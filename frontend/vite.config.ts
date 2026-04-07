import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api/export": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
      },
      "/api/templates": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
      },
      "/api/pdf-templates/preview": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
