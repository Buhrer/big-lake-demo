import { descreverQuando, type DataISO } from '../../dominio/datas'
import type { FiltroHistorico, PaginaHistorico } from '../../compartilhado/contrato'
import type { Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { paginar } from './historico'

export type AcaoAuditoria = 'criar' | 'alterar' | 'excluir' | 'desfazer' | 'sistema'

export interface RegistroAuditoria {
  modulo: string
  acao: AcaoAuditoria
  descricao: string
  entidade?: string
  entidadeId?: number
  antes?: unknown
  depois?: unknown
}

/** Grava uma linha no histórico. Chame DENTRO da mesma transação da alteração. */
export function auditar(db: Banco, relogio: Relogio, r: RegistroAuditoria): void {
  db.prepare(
    `INSERT INTO auditoria (data_hora, modulo, acao, entidade, entidade_id, descricao, antes_json, depois_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    relogio.agora(),
    r.modulo,
    r.acao,
    r.entidade ?? null,
    r.entidadeId ?? null,
    r.descricao,
    r.antes === undefined ? null : JSON.stringify(r.antes),
    r.depois === undefined ? null : JSON.stringify(r.depois)
  )
}

export interface LinhaHistorico {
  id: number
  quando: string
  descricao: string
}

interface LinhaAuditoria {
  id: number
  data_hora: string
  descricao: string
}

const paraLinha = (hoje: DataISO) => (l: LinhaAuditoria) => ({
  id: l.id,
  quando: descreverQuando(l.data_hora, hoje),
  descricao: l.descricao
})

export function listarHistorico(db: Banco, hoje: DataISO, limite = 200): LinhaHistorico[] {
  const linhas = db
    .prepare(
      'SELECT id, data_hora, descricao FROM auditoria ORDER BY data_hora DESC, id DESC LIMIT ?'
    )
    .all(limite) as unknown as LinhaAuditoria[]
  return linhas.map(paraLinha(hoje))
}

/** Configurações › Histórico: últimos ou de um mês, com "Ver mais" (D-085). */
export function paginaDoHistorico(
  db: Banco,
  hoje: DataISO,
  filtro: FiltroHistorico
): PaginaHistorico<LinhaHistorico> {
  const p = paginar<LinhaAuditoria>(
    db,
    {
      select: 'SELECT id, data_hora, descricao FROM auditoria',
      data: 'data_hora',
      ordem: 'data_hora DESC, id DESC'
    },
    filtro
  )
  return { itens: p.linhas.map(paraLinha(hoje)), total: p.total, meses: p.meses }
}
