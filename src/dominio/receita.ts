// Custo e lucro das receitas (docs/03 R3, R4; D-041, D-043).
// Contas com a precisão máxima e arredondamento só no fim (4 casas no custo de cada).
import {
  custoParaCentavos,
  dividirArredondando,
  percentualInteiro,
  type Centavos,
  type CustoX10000,
  type QuantidadeX1000
} from './dinheiro'

/** Um ingrediente: quantidade na receita × custo por unidade do insumo. */
export interface ItemDaReceita {
  quantidade: QuantidadeX1000
  custo: CustoX10000
}

/** D-041 (A, B, C) e D-052 (não contar: o gás e a energia entram só como conta a pagar). */
export type ModoGasEnergia = 'ingrediente' | 'fixo' | 'por_receita' | 'nao_usar'

/** "Gás e energia da produção" (D-041). */
export interface GasEnergia {
  modo: ModoGasEnergia
  /** A: quantas vezes a receita usa (×1.000); null = a receita não usa. */
  vezes: QuantidadeX1000 | null
  /** A: preço de cada vez (o item especial do Estoque). */
  precoPorVez: Centavos
  /** B: valor somado em toda receita. */
  valorFixo: Centavos
  /** C: valor próprio desta receita. */
  valorDaReceita: Centavos | null
}

export const SEM_GAS: GasEnergia = {
  modo: 'por_receita',
  vezes: null,
  precoPorVez: 0 as Centavos,
  valorFixo: 0 as Centavos,
  valorDaReceita: null
}

export interface CustoDaReceita {
  /** Só o gás e energia (×10.000). */
  gas: CustoX10000
  /** Ingredientes + gás e energia, como em "Custo dos ingredientes" (×10.000). */
  ingredientes: CustoX10000
  embalagem: CustoX10000
  total: CustoX10000
  custoDeCada: CustoX10000
}

/** Gás e energia em ×10⁷ (quantidade ×1.000 × reais ×10.000), conforme o jeito escolhido. */
function gasExato(g: GasEnergia): bigint {
  switch (g.modo) {
    case 'ingrediente':
      // vezes (×1.000) × centavos → ×10⁵; ×100 → ×10⁷
      return g.vezes === null ? 0n : BigInt(g.vezes) * BigInt(g.precoPorVez) * 100n
    case 'fixo':
      return BigInt(g.valorFixo) * 100_000n
    case 'por_receita':
      return BigInt(g.valorDaReceita ?? 0) * 100_000n
    case 'nao_usar':
      return 0n
  }
}

const PARA_X10000 = 1000n

export function calcularReceita(r: {
  ingredientes: readonly ItemDaReceita[]
  /** preço de cada item de embalagem por unidade (×10.000) */
  embalagens: readonly CustoX10000[]
  rendimento: number
  gas: GasEnergia
}): CustoDaReceita {
  if (!Number.isInteger(r.rendimento) || r.rendimento <= 0) {
    throw new RangeError('Diga quantas unidades a receita rende.')
  }
  // ×10⁷ = quantidade (×1.000) × custo (×10.000)
  const gas = gasExato(r.gas)
  const ingredientes =
    r.ingredientes.reduce((s, i) => s + BigInt(i.quantidade) * BigInt(i.custo), 0n) + gas
  const embalagem =
    r.embalagens.reduce((s, c) => s + BigInt(c), 0n) * BigInt(r.rendimento) * PARA_X10000
  const total = ingredientes + embalagem
  const x10000 = (v: bigint) => Number(dividirArredondando(v, PARA_X10000))
  return {
    gas: x10000(gas),
    ingredientes: x10000(ingredientes),
    embalagem: x10000(embalagem),
    total: x10000(total),
    custoDeCada: Number(dividirArredondando(total, PARA_X10000 * BigInt(r.rendimento)))
  }
}

export interface LucroNaVenda {
  /** preço − custo de cada (×10.000) */
  lucroDeCada: CustoX10000
  /** "% do preço" que vira lucro */
  percentual: number
  /** lucro de cada × rendimento, em centavos */
  lucroDaReceita: Centavos
}

export function lucroNaVenda(
  preco: Centavos,
  custoDeCada: CustoX10000,
  rendimento: number
): LucroNaVenda {
  const precoX10000 = preco * 100
  const lucroDeCada = precoX10000 - custoDeCada
  return {
    lucroDeCada,
    percentual: percentualInteiro(BigInt(lucroDeCada), BigInt(precoX10000)),
    lucroDaReceita: custoParaCentavos(lucroDeCada * rendimento)
  }
}

/** Marca a receita de menor lucro (só quando há mais de uma para comparar). */
export function marcarMenorLucro(receitas: readonly { lucro: number }[]): boolean[] {
  if (receitas.length < 2) return receitas.map(() => false)
  const menor = Math.min(...receitas.map((r) => r.lucro))
  const indice = receitas.findIndex((r) => r.lucro === menor)
  return receitas.map((_, i) => i === indice)
}

const PLURAIS_ESPECIAIS: Record<string, string> = { pão: 'pães', mão: 'mãos' }

function pluralDeUmaPalavra(p: string): string {
  if (PLURAIS_ESPECIAIS[p]) return PLURAIS_ESPECIAIS[p]
  if (p.endsWith('ão')) return p.slice(0, -2) + 'ões'
  if (p.endsWith('el')) return p.slice(0, -2) + 'éis'
  if (/[aiou]l$/.test(p)) return p.slice(0, -1) + 'is'
  if (/[rz]$/.test(p)) return p + 'es'
  if (p.endsWith('m')) return p.slice(0, -1) + 'ns'
  if (p.endsWith('s')) return p
  return p + 's'
}

/** "paleta" → "paletas"; "sorvete de pote" → "sorvetes de pote". */
export function pluralizar(nome: string): string {
  const [primeira = '', ...resto] = nome.trim().split(' ')
  return [pluralDeUmaPalavra(primeira), ...resto].join(' ')
}
