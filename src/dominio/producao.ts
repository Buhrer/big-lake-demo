// Planejar e registrar a produção (docs/03 R7; D-032 p.31 a 33).
import {
  centavos,
  custoParaCentavos,
  dividirArredondando,
  type Centavos,
  type CustoX10000,
  type QuantidadeX1000
} from './dinheiro'
import { formatarQuantidade } from './formatar'

export interface ItemParaPlanejar {
  nome: string
  /** "kg", "L", "un" ou o nome da unidade ("lata") */
  rotulo: string
  /** Pode ser negativo (produção sem estoque, p.31). */
  quantidade: QuantidadeX1000
  custo: CustoX10000
}

export interface LinhaDoPlano {
  itemId: number
  nome: string
  rotulo: string
  /** o que a receita usa, já multiplicado pelas receitas feitas */
  usa: QuantidadeX1000
  tem: QuantidadeX1000
  falta: QuantidadeX1000
}

export interface PlanoDeProducao {
  linhas: LinhaDoPlano[]
  faltas: LinhaDoPlano[]
  /** falta × último preço pago */
  custoDaFalta: Centavos
}

/**
 * R7: o que a receita usa (`vezes` = quantas receitas, ×1.000: ½ = 500) contra o estoque.
 * Embalagem: 1 de cada item marcado por unidade (D-032 p.9). "Gás e energia" não tem estoque.
 */
export function planejarProducao(
  receita: {
    rendimento: number
    ingredientes: readonly { itemId: number; quantidade: QuantidadeX1000 }[]
    embalagens: readonly number[]
  },
  vezes: QuantidadeX1000,
  itens: ReadonlyMap<number, ItemParaPlanejar>
): PlanoDeProducao {
  const pedidos = [
    ...receita.ingredientes.map((i) => ({
      itemId: i.itemId,
      usa: Number(dividirArredondando(BigInt(i.quantidade) * BigInt(vezes), 1000n))
    })),
    // rendimento (unidades) × vezes/1.000, na escala ×1.000
    ...receita.embalagens.map((itemId) => ({ itemId, usa: receita.rendimento * vezes }))
  ]
  const linhas: LinhaDoPlano[] = []
  let custoFalta = 0n
  for (const p of pedidos) {
    const item = itens.get(p.itemId)
    if (!item) continue
    const falta = Math.max(0, p.usa - Math.max(item.quantidade, 0))
    custoFalta += dividirArredondando(BigInt(falta) * BigInt(item.custo), 1000n)
    linhas.push({
      itemId: p.itemId,
      nome: item.nome,
      rotulo: item.rotulo,
      usa: p.usa,
      tem: item.quantidade,
      falta
    })
  }
  return {
    linhas,
    faltas: linhas.filter((l) => l.falta > 0),
    custoDaFalta: custoParaCentavos(Number(custoFalta))
  }
}

/** Quantas unidades a produção deve render: rendimento × receitas, arredondado. */
export function unidadesPrevistas(rendimento: number, vezes: QuantidadeX1000): number {
  return Number(dividirArredondando(BigInt(rendimento) * BigInt(vezes), 1000n))
}

/** Custo da produção no dia: custo de cada (×10.000) × unidades previstas, em centavos. */
export function custoDaProducao(custoDeCada: CustoX10000, unidades: number): Centavos {
  return centavos(custoParaCentavos(custoDeCada * unidades))
}

/** "½ receita" · "1 receita" · "1,5 receita" · "2 receitas" */
export function textoDasReceitas(vezes: QuantidadeX1000): string {
  if (vezes === 500) return '½ receita'
  const n = formatarQuantidade(vezes)
  return `${n} ${vezes >= 2000 ? 'receitas' : 'receita'}`
}
