import { describe, it, expect } from "vitest";
import { classifyError, type ClassifiedError } from "./error-classifier";

describe("error-classifier", () => {
  it("classifies SlippageExceeded by selector", () => {
    // error SlippageExceeded(uint256 actualOut, uint256 minOut)
    const result = classifyError(
      "execution reverted: SlippageExceeded",
      "0x3a1d3c9b"
    );
    expect(result.kind).toBe("STALE_QUOTE_OR_MIN_OUT_TOO_HIGH");
    expect(result.decodedName).toBe("SlippageExceeded");
    expect(result.recommendation).toContain("Refresh the quote");
    expect(result.recommendation).toContain("Do not auto-lower");
  });

  it("classifies InvalidAmount by selector", () => {
    const result = classifyError(
      "execution reverted: InvalidAmount",
      "0x7c6a0d2e"
    );
    expect(result.kind).toBe("INVALID_AMOUNT");
    expect(result.decodedName).toBe("InvalidAmount");
  });

  it("classifies OnlyOwner by selector", () => {
    const result = classifyError(
      "execution reverted: OnlyOwner",
      "0x8f2a4b7c"
    );
    expect(result.kind).toBe("AUTHORIZATION_FAILURE");
    expect(result.decodedName).toBe("OnlyOwner");
  });

  it("classifies unknown revert as UNKNOWN_REVERT", () => {
    const result = classifyError("execution reverted: CustomError(0x1234)", "0xdeadbeef");
    expect(result.kind).toBe("UNKNOWN_REVERT");
    expect(result.decodedName).toBeUndefined();
    expect(result.recommendation).toContain("Do not guess");
  });

  it("classifies unknown revert without selector", () => {
    const result = classifyError("execution reverted: something went wrong");
    expect(result.kind).toBe("UNKNOWN_REVERT");
    expect(result.selector).toBeUndefined();
  });

  it("classifies slippage by string match", () => {
    const result = classifyError("execution reverted: slippage check failed");
    expect(result.kind).toBe("STALE_QUOTE_OR_MIN_OUT_TOO_HIGH");
  });

  it("preserves raw message in unknown revert", () => {
    const msg = "execution reverted: CustomError: 0x12345678";
    const result = classifyError(msg);
    expect(result.message).toBe(msg);
  });
});
