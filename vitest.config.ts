import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }, dedupe: ["react", "react-dom"] },
  test: { environment: "jsdom", include: ["tests/**/*.test.tsx"], testTimeout: 30000, hookTimeout: 30000, fileParallelism: false, css: false },
});
