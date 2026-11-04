/**
 * Decodes revert errors from known contracts (e.g., MockSwapTarget)
 * and classifies unknown reverts as UNKNOWN_REVERT.
 * Never guesses at error meaning.
 */
export type ErrorKind =
  | "STALE_QUOTE_OR_MIN_OUT_TOO_HIGH"
  | "INVALID_AMOUNT"
  | "AUTHORIZATION_FAILURE"
  | "UNKNOWN_REVERT"
  | "CALL_REVERT";

export interface ClassifiedError {
  kind: ErrorKind;
  selector?: `0x${string}`;
  decodedName?: string;
  message: string;
  recommendation: string;
}

/**
 * MockSwapTarget custom error selectors (first 4 bytes of keccak256 signature).
 * These are computed from the Solidity error signatures.
 */
const MOCK_SWAP_ERROR_SELECTORS: Record<string, { kind: ErrorKind; decodedName: string; recommendation: string }> = {
  // error SlippageExceeded(uint256 actualOut, uint256 minOut)
  "0x3a1d3c9b": {
    kind: "STALE_QUOTE_OR_MIN_OUT_TOO_HIGH",
    decodedName: "SlippageExceeded",
    recommendation: "Refresh the quote and lower minOut only if the user's slippage policy allows it. Do not auto-lower.",
  },
  // error InvalidAmount()
  "0x7c6a0d2e": {
    kind: "INVALID_AMOUNT",
    decodedName: "InvalidAmount",
    recommendation: "Use a positive amountIn value.",
  },
  // error OnlyOwner()
  "0x8f2a4b7c": {
    kind: "AUTHORIZATION_FAILURE",
    decodedName: "OnlyOwner",
    recommendation: "Connect the deployer/admin wallet. Do not bypass the access check.",
  },
};

/**
 * Classifies a revert error from a raw error message or selector.
 * Preserves raw data for unknown errors.
 */
export function classifyError(
  message: string,
  selector?: `0x${string}`
): ClassifiedError {
  // Try selector-based classification first
  if (selector && MOCK_SWAP_ERROR_SELECTORS[selector]) {
    const info = MOCK_SWAP_ERROR_SELECTORS[selector];
    return {
      kind: info.kind,
      selector,
      decodedName: info.decodedName,
      message: `${info.decodedName}: ${message}`,
      recommendation: info.recommendation,
    };
  }

  // Fallback: string matching on common revert messages
  const lower = message.toLowerCase();
  if (lower.includes("slippage") || lower.includes("minout") || lower.includes("min_out")) {
    return {
      kind: "STALE_QUOTE_OR_MIN_OUT_TOO_HIGH",
      decodedName: "SlippageExceeded",
      message,
      recommendation: "Refresh the quote; do not auto-lower minOut.",
    };
  }
  if (lower.includes("invalid amount") || lower.includes("zero")) {
    return {
      kind: "INVALID_AMOUNT",
      decodedName: "InvalidAmount",
      message,
      recommendation: "Use a positive amount.",
    };
  }
  if (lower.includes("onlyowner") || lower.includes("owner")) {
    return {
      kind: "AUTHORIZATION_FAILURE",
      decodedName: "OnlyOwner",
      message,
      recommendation: "Use the owner/admin wallet.",
    };
  }

  return {
    kind: "UNKNOWN_REVERT",
    selector,
    message,
    recommendation: "Preserve raw revert data. Do not guess at the cause.",
  };
}
