import type { LLMProvider, LLMConfig } from "./types";
import type { AgenticPlanRequest } from "@mobius/contracts-abi";

/**
 * Groq LLM provider — OpenAI-compatible API.
 *
 * Groq endpoint: https://api.groq.com/openai/v1/chat/completions
 * Auth: Bearer <GROQ_API_KEY>
 *
 * Required env: GROQ_API_KEY
 * Recommended model: llama-3.1-8b-instant (fast, cheap) or llama-3.1-70b-versatile
 */
export class GroqLLMProvider implements LLMProvider {
  config: LLMConfig;
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      provider: "groq",
      enabled: true,
      model: "llama-3.1-8b-instant",
      ...config,
    };

    this.apiKey = process.env.GROQ_API_KEY ?? "";
    this.baseUrl = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";

    if (!this.apiKey && this.config.enabled) {
      console.warn("[GroqLLMProvider] GROQ_API_KEY not set — LLM calls will fail");
    }
  }

  private async chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GROQ_API_KEY is not set");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? "";
  }

  private async safeCall<T>(
    fn: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    if (!this.apiKey) {
      return fallback;
    }
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  async parseIntent(text: string): Promise<Partial<AgenticPlanRequest>> {
    return this.safeCall(
      async () => {
        const systemPrompt = `You are a DeFi intent parser for Mobius, an agentic transaction-intelligence layer.

Parse the user's natural language objective into a typed JSON object. Only output valid JSON — no markdown, no explanation.

Required output schema:
{
  "objective": { "type": string, "description": string },
  "context": {
    "protocol": string,
    "actionFamily": string,
    "parameters": { [key: string]: string }
  }
}

Rules:
- "type" should be one of: "execute_swap", "hold_defer", "repay_debt", "add_collateral", "sell_collateral_and_repay"
- "protocol" should be the DeFi protocol mentioned (e.g., "MockSwapTarget", "AaveV3")
- "actionFamily" should be the action type (e.g., "swap", "supply", "borrow", "repay")
- Extract parameters like amountIn, minOut, target (0x address), asset, amount from the text
- If no target address is mentioned, set target to null or empty string
- All parameter values must be strings

User input: "${text}"`;

        const content = await this.chatCompletion([
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ]);

        try {
          const parsed = JSON.parse(content);
          return {
            objective: {
              type: parsed.objective?.type ?? "hold_defer",
              description: parsed.objective?.description ?? text,
            },
            context: {
              protocol: parsed.context?.protocol ?? "unknown",
              actionFamily: parsed.context?.actionFamily ?? "unknown",
              parameters: parsed.context?.parameters ?? {},
            },
          };
        } catch {
          return {
            objective: { type: "hold_defer", description: text },
            context: { protocol: "unknown", actionFamily: "unknown", parameters: {} },
          };
        }
      },
      {
        objective: { type: "hold_defer", description: text },
        context: { protocol: "unknown", actionFamily: "unknown", parameters: {} },
      }
    );
  }

  async proposeStrategies(
    objective: string,
    constraints: Record<string, string>
  ): Promise<string[]> {
    return this.safeCall(
      async () => {
        const systemPrompt = `You are a DeFi strategy proposer for Mobius.

Given a user objective and constraints, propose which candidate strategies to consider. Only output valid JSON — no markdown, no explanation.

Output schema:
{
  "strategies": ["strategy_name_1", "strategy_name_2"]
}

Allowed strategies: execute_swap, hold_defer, repay_debt, add_collateral, sell_collateral_and_repay

User objective: "${objective}"
Constraints: ${JSON.stringify(constraints)}`;

        const content = await this.chatCompletion([
          { role: "system", content: systemPrompt },
          { role: "user", content: objective },
        ]);

        try {
          const parsed = JSON.parse(content);
          return Array.isArray(parsed.strategies) ? parsed.strategies : ["hold_defer"];
        } catch {
          return ["hold_defer"];
        }
      },
      ["hold_defer"]
    );
  }

  async explainResults(results: {
    candidateId: string;
    strategy: string;
    status: string;
    estimatedGas?: string;
    constraintViolations: string[];
    explanation: string;
  }[]): Promise<string> {
    return this.safeCall(
      async () => {
        const systemPrompt = `You are a DeFi risk explainer for Mobius.

Explain the following deterministic simulation results in plain, human-readable language. Be concise. Do not invent numbers or contradict the provided data.

Results: ${JSON.stringify(results, null, 2)}`;

        const content = await this.chatCompletion([
          { role: "system", content: systemPrompt },
          { role: "user", content: "Explain these results." },
        ]);

        return content.trim();
      },
      ""
    );
  }
}
