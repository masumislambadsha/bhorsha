import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globalSetup: ["./tests/globalSetup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 180_000,
    // One in-memory replica set is shared by every test file.
    fileParallelism: false,
    clearMocks: true,
  },
});
