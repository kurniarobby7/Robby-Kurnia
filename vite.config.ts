
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
  // Memastikan process.env.API_KEY selalu terdefinisi sebagai string agar tidak error di client side
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || "")
  }
});
