import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["experimental/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.claude/**"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
