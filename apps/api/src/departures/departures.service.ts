import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RequestStage } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateDepartureDto } from "./dto/create-departure.dto";
import { HoldSeatsDto } from "./dto/hold-seats.dto";
import { ConfirmSeatBookingDto } from "./dto/confirm-booking.dto";

const HOLD_MINUTES = 5;

// §1.2's second buying mode: "instant booking on fixed joinable departures
// (seat-map checkout)", alongside (not instead of) the quote→negotiate→book
// flow QuotesService implements. §10.7's acceptance gate — "prevents two
// users from buying the same seat and releases expired holds automatically"
// — is the one hard correctness requirement here; see holdSeats() for how.
@Injectable()
export class DeparturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createDeparture(organizationId: string, actorId: string | undefined, templateId: string, dto: CreateDepartureDto) {
    const template = await this.prisma.tourTemplate.findFirst({ where: { id: templateId, organizationId } });
    if (!template) throw new NotFoundException("Tour template not found");

    const departure = await this.prisma.departure.create({
      data: {
        organizationId,
        tourTemplateId: templateId,
        departureDate: new Date(dto.departureDate),
        currency: dto.currency,
        pricePerSeat: dto.pricePerSeat,
        totalSeats: dto.totalSeats,
        seats: { create: generateSeats(dto.totalSeats) },
      },
      include: { seats: { orderBy: { label: "asc" } } },
    });

