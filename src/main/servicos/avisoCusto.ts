// Aviso "O custo subiu" (R5, D-046): fica até alguém tocar em "Entendi".
import type { AvisoCusto } from '../../compartilhado/contrato'
import { aumentoPercentual, rotuloUnidade, type Unidade } from '../../dominio/estoque'
import type { Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { listarReceitas, receitasQueUsam } from './receitas'

interface Aumento {
  item_id: number
  nome: string
  unidade: Unidade
  nome_unidade: string | null
  custo_atual: number
  primeiro_antes: number
  ultimo_em: string
}

/** Um aviso por insumo com aumento ainda não visto: do custo antes do 1º aumento até o de agora. */
export function listarAvisosDeCusto(db: Banco): AvisoCusto[] {
  const aumentos = db
    .prepare(
      `SELECT h.item_id, i.nome, i.unidade, i.nome_unidade, i.custo_unitario_x10000 AS custo_atual,
         (SELECT h2.custo_antes_x10000 FROM historico_custo h2
          WHERE h2.item_id = h.item_id AND h2.visto_em IS NULL AND h2.origem IN ('entrada', 'edicao')
            AND h2.custo_depois_x10000 > h2.custo_antes_x10000
          ORDER BY h2.data_hora, h2.id LIMIT 1) AS primeiro_antes,
         max(h.data_hora) AS ultimo_em
       FROM historico_custo h JOIN item_estoque i ON i.id = h.item_id AND i.excluido_em IS NULL
       WHERE h.visto_em IS NULL AND h.origem IN ('entrada', 'edicao')
         AND h.custo_depois_x10000 > h.custo_antes_x10000
       GROUP BY h.item_id
       ORDER BY ultimo_em DESC`
    )
    .all() as unknown as Aumento[]

  const agora = new Map(listarReceitas(db).map((r) => [r.id, r]))
  return aumentos
    .filter((a) => a.custo_atual > a.primeiro_antes)
    .map((a) => {
      const antes = new Map(
        listarReceitas(db, { itemId: a.item_id, custo: a.primeiro_antes }).map((r) => [r.id, r])
      )
      return {
        itemId: a.item_id,
        nome: a.nome,
        rotulo: rotuloUnidade(a.unidade, a.nome_unidade),
        unidade: a.unidade,
        quando: a.ultimo_em.slice(0, 10),
        custoAntes: a.primeiro_antes,
        custoAgora: a.custo_atual,
        aumento: aumentoPercentual(a.primeiro_antes, a.custo_atual) ?? 0,
        receitas: receitasQueUsam(db, a.item_id)
          .map(({ id }) => ({ antes: antes.get(id), agora: agora.get(id) }))
          .filter((r) => r.antes && r.agora)
          .map(({ antes: rA, agora: rG }) => ({
            id: rG!.id,
            nome: rG!.nome,
            categoriaNome: rG!.categoriaNome,
            custoAntes: rA!.custoDeCada,
            custoAgora: rG!.custoDeCada,
            lucroAntes: rA!.balcao.lucroDeCada,
            lucroAgora: rG!.balcao.lucroDeCada
          }))
      }
    })
}

/** "Entendi": o aviso deste insumo some (até o próximo aumento). */
export function entenderAvisoDeCusto(db: Banco, relogio: Relogio, itemId: number): void {
  db.prepare(`UPDATE historico_custo SET visto_em = ? WHERE item_id = ? AND visto_em IS NULL`).run(
    relogio.agora(),
    itemId
  )
}
