import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AiJobApprovalStatus, AiJobKind } from "@safaribrain/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { LlmService } from "./llm.service";
import { DraftItineraryDto } from "./dto/draft-itinerary.dto";
import { ApproveItineraryDto } from "./dto/approve-itinerary.dto";

const MEAL_VALUES = new Set(["BREAKFAST", "LUNCH", "DINNER"]);

// §1.3 / §9's non-negotiable: an AI draft can never become a real
// TourTemplate on its own. draftItinerary only ever writes an AiJob row
// (status DRAFTED); approve() is the one path that creates real content,
// and it requires a human-supplied payload (ApproveItineraryDto) rather
// than blindly re-using the AI's output, so "approve" means "I reviewed
// and confirm this", not "I clicked a button".
@Injectable()
export class AiJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly llm: LlmService,
  ) {}

  list(organizationId: string, kind: AiJobKind) {
    return this.prisma.aiJob.findMany({
      where: { organizationId, kind },
      orderBy: { createdAt: "desc" },
      include: { requestedBy: { select: { id: true, fullName: true } } },
    });
  }

  async draftItinerary(organizationId: string, actorId: string | undefined, dto: DraftItineraryDto) {
    const prompt = buildItineraryPrompt(dto.prompt, dto.durationDays);
    const completion = await this.llm.complete(organizationId, prompt);
    const parsed = parseItineraryResponse(completion.text, dto.durationDays);

    const job = await this.prisma.aiJob.create({
      data: {
        organizationId,
        kind: AiJobKind.ITINERARY_DRAFT,
        status: AiJobApprovalStatus.DRAFTED,
        prompt: dto.prompt,
        model: completion.model,
        output: parsed as any,
        requestedById: actorId,
      },
    });

    await this.audit.record({ organizationId, actorId, action: "ai.itinerary_draft.create", entityType: "AiJob", entityId: job.id, metadata: { model: completion.model } });
    return job;
  }

  async approveItinerary(organizationId: string, actorId: string | undefined, jobId: string, dto: ApproveItineraryDto) {
    const job = await this.getOwned(organizationId, jobId, AiJobKind.ITINERARY_DRAFT);
    if (job.status !== AiJobApprovalStatus.DRAFTED) throw new BadRequestException(`This draft is already ${job.status.toLowerCase()}`);

    const template = await this.prisma.tourTemplate.create({
      data: {
        organizationId,
        title: dto.title,
        summary: dto.summary,
        durationDays: dto.days.length,
        publiclyListed: false,
        versions: {
          create: [
            {
              versionNumber: 1,
              termsMarkdown: dto.termsMarkdown,
              days: {
                create: dto.days.map((d) => ({
                  dayNumber: d.dayNumber,
                  title: d.title,
                  description: d.description,
                  mealsIncluded: d.mealsIncluded.filter((m) => MEAL_VALUES.has(m)),
                })),
              },
            },
          ],
        },
      },
    });

    const updated = await this.prisma.aiJob.update({
      where: { id: job.id },
      data: { status: AiJobApprovalStatus.APPROVED, decidedById: actorId, decidedAt: new Date(), resultEntityType: "TourTemplate", resultEntityId: template.id },
    });

    await this.audit.record({ organizationId, actorId, action: "ai.itinerary_draft.approve", entityType: "AiJob", entityId: job.id, metadata: { templateId: template.id } });
    return { job: updated, template };
  }

  async reject(organizationId: string, actorId: string | undefined, jobId: string) {
    const job = await this.getOwned(organizationId, jobId, AiJobKind.ITINERARY_DRAFT);
    if (job.status !== AiJobApprovalStatus.DRAFTED) throw new BadRequestException(`This draft is already ${job.status.toLowerCase()}`);
    const updated = await this.prisma.aiJob.update({
      where: { id: job.id },
      data: { status: AiJobApprovalStatus.REJECTED, decidedById: actorId, decidedAt: new Date() },
    });
    await this.audit.record({ organizationId, actorId, action: "ai.itinerary_draft.reject", entityType: "AiJob", entityId: job.id });
    return updated;
  }

  private async getOwned(organizationId: string, id: string, kind: AiJobKind) {
    const job = await this.prisma.aiJob.findFirst({ where: { id, organizationId, kind } });
    if (!job) throw new NotFoundException("AI draft not found");
    return job;
  }
}

function buildItineraryPrompt(brief: string, durationDays: number): string {
  return [
    `You are drafting a ${durationDays}-day safari itinerary outline for a tour operator's internal review.`,
    `Brief from the operator: "${brief}"`,
    "",
    `Respond with ONLY a JSON object, no prose, no markdown fences, matching this exact shape:`,
    `{"title": string, "summary": string, "days": [{"dayNumber": number, "title": string, "description": string, "mealsIncluded": string[]}]}`,
    `- "days" must have exactly ${durationDays} entries, dayNumber 1..${durationDays}.`,
    `- mealsIncluded values must only be from: "BREAKFAST", "LUNCH", "DINNER".`,
    `- Do not invent specific park fee prices or currency amounts — this is itinerary structure only, not pricing.`,
  ].join("\n");
}

function parseItineraryResponse(text: string, durationDays: number) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new BadRequestException("The AI response wasn't valid JSON — try rephrasing the brief.");
  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new BadRequestException("The AI response wasn't valid JSON — try rephrasing the brief.");
  }
  if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new BadRequestException("The AI response didn't include a day-by-day itinerary.");
  }
  return {
    title: String(parsed.title ?? "Untitled draft"),
    summary: String(parsed.summary ?? ""),
    days: parsed.days.slice(0, durationDays).map((d: any, i: number) => ({
      dayNumber: Number(d.dayNumber ?? i + 1),
      title: String(d.title ?? `Day ${i + 1}`),
      description: d.description ? String(d.description) : "",
      mealsIncluded: Array.isArray(d.mealsIncluded) ? d.mealsIncluded.filter((m: unknown) => MEAL_VALUES.has(String(m))) : [],
    })),
  };
}
