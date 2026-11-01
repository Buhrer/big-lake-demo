import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  ajustar,
  aumentoPercentual,
  baixar,
  baixarComDetalhe,
  custoDeReais,
  custoPorUnidade,
  entrar,
  etiquetaValidade,
  estaVencendo,
  resumoValidade,
  rotuloUnidade,
  situacao,
  textoEntrada,
  validadeCurta,
  type EstadoEstoque
} from './estoque'

const HOJE = '2026-10-16'

describe('T4 · custo por unidade', () => {
  it('20 kg de morango por R$ 360,00 = R$ 18,00/kg', () => {
    expect(custoPorUnidade(centavos(36000), 20000)).toBe(180000)
  })
  it('4 casas: 12 latas por R$ 82,80 = R$ 6,90; 3 kg por R$ 10,00 = R$ 3,3333', () => {
    expect(custoPorUnidade(centavos(8280), 12000)).toBe(69000)
    expect(custoPorUnidade(centavos(1000), 3000)).toBe(33333)
  })
  it('quantidade zero é recusada', () => {
    expect(() => custoPorUnidade(centavos(36000), 0)).toThrow('Digite a quantidade.')
  })
  it('custo digitado em reais (Editar)', () => {
    expect(custoDeReais(centavos(489))).toBe(48900)
  })
})

describe('unidade', () => {
  it('nome da unidade substitui "un" (D-039)', () => {
    expect(rotuloUnidade('un', 'lata')).toBe('lata')
    expect(rotuloUnidade('un', '  ')).toBe('un')
    expect(rotuloUnidade('kg', null)).toBe('kg')
  })
})

describe('situação', () => {
  it('abaixo do mínimo = Comprar; igual ou acima = OK', () => {
    expect(situacao(3500, 10000)).toBe('comprar')
    expect(situacao(10000, 10000)).toBe('ok')
    expect(situacao(-1500, 0)).toBe('comprar')
  })
})

describe('compras (lotes): vence antes, sai antes', () => {
  const estado: EstadoEstoque = {
    quantidade: 18000,
    lotes: [
      { id: 1, validade: '2026-10-30', quantidade: 12000 },
      { id: 2, validade: '2026-10-20', quantidade: 6000 }
    ]
  }

  it('baixar tira primeiro da que vence antes', () => {
    expect(baixar(estado, 8000)).toEqual({
      quantidade: 10000,
      lotes: [
        { id: 1, validade: '2026-10-30', quantidade: 10000 },
        { id: 2, validade: '2026-10-20', quantidade: 0 }
      ]
    })
  })

  it('sem validade sai por último', () => {
    const r = baixar(
      {
        quantidade: 5000,
        lotes: [
          { id: 1, validade: null, quantidade: 3000 },
          { id: 2, validade: '2027-01-01', quantidade: 2000 }
        ]
      },
      2500
    )
    expect(r.lotes).toEqual([
      { id: 1, validade: null, quantidade: 2500 },
      { id: 2, validade: '2027-01-01', quantidade: 0 }
    ])
  })

  it('baixar mais do que tem deixa o estoque negativo (pergunta 31) e zera as compras', () => {
    const r = baixar(estado, 20000)
    expect(r.quantidade).toBe(-2000)
    expect(r.lotes.every((l) => l.quantidade === 0)).toBe(true)
  })

  it('entrada soma ao estoque e cria uma compra com a validade', () => {
    expect(entrar(estado, 20000, '2026-10-22')).toEqual({
      quantidade: 38000,
      lotes: [...estado.lotes, { id: null, validade: '2026-10-22', quantidade: 20000 }]
    })
  })

  it('entrada com estoque negativo: a compra só fica com o que sobrou', () => {
    const negativo: EstadoEstoque = { quantidade: -1500, lotes: [] }
    expect(entrar(negativo, 20000, '2026-10-22')).toEqual({
      quantidade: 18500,
      lotes: [{ id: null, validade: '2026-10-22', quantidade: 18500 }]
    })
    expect(entrar(negativo, 1000, null)).toEqual({ quantidade: -500, lotes: [] })
  })

  it('ajustar no Editar: diminuir baixa; aumentar cria saldo sem validade (D-036)', () => {
    expect(ajustar(estado, 15000).lotes).toEqual([
      { id: 1, validade: '2026-10-30', quantidade: 12000 },
      { id: 2, validade: '2026-10-20', quantidade: 3000 }
    ])
    expect(ajustar(estado, 20000).lotes.at(-1)).toEqual({
      id: null,
      validade: null,
      quantidade: 2000
    })
    expect(ajustar(estado, 18000)).toEqual(estado)
  })
})

