// Gera recursos/icone.png (512×512) a partir do logo do protótipo, desenhado no próprio app.
// Uso: npm run build && node scripts/gerar-icone.cjs
const { _electron } = require('@playwright/test')
const { mkdtempSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const svg = `<svg id="icone" xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#FFC93C" stroke="#2A1E10" stroke-width="2.5"/>
  <g transform="translate(8 4)">
    <path d="M12 24 L24 54 L36 24 Z" fill="#C68B3E" stroke="#2A1E10" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M16 31 L32 31 M19 39 L29 39" stroke="#2A1E10" stroke-width="2"/>
    <circle cx="24" cy="16" r="13" fill="#C62828" stroke="#2A1E10" stroke-width="2.5"/>
    <circle cx="19" cy="11" r="3" fill="#FFFFFF" opacity="0.7"/>
  </g>
</svg>`

;(async () => {
  const env = { ...process.env, BIGLAKE_E2E: '1', BIGLAKE_PENDRIVE: '' }
  delete env.ELECTRON_RUN_AS_NODE
  const raiz = mkdtempSync(join(tmpdir(), 'biglake-icone-'))
  env.BIGLAKE_DADOS = join(raiz, 'dados')
  env.BIGLAKE_COPIAS = join(raiz, 'copias')
  const app = await _electron.launch({ args: ['.'], env })
  const pagina = await app.firstWindow()
  await pagina.waitForSelector('nav')
  await pagina.evaluate((s) => {
    document.body.innerHTML = s
    document.body.style.background = 'transparent'
  }, svg)
  await pagina.locator('#icone').screenshot({ path: join(__dirname, '..', 'recursos', 'icone.png'), omitBackground: true })
  await app.close()
})()
