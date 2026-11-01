import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  diferencaPercentual,
  lucroPorProduto,
  maiorMotivo,
  porcentagens,
  rankingDeClientes,
  rankingDeProdutos,
  textoDiferenca,
  textoQuantidadeVendida
} from './relatorios'

describe('Dinheiro, cartão e Pix (protótipo 13-Relatorios__4)', () => {
  it('porcentagens somam 100: 29 · 17 · 26 · 28', () => {
    expect(porcentagens([1_012_000, 601_000, 900_000, 977_000])).toEqual([29, 17, 26, 28])
  })
  it('restos iguais vão para quem vem antes; sem total, tudo zero', () => {
    expect(porcentagens([1, 1, 1])).toEqual([34, 33, 33])
    expect(porcentagens([0, 0])).toEqual([0, 0])
  })
})

describe('Comparar com o ano passado (protótipo 13-Relatorios__5)', () => {
  it('diferenças do protótipo', () => {
    expect(diferencaPercentual(4_120_000, 5_230_000)).toBe(269)
    expect(diferencaPercentual(2_990_000, 3_385_000)).toBe(132)
    expect(diferencaPercentual(1_130_000, 1_845_000)).toBe(633)
    expect(diferencaPercentual(210, 420)).toBe(1000)
  })
  it('sem ano passado não compara; lucro negativo usa o valor sem sinal', () => {
    expect(diferencaPercentual(0, 100)).toBeNull()
    expect(diferencaPercentual(-1000, 500)).toBe(1500)
  })
  it('texto', () => {
    expect([269, -132, 1000, 0, 5].map(textoDiferenca)).toEqual([
      '+26,9%',
      '−13,2%',
      '+100%',
      '0%',
      '+0,5%'
    ])
  })
})

describe('Mais vendidos nos pedidos (protótipo 13-Relatorios__3)', () => {
  it('soma por produto, o que rendeu mais primeiro', () => {
    const r = rankingDeProdutos([
      { produtoId: 2, nome: 'Pote 2 L · Chocolate', quantidade: 10, valor: centavos(45000) },
      { produtoId: 1, nome: 'Pote 2 L · Morango', quantidade: 27, valor: centavos(121500) },
      { produtoId: 2, nome: 'Pote 2 L · Chocolate', quantidade: 13, valor: centavos(58500) },
      { produtoId: 3, nome: 'Picolé de fruta', quantidade: 7, valor: centavos(56000) }
    ])
    expect(r.map((p) => [p.nome, p.quantidade, p.valor])).toEqual([
      ['Pote 2 L · Morango', 27, 121500],
      ['Pote 2 L · Chocolate', 23, 103500],
      ['Picolé de fruta', 7, 56000]
    ])
  })
  it('clientes que mais compraram', () => {
    const r = rankingDeClientes([
      { clienteId: 1, clienteNome: 'Mercado', total: centavos(54000) },
      { clienteId: 2, clienteNome: 'Buffet', total: centavos(148000) },
      { clienteId: 1, clienteNome: 'Mercado', total: centavos(10000) }
    ])
    expect(r).toEqual([
      { clienteId: 2, nome: 'Buffet', pedidos: 1, valor: 148000 },
      { clienteId: 1, nome: 'Mercado', pedidos: 2, valor: 64000 }
    ])
  })
  it('quantidade como o produto é vendido', () => {
    expect(textoQuantidadeVendida(27, 'pote', null)).toBe('27 potes')
    expect(textoQuantidadeVendida(1, 'pote', null)).toBe('1 pote')
    expect(textoQuantidadeVendida(7, 'caixa', 20)).toBe('7 caixas de 20')
    expect(textoQuantidadeVendida(40, 'unidade', null)).toBe('40 un')
    expect(textoQuantidadeVendida(3, 'copo', null)).toBe('3 copos')
  })
})

describe('R15 · Lucro por produto (estimado)', () => {
  const paleta = {
    receitaId: 1,
    nome: 'Paleta de Morango recheada',
    precoBalcao: centavos(1000),
    custoDeCada: 33504
  }
  it('só balcão: (produzidas − perdidas) × lucro de cada no balcão', () => {
    // 430 − 10 = 420 × (10,00 − 3,3504) = 2.792,83
    const [r] = lucroPorProduto([{ ...paleta, produzidas: 430, perdidas: 10, pedidos: [] }])
    expect(r).toEqual({
      receitaId: 1,
      nome: 'Paleta de Morango recheada',
      sairam: 420,
      lucroDeCada: 66496,
      lucro: 279283
    })
  })
  it('pedidos com o valor real; o resto no balcão (D-073)', () => {
    // 100 nos pedidos a R$ 7,00: 100 × (7,00 − 3,3504) = 364,96
    // 320 no balcão: 320 × 6,6496 = 2.127,87 → total 2.492,83
    const [r] = lucroPorProduto([
      {
        ...paleta,
        produzidas: 430,
        perdidas: 10,
        pedidos: [{ unidades: 100, valor: centavos(70000) }]
      }
    ])
    expect(r!.sairam).toBe(420)
    expect(r!.lucro).toBe(249283)
  })
  it('pedido maior que a produção do mês (vendeu do que já tinha): conta o pedido', () => {
    const [r] = lucroPorProduto([
      { ...paleta, produzidas: 0, perdidas: 0, pedidos: [{ unidades: 20, valor: centavos(14000) }] }
    ])
    expect(r!.sairam).toBe(20)
    expect(r!.lucro).toBe(7299)
  })
  it('ranking pelo lucro; sem saída não aparece', () => {
    const r = lucroPorProduto([
      { ...paleta, produzidas: 10, perdidas: 0, pedidos: [] },
      {
        receitaId: 2,
        nome: 'Açaí 500 ml',
        produzidas: 820,
        perdidas: 0,
        pedidos: [],
        precoBalcao: centavos(1800),
        custoDeCada: 51400
      },
      { ...paleta, receitaId: 3, nome: 'Nada', produzidas: 5, perdidas: 5, pedidos: [] }
    ])
    expect(r.map((p) => [p.nome, p.lucro])).toEqual([
      ['Açaí 500 ml', 1_054_520],
      ['Paleta de Morango recheada', 6650]
    ])
  })
})

describe('Perdas: maior motivo', () => {
  it('o que mais custou; empate, o que aparece mais', () => {
    expect(
      maiorMotivo([
        { motivo: 'Venceu', valor: centavos(8700) },
        { motivo: 'Derreteu', valor: centavos(6830) },
        { motivo: 'Venceu', valor: centavos(2150) }
      ])
    ).toBe('Venceu')
    expect(
      maiorMotivo([
        { motivo: 'A', valor: centavos(100) },
        { motivo: 'B', valor: centavos(50) },
        { motivo: 'B', valor: centavos(50) }
      ])
    ).toBe('B')
    expect(maiorMotivo([])).toBeNull()
  })
})
