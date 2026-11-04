import type { LLMProvider } from "./types";

/**
 * Wraps LLM strategy proposals with deterministic fallback.
 * If LLM is disabled or fails, falls back to default deterministic candidates.
 */
export class CandidateProposer {
  private provider: LLMProvider;
  private defaultStrategies: string[];

  constructor(provider: LLMProvider, defaultStrategies: string[] = ["execute_swap", "hold_defer"]) {
    this.provider = provider;
    this.defaultStrategies = defaultStrategies;
  }

  async propose(
    objective: string,
    constraints: Record<string, string>,
    allowedStrategies: string[]
  ): Promise<string[]> {
    if (!this.provider.config?.enabled) {
      return this.defaultStrategies.filter((s) => allowedStrategies.includes(s));
    }

    try {
      const proposed = await this.provider.proposeStrategies(objective, constraints);
      const valid = proposed.filter((s) => allowedStrategies.includes(s));
      return valid.length > 0 ? valid : this.defaultStrategies.filter((s) =>
        allowedStrategies.includes(s)
      );
    } catch {
      // LLM failed — fall back to deterministic defaults
      return this.defaultStrategies.filter((s) => allowedStrategies.includes(s));
    }
  }
}
