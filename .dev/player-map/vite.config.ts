import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { debugNotesPlugin } from './scripts/debug-notes-plugin.ts';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [react(), debugNotesPlugin(root)],
  resolve: {
    alias: {
      '#debug-notes': fileURLToPath(new URL(
        command === 'serve' ? './src/debug/DebugNotesSlot.dev.tsx' : './src/debug/DebugNotesSlot.tsx',
        import.meta.url,
      )),
    },
  },
  build: {
    sourcemap: true,
    // MapLibre is a single large module (~1.06MB minified) and cannot be split further.
    // Vendor grouping below keeps app/react/gsap under the default; this limit only
    // covers MapLibre itself so the full build stays quiet.
    chunkSizeWarningLimit: 1100,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'maplibre',
              test: /node_modules[\\/]maplibre-gl[\\/]/,
              priority: 30,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 20,
            },
            {
              name: 'gsap',
              test: /node_modules[\\/](gsap|@gsap)[\\/]/,
              priority: 20,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
}));
