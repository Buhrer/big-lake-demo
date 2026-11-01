// Log de erros local, em arquivo que roda (até 3 arquivos de 1 MB). Sem dados de clientes.
import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TAMANHO_MAXIMO = 1024 * 1024
let pasta: string | null = null

export function configurarLog(pastaDeLogs: string): void {
  pasta = pastaDeLogs
  mkdirSync(pasta, { recursive: true })
}

function girar(arquivo: string): void {
  if (!existsSync(arquivo) || statSync(arquivo).size < TAMANHO_MAXIMO) return
  rmSync(`${arquivo}.2`, { force: true })
  if (existsSync(`${arquivo}.1`)) renameSync(`${arquivo}.1`, `${arquivo}.2`)
  renameSync(arquivo, `${arquivo}.1`)
}

export function registrarErro(onde: string, erro: unknown): void {
  const texto = erro instanceof Error ? `${erro.message}\n${erro.stack ?? ''}` : String(erro)
  const linha = `[${new Date().toISOString()}] ${onde}: ${texto}\n`
  if (!pasta) {
    console.error(linha)
    return
  }
  try {
    const arquivo = join(pasta, 'erros.log')
    girar(arquivo)
    appendFileSync(arquivo, linha, 'utf8')
  } catch {
    console.error(linha)
  }
}
