import type { AgenticPlanRequest } from "@mobius/contracts-abi";

/**
 * LLM provider interface. All LLM implementations must conform to this.
 * The LLM is optional and sandboxed — it proposes, deterministic code decides.
 */
export interface LLMProvider {
  config: LLMConfig;

  /**
   * Parse natural language into a typed AgenticPlanRequest.
   * Output must pass Zod validation before being used.
   */
  parseIntent(text: string): Promise<Partial<AgenticPlanRequest>>;

  /**
   * Propose which candidate strategies to consider for a given objective.
   * Returns strategy names — deterministic code generates actual calldata.
   */
  proposeStrategies(objective: string, constraints: Record<string, string>): Promise<string[]>;

  /**
   * Explain deterministic simulation results in human-readable language.
   * Input is trusted deterministic output; LLM only rephrases it.
   */
  explainResults(results: {
    candidateId: string;
    strategy: string;
    status: string;
    estimatedGas?: string;
    constraintViolations: string[];
    explanation: string;
  }[]): Promise<string>;
}

export interface LLMConfig {
  provider: "groq" | "openai" | "anthropic" | "mock";
  apiKey?: string;
  model?: string;
  enabled: boolean;
}
