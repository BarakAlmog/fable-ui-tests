import { defineConfig } from "vite";

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
// so assets must be referenced from "/<repo>/". The deploy workflow sets
// VITE_BASE to "/<repo-name>/" automatically; locally it falls back to "/".
export default defineConfig({
  base: process.env.VITE_BASE || "/",
});
