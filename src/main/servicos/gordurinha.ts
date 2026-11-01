// Gordurinha (docs/03 R14, T9; D-032 p.34 e p.37; D-033 opções 35 e 36; D-071, D-074).
import { z } from 'zod'
import type { DadosGordurinha, Gordurinha } from '../../compartilhado/contrato'
import { mesAnterior } from '../../dominio/contas'
import { centavos, dividirArredondando, type Centavos } from '../../dominio/dinheiro'
import { formatarData, somarDias } from '../../dominio/datas'
import { formatarPercentual, formatarReais } from '../../dominio/formatar'
import {
  oQueComeu,
  precoReajustado,
  previsaoDoFim,
  reajusteSugerido,
  situacao,
  somaComida,
  textoMaisComeram,
  usoMedioPorMes,
  type ContaParaGordurinha,
  type InsumoParaGordurinha
} from '../../dominio/gordurinha'
import { resultadoDoMes } from '../../dominio/socios'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { listarItens } from './estoque'
import { listarCategorias } from './receitas'
import { contasParaOLucro, obterRegras, recebimentos } from './socios'

const esquema = z.object({
  base: z.number().int().positive({ message: 'Digite o lucro líquido base.' }).max(100_000_000_00),
  pct: z
    .number()
    .int()
    .min(1, 'Digite a porcentagem da gordurinha.')
    .max(10000, 'A porcentagem vai até 100%.'),
  desde: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Digite a data do último reajuste.')
    .optional()
})

interface Reajuste {
  id: number
  data: string
  base: Centavos
  pct: number
}

function atual(db: Banco): Reajuste | null {
  const l = db
    .prepare(
      'SELECT id, data, base_centavos, pct_x100 FROM gordurinha_reajuste ORDER BY id DESC LIMIT 1'
    )
    .get() as { id: number; data: string; base_centavos: number; pct_x100: number } | undefined
  return l ? { id: l.id, data: l.data, base: centavos(l.base_centavos), pct: l.pct_x100 } : null
}

// ---------- Insumos: custo no reajuste × agora, e uso médio por mês ----------

/** Uso de cada item nas produções dos últimos 12 meses ÷ meses com produção (opção 35). */
function usoPorMes(db: Banco, hoje: string): Map<number, number> {
  const desde = somarDias(hoje, -365)
  const linhas = db
    .prepare(
      `SELECT i.item_id, sum(i.quantidade_x1000) AS q, min(p.data) AS primeiro
       FROM producao_item i JOIN producao p ON p.id = i.producao_id
       WHERE p.excluido_em IS NULL AND p.data > ? AND p.data <= ?
       GROUP BY i.item_id`
    )
    .all(desde, hoje) as { item_id: number; q: number; primeiro: string }[]
  const primeiro = linhas.reduce<string | null>(
    (m, l) => (m === null || l.primeiro < m ? l.primeiro : m),
    null
  )
  if (!primeiro) return new Map()
  const [a1, m1] = primeiro.split('-').map(Number) as [number, number]
  const [a2, m2] = hoje.split('-').map(Number) as [number, number]
  const meses = Math.min(12, (a2 - a1) * 12 + (m2 - m1) + 1)
  return new Map(linhas.map((l) => [l.item_id, usoMedioPorMes(l.q, meses)]))
}

function insumos(db: Banco, r: Reajuste, hoje: string): InsumoParaGordurinha[] {
  const retrato = new Map(
    (
      db
        .prepare('SELECT item_id, custo_x10000 FROM gordurinha_retrato_item WHERE reajuste_id = ?')
        .all(r.id) as { item_id: number; custo_x10000: number }[]
    ).map((l) => [l.item_id, l.custo_x10000])
  )
  // item cadastrado depois do reajuste: parte do primeiro preço que teve
  const primeiroCusto = new Map(
    (
      db
        .prepare(
          `SELECT item_id, custo_depois_x10000 AS c FROM historico_custo h
           WHERE id = (SELECT min(id) FROM historico_custo WHERE item_id = h.item_id)`
        )
        .all() as { item_id: number; c: number }[]
    ).map((l) => [l.item_id, l.c])
  )
  const uso = usoPorMes(db, hoje)
  return listarItens(db).map((i) => ({
    nome: i.nome,
    rotulo: i.rotulo,
    antes: retrato.get(i.id) ?? primeiroCusto.get(i.id) ?? i.custo,
    agora: i.custo,
    usoPorMes: uso.get(i.id) ?? 0
  }))
}

