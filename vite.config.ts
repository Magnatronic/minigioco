import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages under https://magnatronic.github.io/minigioco/
  base: '/minigioco/',
  server: {
    port: 5173,
    host: true
  },
  preview: { port: 5173 }
});
