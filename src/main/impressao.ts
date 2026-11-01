// Impressão do comprovante e dos relatórios (D-057) e "Salvar em PDF" dos relatórios (D-071).
// Abre a página de impressão numa janela escondida, espera ela ficar pronta e chama a
// impressora direto (prévia no próprio programa, D-088). Nos testes (BIGLAKE_E2E), salva em PDF.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BrowserWindow } from 'electron'
import type { OpcoesImpressao } from '../compartilhado/contrato'

export type CarregarTela = (janela: BrowserWindow, hash: string) => Promise<void>

async function esperarPronta(janela: BrowserWindow): Promise<void> {
  for (let i = 0; i < 100; i++) {
    const pronta = await janela.webContents.executeJavaScript(
      'document.body.dataset.pronta === "1"'
    )
    if (pronta) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('A página de impressão não ficou pronta.')
}

/** Gera o PDF da página (A4), sem programa externo. */
export async function gerarPdf(
  carregar: CarregarTela,
  preload: string,
  hash: string
): Promise<Buffer> {
  const janela = new BrowserWindow({
    show: false,
    width: 800,
    height: 1100,
    webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false }
  })
  try {
    await carregar(janela, hash)
    await esperarPronta(janela)
    return await janela.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
  } finally {
    janela.destroy()
  }
}

/** Quantas folhas tem o PDF (para a prévia dizer "Vai imprimir 2 folhas"). */
export function contarFolhas(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 1
}

/** Nomes das impressoras instaladas no Windows. */
export async function listarImpressoras(janela: BrowserWindow): Promise<string[]> {
  return (await janela.webContents.getPrintersAsync()).map((p) => p.name)
}

/**
 * Imprime direto, sem a janela do Windows (D-088): a prévia e a escolha da impressora e das
 * cópias ficam no próprio programa. impressora null = a padrão do Windows.
 * Nos testes, salva o PDF e as opções escolhidas na pasta de testes.
 */
export async function imprimirPagina(
  carregar: CarregarTela,
  preload: string,
  hash: string,
  nomeDoArquivo: string,
  opcoes: OpcoesImpressao,
  pastaDeTeste: string | null
): Promise<void> {
  const janela = new BrowserWindow({
    show: false,
    width: 800,
    height: 1100,
    webPreferences: { preload, contextIsolation: true, sandbox: true, nodeIntegration: false }
  })
  try {
    await carregar(janela, hash)
    await esperarPronta(janela)
    if (pastaDeTeste) {
      mkdirSync(pastaDeTeste, { recursive: true })
      const pdf = await janela.webContents.printToPDF({ printBackground: true, pageSize: 'A4' })
      writeFileSync(join(pastaDeTeste, `${nomeDoArquivo}.pdf`), pdf)
      writeFileSync(join(pastaDeTeste, `${nomeDoArquivo}.json`), JSON.stringify(opcoes))
      return
    }
    await new Promise<void>((resolver, rejeitar) => {
      janela.webContents.print(
        {
          silent: true,
          printBackground: true,
          pageSize: 'A4',
          copies: opcoes.copias,
          ...(opcoes.impressora ? { deviceName: opcoes.impressora } : {})
        },
        (ok, motivo) => {
          if (ok) resolver()
          else rejeitar(new Error(`A impressora não aceitou a folha (${motivo}).`))
        }
      )
    })
  } finally {
    janela.destroy()
  }
}