// ---------- Contas fixas: séries de contas que repetem ----------

interface Serie {
  serieId: number
  nome: string
  tipo: string
  /** a conta mais nova da série */
  valor: Centavos
  /** a primeira conta da série */
  primeiro: Centavos
}

function series(db: Banco): Serie[] {
  const contas = db
    .prepare(
      `SELECT c.id, c.anterior_id, c.nome, c.valor_centavos, c.vencimento, c.repete, c.excluido_em,
         t.nome AS tipo, t.especial
       FROM conta_pagar c JOIN tipo_conta t ON t.id = c.tipo_id ORDER BY c.id`
    )
    .all() as {
    id: number
    anterior_id: number | null
    nome: string
    valor_centavos: number
    vencimento: string
    repete: number
    excluido_em: string | null
    tipo: string
    especial: string | null
  }[]
  const porId = new Map(contas.map((c) => [c.id, c]))
  const raiz = (id: number): number => {
    let c = porId.get(id)!
    while (c.anterior_id !== null && porId.has(c.anterior_id)) c = porId.get(c.anterior_id)!
    return c.id
  }
  const grupos = new Map<number, typeof contas>()
  for (const c of contas) {
    if (c.especial !== null) continue
    const r = raiz(c.id)
    grupos.set(r, [...(grupos.get(r) ?? []), c])
  }
  const lista: Serie[] = []
  for (const [serieId, g] of grupos) {
    if (!g.some((c) => c.repete === 1)) continue
    const vivas = g.filter((c) => c.excluido_em === null)
    if (vivas.length === 0) continue
    const nova = vivas.reduce((a, b) => (b.vencimento > a.vencimento ? b : a))
    lista.push({
      serieId,
      nome: nova.nome,
      tipo: nova.tipo,
      valor: centavos(nova.valor_centavos),
      primeiro: centavos(vivas[0]!.valor_centavos)
    })
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Sem escolha gravada, toda conta que repete entra, menos o aluguel (D-074). */
function marcadas(db: Banco, lista: readonly Serie[]): Map<number, boolean> {
  const gravadas = new Map(
    (
      db.prepare('SELECT serie_id, entra FROM gordurinha_conta').all() as {
        serie_id: number
        entra: number
      }[]
    ).map((l) => [l.serie_id, l.entra === 1])
  )
  return new Map(
    lista.map((s) => [s.serieId, gravadas.get(s.serieId) ?? s.tipo.toLowerCase() !== 'aluguel'])
  )
}

function contasFixas(db: Banco, r: Reajuste): ContaParaGordurinha[] {
  const retrato = new Map(
    (
      db
        .prepare(
          'SELECT serie_id, valor_centavos FROM gordurinha_retrato_conta WHERE reajuste_id = ?'
        )
        .all(r.id) as { serie_id: number; valor_centavos: number }[]
    ).map((l) => [l.serie_id, centavos(l.valor_centavos)])
  )
  const lista = series(db)
  const entra = marcadas(db, lista)
  return lista
    .filter((s) => entra.get(s.serieId))
    .map((s) => ({ nome: s.nome, antes: retrato.get(s.serieId) ?? s.primeiro, agora: s.valor }))
}

// ---------- Vendas e lucro dos meses ----------

/** Faturamento médio dos meses com venda nos 12 meses antes deste (sem nenhum, o deste mês). */
function faturamentoMedio(db: Banco, hoje: string): Centavos {
  const vendas = recebimentos(db)
  const contas = contasParaOLucro(db)
  const regras = obterRegras(db)
  const fat: number[] = []
  let m = hoje.slice(0, 7)
  for (let i = 0; i < 12; i++) {
    m = mesAnterior(m)
    const f = resultadoDoMes(m, vendas, contas, regras).faturamento
    if (f > 0) fat.push(f)
  }
  if (fat.length === 0) {
    return resultadoDoMes(hoje.slice(0, 7), vendas, contas, regras).faturamento
  }
  const soma = fat.reduce((t, v) => t + v, 0)
  return centavos(Number(dividirArredondando(BigInt(soma), BigInt(fat.length))))
}

/**
 * 12 meses completos de vendas antes deste: a base é a média do lucro líquido deles
 * (R14). null quando ainda não há 12 meses.
 */
function baseDos12Meses(db: Banco, hoje: string): Centavos | null {
  const primeiro = db
    .prepare(
      `SELECT min(d) AS d FROM (
         SELECT min(data) AS d FROM fechamento_balcao
         UNION ALL SELECT min(data) FROM pedido WHERE cancelado_em IS NULL)`
    )
    .get() as { d: string | null }
  if (!primeiro.d) return null
  let m = hoje.slice(0, 7)
  for (let i = 0; i < 12; i++) m = mesAnterior(m)
  if (primeiro.d.slice(0, 7) > m) return null
  const vendas = recebimentos(db)
  const contas = contasParaOLucro(db)
  const regras = obterRegras(db)
  let soma = 0
  let mes = hoje.slice(0, 7)
  for (let i = 0; i < 12; i++) {
    mes = mesAnterior(mes)
    soma += resultadoDoMes(mes, vendas, contas, regras).lucro
  }
  const media = Math.round(soma / 12)
  return media > 0 ? centavos(media) : null
}

// ---------- Relatório ----------

export function obterGordurinha(db: Banco, hoje: string): Gordurinha {
  const r = atual(db)
  const lista = series(db)
  const entra = marcadas(db, lista)
  const contas = lista.map((s) => ({
    serieId: s.serieId,
    nome: s.nome,
    valor: s.valor,
    entra: entra.get(s.serieId) ?? false
  }))
  const baseAutomatica = baseDos12Meses(db, hoje) !== null
  if (!r) {
    return {
      ligada: false,
      desde: null,
      base: centavos(0),
      pct: 1000,
      situacao: situacao(centavos(0), 1000, centavos(0)),
      itens: [],
      maisComeram: null,
      previsao: null,
      reajuste: null,
      faturamentoMedio: centavos(0),
      precos: [],
      contas,
      baseAutomatica
    }
  }
  const itens = oQueComeu(insumos(db, r, hoje), contasFixas(db, r))
  const comido = somaComida(itens)
  const sit = situacao(r.base, r.pct, comido)
  const fat = faturamentoMedio(db, hoje)
  const reajuste = reajusteSugerido(comido, fat)
  const maior = itens[0]?.valor ?? 0
  return {
    ligada: true,
    desde: r.data,
    base: r.base,
    pct: r.pct,
    situacao: sit,
    itens: itens.map((i) => ({
      ...i,
      barra: maior > 0 ? Math.round((i.valor * 100) / maior) : 0
    })),
    maisComeram: textoMaisComeram(itens.filter((i) => i.valor > 0)),
    previsao: previsaoDoFim(r.data, hoje, comido, sit.resta),
    reajuste: reajuste === null ? null : Math.round(reajuste),
    faturamentoMedio: fat,
    precos:
      reajuste === null
        ? []
        : listarCategorias(db)
            .filter((c) => c.precoBalcao > 0 || c.precoAtacado > 0)
            .map((c) => ({
              categoria: c.nome,
              balcao: { antes: c.precoBalcao, ...precoReajustado(c.precoBalcao, comido, fat) },
              atacado: { antes: c.precoAtacado, ...precoReajustado(c.precoAtacado, comido, fat) }
            })),
    contas,
    baseAutomatica
  }
}

// ---------- Ações ----------

/** Retrato do dia: o custo de cada insumo e o valor de cada conta fixa (R14). */
function tirarRetrato(db: Banco, reajusteId: number): void {
  for (const i of listarItens(db)) {
    db.prepare(
      'INSERT INTO gordurinha_retrato_item (reajuste_id, item_id, custo_x10000) VALUES (?, ?, ?)'
    ).run(reajusteId, i.id, i.custo)
  }
  for (const s of series(db)) {
    db.prepare(
      'INSERT INTO gordurinha_retrato_conta (reajuste_id, serie_id, valor_centavos) VALUES (?, ?, ?)'
    ).run(reajusteId, s.serieId, s.valor)
  }
}

function novoReajuste(
  db: Banco,
  relogio: Relogio,
  data: string,
  base: number,
  pct: number
): number {
  const agora = relogio.agora()
  const r = db
    .prepare(
      `INSERT INTO gordurinha_reajuste (data, base_centavos, pct_x100, criado_em, alterado_em)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(data, base, pct, agora, agora)
  const id = Number(r.lastInsertRowid)
  tirarRetrato(db, id)
  return id
}

const textoBase = (base: number, pct: number) =>
  `base ${formatarReais(centavos(base))}, ${formatarPercentual(pct)}`

/** Primeira vez (D-074): a data é a do último reajuste; os preços de partida são os de hoje. */
export function ligarGordurinha(db: Banco, relogio: Relogio, entrada: DadosGordurinha): void {
  const d = esquema.parse(entrada)
  if (!d.desde) throw new Error('Digite a data do último reajuste.')
  if (d.desde > relogio.hoje()) throw new Error('Essa data ainda não chegou.')
  emTransacao(db, () => {
    if (atual(db)) throw new Error('A Gordurinha já está ligada.')
    const id = novoReajuste(db, relogio, d.desde!, d.base, d.pct)
    auditar(db, relogio, {
      modulo: 'relatorios',
      acao: 'criar',
      entidade: 'gordurinha_reajuste',
      entidadeId: id,
      descricao: `Ligou a Gordurinha: último reajuste em ${formatarData(d.desde!)}, ${textoBase(d.base, d.pct)}`,
      depois: d
    })
  })
}

export function mudarGordurinha(db: Banco, relogio: Relogio, entrada: DadosGordurinha): void {
  const d = esquema.parse(entrada)
  emTransacao(db, () => {
    const r = atual(db)
    if (!r) throw new Error('A Gordurinha ainda não foi ligada.')
    if (r.base === d.base && r.pct === d.pct) return
    db.prepare(
      'UPDATE gordurinha_reajuste SET base_centavos = ?, pct_x100 = ?, alterado_em = ? WHERE id = ?'
    ).run(d.base, d.pct, relogio.agora(), r.id)
    auditar(db, relogio, {
      modulo: 'relatorios',
      acao: 'alterar',
      entidade: 'gordurinha_reajuste',
      entidadeId: r.id,
      descricao: `Mudou a Gordurinha: ${textoBase(r.base, r.pct)} → ${textoBase(d.base, d.pct)}`,
      antes: r,
      depois: d
    })
  })
}

export function marcarContaFixa(
  db: Banco,
  relogio: Relogio,
  serieBruta: unknown,
  entraBruto: unknown
): void {
  const serieId = z.number().int().positive().parse(serieBruta)
  const entra = z.boolean().parse(entraBruto)
  emTransacao(db, () => {
    const s = series(db).find((x) => x.serieId === serieId)
    if (!s) throw new Error('Conta não encontrada.')
    db.prepare(
      `INSERT INTO gordurinha_conta (serie_id, entra) VALUES (?, ?)
       ON CONFLICT (serie_id) DO UPDATE SET entra = excluded.entra`
    ).run(serieId, entra ? 1 : 0)
    auditar(db, relogio, {
      modulo: 'relatorios',
      acao: 'alterar',
      entidade: 'gordurinha_conta',
      entidadeId: serieId,
      descricao: `${entra ? 'Colocou' : 'Tirou'} a conta ${s.nome} ${entra ? 'na' : 'da'} Gordurinha`
    })
  })
}

/**
 * "Já reajustei os preços" (D-032 p.37): só zera a conta. Data = hoje, retrato novo;
 * com 12 meses de vendas, a base vira a média do lucro dos 12 meses anteriores.
 */
export function jaReajustei(db: Banco, relogio: Relogio): void {
  const hoje = relogio.hoje()
  emTransacao(db, () => {
    const r = atual(db)
    if (!r) throw new Error('A Gordurinha ainda não foi ligada.')
    const base = baseDos12Meses(db, hoje) ?? r.base
    const id = novoReajuste(db, relogio, hoje, base, r.pct)
    auditar(db, relogio, {
      modulo: 'relatorios',
      acao: 'criar',
      entidade: 'gordurinha_reajuste',
      entidadeId: id,
      descricao:
        `Registrou o reajuste dos preços: a Gordurinha voltou a ficar cheia (${textoBase(base, r.pct)})` +
        (base !== r.base ? '; a base passou a ser a média do lucro dos últimos 12 meses' : '')
    })
  })
}
