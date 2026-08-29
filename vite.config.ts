import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/room-designer/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
