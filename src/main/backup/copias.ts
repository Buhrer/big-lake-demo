import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { backup, DatabaseSync } from 'node:sqlite'
import type { DataHoraISO, DataISO } from '../../dominio/datas'
import {
  compararCopiasMaisNovaPrimeiro,
  copiasParaApagar,
  dataHoraDoNome,
  nomeArquivoCopia
} from '../../dominio/sistema'
import { bancoIntegro, type Banco } from '../banco/conexao'

export interface ArquivoDeCopia {
  caminho: string
  dataHora: DataHoraISO
  tamanhoBytes: number
}

/** true se o arquivo é um banco SQLite íntegro. */
export function arquivoIntegro(caminho: string): boolean {
  let db: DatabaseSync | null = null
  try {
    db = new DatabaseSync(caminho, { readOnly: true })
    return bancoIntegro(db)
  } catch {
    return false
  } finally {
    db?.close()
  }
}

/**
 * Copia o banco aberto para a pasta, sem parar o sistema (API de backup do SQLite).
 * Grava primeiro como ".parcial", confere a integridade e só então dá o nome final:
 * uma cópia interrompida nunca parece uma cópia boa.
 */
export async function copiarBanco(db: Banco, pasta: string, agora: DataHoraISO): Promise<string> {
  await mkdir(pasta, { recursive: true })
  let numero = 1
  while (existsSync(join(pasta, nomeArquivoCopia(agora, numero)))) numero++
  const final = join(pasta, nomeArquivoCopia(agora, numero))
  const parcial = `${final}.parcial`
  await rm(parcial, { force: true })
  try {
    await backup(db, parcial)
    // A cópia herda o modo WAL; volta para o modo normal para ser um arquivo único
    // (sem -wal/-shm ao lado), que dá para levar no pen drive e restaurar sozinho.
    const copia = new DatabaseSync(parcial)
    try {
      copia.exec('PRAGMA journal_mode = DELETE')
    } finally {
      copia.close()
    }
    if (!arquivoIntegro(parcial)) throw new Error('A cópia ficou com defeito e foi descartada.')
    await renomearComPaciencia(parcial, final)
    return final
  } finally {
    // deu certo: já não existe; deu errado: não deixa lixo ao lado das cópias boas
    await rm(parcial, { force: true }).catch(() => {})
    await rm(`${parcial}-journal`, { force: true }).catch(() => {})
  }
}

/**
 * No Windows, o antivírus examina cada arquivo novo e o prende por alguns instantes;
 * renomear nesse momento dá EPERM/EBUSY. Tenta de novo algumas vezes antes de desistir.
 */
async function renomearComPaciencia(de: string, para: string): Promise<void> {
  for (let tentativa = 1; ; tentativa++) {
    try {
      await rename(de, para)
      return
    } catch (erro) {
      const codigo = (erro as NodeJS.ErrnoException).code
      if (tentativa >= 10 || (codigo !== 'EPERM' && codigo !== 'EBUSY' && codigo !== 'EACCES')) {
        throw erro
      }
      await new Promise((r) => setTimeout(r, 100 * tentativa))
    }
  }
}

/**
 * Ordem da mais nova para a mais antiga. O nome do arquivo já traz data, hora e o
 * sufixo _2, _3 das cópias do mesmo segundo, então ele desempata.
 */
export function maisNovaPrimeiro(a: ArquivoDeCopia, b: ArquivoDeCopia): number {
  return compararCopiasMaisNovaPrimeiro(basename(a.caminho), basename(b.caminho))
}

export async function listarCopias(pasta: string): Promise<ArquivoDeCopia[]> {
  if (!existsSync(pasta)) return []
  const nomes = await readdir(pasta)
  const copias: ArquivoDeCopia[] = []
  for (const nome of nomes) {
    const dataHora = dataHoraDoNome(nome)
    if (!dataHora) continue
    const caminho = join(pasta, nome)
    copias.push({ caminho, dataHora, tamanhoBytes: (await stat(caminho)).size })
  }
  return copias.sort(maisNovaPrimeiro)
}

/** Apaga as cópias que não precisam mais ficar (D-094). */
export async function aplicarRetencao(pasta: string, hoje: DataISO): Promise<void> {
  if (!existsSync(pasta)) return
  for (const nome of copiasParaApagar(await readdir(pasta), hoje)) {
    await rm(join(pasta, nome), { force: true })
  }
}

/**
 * Raiz do pen drive conectado (ex.: "E:\"), ou null.
 * BIGLAKE_PENDRIVE simula nos testes (vazio = sem pen drive).
 */
export function detectarPenDrive(): Promise<string | null> {
  const simulado = process.env.BIGLAKE_PENDRIVE
  if (simulado !== undefined) return Promise.resolve(simulado || null)
  if (process.platform !== 'win32') return Promise.resolve(null)
  return new Promise((resolver) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=2').DeviceID"
      ],
      { timeout: 5000, windowsHide: true },
      (erro, saida) => {
        if (erro) return resolver(null)
        const unidade = saida
          .split(/\r?\n/)
          .map((l) => l.trim())
          .find((l) => /^[A-Z]:$/.test(l))
        resolver(unidade ? `${unidade}\\` : null)
      }
    )
  })
}

export function pastaNoPenDrive(raiz: string): string {
  return join(raiz, 'BigLake-Backups')
}
