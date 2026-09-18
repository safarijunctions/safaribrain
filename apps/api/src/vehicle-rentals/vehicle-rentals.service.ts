import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpsertRentalListingDto } from "./dto/upsert-listing.dto";
import { RequestRentalDto } from "./dto/request-rental.dto";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The vehicle rental exchange (§6 Trade "safari vehicle... managed by
// operators and tour guides... other companies can rent depending on
// agreements") — an owner org publishes one of its own fleet Vehicles as
// rentable, and another org (a peer operator short a vehicle, a guide who
// owns none, an agent assembling a package) requests a date-ranged
// rental agreement. Deliberately not an instant "book now" like a seat:
// vehicle hire here is a negotiated commercial arrangement the owner
// accepts or declines, so a request only becomes binding once they do.
@Injectable()
export class VehicleRentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async upsertListing(organizationId: string, actorId: string | undefined, vehicleId: string, dto: UpsertRentalListingDto) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId } });
    if (!vehicle) throw new NotFoundException("Vehicle not found");

    const listing = await this.prisma.vehicleRentalListing.upsert({
      where: { vehicleId },
      update: { dailyRate: dto.dailyRate, currency: dto.currency, visibility: dto.visibility, notes: dto.notes, active: dto.active ?? true },
      create: {
        organizationId,
        vehicleId,
        dailyRate: dto.dailyRate,
        currency: dto.currency,
        visibility: dto.visibility,
        notes: dto.notes,
        active: dto.active ?? true,
      },
    });
    await this.audit.record({ organizationId, actorId, action: "vehicle_rental.listing.upsert", entityType: "VehicleRentalListing", entityId: listing.id, metadata: { vehicleId, dailyRate: dto.dailyRate } });
    return listing;
  }

  listMyListings(organizationId: string) {
    return this.prisma.vehicleRentalListing.findMany({
      where: { organizationId },
      include: { vehicle: true, _count: { select: { agreements: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // Cross-organization browse — excludes the caller's own listings (an
  // org can't rent its own vehicle from itself) and anything the owner
  // has taken UNLISTED or deactivated.
  browseListings(excludeOrganizationId: string) {
    return this.prisma.vehicleRentalListing.findMany({
      where: {
        active: true,
        visibility: "LISTED",
        organizationId: { not: excludeOrganizationId },
        organization: { verified: true },
      },
      include: { vehicle: true, organization: { select: { name: true, country: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  private async getListingOrThrow(listingId: string) {
    const listing = await this.prisma.vehicleRentalListing.findUnique({ where: { id: listingId }, include: { vehicle: true } });
    if (!listing) throw new NotFoundException("Rental listing not found");
    return listing;
  }

  async requestRental(renterOrganizationId: string, listingId: string, dto: RequestRentalDto) {
    const listing = await this.getListingOrThrow(listingId);
    if (!listing.active) throw new BadRequestException("This vehicle is not currently available for rent");
    if (listing.organizationId === renterOrganizationId) {
      throw new BadRequestException("You can't request your own vehicle");
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) throw new BadRequestException("End date must be on or after the start date");

    const days = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
    const totalPrice = Number(listing.dailyRate) * days;

    const agreement = await this.prisma.vehicleRentalAgreement.create({
      data: {
        listingId: listing.id,
        ownerOrganizationId: listing.organizationId,
        renterOrganizationId,
        startDate,
        endDate,
        dailyRate: listing.dailyRate,
        totalPrice,
        currency: listing.currency,
        message: dto.message,
      },
    });
    await this.audit.record({ organizationId: renterOrganizationId, action: "vehicle_rental.agreement.request", entityType: "VehicleRentalAgreement", entityId: agreement.id, metadata: { listingId, startDate: dto.startDate, endDate: dto.endDate } });
    return agreement;
  }

  // ACCEPTED can only happen once for a given vehicle over an overlapping
  // date range — checked inside the same operation the decision is made
  // in, not just at request time, since two renters can request
  // overlapping dates and the owner can only actually accept one.
  async respond(ownerOrganizationId: string, agreementId: string, decision: "ACCEPTED" | "DECLINED") {
    return this.prisma.$transaction(async (tx) => {
      const agreement = await tx.vehicleRentalAgreement.findUnique({ where: { id: agreementId } });
      if (!agreement) throw new NotFoundException("Rental agreement not found");
      if (agreement.ownerOrganizationId !== ownerOrganizationId) throw new ForbiddenException("Not your listing");
      if (agreement.status !== "PENDING") throw new BadRequestException(`This request is already ${agreement.status.toLowerCase()}`);

      if (decision === "ACCEPTED") {
        const overlapping = await tx.vehicleRentalAgreement.findFirst({
          where: {
            listingId: agreement.listingId,
            status: "ACCEPTED",
            startDate: { lte: agreement.endDate },
            endDate: { gte: agreement.startDate },
          },
        });
        if (overlapping) {
          throw new ConflictException("This vehicle already has an accepted rental overlapping these dates");
        }
      }

      const updated = await tx.vehicleRentalAgreement.update({
        where: { id: agreementId },
        data: { status: decision, respondedAt: new Date() },
      });
      await this.audit.record({ organizationId: ownerOrganizationId, action: `vehicle_rental.agreement.${decision.toLowerCase()}`, entityType: "VehicleRentalAgreement", entityId: agreementId });
      return updated;
    });
  }

  listMyAgreements(organizationId: string) {
    return this.prisma.vehicleRentalAgreement.findMany({
      where: { OR: [{ ownerOrganizationId: organizationId }, { renterOrganizationId: organizationId }] },
      include: {
        listing: { include: { vehicle: true } },
        ownerOrganization: { select: { name: true } },
        renterOrganization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
