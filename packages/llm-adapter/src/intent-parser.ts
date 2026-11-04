import { z } from "zod";
import type { LLMProvider } from "./types";
import type { AgenticPlanRequest } from "@mobius/contracts-abi";

/**
 * Validates and sanitizes LLM-proposed intent before it reaches the planner.
 * The LLM proposes; deterministic code validates and decides.
 */
export class IntentParser {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * Parse natural language into a validated AgenticPlanRequest.
   * Throws if LLM output fails schema validation.
   *
   * chainId and account are required fields that the LLM cannot know —
   * they must be provided explicitly by the caller and take precedence.
   */
  async parseAndValidate(
    text: string,
    overrides?: { chainId?: number; account?: `0x${string}` }
  ): Promise<AgenticPlanRequest> {
    const raw = await this.provider.parseIntent(text);

    // Zod schema matching AgenticPlanRequest
    const schema = z.object({
      chainId: z.number().refine((v) => v === 10143 || v === 11155111),
      account: z.string().refine((v) => /^0x[0-9a-fA-F]{40}$/.test(v)),
      objective: z.object({
        type: z.string(),
        description: z.string(),
      }),
      constraints: z.object({
        minAmountOut: z.string().optional(),
        maxSlippageBps: z.number().optional(),
        maxInputAmount: z.string().optional(),
        maxGasWei: z.string().optional(),
        minHealthFactor: z.string().optional(),
        requireHumanApproval: z.boolean().optional(),
      }),
      context: z.object({
        protocol: z.string(),
        actionFamily: z.string(),
        parameters: z.record(z.string(), z.string()),
      }),
    });

    const validated = schema.safeParse({
      ...raw,
      ...(overrides?.chainId !== undefined ? { chainId: overrides.chainId } : {}),
      ...(overrides?.account !== undefined ? { account: overrides.account } : {}),
    });
    if (!validated.success) {
      throw new Error(
        `LLM intent failed validation: ${JSON.stringify(validated.error.issues)}`
      );
    }

    return validated.data as AgenticPlanRequest;
  }

  /**
   * Get strategy proposals from LLM, filtered to allowed strategies.
   * Only returns strategies that exist in the deterministic template registry.
   */
  async proposeAllowedStrategies(
    objective: string,
    constraints: Record<string, string>,
    allowedStrategies: string[]
  ): Promise<string[]> {
    const proposed = await this.provider.proposeStrategies(objective, constraints);

    // Filter to only allowed deterministic strategies
    return proposed.filter((s) => allowedStrategies.includes(s));
  }
}
