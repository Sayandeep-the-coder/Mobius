import { describe, it, expect } from "vitest";
import { MockLLMProvider } from "@mobius/llm-adapter";
import { IntentParser } from "@mobius/llm-adapter";
import { CandidateProposer } from "@mobius/llm-adapter";
import { Explainer } from "@mobius/llm-adapter";

describe("MockLLMProvider", () => {
  const provider = new MockLLMProvider({ enabled: true });

  it("parses intent into typed structure", async () => {
    const result = await provider.parseIntent(
      "Execute swap on 0x1234567890123456789012345678901234567890 with 100 ETH minOut 90"
    );
    expect(result.objective?.type).toBe("execute_swap");
    expect(result.context?.parameters["amountIn"]).toBe("100");
    expect(result.context?.parameters["minOut"]).toBe("90");
    expect(result.context?.parameters["target"]).toBe(
      "0x1234567890123456789012345678901234567890"
    );
  });

  it("proposes swap and hold strategies", async () => {
    const strategies = await provider.proposeStrategies("swap some eth", {});
    expect(strategies).toContain("execute_swap");
    expect(strategies).toContain("hold_defer");
  });

  it("explains results deterministically", async () => {
    const explanation = await provider.explainResults([
      {
        candidateId: "plan_1_swap",
        strategy: "execute_swap",
        status: "SIMULATION_PASSED",
        estimatedGas: "50000",
        constraintViolations: [],
        explanation: "Swap passed against block 1000",
      },
      {
        candidateId: "plan_1_hold",
        strategy: "hold_defer",
        status: "SIMULATION_PASSED",
        constraintViolations: [],
        explanation: "Hold/defer — no transaction submitted",
      },
    ]);
    expect(explanation).toContain("passed");
    expect(explanation).toContain("execute_swap");
  });
});

describe("IntentParser", () => {
  const provider = new MockLLMProvider({ enabled: true });
  const parser = new IntentParser(provider);

  it("validates LLM output through Zod schema", async () => {
    const result = await parser.parseAndValidate(
      "Execute swap on 0x1234567890123456789012345678901234567890 with 100 ETH minOut 90",
      { chainId: 10143, account: "0x1234567890123456789012345678901234567890" as `0x${string}` }
    );
    expect(result.objective.type).toBeDefined();
    expect(result.chainId).toBe(10143);
    expect(result.account).toBe("0x1234567890123456789012345678901234567890");
    expect(result.context.protocol).toBe("MockSwapTarget");
    expect(result.context.actionFamily).toBe("swap");
  });

  it("filters proposed strategies to allowed list", async () => {
    const allowed = ["execute_swap", "hold_defer"];
    const proposed = await parser.proposeAllowedStrategies(
      "swap",
      {},
      allowed
    );
    for (const s of proposed) {
      expect(allowed).toContain(s);
    }
  });
});

describe("CandidateProposer", () => {
  it("returns defaults when LLM disabled", async () => {
    const provider = new MockLLMProvider({ enabled: false });
    const proposer = new CandidateProposer(provider, ["execute_swap", "hold_defer"]);
    const strategies = await proposer.propose("swap", {}, ["execute_swap", "hold_defer"]);
    expect(strategies).toContain("execute_swap");
    expect(strategies).toContain("hold_defer");
  });

  it("filters proposed strategies to allowed list", async () => {
    const provider = new MockLLMProvider({ enabled: true });
    const proposer = new CandidateProposer(provider, ["execute_swap", "hold_defer"]);
    const strategies = await proposer.propose("swap", {}, ["execute_swap", "hold_defer"]);
    expect(strategies.length).toBeGreaterThan(0);
    for (const s of strategies) {
      expect(["execute_swap", "hold_defer"]).toContain(s);
    }
  });
});

describe("Explainer", () => {
  it("provides deterministic explanation when LLM disabled", async () => {
    const provider = new MockLLMProvider({ enabled: false });
    const explainer = new Explainer(provider);
    const result = await explainer.explain([
      {
        candidateId: "plan_1_swap",
        strategy: "execute_swap",
        status: "SIMULATION_REVERTED",
        constraintViolations: ["Slippage exceeded"],
        explanation: "SlippageExceeded: actual 50 < min 90",
      },
    ]);
    expect(result).toContain("reverted");
    expect(result).toContain("execute_swap");
  });

  it("provides deterministic explanation when LLM enabled", async () => {
    const provider = new MockLLMProvider({ enabled: true });
    const explainer = new Explainer(provider);
    const result = await explainer.explain([
      {
        candidateId: "plan_1_swap",
        strategy: "execute_swap",
        status: "SIMULATION_PASSED",
        constraintViolations: [],
        explanation: "Swap passed",
      },
    ]);
    expect(result).toContain("passed");
  });
});
