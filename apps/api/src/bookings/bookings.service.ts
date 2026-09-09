import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus, SupplierConfirmationStatus } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AddTravelerDto } from "./dto/add-traveler.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { UpdateLogisticsDto } from "./dto/update-logistics.dto";
import { AddSupplierConfirmationDto } from "./dto/add-supplier-confirmation.dto";
import { UpdateSupplierConfirmationDto } from "./dto/update-supplier-confirmation.dto";

const INCLUDE = {
  termsSnapshot: true,
  travelers: { orderBy: { createdAt: "asc" as const } },
  payments: { orderBy: { createdAt: "asc" as const }, include: { recordedBy: { select: { id: true, fullName: true } } } },
  request: { include: { contact: true } },
  review: true,
  vehicle: true,
  supplierConfirmations: { orderBy: { createdAt: "asc" as const } },
};

// Phase 2 (§7) start: a booking is created automatically the instant a
// quote is accepted (QuotesService.accept) — never here. This service only
// manages what happens to an existing booking: travelers, and payments
// recorded by staff (no gateway integration yet — §11 open decision;
// bank transfer/cash/manual mobile money per §4.3's "manual bank transfer
// with proof upload" is a first-class method the brief itself lists).
@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getForRequest(organizationId: string, requestId: string) {
    return this.prisma.booking.findFirst({
      where: { requestId, organizationId },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  }

  async getOwned(organizationId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id, organizationId }, include: INCLUDE });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  async getByToken(token: string) {
    const booking = await this.prisma.booking.findUnique({ where: { ticketToken: token }, include: INCLUDE });
    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  async addTraveler(organizationId: string, actorId: string | undefined, bookingId: string, dto: AddTravelerDto) {
    const booking = await this.getOwned(organizationId, bookingId);
    const traveler = await this.prisma.traveler.create({
      data: {
        bookingId: booking.id,
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        passportNumber: dto.passportNumber,
      },
    });
    await this.audit.record({ organizationId, actorId, action: "booking.add_traveler", entityType: "Booking", entityId: booking.id, metadata: { travelerId: traveler.id } });
    return traveler;
  }

  // Recording a payment is itself a consequential, audited action — §1.3
  // "human approval for consequential AI" extends here to any money
  // movement: a payment only ever enters the system because a human typed
  // it in, never automatically. Status advances PENDING -> CONFIRMED (first
  // payment) -> PAID (fully paid) as a pure function of amountPaid; ACTIVE/
  // COMPLETED/CANCELLED are trip-lifecycle states outside payment scope,
  // deliberately not touched here.
  async recordPayment(organizationId: string, actorId: string | undefined, bookingId: string, dto: RecordPaymentDto) {
    const booking = await this.getOwned(organizationId, bookingId);
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException("Cannot record a payment on a cancelled booking");

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: dto.amount,
        currency: booking.currency,
        method: dto.method,
        reference: dto.reference,
        recordedById: actorId,
      },
    });

    const newAmountPaid = Number(booking.amountPaid) + dto.amount;
    const nextStatus =
      newAmountPaid >= Number(booking.totalPrice)
        ? BookingStatus.PAID
        : booking.status === BookingStatus.PENDING
          ? BookingStatus.CONFIRMED
          : booking.status;

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { amountPaid: newAmountPaid, status: nextStatus },
      include: INCLUDE,
    });

    await this.audit.record({
      organizationId,
      actorId,
      action: "booking.record_payment",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { paymentId: payment.id, amount: dto.amount, method: dto.method, newStatus: nextStatus },
    });

    return updated;
  }

  // Guide/pickup/vehicle logistics for the day-of-trip manifest (§7 Phase 2
  // "guide manifests", §4.3 "vehicle compliance") — operator-entered,
  // staff-visible only.
  async updateLogistics(organizationId: string, actorId: string | undefined, bookingId: string, dto: UpdateLogisticsDto) {
    const booking = await this.getOwned(organizationId, bookingId);
    if (dto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, organizationId } });
      if (!vehicle) throw new NotFoundException("Vehicle not found");
    }
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        guideName: dto.guideName,
        guidePhone: dto.guidePhone,
        pickupNotes: dto.pickupNotes,
        ...(dto.vehicleId !== undefined ? { vehicleId: dto.vehicleId } : {}),
      },
      include: INCLUDE,
    });
    await this.audit.record({ organizationId, actorId, action: "booking.update_logistics", entityType: "Booking", entityId: booking.id, metadata: dto as Record<string, unknown> });
    return updated;
  }

  // A per-booking checklist of the lodges/permits/transport an operator
  // needs a yes from before a trip is truly ready (§4.3 "calendar/supplier
  // confirmations") — independent of the booking's own payment status.
  async addSupplierConfirmation(organizationId: string, actorId: string | undefined, bookingId: string, dto: AddSupplierConfirmationDto) {
    const booking = await this.getOwned(organizationId, bookingId);
    const confirmation = await this.prisma.supplierConfirmation.create({
      data: {
        organizationId,
        bookingId: booking.id,
        supplierName: dto.supplierName,
        supplierType: dto.supplierType,
        neededBy: dto.neededBy ? new Date(dto.neededBy) : undefined,
        notes: dto.notes,
      },
    });
    await this.audit.record({ organizationId, actorId, action: "booking.supplier_confirmation.add", entityType: "Booking", entityId: booking.id, metadata: { confirmationId: confirmation.id, supplierName: dto.supplierName } });
    return this.getOwned(organizationId, bookingId);
  }

  async updateSupplierConfirmation(organizationId: string, actorId: string | undefined, bookingId: string, confirmationId: string, dto: UpdateSupplierConfirmationDto) {
    await this.getOwned(organizationId, bookingId);
    const existing = await this.prisma.supplierConfirmation.findFirst({ where: { id: confirmationId, bookingId, organizationId } });
    if (!existing) throw new NotFoundException("Supplier confirmation not found");
    await this.prisma.supplierConfirmation.update({
      where: { id: confirmationId },
      data: {
        status: dto.status,
        referenceCode: dto.referenceCode,
        notes: dto.notes,
        confirmedAt:
          dto.status === SupplierConfirmationStatus.CONFIRMED
            ? new Date()
            : dto.status === SupplierConfirmationStatus.PENDING
              ? null
              : existing.confirmedAt,
      },
    });
    await this.audit.record({ organizationId, actorId, action: "booking.supplier_confirmation.update", entityType: "Booking", entityId: bookingId, metadata: { confirmationId, status: dto.status } });
    return this.getOwned(organizationId, bookingId);
  }

  // Unlocks the post-trip review flow (§4.1, §7 Phase 3 gate) — a review
  // can only be submitted once a human confirms the trip actually
  // happened, not automatically once the departure date passes (no
  // automated "trip must be over" inference; a guide/operator marks it).
  async markCompleted(organizationId: string, actorId: string | undefined, bookingId: string) {
    const booking = await this.getOwned(organizationId, bookingId);
    if (![BookingStatus.PAID, BookingStatus.ACTIVE].includes(booking.status as any)) {
      throw new BadRequestException(`Cannot mark a ${booking.status} booking as completed — it must be PAID or ACTIVE first`);
    }
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.COMPLETED },
      include: INCLUDE,
    });
    await this.audit.record({ organizationId, actorId, action: "booking.mark_completed", entityType: "Booking", entityId: booking.id });
    return updated;
  }
}
