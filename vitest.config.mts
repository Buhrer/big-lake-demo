import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'testes/integracao/**/*.test.ts'],
    coverage: {
      include: ['src/dominio/**/*.ts'],
      exclude: ['src/dominio/**/*.test.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
})
