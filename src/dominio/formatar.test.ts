import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  formatarCusto,
  formatarPercentual,
  formatarQuantidade,
  formatarReais,
  lerQuantidade,
  lerReais,
  motivoNumeroErrado
} from './formatar'

describe('formatarReais', () => {
  it('formato brasileiro com milhar e 2 casas', () => {
    expect(formatarReais(centavos(123456))).toBe('R$ 1.234,56')
    expect(formatarReais(centavos(1845000))).toBe('R$ 18.450,00')
    expect(formatarReais(centavos(5))).toBe('R$ 0,05')
    expect(formatarReais(centavos(0))).toBe('R$ 0,00')
    expect(formatarReais(centavos(123456789))).toBe('R$ 1.234.567,89')
  })
  it('negativo com sinal de menos', () => {
    expect(formatarReais(centavos(-3385000))).toBe('−R$ 33.850,00')
  })
})

describe('formatarCusto (4 casas guardadas, 2 exibidas)', () => {
  it('T1: 2,8264 → R$ 2,83', () => {
    expect(formatarCusto(28264)).toBe('R$ 2,83')
  })
  it('palito 0,08', () => {
    expect(formatarCusto(800)).toBe('R$ 0,08')
  })
})

describe('formatarQuantidade (3 casas guardadas, sem zeros à direita)', () => {
  it('exemplos do protótipo', () => {
    expect(formatarQuantidade(5000)).toBe('5')
    expect(formatarQuantidade(2500)).toBe('2,5')
    expect(formatarQuantidade(120)).toBe('0,12')
    expect(formatarQuantidade(1200000)).toBe('1.200')
    expect(formatarQuantidade(1500)).toBe('1,5')
    expect(formatarQuantidade(-4000)).toBe('−4')
  })
})

describe('formatarPercentual', () => {
  it('taxas e sócios', () => {
    expect(formatarPercentual(150)).toBe('1,5%')
    expect(formatarPercentual(320)).toBe('3,2%')
    expect(formatarPercentual(6000)).toBe('60%')
    expect(formatarPercentual(1025)).toBe('10,25%')
  })
})

describe('lerReais (o que o Carlos digita)', () => {
  it('vírgula decimal e ponto de milhar', () => {
    expect(lerReais('412,50')).toBe(41250)
    expect(lerReais('1.234,56')).toBe(123456)
    expect(lerReais('R$ 1.284,50')).toBe(128450)
    expect(lerReais('412')).toBe(41200)
    expect(lerReais(' 7,5 ')).toBe(750)
    expect(lerReais('0,05')).toBe(5)
  })
  it('ponto sozinho com 1 ou 2 casas é decimal; com 3 é milhar', () => {
    expect(lerReais('412.50')).toBe(41250)
    expect(lerReais('1.234')).toBe(123400)
  })
  it('recusa o que não é valor', () => {
    expect(lerReais('')).toBeNull()
    expect(lerReais('abc')).toBeNull()
    expect(lerReais('1,234')).toBeNull()
    expect(lerReais('1,2,3')).toBeNull()
    expect(lerReais('-5')).toBeNull()
  })
  it('recusa mais de R$ 100 milhões (o limite do banco; D-089)', () => {
    expect(lerReais('100.000.000,00')).toBe(100_000_000_00)
    expect(lerReais('100.000.000,01')).toBeNull()
    expect(lerReais('99999999999')).toBeNull()
  })
})

describe('motivoNumeroErrado (D-089)', () => {
  it('explica em palavras simples', () => {
    expect(motivoNumeroErrado('-50')).toBe('Não use o sinal de menos.')
    expect(motivoNumeroErrado('99999999999')).toBe('Número grande demais. Confira.')
    expect(motivoNumeroErrado('99.999.999.999,00')).toBe('Número grande demais. Confira.')
    expect(motivoNumeroErrado('abc')).toBe(
      'Número com erro. Use só algarismos e vírgula, como 1.234,56.'
    )
    expect(motivoNumeroErrado('1,2,3')).toBe(
      'Número com erro. Use só algarismos e vírgula, como 1.234,56.'
    )
  })
})

describe('lerQuantidade', () => {
  it('até 3 casas', () => {
    expect(lerQuantidade('0,12')).toBe(120)
    expect(lerQuantidade('2,5')).toBe(2500)
    expect(lerQuantidade('1.200')).toBe(1200000)
    expect(lerQuantidade('20')).toBe(20000)
    expect(lerQuantidade('0,125')).toBe(125)
  })
  it('recusa mais de 3 casas e texto', () => {
    expect(lerQuantidade('0,1234')).toBeNull()
    expect(lerQuantidade('x')).toBeNull()
  })
})
