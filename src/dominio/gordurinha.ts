// Gordurinha: a folga posta nos preços no último reajuste (docs/03 R14, T9; D-071, D-074).
import {
  aplicarPercentual,
  arredondarParaCimaMultiplo,
  centavos,
  dividirArredondando,
  somarCentavos,
  type Centavos,
  type CustoX10000,
  type PercentualX100,
  type QuantidadeX1000
} from './dinheiro'
import { diferencaEmDias, partes, type DataISO } from './datas'

export type StatusGordurinha = 'tranquilo' | 'atencao' | 'reajustar'

export const NOME_STATUS: Record<StatusGordurinha, string> = {
  tranquilo: 'Tranquilo',
  atencao: 'Atenção',
  reajustar: 'Hora de reajustar'
}

/** Um insumo que subiu: custo no reajuste × agora, e o uso médio por mês (das produções). */
export interface InsumoParaGordurinha {
  nome: string
  rotulo: string
  antes: CustoX10000
  agora: CustoX10000
  /** quanto usa por mês (×1.000); 0 = ainda sem produção registrada */
  usoPorMes: QuantidadeX1000
}

/** Uma conta fixa marcada: valor no reajuste × a conta mais nova. */
export interface ContaParaGordurinha {
  nome: string
  antes: Centavos
  agora: Centavos
}

export interface ItemComido {
  nome: string
  tipo: 'insumo' | 'conta'
  rotulo: string
  /** insumo: custo de cada; conta: valor do mês (×10.000, para mostrar os dois do mesmo jeito) */
  antes: CustoX10000
  agora: CustoX10000
  usoPorMes: QuantidadeX1000
  /** a mais por mês */
  valor: Centavos
}

/** Quanto cada aumento come por mês. Só o que subiu; insumo sem uso registrado não come nada. */
export function oQueComeu(
  insumos: readonly InsumoParaGordurinha[],
  contas: readonly ContaParaGordurinha[]
): ItemComido[] {
  const lista: ItemComido[] = [
    ...insumos
      .filter((i) => i.agora > i.antes)
      .map((i) => ({
        nome: i.nome,
        tipo: 'insumo' as const,
        rotulo: i.rotulo,
        antes: i.antes,
        agora: i.agora,
        usoPorMes: i.usoPorMes,
        // (agora − antes) ×10.000 por unidade × uso ×1.000 → centavos
        valor: centavos(
          Number(dividirArredondando(BigInt(i.agora - i.antes) * BigInt(i.usoPorMes), 100_000n))
        )
      })),
    ...contas
      .filter((c) => c.agora > c.antes)
      .map((c) => ({
        nome: c.nome,
        tipo: 'conta' as const,
        rotulo: '',
        antes: c.antes * 100,
        agora: c.agora * 100,
        usoPorMes: 0,
        valor: centavos(c.agora - c.antes)
      }))
  ]
  return lista.sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export interface SituacaoGordurinha {
  /** base × % */
  total: Centavos
  comido: Centavos
  resta: Centavos
  /** 0 a 100 */
  percentual: number
  status: StatusGordurinha
}

/** T9: > 50% Tranquilo · 20% a 50% Atenção · < 20% Hora de reajustar. */
export function situacao(
  base: Centavos,
  pct: PercentualX100,
  comido: Centavos
): SituacaoGordurinha {
  const total = aplicarPercentual(base, pct)
  const resta = centavos(Math.max(0, total - comido))
  const percentual = total > 0 ? Math.round((resta * 100) / total) : 0
  const fracao = total > 0 ? resta / total : 0
  const status: StatusGordurinha =
    fracao > 0.5 ? 'tranquilo' : fracao >= 0.2 ? 'atencao' : 'reajustar'
  return { total, comido, resta, percentual, status }
}

export function somaComida(itens: readonly { valor: Centavos }[]): Centavos {
  return somarCentavos(itens.map((i) => i.valor))
}

/**
 * Por volta de quando acaba, no ritmo de agora: ritmo = comido ÷ meses desde o reajuste
 * (pelo menos 1). null quando nada foi comido; o mês de hoje quando já acabou.
 */
export function previsaoDoFim(
  dataReajuste: DataISO,
  hoje: DataISO,
  comido: Centavos,
  resta: Centavos
): { mes: number; ano: number } | null {
  if (comido <= 0) return null
  const meses = Math.max(1, diferencaEmDias(dataReajuste, hoje) / 30.44)
  const faltam = Math.round(resta / (comido / meses))
  const { ano, mes } = partes(hoje)
  const indice = ano * 12 + (mes - 1) + faltam
  return { mes: (indice % 12) + 1, ano: Math.floor(indice / 12) }
}

/** Reajuste para encher a gordurinha de novo: comido ÷ faturamento médio do mês (×1.000: 2,3% = 23). */
export function reajusteSugerido(comido: Centavos, faturamentoMedio: Centavos): number | null {
  if (faturamentoMedio <= 0 || comido <= 0) return null
  return Number(dividirArredondando(BigInt(comido) * 1000n, BigInt(faturamentoMedio)))
}

/**
 * Preço novo (D-071: vale para balcão e atacado): preço × (1 + comido ÷ faturamento médio),
 * e arredondado para cima a R$ 0,50.
 */
export function precoReajustado(
  preco: Centavos,
  comido: Centavos,
  faturamentoMedio: Centavos
): { novo: Centavos; arredondado: Centavos } {
  const novo =
    faturamentoMedio > 0
      ? centavos(
          preco +
            Number(dividirArredondando(BigInt(preco) * BigInt(comido), BigInt(faturamentoMedio)))
        )
      : preco
  return { novo, arredondado: arredondarParaCimaMultiplo(novo, 50) }
}

/** "Mais comeram: morango, leite e energia." (os 3 primeiros, em minúsculas) */
export function textoMaisComeram(itens: readonly { nome: string }[]): string | null {
  const nomes = itens.slice(0, 3).map((i) => i.nome.toLowerCase())
  if (nomes.length === 0) return null
  const lista = nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
  return `${nomes.length === 1 ? 'Mais comeu' : 'Mais comeram'}: ${lista}.`
}

/** Uso médio por mês: o total usado nas produções ÷ meses com uso nos últimos 12 meses (pelo menos 1). */
export function usoMedioPorMes(totalUsado: QuantidadeX1000, meses: number): QuantidadeX1000 {
  return meses > 0 ? Math.round(totalUsado / meses) : 0
}
