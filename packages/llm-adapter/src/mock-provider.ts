import type { LLMProvider, LLMConfig } from "./types";
import type { AgenticPlanRequest } from "@mobius/contracts-abi";

/**
 * Mock LLM provider — works without any API key.
 * Used for development and testing. Returns deterministic, safe defaults.
 * In production, swap this for OpenAI/Anthropic implementation.
 */
export class MockLLMProvider implements LLMProvider {
  config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      provider: "mock",
      enabled: true,
      ...config,
    };
  }

  async parseIntent(text: string): Promise<Partial<AgenticPlanRequest>> {
    // Mock: extract basic intent heuristics without an LLM
    const lower = text.toLowerCase();
    const type = lower.includes("swap") ? "execute_swap" : "hold_defer";

    const parameters: Record<string, string> = {};
    const amountMatch = text.match(/(\d+)\s*(eth|mon|dai|usdc)/i);
    if (amountMatch?.[1]) {
      parameters.amountIn = amountMatch[1];
    }

    const minOutMatch = text.match(/min(?:imum)?\s*(?:out|output)?\s*[:=]?\s*(\d+)/i);
    if (minOutMatch?.[1]) {
      parameters.minOut = minOutMatch[1];
    }

    const targetMatch = text.match(/0x[0-9a-fA-F]{40}/);
    if (targetMatch?.[0]) {
      parameters.target = targetMatch[0];
    }

    return {
      objective: { type, description: text },
      constraints: {},
      context: {
        protocol: "MockSwapTarget",
        actionFamily: "swap",
        parameters,
      },
    };
  }

  async proposeStrategies(
    objective: string,
    constraints: Record<string, string>
  ): Promise<string[]> {
    // Mock: always propose swap + hold (the two deterministic candidates)
    return ["execute_swap", "hold_defer"];
  }

  async explainResults(results: {
    candidateId: string;
    strategy: string;
    status: string;
    estimatedGas?: string;
    constraintViolations: string[];
    explanation: string;
  }[]): Promise<string> {
    const passed = results.filter((r) => r.status === "SIMULATION_PASSED");
    const reverted = results.filter((r) => r.status === "SIMULATION_REVERTED");
    const blocked = results.filter((r) => r.status === "BLOCKED_BY_POLICY");

    let output = `Mobius evaluated ${results.length} candidate(s):\n\n`;

    if (passed.length > 0) {
      output += `✅ ${passed.length} candidate(s) passed simulation:\n`;
      for (const r of passed) {
        output += `- ${r.strategy}: ${r.explanation}\n`;
      }
    }

    if (reverted.length > 0) {
      output += `\n❌ ${reverted.length} candidate(s) reverted:\n`;
      for (const r of reverted) {
        output += `- ${r.strategy}: ${r.explanation}\n`;
      }
    }

    if (blocked.length > 0) {
      output += `\n🚫 ${blocked.length} candidate(s) blocked by policy:\n`;
      for (const r of blocked) {
        output += `- ${r.strategy}: ${r.constraintViolations.join(", ")}\n`;
      }
    }

    output += "\nMobius recommends executing the highest-ranked passing candidate, or holding if none passed.";
    return output;
  }
}
