import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use the same PORT for the Node API and the Vite proxy. This also makes
// `PORT=3004 npm run dev` work when port 3000 is already occupied.
const apiPort = process.env.PORT || '3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } }
  },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false }
});
