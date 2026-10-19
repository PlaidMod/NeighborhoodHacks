import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['web/**', 'node_modules/**'],
    setupFiles: ['tests/setup/no-network.ts'],
    environment: 'node',
    // Run in UTC so time-zone tests prove Chicago time comes from the code, not the machine.
    env: { TZ: 'UTC' },
  },
})
