// Vendas do balcão (fechamento do dia), taxas da maquininha e pedidos de clientes.
import { z } from 'zod'
import type {
  DadosFechamento,
  DadosPedido,
  Fechamento,
  FiltroHistorico,
  PaginaHistorico,
  Pedido,
  ResumoVendas
} from '../../compartilhado/contrato'
import { aplicarPercentual, centavos } from '../../dominio/dinheiro'
import { mesAnterior } from '../../dominio/contas'
import {
  diferencaEmDias,
  formatarData,
  partes,
  somarDias,
  ultimoDiaDoMes,
  type DataISO
} from '../../dominio/datas'
import { formatarPercentual, formatarReais } from '../../dominio/formatar'
import { precosDoProduto, type VendidoComo } from '../../dominio/produto'
import {
  fechamentoDoDia,
  linhasPorDia,
  NOME_DA_FORMA,
  resumirMes,
  TAXAS_ZERADAS,
  taxaDoPedido,
  totalDoPedido,
  type DiaDoResumo,
  type FormaPagamento,
  type Taxas
} from '../../dominio/vendas'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { esquemaFiltroHistorico, paginar } from './historico'

const dinheiro = z.number().int().nonnegative().max(100_000_000_00)
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')

function exigirNaoFutura(d: string, hoje: string): void {
  if (d > hoje) throw new Error('Não dá para lançar um dia que ainda não chegou.')
}

// ---------- Taxas da maquininha ----------

const esquemaTaxas = z.object({
  debitoPct: z.number().int().min(0).max(10_000),
  debitoDias: z.number().int().min(0).max(120),
  creditoPct: z.number().int().min(0).max(10_000),
  creditoDias: z.number().int().min(0).max(120)
})

export function obterTaxas(db: Banco): Taxas {
  const linha = db.prepare(`SELECT valor FROM config WHERE chave = 'maquininha'`).get() as
    { valor: string } | undefined
  if (!linha) return TAXAS_ZERADAS
  const r = esquemaTaxas.safeParse({ ...TAXAS_ZERADAS, ...JSON.parse(linha.valor) })
  return r.success ? r.data : TAXAS_ZERADAS
}

export function salvarTaxas(db: Banco, relogio: Relogio, entrada: unknown): Taxas {
  const depois = esquemaTaxas.parse(entrada)
  return emTransacao(db, () => {
    const antes = obterTaxas(db)
    db.prepare(
      `INSERT INTO config (chave, valor, alterado_em) VALUES ('maquininha', ?, ?)
       ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, alterado_em = excluded.alterado_em`
    ).run(JSON.stringify(depois), relogio.agora())
    const m: string[] = []
    const dias = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)
    if (antes.debitoPct !== depois.debitoPct || antes.debitoDias !== depois.debitoDias) {
      m.push(
        `débito ${formatarPercentual(antes.debitoPct)} em ${dias(antes.debitoDias)} → ${formatarPercentual(depois.debitoPct)} em ${dias(depois.debitoDias)}`
      )
    }
    if (antes.creditoPct !== depois.creditoPct || antes.creditoDias !== depois.creditoDias) {
      m.push(
        `crédito ${formatarPercentual(antes.creditoPct)} em ${dias(antes.creditoDias)} → ${formatarPercentual(depois.creditoPct)} em ${dias(depois.creditoDias)}`
      )
    }
    if (m.length) {
      auditar(db, relogio, {
        modulo: 'vendas',
        acao: 'alterar',
        descricao: `Mudou as taxas da maquininha: ${m.join('; ')}`,
        antes,
        depois
      })
    }
    return depois
  })
}

// ---------- Fechamento do balcão ----------

interface LinhaFechamento {
  data: string
  loja_fechada: number
  dinheiro_centavos: number
  pix_centavos: number
  debito_centavos: number
  credito_centavos: number
  taxa_debito_pct_x100: number
  taxa_credito_pct_x100: number
  dias_debito: number
  dias_credito: number
}

