import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  contasDoMes,
  estoqueBaixo,
  metaDoMes,
  textoDaConta,
  textoDoVencimento,
  vencendoEmBreve
} from './inicio'

describe('T8 · meta do mês (ponto de equilíbrio)', () => {
  it('vendido 32.870,00 em 16 dias; contas 38.500,00 → 85%, faltam 5.630,00, cerca de 3 dias', () => {
    expect(metaDoMes(centavos(3_850_000), centavos(3_287_000), 16)).toEqual({
      meta: 3_850_000,
      vendido: 3_287_000,
      percentual: 85,
      falta: 563_000,
      diasFaltam: 3,
      batida: false
    })
  })

  it('vendido ≥ meta → 100% e meta batida', () => {
    expect(metaDoMes(centavos(1_000_000), centavos(1_200_000), 10)).toMatchObject({
      percentual: 100,
      falta: 0,
      diasFaltam: null,
      batida: true
    })
  })

  it('sem venda ainda: sem ritmo para estimar os dias', () => {
    expect(metaDoMes(centavos(1_000_000), centavos(0), 0)).toMatchObject({
      percentual: 0,
      falta: 1_000_000,
      diasFaltam: null
    })
  })

  it('sem contas no mês: meta zero conta como batida', () => {
    expect(metaDoMes(centavos(0), centavos(0), 0)).toMatchObject({ percentual: 100, batida: true })
  })

  it('dias arredondam para cima', () => {
    // média R$ 100,00/dia; faltam R$ 100,01 → 2 dias
    expect(metaDoMes(centavos(20_001), centavos(10_000), 1).diasFaltam).toBe(2)
  })
})

describe('contas do mês para a meta', () => {
  it('vencem no mês (pagas ou não), sem a fatura do cartão da empresa', () => {
    const c = (vencimento: string, valor: number, fatura = false) => ({
      vencimento,
      valor: centavos(valor),
      fatura
    })
    expect(
      contasDoMes(
        [
          c('2026-10-05', 100000),
          c('2026-10-30', 50000),
          c('2026-11-01', 7000),
          c('2026-10-10', 90000, true)
        ],
        '2026-10'
      )
    ).toBe(150000)
  })
})

const item = (
  id: number,
  nome: string,
  quantidade: number,
  minimo: number,
  lotes: { validade: string | null; quantidade: number }[] = []
) => ({ id, nome, rotulo: 'kg', quantidade, minimo, lotes })

describe('estoque baixo', () => {
  it('só abaixo do mínimo; quem tem menos (em proporção) primeiro', () => {
    const r = estoqueBaixo([
      item(1, 'Leite', 12000, 40000),
      item(2, 'Morango', 3500, 10000),
      item(3, 'Açúcar', 50000, 10000),
      item(4, 'Sem mínimo', 0, 0),
      item(5, 'Pote', 45000, 200000)
    ])
    expect(r.map((i) => i.nome)).toEqual(['Pote', 'Leite', 'Morango'])
  })
})

describe('vencendo em breve (7 dias; vermelho com 3 ou menos)', () => {
  it('cada compra com saldo, a que vence antes primeiro', () => {
    const r = vencendoEmBreve(
      [
        item(1, 'Morango', 5500, 0, [
          { validade: '2026-10-18', quantidade: 3500 },
          { validade: '2026-11-30', quantidade: 2000 }
        ]),
        item(2, 'Manga', 12000, 0, [{ validade: '2026-10-21', quantidade: 12000 }]),
        item(3, 'Creme', 6000, 0, [{ validade: '2026-10-20', quantidade: 6000 }]),
        item(4, 'Leite', 0, 0, [{ validade: '2026-10-17', quantidade: 0 }]),
        item(5, 'Velho', 1000, 0, [{ validade: '2026-10-14', quantidade: 1000 }]),
        item(6, 'Sem validade', 1000, 0, [{ validade: null, quantidade: 1000 }])
      ],
      '2026-10-16'
    )
    expect(r.map((v) => [v.nome, v.dias, v.quantidade])).toEqual([
      ['Velho', -2, 1000],
      ['Morango', 2, 3500],
      ['Creme', 4, 6000],
      ['Manga', 5, 12000]
    ])
  })

  it('textos', () => {
    expect([-1, 0, 1, 2].map(textoDoVencimento)).toEqual(['venceu', 'hoje', 'amanhã', 'em 2 dias'])
  })
})

describe('texto da conta no aviso', () => {
  it('como no protótipo', () => {
    expect(textoDaConta('2026-10-17', '2026-10-16')).toBe('vence amanhã, 17/10')
    expect(textoDaConta('2026-10-19', '2026-10-16')).toBe('vence em 3 dias, 19/10')
    expect(textoDaConta('2026-10-16', '2026-10-16')).toBe('vence hoje, 16/10')
    expect(textoDaConta('2026-10-14', '2026-10-16')).toBe('atrasada, venceu 14/10')
  })
})
