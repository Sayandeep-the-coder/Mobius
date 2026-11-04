import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@mobius/chain-config": path.resolve(__dirname, "../../packages/chain-config/src/index.ts"),
      "@mobius/contracts-abi": path.resolve(__dirname, "../../packages/contracts-abi/src/index.ts"),
      "@mobius/simulation": path.resolve(__dirname, "../../packages/simulation/src/index.ts"),
      "@mobius/policies": path.resolve(__dirname, "../../packages/policies/src/index.ts"),
    },
  },
});
