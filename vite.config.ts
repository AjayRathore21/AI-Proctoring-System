import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

// HTTPS needed for phone testing (getUserMedia requires secure context).
// npm run dev:phone sets VITE_DEV_HTTPS=1 to enable it.
const useHttps = process.env.VITE_DEV_HTTPS === "1";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  server: useHttps
    ? { https: true, host: true }
    : undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split Firebase, React, and app code into separate chunks for better
    // browser caching. Firebase rarely changes between deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
