import { describe, expect, it } from 'vitest'
import {
  dataPorExtenso,
  diaDaSemana,
  diferencaEmDias,
  formatarData,
  lerData,
  mesmoDiaNoMesSeguinte,
  somarDias,
  ultimoDiaDoMes
} from './datas'

describe('lerData / formatarData', () => {
  it('dd/mm/aaaa ↔ AAAA-MM-DD', () => {
    expect(lerData('16/10/2026')).toBe('2026-10-16')
    expect(lerData('1/2/2027')).toBe('2027-02-01')
    expect(formatarData('2026-10-16')).toBe('16/10/2026')
  })
  it('recusa data que não existe', () => {
    expect(lerData('31/11/2026')).toBeNull()
    expect(lerData('29/02/2026')).toBeNull()
    expect(lerData('29/02/2028')).toBe('2028-02-29')
    expect(lerData('16-10-2026')).toBeNull()
    expect(lerData('')).toBeNull()
  })
})

describe('somarDias e diferencaEmDias', () => {
  it('T12: 16/10/2026 + 90 dias de garantia = 14/01/2027', () => {
    expect(somarDias('2026-10-16', 90)).toBe('2027-01-14')
  })
  it('crédito cai em 30 dias e débito em 1', () => {
    expect(somarDias('2026-10-16', 30)).toBe('2026-11-15')
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('diferença entre datas', () => {
    expect(diferencaEmDias('2026-10-16', '2026-10-18')).toBe(2)
    expect(diferencaEmDias('2026-10-16', '2026-10-15')).toBe(-1)
  })
})

describe('mês seguinte (conta que repete todo mês, T11)', () => {
  it('dia 31 em mês de 30 dias vira o último dia', () => {
    expect(mesmoDiaNoMesSeguinte('2026-10-31')).toBe('2026-11-30')
    expect(mesmoDiaNoMesSeguinte('2027-01-31')).toBe('2027-02-28')
    expect(mesmoDiaNoMesSeguinte('2028-01-31')).toBe('2028-02-29')
    expect(mesmoDiaNoMesSeguinte('2026-12-10')).toBe('2027-01-10')
  })
  it('a partir do dia original (mantém 31 depois de fevereiro)', () => {
    expect(mesmoDiaNoMesSeguinte('2027-02-28', 31)).toBe('2027-03-31')
  })
  it('último dia do mês', () => {
    expect(ultimoDiaDoMes(2026, 2)).toBe(28)
    expect(ultimoDiaDoMes(2028, 2)).toBe(29)
    expect(ultimoDiaDoMes(2026, 12)).toBe(31)
  })
})

describe('dia da semana e data por extenso', () => {
  it('16/10/2026 é sexta-feira (como no protótipo)', () => {
    expect(diaDaSemana('2026-10-16')).toBe(5)
    expect(dataPorExtenso('2026-10-16')).toBe('Sexta-feira, 16 de outubro de 2026')
  })
  it('domingo e 1º de janeiro', () => {
    expect(dataPorExtenso('2027-01-03')).toBe('Domingo, 3 de janeiro de 2027')
    expect(dataPorExtenso('2026-03-01')).toBe('Domingo, 1º de março de 2026')
  })
})
