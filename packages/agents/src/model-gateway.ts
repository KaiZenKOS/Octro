import { z } from "zod";

export interface ModelMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ModelGenerationOptions {
  signal?: AbortSignal;
}

export interface ModelGatewayResponse {
  content: string;
}

export interface ModelGateway {
  generate(messages: ModelMessage[], options?: ModelGenerationOptions): Promise<ModelGatewayResponse>;
}

export class ModelGatewayUnavailableError extends Error {
  constructor(message = "model gateway is unavailable") {
    super(message);
    this.name = "ModelGatewayUnavailableError";
  }
}

/**
 * A safe, deterministic default. Model output is a tiny structured choice;
 * the caller renders every user-visible fact from the financial plan.
 */
export class DeterministicModelGateway implements ModelGateway {
  async generate(): Promise<ModelGatewayResponse> {
    return { content: JSON.stringify({ order: "action_first" }) };
  }
}

export interface LiveModelGatewayOptions {
  /** Inject a server-held key from the server composition root. Never read from a client bundle. */
  apiKey?: string;
  endpoint?: string;
  model?: string;
  fetcher?: typeof fetch;
}

const CompletionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable().optional() }).passthrough(),
  }).passthrough()).min(1),
}).passthrough();

/**
 * Server-only OpenAI-compatible gateway. It deliberately performs no
 * environment lookup and has no provider-specific browser keys. The server composition root
 * must inject its secret; orchestration falls back deterministically on any
 * provider error or timeout.
 */
export class LiveModelGateway implements ModelGateway {
  private readonly apiKey: string | undefined;
  private readonly endpoint: string;
  private readonly model: string;
  private readonly fetcher: typeof fetch;

  constructor(options: LiveModelGatewayOptions = {}) {
    this.apiKey = options.apiKey;
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/chat/completions";
    this.model = options.model ?? "gpt-4o-mini";
    this.fetcher = options.fetcher ?? fetch;
  }

  async generate(messages: ModelMessage[], options: ModelGenerationOptions = {}): Promise<ModelGatewayResponse> {
    if ("window" in globalThis) {
      throw new ModelGatewayUnavailableError("live model gateway cannot run in a browser");
    }
    if (!this.apiKey) {
      throw new ModelGatewayUnavailableError("server model credential was not injected");
    }

    const endpoint = new URL(this.endpoint);
    if (endpoint.protocol !== "https:") {
      throw new ModelGatewayUnavailableError("model endpoint must use HTTPS");
    }

    const response = await this.fetcher(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0,
        max_tokens: 32,
        response_format: { type: "json_object" },
      }),
      ...(options.signal ? { signal: options.signal } : {}),
    });

    if (!response.ok) {
      throw new ModelGatewayUnavailableError(`model provider returned HTTP ${response.status}`);
    }

    const parsed = CompletionSchema.safeParse(await response.json());
    const content = parsed.success ? parsed.data.choices[0]?.message.content : undefined;
    if (typeof content !== "string" || content.length === 0 || content.length > 256) {
      throw new ModelGatewayUnavailableError("model provider returned an invalid bounded response");
    }
    return { content };
  }
}