function deLinhaFechamento(l: LinhaFechamento): Fechamento {
  const taxas: Taxas = {
    debitoPct: l.taxa_debito_pct_x100,
    debitoDias: l.dias_debito,
    creditoPct: l.taxa_credito_pct_x100,
    creditoDias: l.dias_credito
  }
  const valores = {
    dinheiro: centavos(l.dinheiro_centavos),
    pix: centavos(l.pix_centavos),
    debito: centavos(l.debito_centavos),
    credito: centavos(l.credito_centavos)
  }
  return {
    data: l.data,
    lojaFechada: l.loja_fechada === 1,
    ...valores,
    taxas,
    calculado: fechamentoDoDia(valores, taxas, l.data)
  }
}

const SELECT_FECHAMENTO = `SELECT data, loja_fechada, dinheiro_centavos, pix_centavos, debito_centavos,
  credito_centavos, taxa_debito_pct_x100, taxa_credito_pct_x100, dias_debito, dias_credito
  FROM fechamento_balcao`

export function listarFechamentos(db: Banco, limite = 60): Fechamento[] {
  return (
    db
      .prepare(`${SELECT_FECHAMENTO} ORDER BY data DESC LIMIT ?`)
      .all(limite) as unknown as LinhaFechamento[]
  ).map(deLinhaFechamento)
}

/** Histórico do balcão: últimos ou de um mês, com "Ver mais" (D-085). */
export function paginaDeFechamentos(
  db: Banco,
  filtro: FiltroHistorico
): PaginaHistorico<Fechamento> {
  const p = paginar<LinhaFechamento>(
    db,
    { select: SELECT_FECHAMENTO, data: 'data', ordem: 'data DESC' },
    filtro
  )
  return { itens: p.linhas.map(deLinhaFechamento), total: p.total, meses: p.meses }
}

export function obterFechamento(db: Banco, dataDia: string): Fechamento | null {
  const l = db.prepare(`${SELECT_FECHAMENTO} WHERE data = ?`).get(dataDia) as
    LinhaFechamento | undefined
  return l ? deLinhaFechamento(l) : null
}

const esquemaFechamento = z.object({
  data,
  lojaFechada: z.boolean(),
  dinheiro,
  pix: dinheiro,
  debito: dinheiro,
  credito: dinheiro
})

