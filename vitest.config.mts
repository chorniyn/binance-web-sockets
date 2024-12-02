import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "json-summary"]
    },
    reporters: ["default", "html"],
    include: ['**/*.{test,spec}.?(c|m)[t]s?(x)'],
    clearMocks: true
  },
});
