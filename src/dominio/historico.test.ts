import { describe, expect, it } from 'vitest'
import { A_CADA_VER_MAIS, nomeDoMesDoFiltro, PRIMEIROS, quantosMais } from './historico'

describe('históricos: últimos 10 e "Ver mais" de 10 em 10 (D-085, D-086)', () => {
  it('começa com 10 e cada "Ver mais" traz 10', () => {
    expect(PRIMEIROS).toBe(10)
    expect(A_CADA_VER_MAIS).toBe(10)
  })

  it('o botão diz quantos ainda vêm: 10, ou o que sobrou', () => {
    expect(quantosMais(10, 150)).toBe(10)
    expect(quantosMais(20, 26)).toBe(6)
    expect(quantosMais(26, 26)).toBe(0)
    expect(quantosMais(10, 7)).toBe(0)
  })

  it('nome do mês na lista: "Outubro de 2026"', () => {
    expect(nomeDoMesDoFiltro('2026-10')).toBe('Outubro de 2026')
    expect(nomeDoMesDoFiltro('2027-03')).toBe('Março de 2027')
  })
})
