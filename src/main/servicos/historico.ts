// Página dos históricos (balcão, pedidos e o que foi feito; D-085): "Últimos" ou um mês,
// os primeiros N, quantos existem e os meses que têm lançamento.
import { z } from 'zod'
import type { FiltroHistorico } from '../../compartilhado/contrato'
import type { Banco } from '../banco/conexao'

export const esquemaFiltroHistorico = z.object({
  anoMes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.')
    .nullable(),
  limite: z.number().int().min(1).max(100_000)
})

interface Consulta {
  /** "SELECT … FROM …", sem WHERE nem ORDER BY */
  select: string
  /** coluna da data no resultado do select ("data", "data_hora") */
  data: string
  /** ORDER BY com as colunas do resultado do select */
  ordem: string
}

export function paginar<L>(
  db: Banco,
  c: Consulta,
  filtroBruto: FiltroHistorico
): { linhas: L[]; total: number; meses: string[] } {
  const filtro = esquemaFiltroHistorico.parse(filtroBruto)
  const base = `FROM (${c.select})`
  const doMes = filtro.anoMes === null ? '' : `WHERE substr(${c.data}, 1, 7) = ?`
  const params = filtro.anoMes === null ? [] : [filtro.anoMes]
  const linhas = db
    .prepare(`SELECT * ${base} ${doMes} ORDER BY ${c.ordem} LIMIT ?`)
    .all(...params, filtro.limite) as unknown as L[]
  const { n } = db.prepare(`SELECT count(*) AS n ${base} ${doMes}`).get(...params) as { n: number }
  const meses = (
    db.prepare(`SELECT DISTINCT substr(${c.data}, 1, 7) AS m ${base} ORDER BY m DESC`).all() as {
      m: string
    }[]
  ).map((l) => l.m)
  return { linhas, total: n, meses }
}