    await this.audit.record({ organizationId, actorId, action: "departure.create", entityType: "Departure", entityId: departure.id, metadata: { templateId, totalSeats: dto.totalSeats } });
    return departure;
  }

  listForTemplate(organizationId: string, templateId: string) {
    return this.prisma.departure.findMany({
      where: { organizationId, tourTemplateId: templateId },
      include: { seats: { select: { status: true } } },
      orderBy: { departureDate: "asc" },
    });
  }

  // Public — cross-organization, same reasoning as MarketplaceService: only
  // departures belonging to a publiclyListed template on a verified org.
  listPublicForTemplate(templateId: string) {
    return this.prisma.departure.findMany({
      where: {
        tourTemplateId: templateId,
        status: "OPEN",
        departureDate: { gte: new Date() },
        tourTemplate: { publiclyListed: true, organization: { verified: true } },
      },
      include: { seats: { select: { status: true, heldUntil: true } } },
      orderBy: { departureDate: "asc" },
    });
  }

  async getPublicDeparture(departureId: string) {
    const departure = await this.prisma.departure.findFirst({
      where: { id: departureId, tourTemplate: { publiclyListed: true, organization: { verified: true } } },
      include: { tourTemplate: { select: { title: true, organization: { select: { name: true, country: true } } } } },
    });
    if (!departure) throw new NotFoundException("Departure not found");
    return departure;
  }

  async getSeatMap(departureId: string, viewerToken?: string) {
    await this.getPublicDeparture(departureId);
    const seats = await this.prisma.seat.findMany({ where: { departureId }, orderBy: { label: "asc" } });
    const now = new Date();
    return seats.map((s) => ({
      id: s.id,
      label: s.label,
      type: s.type,
      status: effectiveStatus(s, now),
      isMine: Boolean(viewerToken) && s.holderToken === viewerToken && effectiveStatus(s, now) === "HELD",
    }));
  }

  // The one piece of this feature that must be genuinely concurrency-safe:
  // two travelers can click the same seat within milliseconds of each
  // other and only one may win. SERIALIZABLE isolation makes Postgres abort
  // one of two conflicting concurrent transactions with a serialization
  // failure (Prisma surfaces this as error code P2034) rather than letting
  // both believe they hold the seat — a DB-level guarantee, not an
  // application-level race that happens to usually work.
  async holdSeats(departureId: string, dto: HoldSeatsDto) {
    await this.getPublicDeparture(departureId);
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const now = new Date();
            const seats = await tx.seat.findMany({ where: { id: { in: dto.seatIds }, departureId } });
            if (seats.length !== dto.seatIds.length) throw new NotFoundException("One or more seats were not found on this departure");

            const unavailable = seats.filter((s) => {
              const status = effectiveStatus(s, now);
              return status === "BOOKED" || (status === "HELD" && s.holderToken !== dto.holderToken);
            });
            if (unavailable.length > 0) {
              throw new ConflictException(`Already taken: ${unavailable.map((s) => s.label).join(", ")} — pick a different seat.`);
            }

            const heldUntil = new Date(now.getTime() + HOLD_MINUTES * 60_000);
            await tx.seat.updateMany({
              where: { id: { in: dto.seatIds } },
              data: { status: "HELD", heldUntil, holderToken: dto.holderToken },
            });
            const updated = await tx.seat.findMany({ where: { id: { in: dto.seatIds } }, orderBy: { label: "asc" } });
            return { heldUntil, seats: updated.map((s) => ({ id: s.id, label: s.label, type: s.type })) };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (err: any) {
        const isSerializationConflict = err?.code === "P2034";
        if (isSerializationConflict && attempt < MAX_ATTEMPTS) continue;
        if (isSerializationConflict) throw new ConflictException("That seat was just taken by someone else — please try again.");
        throw err;
      }
    }
    throw new ConflictException("That seat was just taken by someone else — please try again.");
  }

  async confirmBooking(departureId: string, dto: ConfirmSeatBookingDto) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const heldSeats = await tx.seat.findMany({ where: { departureId, holderToken: dto.holderToken, status: "HELD" } });
      const valid = heldSeats.filter((s) => s.heldUntil && s.heldUntil > now);
      if (valid.length === 0) {
        throw new BadRequestException("Your seat hold has expired — please select seats again.");
      }

      const departure = await tx.departure.findFirstOrThrow({
        where: { id: departureId },
        include: {
          tourTemplate: {
            include: {
              versions: {
                orderBy: { versionNumber: "desc" },
                take: 1,
                include: { days: { include: { place: true }, orderBy: { dayNumber: "asc" } } },
              },
            },
          },
        },
      });
      const templateVersion = departure.tourTemplate.versions[0];

      const contact = await tx.contact.upsert({
        where: { organizationId_email: { organizationId: departure.organizationId, email: dto.contactEmail } },
        update: { fullName: dto.contactFullName, whatsapp: dto.contactWhatsapp, country: dto.contactCountry },
        create: {
          organizationId: departure.organizationId,
          fullName: dto.contactFullName,
          email: dto.contactEmail,
          whatsapp: dto.contactWhatsapp,
          country: dto.contactCountry,
        },
      });

      const request = await tx.enquiryRequest.create({
        data: {
          organizationId: departure.organizationId,
          contactId: contact.id,
          source: "WEB",
          stage: RequestStage.BOOKED,
          partySize: valid.length,
          notes: `Instant seat booking: ${departure.tourTemplate.title}, departing ${departure.departureDate.toDateString()}.`,
          interests: [departure.tourTemplate.title],
          consentGiven: true,
          pipelineLog: { create: [{ stage: RequestStage.BOOKED, note: "Instant seat-map booking" }] },
        },
      });

      const totalPrice = Number(departure.pricePerSeat) * valid.length;
      const booking = await tx.booking.create({
        data: {
          organizationId: departure.organizationId,
          requestId: request.id,
          departureId: departure.id,
          currency: departure.currency,
          totalPrice,
          termsSnapshot: {
            create: {
              itinerary: {
                title: departure.tourTemplate.title,
                durationDays: departure.tourTemplate.durationDays,
                days: templateVersion?.days.map((d) => ({
                  dayNumber: d.dayNumber,
                  title: d.title,
                  description: d.description,
                  mealsIncluded: d.mealsIncluded,
                  place: d.place ? { name: d.place.name } : null,
                })) ?? [],
              } as any,
              termsMarkdown: templateVersion?.termsMarkdown ?? null,
            },
          },
        },
        include: { termsSnapshot: true },
      });

      await tx.seat.updateMany({
        where: { id: { in: valid.map((s) => s.id) } },
        data: { status: "BOOKED", bookingId: booking.id, holderToken: null, heldUntil: null },
      });

      await this.audit.record({
        organizationId: departure.organizationId,
        action: "departure.instant_book",
        entityType: "Booking",
        entityId: booking.id,
        metadata: { departureId: departure.id, seatCount: valid.length },
      });

      return booking;
    });
  }
}

function effectiveStatus(seat: { status: string; heldUntil: Date | null }, now: Date): "AVAILABLE" | "HELD" | "BOOKED" {
  if (seat.status === "BOOKED") return "BOOKED";
  if (seat.status === "HELD" && seat.heldUntil && seat.heldUntil > now) return "HELD";
  return "AVAILABLE"; // lazy expiry — an expired hold reads as available everywhere, no sweep job needed
}

function generateSeats(totalSeats: number): { label: string; type: "WINDOW" | "AISLE" | "FRONT" }[] {
  const ROW_SIZE = 3;
  const seats: { label: string; type: "WINDOW" | "AISLE" | "FRONT" }[] = [];
  let remaining = totalSeats;
  let row = 1;
  while (remaining > 0) {
    const inRow = Math.min(ROW_SIZE, remaining);
    for (let col = 0; col < inRow; col++) {
      const letter = String.fromCharCode(65 + col); // A, B, C
      const type = row === 1 ? "FRONT" : col === 0 || col === inRow - 1 ? "WINDOW" : "AISLE";
      seats.push({ label: `${row}${letter}`, type });
    }
    remaining -= inRow;
    row++;
  }
  return seats;
}
