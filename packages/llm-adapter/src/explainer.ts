import type { LLMProvider } from "./types";

/**
 * Wraps LLM explanation with deterministic fallback.
 * The LLM only rephrases trusted deterministic output — it never invents results.
 */
export class Explainer {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async explain(
    results: {
      candidateId: string;
      strategy: string;
      status: string;
      estimatedGas?: string;
      constraintViolations: string[];
      explanation: string;
    }[]
  ): Promise<string> {
    if (!this.provider.config.enabled) {
      return this.deterministicExplain(results);
    }

    try {
      return await this.provider.explainResults(results);
    } catch {
      return this.deterministicExplain(results);
    }
  }

  private deterministicExplain(results: {
    candidateId: string;
    strategy: string;
    status: string;
    estimatedGas?: string;
    constraintViolations: string[];
    explanation: string;
  }[]): string {
    const passed = results.filter((r) => r.status === "SIMULATION_PASSED");
    const reverted = results.filter((r) => r.status === "SIMULATION_REVERTED");
    const blocked = results.filter((r) => r.status === "BLOCKED_BY_POLICY");

    let output = `Mobius evaluated ${results.length} candidate(s):\n\n`;

    if (passed.length > 0) {
      output += `✅ ${passed.length} passed:\n`;
      for (const r of passed) {
        output += `- ${r.strategy}: ${r.explanation}\n`;
      }
    }

    if (reverted.length > 0) {
      output += `\n❌ ${reverted.length} reverted:\n`;
      for (const r of reverted) {
        output += `- ${r.strategy}: ${r.explanation}\n`;
      }
    }

    if (blocked.length > 0) {
      output += `\n🚫 ${blocked.length} blocked by policy:\n`;
      for (const r of blocked) {
        output += `- ${r.strategy}: ${r.constraintViolations.join(", ")}\n`;
      }
    }

    return output;
  }
}
