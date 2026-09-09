import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { UpsertVehicleDto } from "./dto/upsert-vehicle.dto";

const EXPIRING_SOON_DAYS = 30;

export type ComplianceStatus = "OK" | "EXPIRING_SOON" | "EXPIRED" | "NOT_TRACKED";

// Read-time compliance check — same lazy-evaluation pattern as departure
// hold expiry (DeparturesService.effectiveStatus): a vehicle's insurance/
// inspection state is derived from its stored expiry dates on every read
// rather than needing a background job to flip a stored status.
function computeComplianceStatus(insuranceExpiry: Date | null, inspectionExpiry: Date | null): ComplianceStatus {
  const dates = [insuranceExpiry, inspectionExpiry].filter((d): d is Date => d !== null);
  if (dates.length === 0) return "NOT_TRACKED";
  const now = Date.now();
  const soonThreshold = now + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000;
  if (dates.some((d) => d.getTime() <= now)) return "EXPIRED";
  if (dates.some((d) => d.getTime() <= soonThreshold)) return "EXPIRING_SOON";
  return "OK";
}

function withCompliance<T extends { insuranceExpiry: Date | null; inspectionExpiry: Date | null }>(vehicle: T) {
  return { ...vehicle, complianceStatus: computeComplianceStatus(vehicle.insuranceExpiry, vehicle.inspectionExpiry) };
}

// Fleet compliance (§4.3) — separate from booking logistics (guide/pickup
// notes): a vehicle is an org-owned asset tracked across many trips, not
// something entered once per booking.
@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return vehicles.map(withCompliance);
  }

  async get(organizationId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, organizationId } });
    if (!vehicle) throw new NotFoundException("Vehicle not found");
    return withCompliance(vehicle);
  }

  async create(organizationId: string, actorId: string | undefined, dto: UpsertVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        organizationId,
        name: dto.name,
        registrationNumber: dto.registrationNumber,
        capacity: dto.capacity,
        status: dto.status,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        inspectionExpiry: dto.inspectionExpiry ? new Date(dto.inspectionExpiry) : undefined,
        notes: dto.notes,
      },
    });
    await this.audit.record({ organizationId, actorId, action: "fleet.vehicle.create", entityType: "Vehicle", entityId: vehicle.id, metadata: { name: vehicle.name, registrationNumber: vehicle.registrationNumber } });
    return withCompliance(vehicle);
  }

  async update(organizationId: string, actorId: string | undefined, id: string, dto: UpsertVehicleDto) {
    await this.get(organizationId, id);
    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        name: dto.name,
        registrationNumber: dto.registrationNumber,
        capacity: dto.capacity,
        status: dto.status,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        inspectionExpiry: dto.inspectionExpiry ? new Date(dto.inspectionExpiry) : null,
        notes: dto.notes,
      },
    });
    await this.audit.record({ organizationId, actorId, action: "fleet.vehicle.update", entityType: "Vehicle", entityId: vehicle.id, metadata: { name: vehicle.name, status: vehicle.status } });
    return withCompliance(vehicle);
  }

  async remove(organizationId: string, actorId: string | undefined, id: string) {
    const vehicle = await this.get(organizationId, id);
    await this.prisma.vehicle.delete({ where: { id } });
    await this.audit.record({ organizationId, actorId, action: "fleet.vehicle.delete", entityType: "Vehicle", entityId: id, metadata: { name: vehicle.name } });
    return { deleted: true };
  }
}
