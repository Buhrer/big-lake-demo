// Lucro do mês e divisão entre os sócios (docs/03 R12; D-033, D-058 a D-061).
import { aplicarPercentual, centavos, somarCentavos, type Centavos } from './dinheiro'
import type { DataISO } from './datas'

/** "Como contar o lucro" em Configurações (D-033); o padrão é a nossa sugestão. */
export interface RegrasLucro {
  /** (21) despesa no mês em que foi paga × no mês do vencimento (D-060) */
  despesa: 'pagamento' | 'vencimento'
  /** (22) venda no crédito conta no mês da venda × no mês em que o dinheiro cai */
  credito: 'venda' | 'quando_cai'
  /** (23) taxas da maquininha como despesa (linha própria) × vendas já sem as taxas */
  taxas: 'despesa' | 'descontar'
  /** (27) mês de prejuízo: mostrar e não dividir × dividir × levar para o mês seguinte */
  prejuizo: 'nao_dividir' | 'dividir' | 'levar'
}

export const REGRAS_PADRAO: RegrasLucro = {
  despesa: 'pagamento',
  credito: 'venda',
  taxas: 'despesa',
  prejuizo: 'nao_dividir'
}

/** Um pedaço de venda: o dinheiro, o Pix, o débito ou o crédito de um dia, ou um pedido. */
export interface Recebimento {
  data: DataISO
  /** quando o dinheiro cai na conta (crédito: data + dias do prazo) */
  caiEm: DataISO
  credito: boolean
  valor: Centavos
  /** taxa da maquininha deste pedaço (retrato do dia) */
  taxa: Centavos
  /** venda de pedido (senão, do balcão) — separa as duas linhas no Resultado do mês */
  pedido?: boolean
}

export interface ContaParaOLucro {
  vencimento: DataISO
  pagoEm: DataISO | null
  valor: Centavos
  tipo: string
  /** false na "Fatura do cartão da empresa" (D-061): cada gasto já virou despesa no dia da compra */
  entraNasDespesas: boolean
}

export interface ResultadoDoMes {
  /** vendas do balcão e dos pedidos que contam no mês, antes de tirar as taxas */
  balcao: Centavos
  pedidos: Centavos
  /** taxas da maquininha das vendas do mês (em qualquer regra) */
  taxasDoMes: Centavos
  faturamento: Centavos
  /** taxas da maquininha como despesa (0 quando as vendas já contam sem as taxas) */
  taxas: Centavos
  despesasContas: Centavos
  /** contas + taxas */
  despesas: Centavos
  /** grupos do Resultado do mês = tipos de conta (D-032 p.26) */
  porTipo: { tipo: string; valor: Centavos }[]
  lucro: Centavos
}

function noMes(data: DataISO | null, anoMes: string): boolean {
  return data !== null && data.slice(0, 7) === anoMes
}

/** Faturamento, despesas e lucro de um mês ("AAAA-MM"), conforme as regras escolhidas. */
export function resultadoDoMes(
  anoMes: string,
  recebimentos: readonly Recebimento[],
  contas: readonly ContaParaOLucro[],
  regras: RegrasLucro
): ResultadoDoMes {
  const doMes = recebimentos.filter((r) =>
    noMes(r.credito && regras.credito === 'quando_cai' ? r.caiEm : r.data, anoMes)
  )
  const bruto = somarCentavos(doMes.map((r) => r.valor))
  const taxasDoMes = somarCentavos(doMes.map((r) => r.taxa))
  const faturamento = regras.taxas === 'descontar' ? centavos(bruto - taxasDoMes) : bruto
  const taxas = regras.taxas === 'despesa' ? taxasDoMes : centavos(0)

  // No mês do vencimento (competência) a conta conta mesmo antes de ser paga.
  const contasDoMes = contas.filter(
    (c) =>
      c.entraNasDespesas &&
      (regras.despesa === 'vencimento' ? noMes(c.vencimento, anoMes) : noMes(c.pagoEm, anoMes))
  )
  const grupos = new Map<string, Centavos>()
  for (const c of contasDoMes) {
    grupos.set(c.tipo, centavos((grupos.get(c.tipo) ?? 0) + c.valor))
  }
  const despesasContas = somarCentavos(contasDoMes.map((c) => c.valor))
  const despesas = centavos(despesasContas + taxas)
  return {
    balcao: somarCentavos(doMes.filter((r) => !r.pedido).map((r) => r.valor)),
    pedidos: somarCentavos(doMes.filter((r) => r.pedido).map((r) => r.valor)),
    taxasDoMes,
    faturamento,
    taxas,
    despesasContas,
    despesas,
    porTipo: [...grupos]
      .map(([tipo, valor]) => ({ tipo, valor }))
      .sort((a, b) => b.valor - a.valor || a.tipo.localeCompare(b.tipo)),
    lucro: centavos(faturamento - despesas)
  }
}

