import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { RequestStage } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { CreateDepartureDto } from "./dto/create-departure.dto";
import { HoldSeatsDto } from "./dto/hold-seats.dto";
import { ConfirmSeatBookingDto } from "./dto/confirm-booking.dto";
import { toJsonField, fromJsonField } from "../common/json-field";

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

  // Shared by both channels: a seat is bookable through this shared
  // mechanism as long as the owning org is verified and the departure is
  // reachable through *some* sales channel (retail listing or trade
  // opt-in) — which channel doesn't change how seat holds work, only how
  // the resulting booking is priced and attributed.
  private async assertBookable(departureId: string) {
    const departure = await this.prisma.departure.findFirst({
      where: {
        id: departureId,
        OR: [{ tourTemplate: { publiclyListed: true } }, { tradeVisible: true }],
        tourTemplate: { organization: { verified: true } },
      },
    });
    if (!departure) throw new NotFoundException("Departure not found");
    return departure;
  }

  async getSeatMap(departureId: string, viewerToken?: string) {
    await this.assertBookable(departureId);
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
  // other and only one may win. On Postgres this used an explicit
  // SERIALIZABLE transaction with a retry-on-conflict loop; SQLite doesn't
  // support configurable isolation levels at all (Prisma rejects the
  // option outright for this connector), and doesn't need one — a SQLite
  // database only ever has one write transaction in flight at a time
  // (the engine's own file-level write lock), and Prisma talks to it over
  // a single connection, so a second concurrent holdSeats() call simply
  // runs after the first one commits, never interleaved with it. The
  // check-then-act below is therefore already atomic: whichever caller's
  // transaction runs second will see the seat already HELD/BOOKED and hit
  // the ordinary ConflictException below — no serialization-failure retry
  // needed. Verified empirically (see ARCHITECTURE.md) with a real
  // concurrent-hold test, the same way the Postgres version was verified.
  async holdSeats(departureId: string, dto: HoldSeatsDto) {
    await this.assertBookable(departureId);
    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  // Staff-side: an operator/guide opts an already-created departure into
  // the Trade marketplace (§6) by setting a net seat price below its
  // public pricePerSeat. Off by default (tradeVisible), same "deliberate
  // opt-in" pattern as TourTemplate.publiclyListed — nothing is wholesale
  // just because it exists.
  async setTradePricing(organizationId: string, departureId: string, netPricePerSeat: number, tradeVisible: boolean) {
    const departure = await this.prisma.departure.findFirst({ where: { id: departureId, organizationId } });
    if (!departure) throw new NotFoundException("Departure not found");
    if (tradeVisible && netPricePerSeat >= Number(departure.pricePerSeat)) {
      throw new BadRequestException("The trade net price must be lower than the public price per seat");
    }
    return this.prisma.departure.update({ where: { id: departure.id }, data: { netPricePerSeat, tradeVisible } });
  }

  // Cross-organization, same reasoning as listPublicForTemplate/
  // getPublicDeparture: scoped by tradeVisible + the owning org's
  // verification, not by organizationId. Excludes the caller's own
  // organization — an org can't be its own trade agent — and departures
  // that are already sold out or in the past.
  listTradeDepartures(excludeOrganizationId: string) {
    return this.prisma.departure.findMany({
      where: {
        tradeVisible: true,
        status: "OPEN",
        departureDate: { gte: new Date() },
        organizationId: { not: excludeOrganizationId },
        tourTemplate: { organization: { verified: true } },
      },
      include: {
        tourTemplate: { select: { title: true, durationDays: true, organization: { select: { name: true, country: true } } } },
        seats: { select: { status: true, heldUntil: true } },
      },
      orderBy: { departureDate: "asc" },
    });
  }

  async getTradeDeparture(departureId: string) {
    const departure = await this.prisma.departure.findFirst({
      where: { id: departureId, tradeVisible: true, status: "OPEN", tourTemplate: { organization: { verified: true } } },
      include: { tourTemplate: { select: { title: true, durationDays: true, organization: { select: { name: true, country: true } } } } },
    });
    if (!departure) throw new NotFoundException("Trade departure not found (not trade-visible, or the operator isn't verified)");
    return departure;
  }

  async confirmBooking(
    departureId: string,
    dto: ConfirmSeatBookingDto,
    trade?: { agentOrganizationId: string; unitNetPrice: number },
  ) {
    let seatCount = 0;
    const booking = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const heldSeats = await tx.seat.findMany({ where: { departureId, holderToken: dto.holderToken, status: "HELD" } });
      const valid = heldSeats.filter((s) => s.heldUntil && s.heldUntil > now);
      if (valid.length === 0) {
        throw new BadRequestException("Your seat hold has expired — please select seats again.");
      }
      seatCount = valid.length;

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

      let tradePartnerName: string | undefined;
      if (trade) {
        const agentOrg = await tx.organization.findUnique({ where: { id: trade.agentOrganizationId }, select: { name: true } });
        tradePartnerName = agentOrg?.name;
      }

      const request = await tx.enquiryRequest.create({
        data: {
          organizationId: departure.organizationId,
          contactId: contact.id,
          source: "WEB",
          stage: RequestStage.BOOKED,
          partySize: valid.length,
          notes: trade
            ? `Trade booking via partner "${tradePartnerName ?? trade.agentOrganizationId}": ${departure.tourTemplate.title}, departing ${departure.departureDate.toDateString()}.`
            : `Instant seat booking: ${departure.tourTemplate.title}, departing ${departure.departureDate.toDateString()}.`,
          interests: toJsonField([departure.tourTemplate.title]),
          consentGiven: true,
          pipelineLog: {
            create: [{ stage: RequestStage.BOOKED, note: trade ? `Trade seat-map booking via ${tradePartnerName ?? "a trade partner"}` : "Instant seat-map booking" }],
          },
        },
      });

      const retailTotalPrice = Number(departure.pricePerSeat) * valid.length;
      const totalPrice = trade ? trade.unitNetPrice * valid.length : retailTotalPrice;
      const booking = await tx.booking.create({
        data: {
          organizationId: departure.organizationId,
          requestId: request.id,
          departureId: departure.id,
          currency: departure.currency,
          totalPrice,
          channel: trade ? "TRADE" : "RETAIL",
          agentOrganizationId: trade?.agentOrganizationId,
          retailTotalPrice: trade ? retailTotalPrice : null,
          termsSnapshot: {
            create: {
              itinerary: toJsonField({
                title: departure.tourTemplate.title,
                durationDays: departure.tourTemplate.durationDays,
                days: templateVersion?.days.map((d) => ({
                  dayNumber: d.dayNumber,
                  title: d.title,
                  description: d.description,
                  mealsIncluded: fromJsonField<string[]>(d.mealsIncluded, []),
                  place: d.place ? { name: d.place.name } : null,
                })) ?? [],
              }),
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

      return booking;
    });
    // Deliberately outside the transaction: AuditService.record() runs
    // against the outer (non-tx) PrismaService connection. On SQLite,
    // where this app runs over a single connection (see schema.prisma's
    // datasource comment), calling it *inside* an open interactive
    // transaction self-deadlocks — the transaction holds the only
    // connection and audit.record() blocks forever waiting for a free
    // one, until Prisma's own interactive-transaction timeout aborts it.
    // The audit entry is therefore best-effort-after-commit rather than
    // part of the same atomic unit as the booking — acceptable for a
    // record-keeping trail (§9), unlike the booking data itself.
    await this.audit.record({
      organizationId: booking.organizationId,
      action: trade ? "departure.trade_book" : "departure.instant_book",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { departureId, seatCount, agentOrganizationId: trade?.agentOrganizationId },
    });
    return booking;
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
