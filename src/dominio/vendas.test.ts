import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  diasDoMes,
  fechamentoDoDia,
  partesPercentuais,
  resumirMes,
  taxaDoPedido,
  totalDoPedido,
  type Taxas
} from './vendas'

const TAXAS: Taxas = { debitoPct: 150, debitoDias: 1, creditoPct: 320, creditoDias: 30 }

describe('T5 · fechamento do balcão', () => {
  const f = fechamentoDoDia(
    {
      dinheiro: centavos(41250),
      pix: centavos(33400),
      debito: centavos(21800),
      credito: centavos(32000)
    },
    TAXAS,
    '2026-10-16'
  )
  it('total R$ 1.284,50; taxas R$ 3,27 e R$ 10,24; fica R$ 1.270,99', () => {
    expect(f.total).toBe(128450)
    expect(f.taxaDebito).toBe(327)
    expect(f.taxaCredito).toBe(1024)
    expect(f.taxas).toBe(1351)
    expect(f.ficaParaASorveteria).toBe(127099)
  })
  it('o débito cai amanhã e o crédito em 30 dias (15/11)', () => {
    expect(f.debitoCaiEm).toBe('2026-10-17')
    expect(f.creditoCaiEm).toBe('2026-11-15')
  })
  it('sem taxas cadastradas (D-049): nada é descontado', () => {
    const zero = fechamentoDoDia(
      {
        dinheiro: centavos(0),
        pix: centavos(0),
        debito: centavos(10000),
        credito: centavos(10000)
      },
      { debitoPct: 0, debitoDias: 0, creditoPct: 0, creditoDias: 0 },
      '2026-10-16'
    )
    expect(zero.taxas).toBe(0)
    expect(zero.creditoCaiEm).toBe('2026-10-16')
  })
})

describe('T6 · pedido', () => {
  const itens = [
    { quantidade: 4, precoUnitario: centavos(4500) },
    { quantidade: 4, precoUnitario: centavos(4500) },
    { quantidade: 2, precoUnitario: centavos(5200) },
    { quantidade: 1, precoUnitario: centavos(11000) }
  ]
  it('4 + 4 potes a R$ 45, 2 a R$ 52 e 1 caixa de R$ 110 = R$ 574,00', () => {
    expect(totalDoPedido(itens)).toBe(57400)
  })
  it('no Pix ou dinheiro: sem taxa', () => {
    expect(taxaDoPedido(centavos(57400), 'pix', TAXAS)).toEqual({ pct: 0, valor: 0 })
    expect(taxaDoPedido(centavos(57400), 'dinheiro', TAXAS).valor).toBe(0)
  })
  it('no crédito (3,2%): taxa R$ 18,37, fica R$ 555,63', () => {
    const t = taxaDoPedido(centavos(57400), 'credito', TAXAS)
    expect(t).toEqual({ pct: 320, valor: 1837 })
    expect(57400 - t.valor).toBe(55563)
  })
  it('no débito (1,5%)', () => {
    expect(taxaDoPedido(centavos(57400), 'debito', TAXAS)).toEqual({ pct: 150, valor: 861 })
  })
  it('quantidade zero não entra no total', () => {
    expect(totalDoPedido([{ quantidade: 0, precoUnitario: centavos(4500) }])).toBe(0)
  })
})

describe('porcentagens que somam 100 (Balcão 86% · Pedidos 14%)', () => {
  it('protótipo: 28.340,00 e 4.530,00', () => {
    expect(partesPercentuais(2834000, 453000)).toEqual([86, 14])
  })
  it('sem vendas', () => {
    expect(partesPercentuais(0, 0)).toEqual([0, 0])
  })
})

describe('dias do mês até hoje', () => {
  it('de 1 a 16 de outubro', () => {
    const dias = diasDoMes('2026-10-16')
    expect(dias).toHaveLength(16)
    expect(dias[0]).toBe('2026-10-01')
    expect(dias.at(-1)).toBe('2026-10-16')
  })
})

describe('resumo do mês (protótipo, 10 a 16 de outubro)', () => {
  const balcao = [
    { data: '2026-10-10', total: centavos(263050), fechada: false },
    { data: '2026-10-11', total: centavos(330500), fechada: false },
    { data: '2026-10-12', total: centavos(0), fechada: true },
    { data: '2026-10-13', total: centavos(95750), fechada: false },
    { data: '2026-10-14', total: centavos(122900), fechada: false },
    { data: '2026-10-15', total: centavos(138250), fechada: false }
  ]
  const pedidos = [
    { data: '2026-10-10', total: centavos(98000) },
    { data: '2026-10-12', total: centavos(72000) },
    { data: '2026-10-14', total: centavos(45000) },
    { data: '2026-10-14', total: centavos(148000) },
    { data: '2026-10-15', total: centavos(36000) },
    { data: '2026-10-16', total: centavos(54000) }
  ]
  const r = resumirMes('2026-10-16', balcao, pedidos, '2026-10-10')

  it('totais, porcentagens e quantidade de pedidos', () => {
    expect(r.balcao).toBe(950450)
    expect(r.pedidos).toBe(453000)
    expect(r.total).toBe(1403450)
    expect(r.qtdPedidos).toBe(6)
    expect(r.percentuais).toEqual([68, 32])
  })
  it('melhor dia: sábado 10/10, R$ 3.610,50 (balcão + pedidos)', () => {
    expect(r.melhorDia).toEqual({ data: '2026-10-10', total: 361050 })
  })
  it('dias com venda e média por dia', () => {
    expect(r.diasComVenda).toBe(7)
    expect(r.mediaPorDia).toBe(200493) // 14.034,50 ÷ 7
  })
  it('dias lançados: loja fechada conta; hoje ainda falta', () => {
    expect(r.diasLancados).toBe(6)
    expect(r.diasDoMes).toBe(7) // contando desde 10/10, o primeiro dia de uso
    expect(r.diasSemLancamento).toEqual(['2026-10-16'])
  })
  it('vendas por dia, do mais novo para o mais antigo', () => {
    expect(r.porDia[0]).toEqual({
      data: '2026-10-16',
      balcao: null,
      fechada: false,
      pedidos: 54000,
      total: 54000
    })
    expect(r.porDia.find((d) => d.data === '2026-10-12')).toEqual({
      data: '2026-10-12',
      balcao: 0,
      fechada: true,
      pedidos: 72000,
      total: 72000
    })
    expect(r.porDia.find((d) => d.data === '2026-10-13')?.pedidos).toBe(0)
  })
})
