import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

function copyLegacyRuntime(): Plugin {
  return {
    name: "copy-legacy-dental-runtime",
    closeBundle() {
      for (const directory of ["assets", "js"]) {
        cpSync(
          resolve(projectRoot, directory),
          resolve(projectRoot, "dist", directory),
          { recursive: true },
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyLegacyRuntime()],
  server: { host: "127.0.0.1" },
});
