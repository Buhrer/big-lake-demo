import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import { custoDoProduto, descreverTamanho, precosDoProduto } from './produto'

describe('preço do produto (fixo da categoria, R1)', () => {
  it('unidade, pote e copo: o preço da categoria', () => {
    expect(
      precosDoProduto({ balcao: centavos(4900), atacado: centavos(4500) }, 'pote', null)
    ).toEqual({ balcao: 4900, atacado: 4500 })
  })
  it('T6: caixa de 20 picolés = 20 × R$ 5,50 = R$ 110,00 no atacado', () => {
    expect(precosDoProduto({ balcao: centavos(700), atacado: centavos(550) }, 'caixa', 20)).toEqual(
      {
        balcao: 14000,
        atacado: 11000
      }
    )
  })
  it('caixa sem quantidade conta como 1', () => {
    expect(
      precosDoProduto({ balcao: centavos(700), atacado: centavos(550) }, 'caixa', null).atacado
    ).toBe(550)
  })
})

describe('custo do produto (vem da receita)', () => {
  it('Sorvete de Morango, pote 2 L: R$ 27,92', () => {
    expect(custoDoProduto(279200, 'pote', null)).toBe(279200)
  })
  it('caixa: quantidade × custo de cada', () => {
    expect(custoDoProduto(12000, 'caixa', 20)).toBe(240000)
  })
  it('sem receita, sem custo', () => {
    expect(custoDoProduto(null, 'unidade', null)).toBeNull()
  })
})

describe('tamanho na lista', () => {
  it('como no protótipo', () => {
    expect(descreverTamanho('unidade', 110000, 'g', null)).toBe('1 unidade · 110 g')
    expect(descreverTamanho('pote', 2000, 'L', null)).toBe('pote · 2 L')
    expect(descreverTamanho('copo', 300000, 'ml', null)).toBe('copo · 300 ml')
    expect(descreverTamanho('caixa', null, null, 20)).toBe('caixa com 20')
    expect(descreverTamanho('unidade', null, null, null)).toBe('1 unidade')
  })
})
