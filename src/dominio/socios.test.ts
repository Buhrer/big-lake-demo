import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  ajustarParticipacao,
  dividirPelasPartes,
  lucroParaDividir,
  prejuizoQueChega,
  quantoCadaUmRecebe,
  REGRAS_PADRAO,
  resultadoDoMes,
  type ContaParaOLucro,
  type Recebimento,
  type RegrasLucro
} from './socios'

const c = centavos
const CARLOS = { id: 1, pct: 6000 }
const PAULO = { id: 2, pct: 4000 }

describe('T7 · divisão dos sócios', () => {
  const partes = quantoCadaUmRecebe(c(1845000), [CARLOS, PAULO], [], [])
  it('lucro R$ 18.450,00 → Carlos R$ 11.070,00 e Paulo R$ 7.380,00', () => {
    expect(partes.map((p) => p.parte)).toEqual([1107000, 738000])
  })
  it('+ reembolso Carlos 1.000,00 e retirada Carlos 500,00 → Carlos recebe R$ 11.570,00', () => {
    const [carlos] = quantoCadaUmRecebe(
      c(1845000),
      [CARLOS, PAULO],
      [{ socioId: 1, valor: c(100000) }],
      [{ socioId: 1, valor: c(50000) }]
    )
    expect(carlos).toMatchObject({ reembolso: 100000, retiradas: 50000, totalAReceber: 1157000 })
  })
  it('conta de R$ 320,00 no cartão pessoal do Paulo soma +R$ 320,00 no total dele', () => {
    const [, paulo] = quantoCadaUmRecebe(
      c(1845000),
      [CARLOS, PAULO],
      [{ socioId: 2, valor: c(32000) }],
      []
    )
    expect(paulo?.totalAReceber).toBe(770000)
  })
  it('Carlos 65% → Paulo 35% sozinho; passo de 1 em 1% e sempre entre 0 e 100', () => {
    expect(ajustarParticipacao(6000, 500)).toEqual([6500, 3500])
    expect(ajustarParticipacao(6000, -100)).toEqual([5900, 4100])
    expect(ajustarParticipacao(10_000, 100)).toEqual([10_000, 0])
    expect(ajustarParticipacao(0, -100)).toEqual([0, 10_000])
  })
  it('centavo que sobra fica com o último: a soma das partes é sempre o lucro', () => {
    expect(dividirPelasPartes(c(1001), [3300, 6700])).toEqual([330, 671])
    expect(dividirPelasPartes(c(-1001), [6000, 4000])).toEqual([-601, -400])
  })
})

// Um dia de balcão com crédito que cai em 30 dias, um pedido no débito e contas.
const vendas: Recebimento[] = [
  { data: '2026-10-20', caiEm: '2026-10-20', credito: false, valor: c(100000), taxa: c(0) },
  { data: '2026-10-20', caiEm: '2026-11-19', credito: true, valor: c(50000), taxa: c(1600) },
  { data: '2026-10-21', caiEm: '2026-10-22', credito: false, valor: c(20000), taxa: c(300) },
  { data: '2026-09-25', caiEm: '2026-10-25', credito: true, valor: c(30000), taxa: c(960) }
]
const contas: ContaParaOLucro[] = [
  {
    vencimento: '2026-10-10',
    pagoEm: '2026-10-09',
    valor: c(40000),
    tipo: 'Aluguel',
    entraNasDespesas: true
  },
  // vence em outubro, paga só em novembro
  {
    vencimento: '2026-10-31',
    pagoEm: '2026-11-02',
    valor: c(25000),
    tipo: 'Energia',
    entraNasDespesas: true
  },
  // de setembro, paga em outubro
  {
    vencimento: '2026-09-30',
    pagoEm: '2026-10-01',
    valor: c(10000),
    tipo: 'Energia',
    entraNasDespesas: true
  },
  // vence em outubro e ainda não foi paga
  {
    vencimento: '2026-10-28',
    pagoEm: null,
    valor: c(5000),
    tipo: 'Serviços',
    entraNasDespesas: true
  },
  // fatura do cartão da empresa: nunca entra (D-061)
  {
    vencimento: '2026-10-15',
    pagoEm: '2026-10-15',
    valor: c(99900),
    tipo: 'Fatura do cartão da empresa',
    entraNasDespesas: false
  }
]
const regras = (r: Partial<RegrasLucro>): RegrasLucro => ({ ...REGRAS_PADRAO, ...r })

