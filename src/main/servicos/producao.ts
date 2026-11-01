// Registrar produção: baixa o estoque e anota o que foi feito (docs/03 R7; D-032 p.31 a 33; D-065).
import { z } from 'zod'
import type { DadosProducao, Producao } from '../../compartilhado/contrato'
import { centavos } from '../../dominio/dinheiro'
import { formatarData } from '../../dominio/datas'
import {
  custoDaProducao,
  planejarProducao,
  textoDasReceitas,
  unidadesPrevistas,
  type ItemParaPlanejar
} from '../../dominio/producao'
import { pluralizar } from '../../dominio/receita'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { baixarDoEstoque, devolverAoEstoque, listarItens } from './estoque'
import { listarReceitas, obterReceita } from './receitas'

const esquema = z.object({
  receitaId: z.number().int().positive({ message: 'Escolha a receita.' }),
  vezes: z
    .number()
    .int()
    .positive({ message: 'Digite quantas receitas fez.' })
    .max(100_000, 'Confira quantas receitas fez.'),
  unidadesFeitas: z
    .number()
    .int()
    .min(0, 'Digite quantas saíram.')
    .max(1_000_000, 'Confira quantas saíram.')
})

interface Linha {
  id: number
  data: string
  receita_id: number
  nome_receita: string
  nome_unidade: string | null
  vezes_x1000: number
  unidades_previstas: number
  unidades_feitas: number
  custo_total_centavos: number
}

const SELECT = `SELECT p.id, p.data, p.receita_id, p.nome_receita, c.nome_unidade, p.vezes_x1000,
  p.unidades_previstas, p.unidades_feitas, p.custo_total_centavos
  FROM producao p JOIN receita r ON r.id = p.receita_id LEFT JOIN categoria c ON c.id = r.categoria_id`

function deLinha(l: Linha): Producao {
  return {
    id: l.id,
    data: l.data,
    receitaId: l.receita_id,
    nomeReceita: l.nome_receita,
    nomeUnidade: l.nome_unidade ?? '',
    vezes: l.vezes_x1000,
    unidadesPrevistas: l.unidades_previstas,
    unidadesFeitas: l.unidades_feitas,
    custoTotal: centavos(l.custo_total_centavos)
  }
}

export function listarProducoes(db: Banco, anoMes: string): Producao[] {
  return (
    db
      .prepare(
        `${SELECT} WHERE p.excluido_em IS NULL AND substr(p.data, 1, 7) = ? ORDER BY p.data DESC, p.id DESC`
      )
      .all(anoMes) as unknown as Linha[]
  ).map(deLinha)
}

function obterProducao(db: Banco, id: number): Producao | null {
  const l = db.prepare(`${SELECT} WHERE p.id = ?`).get(id) as Linha | undefined
  return l ? deLinha(l) : null
}

/** "100 paletas" · "1 paleta" */
function unidades(n: number, nomeUnidade: string): string {
  if (!nomeUnidade) return `${n} un`
  return `${n} ${n === 1 ? nomeUnidade : pluralizar(nomeUnidade)}`
}

function baixarItensDa(db: Banco, agora: string, producaoId: number): void {
  const itens = db
    .prepare('SELECT item_id, quantidade_x1000 FROM producao_item WHERE producao_id = ?')
    .all(producaoId) as { item_id: number; quantidade_x1000: number }[]
  for (const i of itens) {
    baixarDoEstoque(db, agora, i.item_id, i.quantidade_x1000, 'producao', producaoId)
  }
}

/** Registra a produção de hoje e baixa do estoque (pode ficar negativo, p.31). */
export function registrarProducao(db: Banco, relogio: Relogio, entrada: DadosProducao): Producao {
  const d = esquema.parse(entrada)
  return emTransacao(db, () => {
    const receita = obterReceita(db, d.receitaId)
    if (!receita) throw new Error('Escolha a receita.')
    const resumo = listarReceitas(db).find((r) => r.id === d.receitaId)!
    const itens = new Map<number, ItemParaPlanejar>(
      listarItens(db).map((i) => [
        i.id,
        { nome: i.nome, rotulo: i.rotulo, quantidade: i.quantidade, custo: i.custo }
      ])
    )
    const plano = planejarProducao(receita, d.vezes, itens)
    const previstas = unidadesPrevistas(receita.rendimento, d.vezes)
    const agora = relogio.agora()
    const r = db
      .prepare(
        `INSERT INTO producao (data, receita_id, nome_receita, vezes_x1000, unidades_previstas,
           unidades_feitas, custo_de_cada_x10000, custo_total_centavos, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        relogio.hoje(),
        receita.id,
        receita.nome,
        d.vezes,
        previstas,
        d.unidadesFeitas,
        resumo.custoDeCada,
        custoDaProducao(resumo.custoDeCada, previstas),
        agora
      )
    const id = Number(r.lastInsertRowid)
    for (const l of plano.linhas) {
      if (l.usa <= 0) continue
      db.prepare(
        'INSERT INTO producao_item (producao_id, item_id, quantidade_x1000) VALUES (?, ?, ?)'
      ).run(id, l.itemId, l.usa)
    }
    baixarItensDa(db, agora, id)
    const negativo = plano.faltas.map((f) => f.nome)
    const saiuDiferente = d.unidadesFeitas !== previstas ? ` (a receita previa ${previstas})` : ''
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'criar',
      entidade: 'producao',
      entidadeId: id,
      descricao:
        `Registrou a produção: ${textoDasReceitas(d.vezes)} de ${receita.nome}, ` +
        `${unidades(d.unidadesFeitas, receita.nomeUnidade)}${saiuDiferente}. ` +
        'Ingredientes e embalagens baixados do estoque' +
        (negativo.length ? `; ficou negativo: ${negativo.join(', ')}` : ''),
      depois: { ...d, itens: plano.linhas.map((l) => ({ itemId: l.itemId, usa: l.usa })) }
    })
    return obterProducao(db, id)!
  })
}

export function excluirProducao(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const p = obterProducao(db, id)
    if (!p) throw new Error('Produção não encontrada.')
    const agora = relogio.agora()
    db.prepare('UPDATE producao SET excluido_em = ? WHERE id = ? AND excluido_em IS NULL').run(
      agora,
      id
    )
    devolverAoEstoque(db, agora, 'producao', id)
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'excluir',
      entidade: 'producao',
      entidadeId: id,
      descricao: `Excluiu a produção de ${formatarData(p.data).slice(0, 5)} (${textoDasReceitas(p.vezes)} de ${p.nomeReceita}): os ingredientes e as embalagens voltaram para o estoque`
    })
  })
}

export function desfazerExclusaoProducao(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const p = db.prepare('SELECT excluido_em FROM producao WHERE id = ?').get(id) as
      { excluido_em: string | null } | undefined
    if (!p?.excluido_em) throw new Error('Não há exclusão para desfazer.')
    const agora = relogio.agora()
    db.prepare('UPDATE producao SET excluido_em = NULL WHERE id = ?').run(id)
    baixarItensDa(db, agora, id)
    const prod = obterProducao(db, id)!
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'desfazer',
      entidade: 'producao',
      entidadeId: id,
      descricao: `Desfez a exclusão da produção de ${formatarData(prod.data).slice(0, 5)} (${prod.nomeReceita}): baixou de novo do estoque`
    })
  })
}
