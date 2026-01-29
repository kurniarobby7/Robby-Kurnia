
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    port: 3000
  },
  // Define process.env secara spesifik untuk API_KEY guna menghindari error 'process is not defined'
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