/** Um fechamento por dia (D-048): se o dia já existe, é correção. */
export function salvarFechamento(
  db: Banco,
  relogio: Relogio,
  entrada: DadosFechamento
): Fechamento {
  const d = esquemaFechamento.parse(entrada)
  exigirNaoFutura(d.data, relogio.hoje())
  const valores = d.lojaFechada
    ? { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
    : { dinheiro: d.dinheiro, pix: d.pix, debito: d.debito, credito: d.credito }
  return emTransacao(db, () => {
    const antes = obterFechamento(db, d.data)
    const agora = relogio.agora()
    // correção mantém as taxas do dia (retrato); lançamento novo usa as taxas de agora
    const taxas = antes?.taxas ?? obterTaxas(db)
    const dia = formatarData(d.data).slice(0, 5)
    if (!antes) {
      db.prepare(
        `INSERT INTO fechamento_balcao (data, loja_fechada, dinheiro_centavos, pix_centavos, debito_centavos,
           credito_centavos, taxa_debito_pct_x100, taxa_credito_pct_x100, dias_debito, dias_credito,
           criado_em, alterado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        d.data,
        d.lojaFechada ? 1 : 0,
        valores.dinheiro,
        valores.pix,
        valores.debito,
        valores.credito,
        taxas.debitoPct,
        taxas.creditoPct,
        taxas.debitoDias,
        taxas.creditoDias,
        agora,
        agora
      )
      const total = valores.dinheiro + valores.pix + valores.debito + valores.credito
      auditar(db, relogio, {
        modulo: 'vendas',
        acao: 'criar',
        entidade: 'fechamento_balcao',
        descricao: d.lojaFechada
          ? `Marcou o dia ${dia} como loja fechada`
          : `Lançou as vendas do dia ${dia}: ${formatarReais(centavos(total))}`,
        depois: d
      })
    } else {
      const m: string[] = []
      if (antes.lojaFechada !== d.lojaFechada) {
        m.push(d.lojaFechada ? 'marcou como loja fechada' : 'a loja abriu')
      }
      for (const [campo, rotulo] of [
        ['dinheiro', 'dinheiro'],
        ['pix', 'Pix'],
        ['debito', 'débito'],
        ['credito', 'crédito']
      ] as const) {
        if (antes[campo] !== valores[campo]) {
          m.push(
            `${rotulo} ${formatarReais(antes[campo])} → ${formatarReais(centavos(valores[campo]))}`
          )
        }
      }
      if (m.length) {
        db.prepare(
          `UPDATE fechamento_balcao SET loja_fechada = ?, dinheiro_centavos = ?, pix_centavos = ?,
             debito_centavos = ?, credito_centavos = ?, alterado_em = ? WHERE data = ?`
        ).run(
          d.lojaFechada ? 1 : 0,
          valores.dinheiro,
          valores.pix,
          valores.debito,
          valores.credito,
          agora,
          d.data
        )
        auditar(db, relogio, {
          modulo: 'vendas',
          acao: 'alterar',
          entidade: 'fechamento_balcao',
          descricao: `Corrigiu as vendas do dia ${dia}: ${m.join('; ')}`,
          antes,
          depois: d
        })
      }
    }
    return obterFechamento(db, d.data)!
  })
}

// ---------- Pedidos ----------

const esquemaPedido = z.object({
  clienteId: z.number().int().positive({ message: 'Escolha o cliente.' }),
  data,
  forma: z.enum(['dinheiro', 'pix', 'debito', 'credito'], {
    message: 'Escolha como o cliente pagou.'
  }),
  itens: z
    .array(
      z.object({ produtoId: z.number().int().positive(), quantidade: z.number().int().positive() })
    )
    .min(1, 'Coloque pelo menos um produto no pedido.')
})

interface LinhaPedido {
  id: number
  numero: number
  data: string
  cliente_id: number
  cliente_nome: string
  forma_pagamento: FormaPagamento
  total_centavos: number
  taxa_pct_x100: number
  taxa_centavos: number
  cancelado_em: string | null
  motivo_cancelamento: string | null
}

const SELECT_PEDIDO = `SELECT p.id, p.numero, p.data, p.cliente_id, c.nome AS cliente_nome, p.forma_pagamento,
  p.total_centavos, p.taxa_pct_x100, p.taxa_centavos, p.cancelado_em, p.motivo_cancelamento
  FROM pedido p JOIN cliente c ON c.id = p.cliente_id`

function itensDo(db: Banco, pedidoId: number): Pedido['itens'] {
  return (
    db
      .prepare(
        `SELECT produto_id, nome_produto, quantidade, preco_unitario_centavos FROM pedido_item
         WHERE pedido_id = ? ORDER BY id`
      )
      .all(pedidoId) as {
      produto_id: number
      nome_produto: string
      quantidade: number
      preco_unitario_centavos: number
    }[]
  ).map((i) => ({
    produtoId: i.produto_id,
    nome: i.nome_produto,
    quantidade: i.quantidade,
    precoUnitario: centavos(i.preco_unitario_centavos)
  }))
}

function deLinhaPedido(db: Banco, p: LinhaPedido): Pedido {
  return {
    id: p.id,
    numero: p.numero,
    data: p.data,
    clienteId: p.cliente_id,
    clienteNome: p.cliente_nome,
    forma: p.forma_pagamento,
    itens: itensDo(db, p.id),
    total: centavos(p.total_centavos),
    taxaPct: p.taxa_pct_x100,
    taxa: centavos(p.taxa_centavos),
    cancelado: p.cancelado_em !== null,
    motivoCancelamento: p.motivo_cancelamento
  }
}

/** Pedidos do mês ("AAAA-MM"), do mais novo para o mais antigo. */
export function listarPedidos(db: Banco, anoMes: string): Pedido[] {
  return (
    db
      .prepare(
        `${SELECT_PEDIDO} WHERE substr(p.data, 1, 7) = ? ORDER BY p.data DESC, p.numero DESC`
      )
      .all(anoMes) as unknown as LinhaPedido[]
  ).map((p) => deLinhaPedido(db, p))
}

/** Histórico de pedidos: últimos ou de um mês, com "Ver mais" (D-085). */
export function paginaDePedidos(db: Banco, filtro: FiltroHistorico): PaginaHistorico<Pedido> {
  const p = paginar<LinhaPedido>(
    db,
    { select: SELECT_PEDIDO, data: 'data', ordem: 'data DESC, numero DESC' },
    filtro
  )
  return { itens: p.linhas.map((l) => deLinhaPedido(db, l)), total: p.total, meses: p.meses }
}

export function obterPedido(db: Banco, id: number): Pedido | null {
  const p = db.prepare(`${SELECT_PEDIDO} WHERE p.id = ?`).get(id) as LinhaPedido | undefined
  return p ? deLinhaPedido(db, p) : null
}

export function proximoNumero(db: Banco): number {
  const r = db.prepare('SELECT coalesce(max(numero), 0) + 1 AS n FROM pedido').get() as {
    n: number
  }
  return r.n
}

/** Preço de atacado de hoje do produto (preço fixo da categoria, × caixa). */
function precoDeAtacadoDeHoje(db: Banco, produtoId: number): { nome: string; preco: number } {
  const p = db
    .prepare(
      `SELECT p.nome, p.vendido_como, p.unidades_por_caixa, c.preco_atacado_centavos, c.preco_balcao_centavos
       FROM produto p JOIN categoria c ON c.id = p.categoria_id
       WHERE p.id = ? AND p.excluido_em IS NULL`
    )
    .get(produtoId) as
    | {
        nome: string
        vendido_como: VendidoComo
        unidades_por_caixa: number | null
        preco_atacado_centavos: number
        preco_balcao_centavos: number
      }
    | undefined
  if (!p) throw new Error('Um dos produtos não está mais à venda.')
  const precos = precosDoProduto(
    { balcao: centavos(p.preco_balcao_centavos), atacado: centavos(p.preco_atacado_centavos) },
    p.vendido_como,
    p.unidades_por_caixa
  )
  return { nome: p.nome, preco: precos.atacado }
}

function resumoDosItens(itens: { nome: string; quantidade: number }[]): string {
  return itens.map((i) => `${i.quantidade} ${i.nome}`).join(', ')
}

/** Faz (id null) ou corrige um pedido (D-056). Devolve o pedido salvo. */
export function salvarPedido(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosPedido
): Pedido {
  const d = esquemaPedido.parse(entrada)
  exigirNaoFutura(d.data, relogio.hoje())
  return emTransacao(db, () => {
    const cliente = db
      .prepare('SELECT nome FROM cliente WHERE id = ? AND excluido_em IS NULL')
      .get(d.clienteId) as { nome: string } | undefined
    if (!cliente) throw new Error('Escolha o cliente.')
    const antes = id === null ? null : obterPedido(db, id)
    if (id !== null && !antes) throw new Error('Pedido não encontrado.')
    if (antes?.cancelado)
      throw new Error('Este pedido foi cancelado. Desfaça o cancelamento antes de corrigir.')

    // itens que já estavam mantêm nome e preço do dia do pedido (retrato)
    const retrato = new Map(antes?.itens.map((i) => [i.produtoId, i]) ?? [])
    const itens = d.itens.map((i) => {
      const velho = retrato.get(i.produtoId)
      const atual = velho
        ? { nome: velho.nome, preco: velho.precoUnitario as number }
        : precoDeAtacadoDeHoje(db, i.produtoId)
      return {
        produtoId: i.produtoId,
        nome: atual.nome,
        quantidade: i.quantidade,
        precoUnitario: centavos(atual.preco)
      }
    })
    const total = totalDoPedido(itens)
    // correção mantém a taxa do dia do pedido; muda só se mudar a forma de pagamento
    const pct =
      antes && antes.forma === d.forma
        ? antes.taxaPct
        : taxaDoPedido(total, d.forma, obterTaxas(db)).pct
    const taxa = aplicarPercentual(total, pct)

    const agora = relogio.agora()
    let pedidoId: number
    let numero: number
    if (antes === null) {
      numero = proximoNumero(db)
      const r = db
        .prepare(
          `INSERT INTO pedido (numero, data, cliente_id, forma_pagamento, total_centavos, taxa_pct_x100,
             taxa_centavos, criado_em, alterado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(numero, d.data, d.clienteId, d.forma, total, pct, taxa, agora, agora)
      pedidoId = Number(r.lastInsertRowid)
      auditar(db, relogio, {
        modulo: 'vendas',
        acao: 'criar',
        entidade: 'pedido',
        entidadeId: pedidoId,
        descricao: `Fez o pedido nº ${numero} para ${cliente.nome}: ${formatarReais(total)} em ${NOME_DA_FORMA[d.forma]} (${resumoDosItens(itens)})`,
        depois: { ...d, itens }
      })
    } else {
      pedidoId = antes.id
      numero = antes.numero
      const m: string[] = []
      if (antes.clienteId !== d.clienteId) m.push(`cliente ${antes.clienteNome} → ${cliente.nome}`)
      if (antes.data !== d.data)
        m.push(`data ${formatarData(antes.data)} → ${formatarData(d.data)}`)
      if (antes.forma !== d.forma) {
        m.push(`pagamento ${NOME_DA_FORMA[antes.forma]} → ${NOME_DA_FORMA[d.forma]}`)
      }
      const itensAntes = resumoDosItens(antes.itens)
      const itensDepois = resumoDosItens(itens)
      if (itensAntes !== itensDepois) m.push(`itens ${itensAntes} → ${itensDepois}`)
      if (antes.total !== total)
        m.push(`total ${formatarReais(antes.total)} → ${formatarReais(total)}`)
      if (m.length === 0) return antes
      db.prepare(
        `UPDATE pedido SET data = ?, cliente_id = ?, forma_pagamento = ?, total_centavos = ?, taxa_pct_x100 = ?,
           taxa_centavos = ?, alterado_em = ? WHERE id = ?`
      ).run(d.data, d.clienteId, d.forma, total, pct, taxa, agora, pedidoId)
      db.prepare('DELETE FROM pedido_item WHERE pedido_id = ?').run(pedidoId)
      auditar(db, relogio, {
        modulo: 'vendas',
        acao: 'alterar',
        entidade: 'pedido',
        entidadeId: pedidoId,
        descricao: `Corrigiu o pedido nº ${numero}: ${m.join('; ')}`,
        antes,
        depois: { ...d, itens }
      })
    }
    // pedido novo ainda não tem itens; na correção, os antigos foram apagados acima
    for (const i of itens) {
      db.prepare(
        `INSERT INTO pedido_item (pedido_id, produto_id, nome_produto, quantidade, preco_unitario_centavos)
         VALUES (?, ?, ?, ?, ?)`
      ).run(pedidoId, i.produtoId, i.nome, i.quantidade, i.precoUnitario)
    }
    return obterPedido(db, pedidoId)!
  })
}

export function cancelarPedido(
  db: Banco,
  relogio: Relogio,
  id: number,
  motivoBruto: unknown
): void {
  const motivo =
    z
      .string()
      .trim()
      .max(200)
      .nullable()
      .parse(motivoBruto ?? null) || null
  emTransacao(db, () => {
    const p = obterPedido(db, id)
    if (!p) throw new Error('Pedido não encontrado.')
    if (p.cancelado) return
    db.prepare('UPDATE pedido SET cancelado_em = ?, motivo_cancelamento = ? WHERE id = ?').run(
      relogio.agora(),
      motivo,
      id
    )
    auditar(db, relogio, {
      modulo: 'vendas',
      acao: 'excluir',
      entidade: 'pedido',
      entidadeId: id,
      descricao: `Cancelou o pedido nº ${p.numero} (${p.clienteNome}, ${formatarReais(p.total)})${motivo ? `: ${motivo}` : ''}`
    })
  })
}

export function desfazerCancelamento(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const p = obterPedido(db, id)
    if (!p) throw new Error('Pedido não encontrado.')
    if (!p.cancelado) return
    db.prepare(
      'UPDATE pedido SET cancelado_em = NULL, motivo_cancelamento = NULL WHERE id = ?'
    ).run(id)
    auditar(db, relogio, {
      modulo: 'vendas',
      acao: 'desfazer',
      entidade: 'pedido',
      entidadeId: id,
      descricao: `Desfez o cancelamento do pedido nº ${p.numero}`
    })
  })
}

// ---------- Resumo das vendas ----------

/** Primeiro dia com balcão ou pedido lançado (antes dele não se cobra "falta lançar"). */
function inicioDoUso(db: Banco): DataISO | null {
  const primeiro = db.prepare('SELECT min(data) AS d FROM fechamento_balcao').get() as {
    d: string | null
  }
  const primeiroPedido = db
    .prepare('SELECT min(data) AS d FROM pedido WHERE cancelado_em IS NULL')
    .get() as { d: string | null }
  return [primeiro.d, primeiroPedido.d].filter((d): d is string => d !== null).sort()[0] ?? null
}

/**
 * "Vendas por dia" do Resumo (D-086): um dia por linha, do mais novo para trás, desde o
 * primeiro dia de uso até hoje (dias sem balcão aparecem como "falta lançar").
 */
export function paginaVendasPorDia(
  db: Banco,
  hoje: DataISO,
  filtroBruto: FiltroHistorico
): PaginaHistorico<DiaDoResumo> {
  const filtro = esquemaFiltroHistorico.parse(filtroBruto)
  const inicio = inicioDoUso(db)
  if (!inicio || inicio > hoje) return { itens: [], total: 0, meses: [] }
  const meses: string[] = []
  for (let m = hoje.slice(0, 7); m >= inicio.slice(0, 7); m = mesAnterior(m)) meses.push(m)

  let de = inicio
  let ate = hoje
  if (filtro.anoMes) {
    const { ano, mes } = partes(`${filtro.anoMes}-01`)
    const fimDoMes = `${filtro.anoMes}-${String(ultimoDiaDoMes(ano, mes)).padStart(2, '0')}`
    de = `${filtro.anoMes}-01` > inicio ? `${filtro.anoMes}-01` : inicio
    ate = fimDoMes < hoje ? fimDoMes : hoje
  }
  const total = de > ate ? 0 : diferencaEmDias(de, ate) + 1
  const datas = Array.from({ length: Math.min(filtro.limite, total) }, (_, i) => somarDias(ate, -i))
  if (datas.length === 0) return { itens: [], total, meses }
  const maisAntiga = datas[datas.length - 1]!
  const balcao = (
    db
      .prepare(`${SELECT_FECHAMENTO} WHERE data BETWEEN ? AND ?`)
      .all(maisAntiga, ate) as unknown as LinhaFechamento[]
  ).map(deLinhaFechamento)
  const pedidos = db
    .prepare(
      `SELECT data, total_centavos FROM pedido
       WHERE cancelado_em IS NULL AND data BETWEEN ? AND ?`
    )
    .all(maisAntiga, ate) as { data: string; total_centavos: number }[]
  return {
    itens: linhasPorDia(
      datas,
      balcao.map((b) => ({ data: b.data, total: b.calculado.total, fechada: b.lojaFechada })),
      pedidos.map((p) => ({ data: p.data, total: centavos(p.total_centavos) }))
    ),
    total,
    meses
  }
}

export function resumoDasVendas(db: Banco, hoje: string): ResumoVendas {
  const anoMes = hoje.slice(0, 7)
  const balcao = (
    db
      .prepare(`${SELECT_FECHAMENTO} WHERE substr(data, 1, 7) = ?`)
      .all(anoMes) as unknown as LinhaFechamento[]
  ).map(deLinhaFechamento)
  const pedidos = listarPedidos(db, anoMes).filter((p) => !p.cancelado)
  const inicio = inicioDoUso(db)
  const mes = resumirMes(
    hoje,
    balcao.map((b) => ({ data: b.data, total: b.calculado.total, fechada: b.lojaFechada })),
    pedidos.map((p) => ({ data: p.data, total: p.total })),
    inicio
  )
  const balcaoHoje = balcao.find((b) => b.data === hoje) ?? null
  const pedidosHoje = pedidos.filter((p) => p.data === hoje)
  const totalPedidosHoje = centavos(pedidosHoje.reduce((s, p) => s + p.total, 0))
  const taxaPedidosHoje = centavos(pedidosHoje.reduce((s, p) => s + p.taxa, 0))
  const taxasHoje = centavos((balcaoHoje?.calculado.taxas ?? 0) + taxaPedidosHoje)
  const vendasHoje = centavos((balcaoHoje?.calculado.total ?? 0) + totalPedidosHoje)
  return {
    ...mes,
    hoje: {
      balcao: balcaoHoje,
      pedidos: totalPedidosHoje,
      qtdPedidos: pedidosHoje.length,
      vendas: vendasHoje,
      taxaPedidos: taxaPedidosHoje,
      taxas: taxasHoje,
      ficaParaASorveteria: centavos(vendasHoje - taxasHoje)
    },
    taxasAtuais: obterTaxas(db)
  }
}
