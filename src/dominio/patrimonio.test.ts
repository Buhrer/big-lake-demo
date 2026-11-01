import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  formatarMesAno,
  garantiaAte,
  lerMesAno,
  nomeDaConta,
  nomeDoFiltro,
  resumirManutencoes,
  textoDosServicos
} from './patrimonio'

describe('T12 · garantia', () => {
  it('16/10/2026 + 90 dias = 14/01/2027', () => {
    expect(garantiaAte('2026-10-16', 90)).toBe('2027-01-14')
  })
  it('sem garantia', () => {
    expect(garantiaAte('2026-10-16', 0)).toBeNull()
  })
})

describe('conta da manutenção', () => {
  it('nome "<o que foi feito> · <bem>"', () => {
    expect(nomeDaConta(' Troca de óleo e filtros ', 'Furgão de entrega 2019')).toBe(
      'Troca de óleo e filtros · Furgão de entrega 2019'
    )
  })
})

describe('data da compra (mês/ano)', () => {
  it('lê e mostra', () => {
    expect(lerMesAno('03/2022')).toBe('2022-03')
    expect(lerMesAno('3/2022')).toBe('2022-03')
    expect(formatarMesAno('2022-03')).toBe('03/2022')
  })
  it('recusa o que não é mês/ano', () => {
    expect(lerMesAno('13/2022')).toBeNull()
    expect(lerMesAno('03/22')).toBeNull()
    expect(lerMesAno('16/10/2026')).toBeNull()
    expect(lerMesAno('')).toBeNull()
  })
})

describe('filtros dos tipos', () => {
  it('como no protótipo; tipo criado fica como foi escrito', () => {
    expect(
      ['Veículo', 'Equipamento', 'Móvel', 'Informática', 'Ferramenta'].map(nomeDoFiltro)
    ).toEqual(['Veículos', 'Equipamentos', 'Móveis', 'Informática', 'Ferramenta'])
  })
})

describe('resumo do ano (protótipo 12-Patrimonio, aba Manutenções)', () => {
  const m = (
    bemId: number,
    bemNome: string,
    data: string,
    tipo: 'revisao' | 'conserto',
    v: number
  ) => ({
    bemId,
    bemNome,
    data,
    tipo,
    valor: centavos(v)
  })
  const lista = [
    m(7, 'Freezer vertical 560 L', '2026-09-08', 'conserto', 45000),
    m(1, 'Furgão', '2026-08-12', 'revisao', 38000),
    m(2, 'Moto', '2026-07-20', 'revisao', 21000),
    m(3, 'Máquina', '2026-06-15', 'revisao', 65000),
    m(4, 'Gerador', '2026-05-10', 'revisao', 26000),
    m(1, 'Furgão', '2026-05-03', 'conserto', 92000),
    m(8, 'Ar', '2026-04-10', 'revisao', 18000),
    m(6, 'Freezer horizontal', '2026-03-02', 'revisao', 32000),
    m(1, 'Furgão', '2025-12-01', 'conserto', 500000)
  ]
  it('gasto, serviços e o bem que mais gastou (só o ano pedido)', () => {
    expect(resumirManutencoes(lista, 2026)).toEqual({
      gasto: 337000,
      servicos: 8,
      revisoes: 6,
      consertos: 2,
      bemQueMaisGastou: { nome: 'Furgão', valor: 130000 }
    })
  })
  it('ano sem manutenção', () => {
    expect(resumirManutencoes(lista, 2024)).toEqual({
      gasto: 0,
      servicos: 0,
      revisoes: 0,
      consertos: 0,
      bemQueMaisGastou: null
    })
  })
  it('serviço de graça não vira "bem que mais gastou"', () => {
    expect(
      resumirManutencoes([m(1, 'Furgão', '2026-01-01', 'conserto', 0)], 2026).bemQueMaisGastou
    ).toBeNull()
  })
  it('texto dos serviços', () => {
    expect(textoDosServicos(5, 3)).toBe('5 revisões e 3 consertos')
    expect(textoDosServicos(1, 0)).toBe('1 revisão')
    expect(textoDosServicos(0, 1)).toBe('1 conserto')
    expect(textoDosServicos(0, 0)).toBe('nenhum serviço')
  })
})
