// Relatórios: contas e frases de conclusão (docs/02 §10, docs/03 R15; D-073).
import { centavos, dividirArredondando, type Centavos, type CustoX10000 } from './dinheiro'

/**
 * Porcentagens inteiras que somam 100 (maiores restos), na ordem dada.
 * Ex.: 10.120 · 6.010 · 9.000 · 9.770 → 29 · 17 · 26 · 28.
 */
export function porcentagens(valores: readonly number[]): number[] {
  const total = valores.reduce((t, v) => t + v, 0)
  if (total <= 0) return valores.map(() => 0)
  const brutos = valores.map((v) => (v * 100) / total)
  const inteiros = brutos.map(Math.floor)
  let falta = 100 - inteiros.reduce((t, v) => t + v, 0)
  const ordem = brutos
    .map((b, i) => ({ i, resto: b - Math.floor(b) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i)
  for (const { i } of ordem) {
    if (falta <= 0) break
    inteiros[i]! += 1
    falta--
  }
  return inteiros
}

/** Diferença em %, com 1 casa (×10: 26,9% = 269). null quando não há com o que comparar. */
export function diferencaPercentual(antes: number, agora: number): number | null {
  if (antes === 0) return null
  return Number(dividirArredondando(BigInt(agora - antes) * 1000n, BigInt(Math.abs(antes))))
}

/** "+26,9%" · "−13,2%" · "+100%" · "0%" */
export function textoDiferenca(x10: number): string {
  const sinal = x10 > 0 ? '+' : x10 < 0 ? '−' : ''
  const abs = Math.abs(x10)
  const inteiro = Math.floor(abs / 10)
  const decimal = abs % 10
  return `${sinal}${inteiro}${decimal ? `,${decimal}` : ''}%`
}

// ---------- Mais vendidos nos pedidos ----------

export interface ItemVendido {
  produtoId: number
  nome: string
  quantidade: number
  valor: Centavos
}

/** Soma por produto, do que mais rendeu em R$ para o que menos (empate: mais unidades). */
export function rankingDeProdutos(itens: readonly ItemVendido[]): ItemVendido[] {
  const porProduto = new Map<number, ItemVendido>()
  for (const i of itens) {
    const p = porProduto.get(i.produtoId) ?? { ...i, quantidade: 0, valor: centavos(0) }
    p.quantidade += i.quantidade
    p.valor = centavos(p.valor + i.valor)
    porProduto.set(i.produtoId, p)
  }
  return [...porProduto.values()].sort(
    (a, b) =>
      b.valor - a.valor || b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR')
  )
}

export interface ClienteQueComprou {
  clienteId: number
  nome: string
  pedidos: number
  valor: Centavos
}

export function rankingDeClientes(
  pedidos: readonly { clienteId: number; clienteNome: string; total: Centavos }[]
): ClienteQueComprou[] {
  const porCliente = new Map<number, ClienteQueComprou>()
  for (const p of pedidos) {
    const c = porCliente.get(p.clienteId) ?? {
      clienteId: p.clienteId,
      nome: p.clienteNome,
      pedidos: 0,
      valor: centavos(0)
    }
    c.pedidos += 1
    c.valor = centavos(c.valor + p.total)
    porCliente.set(p.clienteId, c)
  }
  return [...porCliente.values()].sort(
    (a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR')
  )
}

/** "27 potes" · "1 pote" · "7 caixas de 20" · "40 un" · "3 copos" */
export function textoQuantidadeVendida(
  quantidade: number,
  vendidoComo: 'unidade' | 'pote' | 'copo' | 'caixa',
  unidadesPorCaixa: number | null
): string {
  const um = quantidade === 1
  switch (vendidoComo) {
    case 'pote':
      return `${quantidade} ${um ? 'pote' : 'potes'}`
    case 'copo':
      return `${quantidade} ${um ? 'copo' : 'copos'}`
    case 'caixa':
      return `${quantidade} ${um ? 'caixa' : 'caixas'}${unidadesPorCaixa ? ` de ${unidadesPorCaixa}` : ''}`
    default:
      return `${quantidade} un`
  }
}

// ---------- Lucro por produto (R15) ----------

export interface ProducaoDoProduto {
  receitaId: number
  nome: string
  /** unidades que saíram nas produções do mês */
  produzidas: number
  /** unidades perdidas (produto pronto e troca) no mês */
  perdidas: number
  /** o que foi vendido em pedidos: unidades da receita e o valor recebido */
  pedidos: readonly { unidades: number; valor: Centavos }[]
  precoBalcao: Centavos
  custoDeCada: CustoX10000
}

export interface LucroDoProduto {
  receitaId: number
  nome: string
  sairam: number
  /** lucro de cada, na média (×10.000) */
  lucroDeCada: CustoX10000
  lucro: Centavos
}

/**
 * R15 (D-073): saíram = produzidas − perdidas (nunca menos que o vendido em pedidos).
 * Pedidos usam o valor real; o resto conta como vendido no balcão.
 */
export function lucroPorProduto(produtos: readonly ProducaoDoProduto[]): LucroDoProduto[] {
  return produtos
    .map((p) => {
      const unidadesPedidos = p.pedidos.reduce((t, x) => t + x.unidades, 0)
      const valorPedidos = p.pedidos.reduce((t, x) => t + x.valor, 0)
      const sairam = Math.max(p.produzidas - p.perdidas, unidadesPedidos, 0)
      const balcao = sairam - unidadesPedidos
      // tudo em ×10.000 (custo com 4 casas)
      const lucroX10000 =
        valorPedidos * 100 -
        unidadesPedidos * p.custoDeCada +
        balcao * (p.precoBalcao * 100 - p.custoDeCada)
      return {
        receitaId: p.receitaId,
        nome: p.nome,
        sairam,
        lucroDeCada: sairam ? Math.round(lucroX10000 / sairam) : 0,
        lucro: centavos(Number(dividirArredondando(BigInt(lucroX10000), 100n)))
      }
    })
    .filter((p) => p.sairam > 0)
    .sort((a, b) => b.lucro - a.lucro || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// ---------- Perdas ----------

/** O motivo que mais custou no período (empate: o que aparece mais vezes). */
export function maiorMotivo(perdas: readonly { motivo: string; valor: Centavos }[]): string | null {
  const porMotivo = new Map<string, { valor: number; vezes: number }>()
  for (const p of perdas) {
    const m = porMotivo.get(p.motivo) ?? { valor: 0, vezes: 0 }
    m.valor += p.valor
    m.vezes += 1
    porMotivo.set(p.motivo, m)
  }
  let melhor: [string, { valor: number; vezes: number }] | null = null
  for (const e of porMotivo) {
    if (
      !melhor ||
      e[1].valor > melhor[1].valor ||
      (e[1].valor === melhor[1].valor && e[1].vezes > melhor[1].vezes)
    )
      melhor = e
  }
  return melhor?.[0] ?? null
}
