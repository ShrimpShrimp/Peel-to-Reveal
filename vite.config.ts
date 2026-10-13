import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.endsWith('/geometry/treeSlices.ts')) return 'tree-geometry';
        },
      },
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        courtyard: fileURLToPath(new URL('./courtyard-study.html', import.meta.url)),
        tree: fileURLToPath(new URL('./tree.html', import.meta.url)),
      },
    },
  },
});
