import { DatabaseSync } from 'node:sqlite'

export type Banco = DatabaseSync

/**
 * Abre o banco com as proteções contra queda de energia:
 * WAL + synchronous=FULL (cada transação confirmada já está no disco).
 */
export function abrirBanco(caminho: string): Banco {
  const db = new DatabaseSync(caminho)
  try {
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `)
  } catch (erro) {
    // Arquivo que não é um banco: fecha para não deixar o arquivo preso (Windows).
    db.close()
    throw erro
  }
  return db
}

/** Roda `fn` numa transação: ou grava tudo, ou nada. */
export function emTransacao<T>(db: Banco, fn: () => T): T {
  if (db.isTransaction) return fn()
  db.exec('BEGIN IMMEDIATE')
  try {
    const resultado = fn()
    db.exec('COMMIT')
    return resultado
  } catch (erro) {
    db.exec('ROLLBACK')
    throw erro
  }
}

/** true quando o arquivo do banco está íntegro. */
export function bancoIntegro(db: Banco): boolean {
  const linha = db.prepare('PRAGMA quick_check').get() as { quick_check?: string } | undefined
  return linha?.quick_check === 'ok'
}
