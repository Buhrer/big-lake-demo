import { describe, expect, it } from 'vitest'
import {
  aplicarPercentual,
  arredondarParaCimaMultiplo,
  centavos,
  custoParaCentavos,
  dividirArredondando,
  percentualInteiro,
  somarCentavos
} from './dinheiro'

describe('dividirArredondando (meio para cima, negativos para longe do zero)', () => {
  it('arredonda o meio para cima', () => {
    expect(dividirArredondando(5n, 2n)).toBe(3n)
    expect(dividirArredondando(15n, 10n)).toBe(2n)
    expect(dividirArredondando(14n, 10n)).toBe(1n)
  })
  it('negativo vai para longe do zero', () => {
    expect(dividirArredondando(-5n, 2n)).toBe(-3n)
    expect(dividirArredondando(-14n, 10n)).toBe(-1n)
  })
  it('zero e divisão exata', () => {
    expect(dividirArredondando(0n, 7n)).toBe(0n)
    expect(dividirArredondando(100n, 10n)).toBe(10n)
  })
  it('recusa divisão por zero', () => {
    expect(() => dividirArredondando(1n, 0n)).toThrow()
  })
})

describe('centavos', () => {
  it('aceita só inteiros seguros', () => {
    expect(centavos(1000)).toBe(1000)
    expect(() => centavos(10.5)).toThrow()
    expect(() => centavos(Number.MAX_SAFE_INTEGER + 1)).toThrow()
  })
})

describe('aplicarPercentual (taxas da maquininha, T5 e T6)', () => {
  it('T5: débito 218,00 × 1,5% = 3,27', () => {
    expect(aplicarPercentual(centavos(21800), 150)).toBe(327)
  })
  it('T5: crédito 320,00 × 3,2% = 10,24', () => {
    expect(aplicarPercentual(centavos(32000), 320)).toBe(1024)
  })
  it('T6: pedido 574,00 no crédito 3,2% = 18,37 (18,368 arredonda para cima)', () => {
    expect(aplicarPercentual(centavos(57400), 320)).toBe(1837)
  })
  it('T7: lucro 18.450,00 × 60% = 11.070,00 e × 40% = 7.380,00', () => {
    expect(aplicarPercentual(centavos(1845000), 6000)).toBe(1107000)
    expect(aplicarPercentual(centavos(1845000), 4000)).toBe(738000)
  })
  it('meio centavo arredonda para cima; zero fica zero', () => {
    expect(aplicarPercentual(centavos(1), 5000)).toBe(1)
    expect(aplicarPercentual(centavos(0), 320)).toBe(0)
  })
})

describe('somarCentavos', () => {
  it('T5: total do dia 412,50 + 334,00 + 218,00 + 320,00 = 1.284,50', () => {
    expect(somarCentavos([41250, 33400, 21800, 32000].map(centavos))).toBe(128450)
  })
  it('lista vazia é zero', () => {
    expect(somarCentavos([])).toBe(0)
  })
})

describe('custoParaCentavos (custo com 4 casas → exibição)', () => {
  it('T1: custo de cada 2,8264 → R$ 2,83', () => {
    expect(custoParaCentavos(28264)).toBe(283)
  })
  it('T1: lucro de cada 7,1736 → R$ 7,17', () => {
    expect(custoParaCentavos(71736)).toBe(717)
  })
  it('meio para cima e negativos', () => {
    expect(custoParaCentavos(28250)).toBe(283)
    expect(custoParaCentavos(28249)).toBe(282)
    expect(custoParaCentavos(-28250)).toBe(-283)
  })
})

describe('percentualInteiro ("% do preço")', () => {
  it('T1: 7,1736 de 10,00 = 72%', () => {
    expect(percentualInteiro(71736n, 100000n)).toBe(72)
  })
  it('T1: 4,1736 de 7,00 = 60%', () => {
    expect(percentualInteiro(41736n, 70000n)).toBe(60)
  })
  it('T8: 32.870,00 de 38.500,00 = 85%', () => {
    expect(percentualInteiro(3287000n, 3850000n)).toBe(85)
  })
  it('T9: 570,00 de 1.500,00 = 38%', () => {
    expect(percentualInteiro(57000n, 150000n)).toBe(38)
  })
  it('todo zero dá zero (sem divisão por zero)', () => {
    expect(percentualInteiro(10n, 0n)).toBe(0)
  })
})

describe('arredondarParaCimaMultiplo (reajuste para R$ 0,50, T9)', () => {
  it('Paleta 10,23 → 10,50; Picolé 7,16 → 7,50; Pote 50,14 → 50,50', () => {
    expect(arredondarParaCimaMultiplo(centavos(1023), 50)).toBe(1050)
    expect(arredondarParaCimaMultiplo(centavos(716), 50)).toBe(750)
    expect(arredondarParaCimaMultiplo(centavos(5014), 50)).toBe(5050)
  })
  it('valor já redondo não muda', () => {
    expect(arredondarParaCimaMultiplo(centavos(1050), 50)).toBe(1050)
    expect(arredondarParaCimaMultiplo(centavos(0), 50)).toBe(0)
  })
})
