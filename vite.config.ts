import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Tailwind is configured via postcss.config.js and tailwind.config.js; no Vite plugin required

export default defineConfig({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
