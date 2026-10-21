import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    unstubGlobals: true,
    restoreMocks: true,
    coverage: {
      include: ["src/**/*.ts"],
      // Entry files only wire the tested modules to Chrome.
      exclude: ["src/**/*.test.ts", "src/background/background.ts", "src/content/content.ts", "src/popup/popup.ts"],
    },
  },
});
