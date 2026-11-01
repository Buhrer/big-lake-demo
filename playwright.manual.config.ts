// Só para gerar o manual do Carlos ("npm run manual"); fora do "npm run verificar".
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './testes/manual',
  timeout: 240_000,
  workers: 1,
  reporter: [['list']]
})
