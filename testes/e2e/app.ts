import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'

export interface Pastas {
  dados: string
  copias: string
  /** Pasta que faz o papel do pen drive ('' = sem pen drive). */
  penDrive: string
}

export interface AppAberto {
  app: ElectronApplication
  pagina: Page
  pastas: Pastas
}

export function pastasNovas(comPenDrive = true): Pastas {
  const raiz = mkdtempSync(join(tmpdir(), 'biglake-e2e-'))
  return {
    dados: join(raiz, 'dados'),
    copias: join(raiz, 'Documentos', 'BigLake', 'Backups'),
    penDrive: comPenDrive ? mkdtempSync(join(tmpdir(), 'biglake-pen-')) : ''
  }
}

/**
 * Abre o programa já construído (out/), com data fixa e pastas temporárias:
 * os testes nunca tocam no banco nem nas cópias de verdade.
 */
export async function abrirApp(
  largura = 1366,
  altura = 768,
  pastas: Pastas = pastasNovas(),
  hoje = '16/10/2026'
): Promise<AppAberto> {
  // O VS Code define ELECTRON_RUN_AS_NODE, que faria o Electron abrir como Node puro.
  const ambiente = { ...process.env }
  delete ambiente.ELECTRON_RUN_AS_NODE
  const app = await electron.launch({
    args: ['.'],
    env: {
      ...ambiente,
      BIGLAKE_E2E: '1',
      BIGLAKE_HOJE: hoje,
      BIGLAKE_DADOS: pastas.dados,
      BIGLAKE_COPIAS: pastas.copias,
      BIGLAKE_PENDRIVE: pastas.penDrive
    } as Record<string, string>
  })
  const pagina = await app.firstWindow()
  await definirTamanho(app, largura, altura)
  await pagina.waitForSelector('nav[aria-label="Menu principal"]')
  return { app, pagina, pastas }
}

/** Muda a área útil da janela (equivale à tela do computador). */
export async function definirTamanho(app: ElectronApplication, largura: number, altura: number) {
  await app.evaluate(
    ({ BrowserWindow }, [l, a]) => {
      const janela = BrowserWindow.getAllWindows()[0]
      janela?.setMinimumSize(800, 600)
      janela?.setContentSize(l as number, a as number)
    },
    [largura, altura]
  )
}

/** true se a página tem barra de rolagem horizontal. */
export async function temRolagemHorizontal(pagina: Page): Promise<boolean> {
  return pagina.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
}

export async function definirEscala(pagina: Page, escala: number) {
  // Usa os botões de verdade: desce até 80% e sobe de 10 em 10.
  const menos = pagina.getByRole('button', { name: 'Diminuir a letra' })
  const mais = pagina.getByRole('button', { name: 'Aumentar a letra' })
  while (await menos.isEnabled()) await menos.click()
  const cliques = (escala - 80) / 10
  for (let i = 0; i < cliques; i++) await mais.click()
}

export async function irPara(pagina: Page, hash: string) {
  await pagina.evaluate((h) => (location.hash = h), hash)
}
