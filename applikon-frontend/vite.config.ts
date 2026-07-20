import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // Threads, not the default forks. Each fork resolves externalized CJS deps natively and
    // on its own, and that interop intermittently lost named exports ("does not provide an
    // export named 'parse'/'getConfig'" from cookie / @testing-library/dom) — which file hit
    // it varied per run. Threads share one process's resolution, so the suite is stable.
    pool: 'threads',
  },
})
