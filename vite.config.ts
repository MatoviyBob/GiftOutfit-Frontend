import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), mkcert(),],
  base: '/GiftOutfit-Frontend/', // for github pages
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    allowedHosts: ['70eac4e25dcc.ngrok-free.app', 'crybaby.jetpump.org'],
    // Exposes your dev server and makes it accessible for the devices in the same network.
    host: true,
  },
})
