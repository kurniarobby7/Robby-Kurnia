
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  define: {
    // Memastikan process.env tersedia di browser saat development
    'process.env': {
      API_KEY: JSON.stringify(process.env.VITE_API_KEY || "")
    }
  }
});
