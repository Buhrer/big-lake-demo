// Vendas do balcão e pedidos (docs/03 R8, R9; D-048 a D-050, D-055).
import {
  aplicarPercentual,
  centavos,
  dividirArredondando,
  percentualInteiro,
  somarCentavos,
  type Centavos,
  type PercentualX100
} from './dinheiro'
import { partes, somarDias, type DataISO } from './datas'

export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito'

export const NOME_DA_FORMA: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Cartão débito',
  credito: 'Cartão crédito'
}

/** Taxas da maquininha (D-049: começam em 0). */
export interface Taxas {
  debitoPct: PercentualX100
  debitoDias: number
  creditoPct: PercentualX100
  creditoDias: number
}

export const TAXAS_ZERADAS: Taxas = { debitoPct: 0, debitoDias: 0, creditoPct: 0, creditoDias: 0 }

export interface ValoresDoBalcao {
  dinheiro: Centavos
  pix: Centavos
  debito: Centavos
  credito: Centavos
}

export interface FechamentoCalculado {
  total: Centavos
  taxaDebito: Centavos
  taxaCredito: Centavos
  taxas: Centavos
  ficaParaASorveteria: Centavos
  debitoCaiEm: DataISO
  creditoCaiEm: DataISO
}

/** T5: total do dia, taxas da maquininha e quando o dinheiro cai na conta. */
export function fechamentoDoDia(
  v: ValoresDoBalcao,
  taxas: Taxas,
  data: DataISO
): FechamentoCalculado {
  const total = somarCentavos([v.dinheiro, v.pix, v.debito, v.credito])
  const taxaDebito = aplicarPercentual(v.debito, taxas.debitoPct)
  const taxaCredito = aplicarPercentual(v.credito, taxas.creditoPct)
  const taxasDoDia = somarCentavos([taxaDebito, taxaCredito])
  return {
    total,
    taxaDebito,
    taxaCredito,
    taxas: taxasDoDia,
    ficaParaASorveteria: centavos(total - taxasDoDia),
    debitoCaiEm: somarDias(data, taxas.debitoDias),
    creditoCaiEm: somarDias(data, taxas.creditoDias)
  }
}

export function totalDoPedido(
  itens: readonly { quantidade: number; precoUnitario: Centavos }[]
): Centavos {
  return somarCentavos(itens.map((i) => centavos(i.quantidade * i.precoUnitario)))
}

/** Taxa da maquininha do pedido: só no cartão (R8: vale também para os pedidos). */
export function taxaDoPedido(
  total: Centavos,
  forma: FormaPagamento,
  taxas: Taxas
): { pct: PercentualX100; valor: Centavos } {
  const pct = forma === 'debito' ? taxas.debitoPct : forma === 'credito' ? taxas.creditoPct : 0
  return { pct, valor: aplicarPercentual(total, pct) }
}

/** Duas partes em % inteiro que somam 100 (a primeira arredonda, a segunda completa). */
export function partesPercentuais(a: number, b: number): [number, number] {
  const total = a + b
  if (total === 0) return [0, 0]
  const pa = percentualInteiro(BigInt(a), BigInt(total))
  return [pa, 100 - pa]
}

/** Dias do mês de `hoje`, do dia 1 até hoje. */
export function diasDoMes(hoje: DataISO, aPartirDe?: DataISO): DataISO[] {
  const { ano, mes, dia } = partes(hoje)
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dias: DataISO[] = []
  for (let i = 0; i < dia; i++) {
    const d = somarDias(inicio, i)
    if (!aPartirDe || d >= aPartirDe) dias.push(d)
  }
  return dias
}

export interface DiaDoResumo {
  data: DataISO
  /** null = falta lançar o balcão */
  balcao: Centavos | null
  fechada: boolean
  pedidos: Centavos
  total: Centavos
}

export interface ResumoDoMes {
  total: Centavos
  balcao: Centavos
  pedidos: Centavos
  qtdPedidos: number
  percentuais: [number, number]
  diasComVenda: number
  mediaPorDia: Centavos
  melhorDia: { data: DataISO; total: Centavos } | null
  /** Dias com o balcão lançado (loja fechada conta como lançado). */
  diasLancados: number
  /** Dias do mês até hoje, desde o primeiro dia de uso do sistema. */
  diasDoMes: number
  diasSemLancamento: DataISO[]
  porDia: DiaDoResumo[]
}

/**
 * Uma linha de "Vendas por dia" para cada data, na ordem recebida: balcão (null = falta
 * lançar), pedidos e total do dia. Serve ao resumo do mês e ao histórico com "Ver mais" (D-086).
 */
export function linhasPorDia(
  datas: readonly DataISO[],
  balcao: readonly { data: DataISO; total: Centavos; fechada: boolean }[],
  pedidos: readonly { data: DataISO; total: Centavos }[]
): DiaDoResumo[] {
  const porData = new Map(balcao.map((b) => [b.data, b]))
  const pedidosPorData = new Map<DataISO, number>()
  for (const p of pedidos) pedidosPorData.set(p.data, (pedidosPorData.get(p.data) ?? 0) + p.total)
  return datas.map((data) => {
    const b = porData.get(data)
    const ped = centavos(pedidosPorData.get(data) ?? 0)
    const bal = b ? b.total : null
    return {
      data,
      balcao: bal,
      fechada: b?.fechada ?? false,
      pedidos: ped,
      total: centavos((bal ?? 0) + ped)
    }
  })
}

/**
 * Resumo das vendas do mês de `hoje` (aba "Resumo das vendas").
 * `inicioDoUso`: o primeiro dia com lançamento no sistema, para não cobrar dias de antes dele.
 */
export function resumirMes(
  hoje: DataISO,
  balcao: readonly { data: DataISO; total: Centavos; fechada: boolean }[],
  pedidos: readonly { data: DataISO; total: Centavos }[],
  inicioDoUso: DataISO | null
): ResumoDoMes {
  const dias = diasDoMes(hoje, inicioDoUso ?? hoje)
  const porData = new Map(balcao.map((b) => [b.data, b]))

  const todasAsDatas = new Set<DataISO>([...dias, ...porData.keys(), ...pedidos.map((p) => p.data)])
  const porDia = linhasPorDia(
    [...todasAsDatas]
      .filter((d) => d <= hoje && d.slice(0, 7) === hoje.slice(0, 7))
      .sort()
      .reverse(),
    balcao,
    pedidos
  )

  const totalBalcao = somarCentavos(balcao.map((b) => b.total))
  const totalPedidos = somarCentavos(pedidos.map((p) => p.total))
  const total = centavos(totalBalcao + totalPedidos)
  const comVenda = porDia.filter((d) => d.total > 0)
  const melhor = comVenda.reduce<DiaDoResumo | null>(
    (m, d) => (m === null || d.total > m.total ? d : m),
    null
  )
  return {
    total,
    balcao: totalBalcao,
    pedidos: totalPedidos,
    qtdPedidos: pedidos.length,
    percentuais: partesPercentuais(totalBalcao, totalPedidos),
    diasComVenda: comVenda.length,
    mediaPorDia: comVenda.length
      ? centavos(Number(dividirArredondando(BigInt(total), BigInt(comVenda.length))))
      : centavos(0),
    melhorDia: melhor ? { data: melhor.data, total: melhor.total } : null,
    diasLancados: dias.filter((d) => porData.has(d)).length,
    diasDoMes: dias.length,
    diasSemLancamento: dias.filter((d) => !porData.has(d)),
    porDia
  }
}
