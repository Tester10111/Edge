// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // proxy any /api/* to the Apps Script web app
      '/api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbztnp4_OpbKX01PJ6PWXcBSlnG8titrAgyVAhIOr4QT2MubMHjiv6LB-d-4uwCGE9ZH/exec'),
        // If using https and TLS problems, you may need secure: false
        // secure: false,
      },
    },
  },
});