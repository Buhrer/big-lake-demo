// Só para "npm run exemplo": roda o gerador de dados de exemplo (fora do "npm run teste").
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
    include: ['testes/exemplo/dados-exemplo.ts'],
    testTimeout: 600_000
  }
})
