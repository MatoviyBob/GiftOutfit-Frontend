import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [
      react(),
      tailwindcss(),
      // mkcert is only useful in dev (generates local HTTPS certs)
      ...(isProd ? [] : [mkcert()]),
    ],
    base: '/', // server deployment at root
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: ['70eac4e25dcc.ngrok-free.app', 'crybaby.jetpump.org'],
      // Exposes your dev server and makes it accessible for devices on the same network.
      host: true,
    },
    // Production build hardening:
    //   - `drop: ['debugger']` removes leftover `debugger;` statements
    //   - `pure: ['console.log', ...]` lets esbuild eliminate diagnostic logs
    //     whose return value is unused, but keeps `console.warn` /
    //     `console.error` for real error reporting. Be deliberate about which
    //     ones you keep — anything calling `console.log` will be stripped.
    esbuild: isProd
      ? {
          drop: ['debugger'],
          pure: ['console.log', 'console.info', 'console.debug'],
          legalComments: 'none',
        }
      : undefined,
    build: {
      sourcemap: false,
    },
  }
})
