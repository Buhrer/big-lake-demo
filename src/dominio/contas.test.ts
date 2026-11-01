import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  deveAvisar,
  etiquetaDaConta,
  mesesParaGerar,
  nomeDaContaDaCompra,
  resumoDasContas,
  textoDoPagamento,
  vencimentoNoMes
} from './contas'

const HOJE = '2026-10-16'

describe('T11 · etiqueta do vencimento', () => {
  it('amanhã, em 3 dias (vermelho), em 6 dias (amarelo), em 14 dias (azul)', () => {
    expect(etiquetaDaConta('2026-10-17', null, HOJE)).toEqual({ texto: 'Amanhã', nivel: 'erro' })
    expect(etiquetaDaConta('2026-10-19', null, HOJE)).toEqual({ texto: 'Em 3 dias', nivel: 'erro' })
    expect(etiquetaDaConta('2026-10-22', null, HOJE)).toEqual({
      texto: 'Em 6 dias',
      nivel: 'atencao'
    })
    expect(etiquetaDaConta('2026-10-30', null, HOJE)).toEqual({
      texto: 'Em 14 dias',
      nivel: 'info'
    })
  })
  it('hoje, atrasada e paga', () => {
    expect(etiquetaDaConta(HOJE, null, HOJE)).toEqual({ texto: 'Hoje', nivel: 'erro' })
    expect(etiquetaDaConta('2026-10-15', null, HOJE)).toEqual({
      texto: 'Atrasada',
      nivel: 'erro'
    })
    expect(etiquetaDaConta('2026-10-15', '2026-10-14', HOJE)).toEqual({
      texto: 'Paga',
      nivel: 'ok'
    })
  })
})

describe('T11 · aviso (Início e bolinha do menu)', () => {
  it('vence amanhã com aviso de 3 dias: avisa', () => {
    expect(deveAvisar({ vencimento: '2026-10-17', avisarDias: 3, pagoEm: null }, HOJE)).toBe(true)
  })
  it('vence em 5 dias com aviso de 3 dias: ainda não', () => {
    expect(deveAvisar({ vencimento: '2026-10-21', avisarDias: 3, pagoEm: null }, HOJE)).toBe(false)
    expect(deveAvisar({ vencimento: '2026-10-19', avisarDias: 3, pagoEm: null }, HOJE)).toBe(true)
  })
  it('atrasada avisa; paga não avisa', () => {
    expect(deveAvisar({ vencimento: '2026-10-01', avisarDias: 1, pagoEm: null }, HOJE)).toBe(true)
    expect(deveAvisar({ vencimento: '2026-10-17', avisarDias: 7, pagoEm: HOJE }, HOJE)).toBe(false)
  })
})

describe('cards de Contas a pagar', () => {
  const conta = (vencimento: string, valor: number, pagoEm: string | null = null) => ({
    vencimento,
    valor: centavos(valor),
    pagoEm
  })
  it('protótipo: próximos 7 dias R$ 5.420,00 em 3 contas; nenhuma atrasada', () => {
    const r = resumoDasContas(
      [
        conta('2026-10-17', 295000),
        conta('2026-10-19', 197000),
        conta('2026-10-22', 50000),
        conta('2026-10-30', 350000),
        conta('2026-11-05', 102000),
        conta('2026-10-05', 100000, '2026-10-05'),
        conta('2026-09-30', 70000, '2026-09-30')
      ],
      HOJE
    )
    expect(r.proximos7).toEqual({ valor: 542000, quantidade: 3 })
    expect(r.atrasadas).toEqual({ valor: 0, quantidade: 0 })
    expect(r.pagasNoMes).toEqual({ valor: 100000, quantidade: 1 })
  })
  it('atrasada não entra em "próximos 7 dias"; vence hoje entra', () => {
    const r = resumoDasContas([conta('2026-10-15', 1000), conta(HOJE, 2000)], HOJE)
    expect(r.atrasadas).toEqual({ valor: 1000, quantidade: 1 })
    expect(r.proximos7).toEqual({ valor: 2000, quantidade: 1 })
  })
})

describe('T11 · conta que repete (criada no dia 1º, D-032 p.18)', () => {
  it('dia 31 → mês com 30 dias vence dia 30; depois volta ao 31', () => {
    expect(vencimentoNoMes(31, '2026-11')).toBe('2026-11-30')
    expect(vencimentoNoMes(31, '2026-12')).toBe('2026-12-31')
    expect(vencimentoNoMes(31, '2027-02')).toBe('2027-02-28')
    expect(vencimentoNoMes(29, '2028-02')).toBe('2028-02-29')
  })
  it('a conta do mês aparece só quando o mês chega', () => {
    expect(mesesParaGerar('2026-10-31', '2026-10-16')).toEqual([])
    expect(mesesParaGerar('2026-10-31', '2026-11-01')).toEqual(['2026-11'])
  })
  it('sistema fechado por meses: cria os meses que faltaram, virando o ano', () => {
    expect(mesesParaGerar('2026-11-30', '2027-02-10')).toEqual(['2026-12', '2027-01', '2027-02'])
  })
  it('conta lançada já para o mês seguinte espera aquele mês passar', () => {
    expect(mesesParaGerar('2026-11-05', '2026-10-16')).toEqual([])
    expect(mesesParaGerar('2026-11-05', '2026-11-20')).toEqual([])
    expect(mesesParaGerar('2026-11-05', '2026-12-01')).toEqual(['2026-12'])
  })
})

describe('texto do pagamento na lista', () => {
  it('sem cartão', () => {
    expect(textoDoPagamento('pix', null)).toBe('pago com Pix')
    expect(textoDoPagamento('boleto', null)).toBe('pago com boleto')
  })
  it('cartão da empresa e cartão pessoal (reembolso)', () => {
    expect(textoDoPagamento('credito', { nome: 'Bradesco', dono: null })).toBe(
      'pago com cartão de crédito (Bradesco · da empresa)'
    )
    expect(textoDoPagamento('debito', { nome: 'Débito final 2285', dono: 'Paulo' })).toBe(
      'pago com cartão de débito (Débito final 2285 · pessoal do Paulo · reembolso)'
    )
  })
})

describe('nomeDaContaDaCompra (D-092)', () => {
  it('item, quantidade e fornecedor', () => {
    expect(nomeDaContaDaCompra('Morango', 10_000, 'kg', 'Hortifruti São José')).toBe(
      'Morango 10 kg · Hortifruti São José'
    )
    expect(nomeDaContaDaCompra('Leite condensado', 24_000, 'lata', null)).toBe(
      'Leite condensado 24 lata'
    )
  })
  it('cabe nas 120 letras do nome da conta', () => {
    const nome = nomeDaContaDaCompra(
      'Creme '.repeat(15).trim(),
      2_500,
      'L',
      'Laticínios '.repeat(8)
    )
    expect(nome.length).toBeLessThanOrEqual(120)
    expect(nome.endsWith('…')).toBe(true)
  })
})
