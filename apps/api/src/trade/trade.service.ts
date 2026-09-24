import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DeparturesService } from "../departures/departures.service";
import { HoldSeatsDto } from "../departures/dto/hold-seats.dto";
import { BookTradeSeatsDto } from "./dto/book-trade-seats.dto";

// The Trade marketplace (§6): another organization (an agent, or an
// operator/guide buying capacity from a peer) browses departures the
// owning org has opted into the trade channel and books seats on behalf
// of their own end client at the net (wholesale) price, rather than the
// public retail price. Seat holding/locking is identical to the retail
// flow — the same Seat rows, the same concurrency-safe hold — this module
// only adds who's buying and at what price.
@Injectable()
export class TradeService {
  constructor(
    private readonly departures: DeparturesService,
    private readonly prisma: PrismaService,
  ) {}

  // A directory of other verified trade-network organizations — used by
  // the messaging UI to start a conversation with a real counterpart
  // instead of requiring an organization id to be typed in blind.
  listDirectory(excludeOrganizationId: string) {
    return this.prisma.organization.findMany({
      where: { verified: true, id: { not: excludeOrganizationId } },
      select: { id: true, name: true, kind: true, country: true },
      orderBy: { name: "asc" },
    });
  }

  // The agent's own view of every seat they've bought wholesale — across
  // every operator/guide's departures, not scoped to one organizationId
  // the way every retail booking query in this codebase is (bookings
  // belong to the *selling* org there; here the agent is the buyer).
  listMyTradeBookings(agentOrganizationId: string) {
    return this.prisma.booking.findMany({
      where: { agentOrganizationId, channel: "TRADE" },
      include: {
        organization: { select: { name: true, country: true } },
        departure: { select: { departureDate: true, tourTemplate: { select: { title: true } } } },
        travelers: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  listDepartures(callerOrganizationId: string) {
    return this.departures.listTradeDepartures(callerOrganizationId);
  }

  async getDeparture(callerOrganizationId: string, departureId: string) {
    const departure = await this.departures.getTradeDeparture(departureId);
    if (departure.organizationId === callerOrganizationId) {
      throw new BadRequestException("You can't book your own departure through the trade channel");
    }
    return departure;
  }

  getSeatMap(departureId: string, holderToken?: string) {
    return this.departures.getSeatMap(departureId, holderToken);
  }

  async holdSeats(callerOrganizationId: string, departureId: string, dto: HoldSeatsDto) {
    await this.getDeparture(callerOrganizationId, departureId); // re-checks tradeVisible + not-own-departure
    return this.departures.holdSeats(departureId, dto);
  }

  async bookSeats(callerOrganizationId: string, departureId: string, dto: BookTradeSeatsDto) {
    const departure = await this.getDeparture(callerOrganizationId, departureId);
    if (departure.netPricePerSeat == null) {
      throw new BadRequestException("This departure has no net price set");
    }
    return this.departures.confirmBooking(
      departureId,
      {
        holderToken: dto.holderToken,
        contactFullName: dto.endClientFullName,
        contactEmail: dto.endClientEmail,
        contactWhatsapp: dto.endClientWhatsapp,
        contactCountry: dto.endClientCountry,
      },
      { agentOrganizationId: callerOrganizationId, unitNetPrice: Number(departure.netPricePerSeat) },
    );
  }
}
