import type { Banco } from './conexao'
import m0001 from './migracoes/0001_base.sql?raw'
import m0002 from './migracoes/0002_cadastros.sql?raw'
import m0003 from './migracoes/0003_estoque.sql?raw'
import m0004 from './migracoes/0004_receitas.sql?raw'
import m0005 from './migracoes/0005_produtos.sql?raw'
import m0006 from './migracoes/0006_vendas.sql?raw'
import m0007 from './migracoes/0007_contas_socios.sql?raw'
import m0008 from './migracoes/0008_categorias_iniciais.sql?raw'
import m0009 from './migracoes/0009_producao.sql?raw'
import m0010 from './migracoes/0010_perdas.sql?raw'
import m0011 from './migracoes/0011_patrimonio.sql?raw'
import m0012 from './migracoes/0012_gordurinha.sql?raw'

export interface Migracao {
  versao: number
  sql: string
}

/** Todas as migrações, em ordem. Nunca editar uma migração já entregue: crie outra. */
export const MIGRACOES: Migracao[] = [
  { versao: 1, sql: m0001 },
  { versao: 2, sql: m0002 },
  { versao: 3, sql: m0003 },
  { versao: 4, sql: m0004 },
  { versao: 5, sql: m0005 },
  { versao: 6, sql: m0006 },
  { versao: 7, sql: m0007 },
  { versao: 8, sql: m0008 },
  { versao: 9, sql: m0009 },
  { versao: 10, sql: m0010 },
  { versao: 11, sql: m0011 },
  { versao: 12, sql: m0012 }
]

export function versaoDoBanco(db: Banco): number {
  const linha = db.prepare('PRAGMA user_version').get() as { user_version: number }
  return linha.user_version
}

/**
 * Aplica as migrações pendentes, cada uma numa transação.
 * `antesDeMigrar` (a cópia de segurança) só roda quando há algo a aplicar
 * e o banco já tinha dados (versão > 0).
 */
export async function migrar(
  db: Banco,
  antesDeMigrar: () => Promise<void>,
  migracoes: Migracao[] = MIGRACOES
): Promise<{ de: number; para: number }> {
  const de = versaoDoBanco(db)
  const pendentes = migracoes.filter((m) => m.versao > de).sort((a, b) => a.versao - b.versao)
  if (pendentes.length === 0) return { de, para: de }
  if (de > 0) await antesDeMigrar()
  for (const m of pendentes) {
    db.exec('BEGIN IMMEDIATE')
    try {
      db.exec(m.sql)
      db.exec(`PRAGMA user_version = ${m.versao}`)
      db.exec('COMMIT')
    } catch (erro) {
      db.exec('ROLLBACK')
      throw new Error(`Falha na migração ${m.versao}: ${(erro as Error).message}`)
    }
  }
  return { de, para: versaoDoBanco(db) }
}

/** O banco foi criado por uma versão mais nova do programa? (não dá para abrir com esta) */
export function bancoMaisNovoQueOPrograma(db: Banco, migracoes: Migracao[] = MIGRACOES): boolean {
  return versaoDoBanco(db) > Math.max(0, ...migracoes.map((m) => m.versao))
}
