import { defineConfig } from 'vite';

// Relative base so the build works from any GitHub Pages sub-path
// (e.g. https://<user>.github.io/portfolio/) as well as a custom domain.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
