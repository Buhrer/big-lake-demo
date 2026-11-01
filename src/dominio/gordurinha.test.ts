import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  oQueComeu,
  precoReajustado,
  previsaoDoFim,
  reajusteSugerido,
  situacao,
  somaComida,
  textoMaisComeram,
  usoMedioPorMes
} from './gordurinha'

const base = centavos(1_500_000)

describe('T9 · Gordurinha', () => {
  it('base 15.000,00; 10%; comido 930,00 → total 1.500,00; resta 570,00 (38%); Atenção', () => {
    expect(situacao(base, 1000, centavos(93_000))).toEqual({
      total: 150_000,
      comido: 93_000,
      resta: 57_000,
      percentual: 38,
      status: 'atencao'
    })
  })

  it('comido 1.600,00 → resta 0,00 (0%); Hora de reajustar', () => {
    expect(situacao(base, 1000, centavos(160_000))).toMatchObject({
      resta: 0,
      percentual: 0,
      status: 'reajustar'
    })
  })

  it('comido 500,00 → resta 1.000,00 (67%); Tranquilo', () => {
    expect(situacao(base, 1000, centavos(50_000))).toMatchObject({
      resta: 100_000,
      percentual: 67,
      status: 'tranquilo'
    })
  })

  it('limites: 50% é Atenção; 20% é Atenção; 19% é Hora de reajustar', () => {
    expect(situacao(base, 1000, centavos(75_000)).status).toBe('atencao')
    expect(situacao(base, 1000, centavos(120_000)).status).toBe('atencao')
    expect(situacao(base, 1000, centavos(121_500)).status).toBe('reajustar')
  })

  it('faturamento médio 40.000,00; comido 930,00 → reajuste 2,3%', () => {
    expect(reajusteSugerido(centavos(93_000), centavos(4_000_000))).toBe(23)
    expect(reajusteSugerido(centavos(0), centavos(4_000_000))).toBeNull()
    expect(reajusteSugerido(centavos(93_000), centavos(0))).toBeNull()
  })

  it('Paleta 10,00 → 10,23 → R$ 10,50; Picolé 7,00 → 7,16 → R$ 7,50; Pote 49,00 → 50,14 → R$ 50,50', () => {
    const r = (p: number) => precoReajustado(centavos(p), centavos(93_000), centavos(4_000_000))
    expect(r(1000)).toEqual({ novo: 1023, arredondado: 1050 })
    expect(r(700)).toEqual({ novo: 716, arredondado: 750 })
    expect(r(4900)).toEqual({ novo: 5014, arredondado: 5050 })
  })

  it('preço já redondo não sobe à toa', () => {
    expect(precoReajustado(centavos(1000), centavos(0), centavos(4_000_000))).toEqual({
      novo: 1000,
      arredondado: 1000
    })
  })
})

describe('o que comeu a gordurinha (protótipo)', () => {
  const itens = oQueComeu(
    [
      // morango R$ 14,00 → 18,00, usa ~80 kg por mês = +320,00
      { nome: 'Morango', rotulo: 'kg', antes: 140000, agora: 180000, usoPorMes: 80000 },
      // leite R$ 4,20 → 4,89, ~350 L = +241,50
      { nome: 'Leite integral', rotulo: 'L', antes: 42000, agora: 48900, usoPorMes: 350000 },
      // saquinho R$ 0,24 → 0,27, ~1.700 = +51,00
      { nome: 'Saquinho', rotulo: 'un', antes: 2400, agora: 2700, usoPorMes: 1_700_000 },
      // caiu de preço: não entra
      { nome: 'Açúcar', rotulo: 'kg', antes: 50000, agora: 42000, usoPorMes: 100000 },
      // subiu, mas ainda sem produção registrada: entra com R$ 0,00
      { nome: 'Liga', rotulo: 'kg', antes: 30000, agora: 32000, usoPorMes: 0 }
    ],
    [
      { nome: 'Energia elétrica', antes: centavos(284_000), agora: centavos(295_000) },
      { nome: 'Aluguel', antes: centavos(350_000), agora: centavos(350_000) }
    ]
  )

  it('cada aumento × uso do mês; contas pela diferença; do que mais comeu', () => {
    expect(itens.map((i) => [i.nome, i.valor])).toEqual([
      ['Morango', 32000],
      ['Leite integral', 24150],
      ['Energia elétrica', 11000],
      ['Saquinho', 5100],
      ['Liga', 0]
    ])
    expect(somaComida(itens)).toBe(72250)
  })

  it('"Mais comeram: morango, leite integral e energia elétrica."', () => {
    expect(textoMaisComeram(itens)).toBe(
      'Mais comeram: morango, leite integral e energia elétrica.'
    )
    expect(textoMaisComeram([{ nome: 'Morango' }])).toBe('Mais comeu: morango.')
    expect(textoMaisComeram([])).toBeNull()
  })
})

describe('previsão de quando acaba', () => {
  it('reajuste em 10/03, hoje 16/10 (7 meses), comeu 930 e restam 570 → ~4 meses → fevereiro de 2027', () => {
    expect(previsaoDoFim('2026-03-10', '2026-10-16', centavos(93_000), centavos(57_000))).toEqual({
      mes: 2,
      ano: 2027
    })
  })
  it('nada comido: sem previsão; já acabou: este mês', () => {
    expect(previsaoDoFim('2026-03-10', '2026-10-16', centavos(0), centavos(150_000))).toBeNull()
    expect(previsaoDoFim('2026-03-10', '2026-10-16', centavos(160_000), centavos(0))).toEqual({
      mes: 10,
      ano: 2026
    })
  })
  it('reajuste recente conta como 1 mês', () => {
    // 15 dias, comeu 300, restam 1.200 → 4 meses
    expect(previsaoDoFim('2026-10-01', '2026-10-16', centavos(30_000), centavos(120_000))).toEqual({
      mes: 2,
      ano: 2027
    })
  })
})

describe('uso médio por mês', () => {
  it('total ÷ meses; sem meses, zero', () => {
    expect(usoMedioPorMes(960_000, 12)).toBe(80_000)
    expect(usoMedioPorMes(5_000, 3)).toBe(1_667)
    expect(usoMedioPorMes(5_000, 0)).toBe(0)
  })
})