describe('Como contar o lucro (D-033): cada combinação', () => {
  it('padrão: despesa no mês pago, crédito no mês da venda, taxas como despesa', () => {
    const r = resultadoDoMes('2026-10', vendas, contas, REGRAS_PADRAO)
    expect(r.faturamento).toBe(170000)
    expect(r.taxas).toBe(1900)
    expect(r.despesasContas).toBe(50000)
    expect(r.despesas).toBe(51900)
    expect(r.lucro).toBe(118100)
    expect(r.porTipo).toEqual([
      { tipo: 'Aluguel', valor: 40000 },
      { tipo: 'Energia', valor: 10000 }
    ])
  })
  it('(21) no mês do vencimento: conta a de outubro paga em novembro e a ainda não paga', () => {
    const r = resultadoDoMes('2026-10', vendas, contas, regras({ despesa: 'vencimento' }))
    expect(r.despesasContas).toBe(70000)
    expect(r.porTipo.map((g) => g.tipo)).toEqual(['Aluguel', 'Energia', 'Serviços'])
  })
  it('(22) crédito quando cai: sai o crédito de 20/10 e entra o de 25/09', () => {
    const r = resultadoDoMes('2026-10', vendas, contas, regras({ credito: 'quando_cai' }))
    expect(r.faturamento).toBe(150000)
    expect(r.taxas).toBe(1260)
  })
  it('(23) vendas já sem as taxas: faturamento líquido e nenhuma linha de taxa', () => {
    const r = resultadoDoMes('2026-10', vendas, contas, regras({ taxas: 'descontar' }))
    expect(r.faturamento).toBe(168100)
    expect(r.taxas).toBe(0)
    expect(r.lucro).toBe(118100)
  })
  it('(21)+(22)+(23) juntas', () => {
    const r = resultadoDoMes(
      '2026-10',
      vendas,
      contas,
      regras({ despesa: 'vencimento', credito: 'quando_cai', taxas: 'descontar' })
    )
    expect(r.faturamento).toBe(150000 - 1260)
    expect(r.despesas).toBe(70000)
    expect(r.lucro).toBe(150000 - 1260 - 70000)
  })
})

describe('(27) mês de prejuízo', () => {
  it('mostrar e não dividir (padrão)', () => {
    expect(lucroParaDividir(c(-5000), c(0), 'nao_dividir')).toEqual({
      paraDividir: 0,
      prejuizoQueVai: 0
    })
    expect(lucroParaDividir(c(5000), c(0), 'nao_dividir').paraDividir).toBe(5000)
  })
  it('dividir o prejuízo: cada um fica com a sua parte negativa', () => {
    const { paraDividir } = lucroParaDividir(c(-10000), c(0), 'dividir')
    const partes = quantoCadaUmRecebe(paraDividir, [CARLOS, PAULO], [], [])
    expect(partes.map((p) => p.parte)).toEqual([-6000, -4000])
  })
  it('levar para o mês seguinte: o prejuízo é descontado do próximo lucro', () => {
    expect(lucroParaDividir(c(-10000), c(0), 'levar')).toEqual({
      paraDividir: 0,
      prejuizoQueVai: -10000
    })
    expect(lucroParaDividir(c(4000), c(-10000), 'levar')).toEqual({
      paraDividir: 0,
      prejuizoQueVai: -6000
    })
    expect(lucroParaDividir(c(9000), c(-6000), 'levar')).toEqual({
      paraDividir: 3000,
      prejuizoQueVai: 0
    })
    expect(prejuizoQueChega([c(-10000), c(4000)])).toBe(-6000)
    expect(prejuizoQueChega([c(-10000), c(4000), c(9000)])).toBe(0)
    expect(prejuizoQueChega([])).toBe(0)
  })
})
