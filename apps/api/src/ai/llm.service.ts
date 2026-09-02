import { BadRequestException, Injectable } from "@nestjs/common";
import { IntegrationsService } from "../admin/integrations.service";

export interface LlmCompletion {
  model: string;
  text: string;
}

// Talks to Anthropic's Messages API specifically, using whatever key an
// admin has stored under the LLM_PROVIDER integration (§4.9, §11) — the
// brief's own "ask before choosing an LLM model" is resolved the same way
// payment providers were: admin-configurable rather than a build-time
// vendor lock-in. This client is intentionally provider-specific (not a
// generic multi-vendor abstraction) because that abstraction would be
// untested decoration — a future provider can be added the same way this
// one was, when there's a second real feature that needs it.
@Injectable()
export class LlmService {
  constructor(private readonly integrations: IntegrationsService) {}

  async complete(organizationId: string, prompt: string): Promise<LlmCompletion> {
    const rows = await this.integrations.getEnabledForCategory(organizationId, "AI");
    const row = rows.find((r) => r.provider === "LLM_PROVIDER");
    if (!row) {
      throw new BadRequestException("No AI provider is configured — add one under Admin > Integrations first.");
    }
    const config = row.config as Record<string, unknown>;
    const secrets = row.secrets as Record<string, unknown>;
    const apiKey = secrets.apiKey as string | undefined;
    const model = (config.model as string | undefined) || "claude-haiku-4-5-20251001";
    if (!apiKey) {
      throw new BadRequestException("The AI provider integration is missing its apiKey secret.");
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new BadRequestException(`AI provider request failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    return { model, text };
  }
}
