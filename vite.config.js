import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base: the same build works at /, at /jarsar-ledger/ on GitHub Pages,
// and under `vite preview`. Safe because routing is hash-only.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
});