/**
 * Quanto do lucro vai para a divisão (regra 27).
 * `prejuizoAnterior` (≤ 0) só existe na regra "levar para o mês seguinte".
 */
export function lucroParaDividir(
  lucro: Centavos,
  prejuizoAnterior: Centavos,
  regra: RegrasLucro['prejuizo']
): { paraDividir: Centavos; prejuizoQueVai: Centavos } {
  const zero = centavos(0)
  if (regra === 'dividir') return { paraDividir: lucro, prejuizoQueVai: zero }
  if (regra === 'nao_dividir') {
    return { paraDividir: lucro < 0 ? zero : lucro, prejuizoQueVai: zero }
  }
  const saldo = centavos(lucro + prejuizoAnterior)
  return saldo < 0
    ? { paraDividir: zero, prejuizoQueVai: saldo }
    : { paraDividir: saldo, prejuizoQueVai: zero }
}

/** Prejuízo que chega a cada mês na regra "levar", a partir dos lucros dos meses em ordem. */
export function prejuizoQueChega(lucrosEmOrdem: readonly Centavos[]): Centavos {
  let vai = centavos(0)
  for (const lucro of lucrosEmOrdem) vai = lucroParaDividir(lucro, vai, 'levar').prejuizoQueVai
  return vai
}

/** Divide pela porcentagem (×100); o último sócio fica com o centavo que sobrar. */
export function dividirPelasPartes(valor: Centavos, pcts: readonly number[]): Centavos[] {
  const partes = pcts.slice(0, -1).map((p) => aplicarPercentual(valor, p))
  if (pcts.length === 0) return []
  return [...partes, centavos(valor - somarCentavos(partes))]
}

export interface SocioNoMes {
  id: number
  pct: number
  parte: Centavos
  reembolso: Centavos
  retiradas: Centavos
  totalAReceber: Centavos
}

/** T7: parte do lucro + reembolsos (cartão pessoal) − retiradas do mês. */
export function quantoCadaUmRecebe(
  paraDividir: Centavos,
  socios: readonly { id: number; pct: number }[],
  reembolsos: readonly { socioId: number; valor: Centavos }[],
  retiradas: readonly { socioId: number; valor: Centavos }[]
): SocioNoMes[] {
  const partes = dividirPelasPartes(
    paraDividir,
    socios.map((s) => s.pct)
  )
  return socios.map((s, i) => {
    const reembolso = somarCentavos(
      reembolsos.filter((r) => r.socioId === s.id).map((r) => r.valor)
    )
    const retirou = somarCentavos(retiradas.filter((r) => r.socioId === s.id).map((r) => r.valor))
    const parte = partes[i] ?? centavos(0)
    return {
      id: s.id,
      pct: s.pct,
      parte,
      reembolso,
      retiradas: retirou,
      totalAReceber: centavos(parte + reembolso - retirou)
    }
  })
}

/** Dois sócios: o primeiro muda de 1 em 1% (D-032 p.29) e o outro completa 100%. */
export function ajustarParticipacao(pctPrimeiro: number, passo: number): [number, number] {
  const novo = Math.min(10_000, Math.max(0, pctPrimeiro + passo))
  return [novo, 10_000 - novo]
}

/** "Como pegou" a retirada (D-032 p.30: só as duas do protótipo). */
export type ComoRetirou = 'pix_empresa' | 'dinheiro_caixa'

export const NOME_COMO_RETIROU: Record<ComoRetirou, string> = {
  pix_empresa: 'Pix da conta da empresa',
  dinheiro_caixa: 'Dinheiro do caixa'
}
