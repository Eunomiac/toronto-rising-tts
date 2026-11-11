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
  build: { sourcemap: true },
}));
