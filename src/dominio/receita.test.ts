import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  calcularReceita,
  lucroNaVenda,
  marcarMenorLucro,
  pluralizar,
  SEM_GAS,
  type GasEnergia,
  type ItemDaReceita
} from './receita'

// Preços do protótipo (custo por unidade, 4 casas)
const POLPA_MARACUJA = 140000
const ACUCAR = 42000
const LEITE_CONDENSADO = 69000
const CREME_DE_LEITE = 215000
const LEITE = 48900
const LIGA = 320000
const MORANGO = 180000
const EMBALAGEM_PALETA = [800, 2700, 600] // palito, saquinho, etiqueta

const GAS_A: GasEnergia = {
  modo: 'ingrediente',
  vezes: 1000,
  precoPorVez: centavos(800),
  valorFixo: centavos(0),
  valorDaReceita: null
}

const MARACUJA: ItemDaReceita[] = [
  { quantidade: 5000, custo: POLPA_MARACUJA },
  { quantidade: 3000, custo: ACUCAR },
  { quantidade: 10000, custo: LEITE_CONDENSADO },
  { quantidade: 2500, custo: CREME_DE_LEITE },
  { quantidade: 5000, custo: LEITE },
  { quantidade: 120, custo: LIGA }
]

const morango = (precoMorango: number): ItemDaReceita[] => [
  { quantidade: 5000, custo: precoMorango },
  { quantidade: 2500, custo: ACUCAR },
  { quantidade: 15000, custo: LEITE_CONDENSADO },
  { quantidade: 2500, custo: CREME_DE_LEITE },
  { quantidade: 5000, custo: LEITE },
  { quantidade: 120, custo: LIGA }
]

describe('T1 · Paleta de Maracujá (rende 100)', () => {
  const r = calcularReceita({
    ingredientes: MARACUJA,
    embalagens: EMBALAGEM_PALETA,
    rendimento: 100,
    gas: GAS_A
  })

  it('ingredientes R$ 241,64 (com gás e energia R$ 8,00); embalagem R$ 41,00', () => {
    expect(r.gas).toBe(80000)
    expect(r.ingredientes).toBe(2416400)
    expect(r.embalagem).toBe(410000)
  })
  it('total R$ 282,64; custo de cada R$ 2,8264', () => {
    expect(r.total).toBe(2826400)
    expect(r.custoDeCada).toBe(28264)
  })
  it('balcão 10,00: lucro R$ 7,17 (72%), receita inteira R$ 717,36', () => {
    expect(lucroNaVenda(centavos(1000), r.custoDeCada, 100)).toEqual({
      lucroDeCada: 71736,
      percentual: 72,
      lucroDaReceita: 71736
    })
  })
  it('atacado 7,00: lucro R$ 4,17 (60%)', () => {
    const a = lucroNaVenda(centavos(700), r.custoDeCada, 100)
    expect(a.lucroDeCada).toBe(41736)
    expect(a.percentual).toBe(60)
  })
})

describe('T2 · Paleta de Morango recheada (rende 100)', () => {
  it('ingredientes R$ 294,04; total R$ 335,04; custo R$ 3,35; lucro balcão R$ 6,65', () => {
    const r = calcularReceita({
      ingredientes: morango(MORANGO),
      embalagens: EMBALAGEM_PALETA,
      rendimento: 100,
      gas: GAS_A
    })
    expect(r.ingredientes).toBe(2940400)
    expect(r.total).toBe(3350400)
    expect(r.custoDeCada).toBe(33504)
    expect(lucroNaVenda(centavos(1000), r.custoDeCada, 100).lucroDeCada).toBe(66496)
  })
})

describe('T3 · morango de R$ 14,00 para R$ 18,00', () => {
  it('Paleta de Morango: custo 3,15 → 3,35 e lucro 6,85 → 6,65', () => {
    const antes = calcularReceita({
      ingredientes: morango(140000),
      embalagens: EMBALAGEM_PALETA,
      rendimento: 100,
      gas: GAS_A
    })
    expect(antes.custoDeCada).toBe(31504)
    expect(lucroNaVenda(centavos(1000), antes.custoDeCada, 100).lucroDeCada).toBe(68496)
  })
})

