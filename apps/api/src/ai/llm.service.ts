import { BadRequestException, Injectable } from "@nestjs/common";
import { IntegrationsService } from "../admin/integrations.service";

export interface LlmCompletion {
  model: string;
  text: string;
}

// Anthropic Messages API request/response shapes, kept minimal — just
// enough for the two callers this service has (a single-shot completion,
// and Noki's multi-turn tool-use loop). Not a general SDK wrapper.
export interface LlmMessagesRequest {
  system?: string;
  messages: unknown[];
  tools?: unknown[];
  maxTokens?: number;
}

export interface LlmMessagesResponse {
  model: string;
  stop_reason: string | null;
  content: { type: string; text?: string; id?: string; name?: string; input?: unknown }[];
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
    const { apiKey, model } = await this.getCredentials(organizationId);
    const res = await this.callAnthropic(apiKey, {
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find((c) => c.type === "text")?.text ?? "";
    return { model: res.model, text };
  }

  // Raw multi-turn / tool-use call, used by Noki's agentic loop — the
  // caller owns the conversation state and tool-execution logic, this just
  // carries credentials and shapes the HTTP call.
  async messages(organizationId: string, req: LlmMessagesRequest): Promise<LlmMessagesResponse> {
    const { apiKey, model } = await this.getCredentials(organizationId);
    return this.callAnthropic(apiKey, {
      model,
      max_tokens: req.maxTokens ?? 1024,
      system: req.system,
      messages: req.messages,
      tools: req.tools,
    });
  }

  private async getCredentials(organizationId: string): Promise<{ apiKey: string; model: string }> {
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
    return { apiKey, model };
  }

  private async callAnthropic(apiKey: string, body: Record<string, unknown>): Promise<LlmMessagesResponse> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new BadRequestException(`AI provider request failed (${res.status}): ${text.slice(0, 300)}`);
    }

    return res.json() as Promise<LlmMessagesResponse>;
  }
}
