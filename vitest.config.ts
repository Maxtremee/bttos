import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "happy-dom",
      reporter: ["verbose"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", ".claude/**"],
    },
  }),
);
