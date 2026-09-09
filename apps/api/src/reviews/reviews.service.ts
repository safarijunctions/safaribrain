import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BookingStatus, ReviewStatus } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { SubmitReviewDto } from "./dto/submit-review.dto";
import { ModerateReviewDto } from "./dto/moderate-review.dto";
import { ReplyReviewDto } from "./dto/reply-review.dto";

// §4.1's "traveler reviews (verified post-trip only)" — verified here
// means tied to an actual COMPLETED booking (BookingsService.markCompleted),
// not a free-text account-less review anyone could post. §7 Phase 3's gate
// is "post-trip review invite and moderation" — every review starts
// PENDING and only a human with MODERATE_LISTING can publish or reject it.
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async submitByToken(token: string, dto: SubmitReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { ticketToken: token },
      include: {
        request: { include: { contact: true } },
        quote: { select: { tourTemplateId: true } },
        departure: { select: { tourTemplateId: true } },
        review: true,
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException("A review can only be left once the trip is marked completed.");
    }
    if (booking.review) throw new BadRequestException("A review has already been submitted for this booking.");

    const review = await this.prisma.review.create({
      data: {
        organizationId: booking.organizationId,
        bookingId: booking.id,
        tourTemplateId: booking.quote?.tourTemplateId ?? booking.departure?.tourTemplateId ?? null,
        reviewerName: booking.request.contact.fullName,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
      },
    });

    await this.audit.record({ organizationId: booking.organizationId, action: "review.submit", entityType: "Review", entityId: review.id, metadata: { bookingId: booking.id, rating: dto.rating } });
    return review;
  }

  // Public — only PUBLISHED reviews, cross-organization like the rest of
  // MarketplaceController, scoped to one template.
  async listPublicForTemplate(tourTemplateId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { tourTemplateId, status: ReviewStatus.PUBLISHED },
      orderBy: { createdAt: "desc" },
      select: { id: true, reviewerName: true, rating: true, title: true, body: true, operatorReply: true, createdAt: true },
    });
    const average = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
    return { average, count: reviews.length, reviews };
  }

  listModerationQueue(organizationId: string, status?: string) {
    return this.prisma.review.findMany({
      where: { organizationId, status: (status as ReviewStatus) ?? ReviewStatus.PENDING },
      orderBy: { createdAt: "asc" },
      include: { booking: { select: { ticketToken: true } }, tourTemplate: { select: { title: true } } },
    });
  }

  async moderate(organizationId: string, actorId: string | undefined, reviewId: string, dto: ModerateReviewDto) {
    const review = await this.getOwned(organizationId, reviewId);
    if (review.status !== ReviewStatus.PENDING) throw new BadRequestException(`This review is already ${review.status.toLowerCase()}`);
    const status = dto.decision === "PUBLISH" ? ReviewStatus.PUBLISHED : ReviewStatus.REJECTED;
    const updated = await this.prisma.review.update({
      where: { id: review.id },
      data: { status, moderatedById: actorId, moderatedAt: new Date() },
    });
    await this.audit.record({ organizationId, actorId, action: `review.${dto.decision.toLowerCase()}`, entityType: "Review", entityId: review.id });
    return updated;
  }

  async reply(organizationId: string, actorId: string | undefined, reviewId: string, dto: ReplyReviewDto) {
    const review = await this.getOwned(organizationId, reviewId);
    const updated = await this.prisma.review.update({ where: { id: review.id }, data: { operatorReply: dto.text } });
    await this.audit.record({ organizationId, actorId, action: "review.reply", entityType: "Review", entityId: review.id });
    return updated;
  }

  private async getOwned(organizationId: string, id: string) {
    const review = await this.prisma.review.findFirst({ where: { id, organizationId } });
    if (!review) throw new NotFoundException("Review not found");
    return review;
  }
}