describe('gás e energia: os três jeitos (D-041)', () => {
  const base = { ingredientes: MARACUJA, embalagens: EMBALAGEM_PALETA, rendimento: 100 }
  it('A · ingrediente: vezes × preço por vez (meia vez = metade)', () => {
    expect(calcularReceita({ ...base, gas: GAS_A }).gas).toBe(80000)
    expect(calcularReceita({ ...base, gas: { ...GAS_A, vezes: 500 } }).gas).toBe(40000)
    expect(calcularReceita({ ...base, gas: { ...GAS_A, vezes: null } }).gas).toBe(0)
  })
  it('B · valor fixo em toda receita (ignora as vezes)', () => {
    const r = calcularReceita({
      ...base,
      gas: { ...GAS_A, modo: 'fixo', valorFixo: centavos(1000) }
    })
    expect(r.gas).toBe(100000)
    expect(r.total).toBe(2846400)
  })
  it('C · valor próprio da receita', () => {
    const gas: GasEnergia = { ...GAS_A, modo: 'por_receita', valorDaReceita: centavos(650) }
    expect(calcularReceita({ ...base, gas }).gas).toBe(65000)
    expect(calcularReceita({ ...base, gas: { ...gas, valorDaReceita: null } }).gas).toBe(0)
  })
  it('D · não contar nas receitas (só como conta a pagar): zero, sem perder os valores', () => {
    const r = calcularReceita({
      ...base,
      gas: { ...GAS_A, modo: 'nao_usar', valorFixo: centavos(1000), valorDaReceita: centavos(650) }
    })
    expect(r.gas).toBe(0)
    expect(r.ingredientes).toBe(2336400)
  })
  it('sem gás', () => {
    expect(calcularReceita({ ...base, gas: SEM_GAS }).ingredientes).toBe(2336400)
  })
})

describe('bordas', () => {
  it('rendimento zero é recusado', () => {
    expect(() =>
      calcularReceita({ ingredientes: [], embalagens: [], rendimento: 0, gas: SEM_GAS })
    ).toThrow('Diga quantas unidades a receita rende.')
  })
  it('receita sem embalagem', () => {
    const r = calcularReceita({
      ingredientes: MARACUJA,
      embalagens: [],
      rendimento: 10,
      gas: SEM_GAS
    })
    expect(r.embalagem).toBe(0)
  })
  it('preço menor que o custo: lucro negativo', () => {
    const l = lucroNaVenda(centavos(200), 28264, 100)
    expect(l.lucroDeCada).toBe(-8264)
    expect(l.percentual).toBe(-41)
    expect(l.lucroDaReceita).toBe(-8264)
  })
  it('preço zero (categoria nova sem preço): 0%', () => {
    expect(lucroNaVenda(centavos(0), 28264, 100).percentual).toBe(0)
  })
})

describe('menor lucro da categoria', () => {
  it('marca a de menor lucro no balcão quando há mais de uma', () => {
    expect(marcarMenorLucro([{ lucro: 71736 }, { lucro: 66496 }, { lucro: 65100 }])).toEqual([
      false,
      false,
      true
    ])
    expect(marcarMenorLucro([{ lucro: 71736 }])).toEqual([false])
  })
})

describe('plural do nome da unidade (D-043)', () => {
  it.each([
    ['paleta', 'paletas'],
    ['picolé', 'picolés'],
    ['pote', 'potes'],
    ['copo', 'copos'],
    ['açaí', 'açaís'],
    ['casquinha', 'casquinhas'],
    ['milk-shake', 'milk-shakes'],
    ['sorvete de pote', 'sorvetes de pote'],
    ['pão', 'pães'],
    ['sabor', 'sabores'],
    ['pastel', 'pastéis'],
    ['bombom', 'bombons']
  ])('%s → %s', (singular, plural) => {
    expect(pluralizar(singular)).toBe(plural)
  })
})
