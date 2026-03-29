import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appBase = process.env.WEB_V2_BASE || '/app-v2/';

export default defineConfig({
  base: appBase,
  plugins: [react()],
  build: {
    commonjsOptions: {
      include: [/shared[\/]contracts/, /packages[\/]contracts-v2/, /node_modules/]
    }
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '..', '..')]
    }
  }
});