describe('validade na lista (D-040)', () => {
  it('perto: dd/mm; longe: mm/aaaa', () => {
    expect(validadeCurta('2026-10-25', HOJE)).toBe('25/10')
    expect(validadeCurta('2026-11-16', HOJE)).toBe('16/11')
    expect(validadeCurta('2026-11-17', HOJE)).toBe('11/2026')
    expect(validadeCurta('2027-03-31', HOJE)).toBe('03/2027')
    expect(validadeCurta('2026-10-10', HOJE)).toBe('10/10')
  })

  it('etiquetas: vermelha até 3 dias, amarela até 7', () => {
    expect(etiquetaValidade('2026-10-18', HOJE)).toEqual({
      nivel: 'erro',
      texto: 'vence em 2 dias'
    })
    expect(etiquetaValidade('2026-10-20', HOJE)).toEqual({
      nivel: 'atencao',
      texto: 'vence em 4 dias'
    })
    expect(etiquetaValidade('2026-10-23', HOJE)).toEqual({
      nivel: 'atencao',
      texto: 'vence em 7 dias'
    })
    expect(etiquetaValidade('2026-10-24', HOJE)).toBeNull()
    expect(etiquetaValidade('2026-10-17', HOJE)?.texto).toBe('vence amanhã')
    expect(etiquetaValidade('2026-10-16', HOJE)?.texto).toBe('vence hoje')
    expect(etiquetaValidade('2026-10-15', HOJE)).toEqual({ nivel: 'erro', texto: 'venceu' })
  })

  it('resumo: a compra que vence primeiro, com a quantidade se não for tudo', () => {
    const creme: EstadoEstoque = {
      quantidade: 18000,
      lotes: [
        { id: 1, validade: '2026-10-30', quantidade: 12000 },
        { id: 2, validade: '2026-10-20', quantidade: 6000 }
      ]
    }
    expect(resumoValidade(creme, HOJE, 'L')).toEqual({
      texto: '20/10 (6\u00a0L)',
      etiqueta: { nivel: 'atencao', texto: 'vence em 4 dias' }
    })
    const morango: EstadoEstoque = {
      quantidade: 3500,
      lotes: [{ id: 1, validade: '2026-10-18', quantidade: 3500 }]
    }
    expect(resumoValidade(morango, HOJE, 'kg')?.texto).toBe('18/10')
  })

  it('compras já usadas (saldo zero) e sem validade não contam', () => {
    expect(
      resumoValidade(
        {
          quantidade: 900,
          lotes: [
            { id: 1, validade: '2026-10-17', quantidade: 0 },
            { id: 2, validade: null, quantidade: 900 }
          ]
        },
        HOJE,
        'un'
      )
    ).toBeNull()
  })

  it('"Vencendo" = até 7 dias ou vencida', () => {
    const lote = (validade: string) => ({
      quantidade: 1000,
      lotes: [{ id: 1, validade, quantidade: 1000 }]
    })
    expect(estaVencendo(lote('2026-10-23'), HOJE)).toBe(true)
    expect(estaVencendo(lote('2026-10-24'), HOJE)).toBe(false)
    expect(estaVencendo(lote('2026-10-01'), HOJE)).toBe(true)
  })
})

describe('o custo subiu', () => {
  it('T3: morango R$ 14,00 → R$ 18,00 = +29%', () => {
    expect(aumentoPercentual(140000, 180000)).toBe(29)
  })
  it('sem custo anterior não há porcentagem', () => {
    expect(aumentoPercentual(0, 180000)).toBeNull()
  })
})

describe('frase do histórico', () => {
  it('como no protótipo', () => {
    expect(textoEntrada('Morango', 20000, 'kg', centavos(36000))).toBe(
      'Registrou entrada de mercadoria: Morango 20 kg (R$ 360,00)'
    )
  })
})

describe('baixa com detalhe de cada compra (Desfazer da produção e da perda)', () => {
  it('sai primeiro da compra que vence antes; o que passa vira estoque negativo', () => {
    const r = baixarComDetalhe(
      {
        quantidade: 3500,
        lotes: [
          { id: 1, validade: null, quantidade: 1500 },
          { id: 2, validade: '2026-10-20', quantidade: 2000 }
        ]
      },
      5000
    )
    expect(r.saidas).toEqual([
      { loteId: 1, quantidade: 1500 },
      { loteId: 2, quantidade: 2000 },
      { loteId: null, quantidade: 1500 }
    ])
    expect(r.estado.quantidade).toBe(-1500)
  })
  it('só uma parte de uma compra', () => {
    const r = baixarComDetalhe(
      { quantidade: 2000, lotes: [{ id: 7, validade: '2026-11-01', quantidade: 2000 }] },
      500
    )
    expect(r.saidas).toEqual([{ loteId: 7, quantidade: 500 }])
  })
})
