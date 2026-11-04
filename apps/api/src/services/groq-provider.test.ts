import { describe, it, expect } from "vitest";
import { GroqLLMProvider } from "@mobius/llm-adapter";

describe("GroqLLMProvider", () => {
  it("constructor stores config", () => {
    const provider = new GroqLLMProvider({
      enabled: false,
      model: "llama-3.1-8b-instant",
    });
    expect(provider.config.provider).toBe("groq");
    expect(provider.config.enabled).toBe(false);
    expect(provider.config.model).toBe("llama-3.1-8b-instant");
  });

  it("parseIntent returns safe default when no API key", async () => {
    // Temporarily unset GROQ_API_KEY for this test
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const provider = new GroqLLMProvider({ enabled: true });
    const result = await provider.parseIntent("swap some eth");

    expect(result.objective?.type).toBe("hold_defer");
    expect(result.context?.protocol).toBe("unknown");

    // Restore
    if (originalKey) {
      process.env.GROQ_API_KEY = originalKey;
    }
  });

  it("proposeStrategies returns safe default when no API key", async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const provider = new GroqLLMProvider({ enabled: true });
    const strategies = await provider.proposeStrategies("swap", {});

    expect(strategies).toEqual(["hold_defer"]);

    if (originalKey) {
      process.env.GROQ_API_KEY = originalKey;
    }
  });

  it("explainResults returns empty string when no API key", async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const provider = new GroqLLMProvider({ enabled: true });
    const result = await provider.explainResults([
      {
        candidateId: "plan_1",
        strategy: "execute_swap",
        status: "SIMULATION_PASSED",
        constraintViolations: [],
        explanation: "test",
      },
    ]);

    expect(result).toBe("");

    if (originalKey) {
      process.env.GROQ_API_KEY = originalKey;
    }
  });
});
