import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appBase = process.env.WEB_V2_BASE || '/app-v2/';

export default defineConfig({
  base: appBase,
  plugins: [react()],
  server: {
    port: 5173
  }
});
