import { describe, expect, it } from 'vitest'
import {
  custoDaProducao,
  planejarProducao,
  textoDasReceitas,
  unidadesPrevistas,
  type ItemParaPlanejar
} from './producao'

// T2/T13: Paleta de Morango recheada (rende 100)
const ITENS = new Map<number, ItemParaPlanejar>([
  [1, { nome: 'Morango', rotulo: 'kg', quantidade: 3500, custo: 180000 }],
  [2, { nome: 'Açúcar refinado', rotulo: 'kg', quantidade: 50000, custo: 42000 }],
  [3, { nome: 'Leite condensado', rotulo: 'lata', quantidade: 30000, custo: 69000 }],
  [4, { nome: 'Creme de leite', rotulo: 'L', quantidade: 18000, custo: 215000 }],
  [5, { nome: 'Leite integral', rotulo: 'L', quantidade: 30000, custo: 48900 }],
  [6, { nome: 'Liga neutra', rotulo: 'kg', quantidade: 2000, custo: 320000 }],
  [7, { nome: 'Palito', rotulo: 'un', quantidade: 1_200_000, custo: 800 }],
  [8, { nome: 'Saquinho plástico', rotulo: 'un', quantidade: 900_000, custo: 2700 }],
  [9, { nome: 'Etiqueta', rotulo: 'un', quantidade: 2_000_000, custo: 600 }]
])
const PALETA = {
  rendimento: 100,
  ingredientes: [
    { itemId: 1, quantidade: 5000 },
    { itemId: 2, quantidade: 2500 },
    { itemId: 3, quantidade: 15000 },
    { itemId: 4, quantidade: 2500 },
    { itemId: 5, quantidade: 5000 },
    { itemId: 6, quantidade: 120 }
  ],
  embalagens: [7, 8, 9]
}

describe('T13 · planejar a produção', () => {
  const p = planejarProducao(PALETA, 1000, ITENS)
  it('o que a receita usa: ingredientes e 100 de cada embalagem', () => {
    expect(p.linhas.map((l) => [l.nome, l.usa, l.tem])).toEqual([
      ['Morango', 5000, 3500],
      ['Açúcar refinado', 2500, 50000],
      ['Leite condensado', 15000, 30000],
      ['Creme de leite', 2500, 18000],
      ['Leite integral', 5000, 30000],
      ['Liga neutra', 120, 2000],
      ['Palito', 100_000, 1_200_000],
      ['Saquinho plástico', 100_000, 900_000],
      ['Etiqueta', 100_000, 2_000_000]
    ])
  })
  it('falta 1,5 kg de morango; custo estimado R$ 27,00', () => {
    expect(p.faltas.map((l) => [l.nome, l.falta])).toEqual([['Morango', 1500]])
    expect(p.custoDaFalta).toBe(2700)
  })
  it('tudo no estoque: nenhuma falta', () => {
    const cheio = new Map(ITENS)
    cheio.set(1, { ...ITENS.get(1)!, quantidade: 5000 })
    const q = planejarProducao(PALETA, 1000, cheio)
    expect(q.faltas).toEqual([])
    expect(q.custoDaFalta).toBe(0)
  })
  it('meia receita e duas receitas (D-032 p.32)', () => {
    const meia = planejarProducao(PALETA, 500, ITENS)
    expect(meia.linhas[0]).toMatchObject({ usa: 2500, falta: 0 })
    expect(meia.linhas[6]).toMatchObject({ usa: 50_000 })
    const duas = planejarProducao(PALETA, 2000, ITENS)
    expect(duas.linhas[0]).toMatchObject({ usa: 10_000, falta: 6500 })
    expect(duas.custoDaFalta).toBe(11700)
  })
  it('estoque negativo: falta tudo o que a receita usa', () => {
    const neg = new Map(ITENS)
    neg.set(1, { ...ITENS.get(1)!, quantidade: -1000 })
    expect(planejarProducao(PALETA, 1000, neg).linhas[0]!.falta).toBe(5000)
  })
  it('item apagado do estoque não aparece', () => {
    const sem = new Map(ITENS)
    sem.delete(6)
    expect(planejarProducao(PALETA, 1000, sem).linhas.map((l) => l.nome)).not.toContain(
      'Liga neutra'
    )
  })
})

describe('unidades previstas', () => {
  it('rendimento × receitas, arredondado', () => {
    expect(unidadesPrevistas(100, 1000)).toBe(100)
    expect(unidadesPrevistas(100, 500)).toBe(50)
    expect(unidadesPrevistas(15, 500)).toBe(8)
    expect(unidadesPrevistas(10, 2500)).toBe(25)
  })
})

describe('custo da produção no dia', () => {
  it('T2: custo de cada R$ 3,3504 × 100 = R$ 335,04', () => {
    expect(custoDaProducao(33504, 100)).toBe(33504)
  })
})

describe('texto das receitas feitas', () => {
  it('½, 1, 1,5 e 2', () => {
    expect(textoDasReceitas(500)).toBe('½ receita')
    expect(textoDasReceitas(1000)).toBe('1 receita')
    expect(textoDasReceitas(1500)).toBe('1,5 receita')
    expect(textoDasReceitas(2000)).toBe('2 receitas')
  })
})
