// Produtos à venda: preço fixo da categoria e custo da receita (R1, R4; D-045).
import { centavos, type Centavos, type CustoX10000, type QuantidadeX1000 } from './dinheiro'
import { formatarQuantidade } from './formatar'

export type VendidoComo = 'unidade' | 'pote' | 'copo' | 'caixa'
export type UnidadeMedida = 'g' | 'kg' | 'ml' | 'L'

export const VENDIDO_COMO: Record<VendidoComo, string> = {
  unidade: 'Unidade',
  pote: 'Pote',
  copo: 'Copo',
  caixa: 'Caixa'
}

function quantasNaCaixa(vendidoComo: VendidoComo, porCaixa: number | null): number {
  return vendidoComo === 'caixa' ? Math.max(1, porCaixa ?? 1) : 1
}

export function precosDoProduto(
  categoria: { balcao: Centavos; atacado: Centavos },
  vendidoComo: VendidoComo,
  porCaixa: number | null
): { balcao: Centavos; atacado: Centavos } {
  const n = quantasNaCaixa(vendidoComo, porCaixa)
  return { balcao: centavos(categoria.balcao * n), atacado: centavos(categoria.atacado * n) }
}

/** Custo de cada produto: o custo de cada da receita (× quantidade na caixa). */
export function custoDoProduto(
  custoDeCadaDaReceita: CustoX10000 | null,
  vendidoComo: VendidoComo,
  porCaixa: number | null
): CustoX10000 | null {
  if (custoDeCadaDaReceita === null) return null
  return custoDeCadaDaReceita * quantasNaCaixa(vendidoComo, porCaixa)
}

/** "1 unidade · 110 g", "pote · 2 L", "caixa com 20". */
export function descreverTamanho(
  vendidoComo: VendidoComo,
  medida: QuantidadeX1000 | null,
  unidade: UnidadeMedida | null,
  porCaixa: number | null
): string {
  const como =
    vendidoComo === 'unidade'
      ? '1 unidade'
      : vendidoComo === 'caixa'
        ? `caixa com ${porCaixa ?? 1}`
        : vendidoComo
  return medida !== null && unidade ? `${como} · ${formatarQuantidade(medida)} ${unidade}` : como
}
