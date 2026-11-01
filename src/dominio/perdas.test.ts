import { describe, expect, it } from 'vitest'
import { centavos } from './dinheiro'
import {
  faltaParaAPerda,
  MOTIVOS_PERDA,
  resumirPerdas,
  rotuloDoProduto,
  textoDosItens,
  valorDaPerda,
  valorDoItem
} from './perdas'

describe('T10 · valor da perda', () => {
  it('matéria-prima pelo preço pago: morango 4 kg (18,00) + manga 2 kg (7,50) = R$ 87,00', () => {
    expect(valorDoItem(4000, 180000)).toBe(7200)
    expect(valorDoItem(2000, 75000)).toBe(1500)
    expect(
      valorDaPerda([
        { quantidade: 4000, custo: 180000 },
        { quantidade: 2000, custo: 75000 }
      ])
    ).toBe(8700)
  })

  it('troca pelo custo de fazer: 2 paletas de morango (3,35) = R$ 6,70', () => {
    expect(valorDaPerda([{ quantidade: 2000, custo: 33500 }])).toBe(670)
  })

  it('custo com 4 casas e quantidade quebrada: arredonda no fim de cada item', () => {
    // 1,5 kg × R$ 2,8264 = R$ 4,2396 → R$ 4,24
    expect(valorDoItem(1500, 28264)).toBe(424)
    // 3 × R$ 0,9549 = R$ 2,8647 → R$ 2,86
    expect(valorDoItem(3000, 9549)).toBe(286)
  })

  it('sem itens = R$ 0,00', () => {
    expect(valorDaPerda([])).toBe(0)
  })
})

describe('motivos (R10)', () => {
  it('cada tipo com os seus motivos, terminando em "Outro"', () => {
    expect(MOTIVOS_PERDA.produto).toEqual(['Venceu', 'Derreteu', 'Quebrou ou amassou', 'Outro'])
    expect(MOTIVOS_PERDA.materia_prima).toEqual(['Venceu', 'Estragou', 'Quebrou', 'Outro'])
    expect(MOTIVOS_PERDA.troca).toEqual([
      'Venceu no cliente',
      'Derreteu no cliente',
      'Embalagem com defeito',
      'Outro'
    ])
  })
})

describe('como a quantidade aparece', () => {
  it('produto com o nome da categoria fica em "un"; pote fica em "pote(s)"', () => {
    expect(rotuloDoProduto('Paleta de Morango recheada', 'paleta', 8)).toBe('un')
    expect(rotuloDoProduto('Picolé de limão', 'picolé', 20)).toBe('un')
    expect(rotuloDoProduto('Sorvete de Morango · pote 2 L', 'pote', 1)).toBe('pote')
    expect(rotuloDoProduto('Sorvete de Chocolate · pote 2 L', 'pote', 2)).toBe('potes')
    expect(rotuloDoProduto('Açaí', '', 3)).toBe('un')
  })

  it('texto da lista: "4 kg Morango · 2 kg Manga"', () => {
    expect(
      textoDosItens([
        { nome: 'Morango', quantidade: 4000, rotulo: 'kg' },
        { nome: 'Manga', quantidade: 2000, rotulo: 'kg' }
      ])
    ).toBe('4 kg Morango · 2 kg Manga')
    expect(textoDosItens([{ nome: 'Creme de leite', quantidade: 1500, rotulo: 'L' }])).toBe(
      '1,5 L Creme de leite'
    )
  })
})

describe('resumo do mês (protótipo 09-Perdas)', () => {
  const r = resumirPerdas([
    { tipo: 'troca', clienteId: 3, clienteNome: 'Lanchonete Sabor & Cia', valor: centavos(1900) },
    { tipo: 'materia_prima', clienteId: null, clienteNome: null, valor: centavos(1850) },
    { tipo: 'troca', clienteId: 2, clienteNome: 'Padaria Pão Quente', valor: centavos(2792) },
    { tipo: 'produto', clienteId: null, clienteNome: null, valor: centavos(6830) },
    { tipo: 'troca', clienteId: 1, clienteNome: 'Mercado Bom Preço', valor: centavos(4076) },
    { tipo: 'materia_prima', clienteId: null, clienteNome: null, valor: centavos(2150) },
    { tipo: 'materia_prima', clienteId: null, clienteNome: null, valor: centavos(8700) }
  ])

  it('perdido no mês e por tipo', () => {
    expect(r.total).toBe(28298)
    expect(r.registros).toBe(7)
    expect(r.porTipo.produto).toEqual({ valor: 6830, registros: 1 })
    expect(r.porTipo.materia_prima).toEqual({ valor: 12700, registros: 3 })
    expect(r.porTipo.troca).toEqual({ valor: 8768, registros: 3 })
  })

  it('trocas por cliente, do que mais perdeu; barra proporcional ao maior', () => {
    expect(r.porCliente.map((c) => [c.clienteNome, c.trocas, c.valor, c.barra])).toEqual([
      ['Mercado Bom Preço', 1, 4076, 100],
      ['Padaria Pão Quente', 1, 2792, 68],
      ['Lanchonete Sabor & Cia', 1, 1900, 47]
    ])
  })

  it('soma as trocas do mesmo cliente', () => {
    const dois = resumirPerdas([
      { tipo: 'troca', clienteId: 1, clienteNome: 'Mercado', valor: centavos(100) },
      { tipo: 'troca', clienteId: 1, clienteNome: 'Mercado', valor: centavos(250) }
    ])
    expect(dois.porCliente).toEqual([
      { clienteId: 1, clienteNome: 'Mercado', trocas: 2, valor: 350, barra: 100 }
    ])
  })

  it('mês sem perdas', () => {
    const vazio = resumirPerdas([])
    expect(vazio.total).toBe(0)
    expect(vazio.porCliente).toEqual([])
    expect(vazio.porTipo.troca).toEqual({ valor: 0, registros: 0 })
  })
})

describe('estoque que vai ficar negativo', () => {
  const tem = new Map([
    [1, 3500],
    [2, 10000]
  ])
  it('aponta só o que passa do estoque (somando o mesmo item duas vezes)', () => {
    expect(
      faltaParaAPerda(
        [
          { itemId: 1, quantidade: 4000 },
          { itemId: 2, quantidade: 2000 }
        ],
        tem
      )
    ).toEqual([1])
    expect(
      faltaParaAPerda(
        [
          { itemId: 2, quantidade: 6000 },
          { itemId: 2, quantidade: 6000 }
        ],
        tem
      )
    ).toEqual([2])
  })

  it('na edição, conta o que o próprio registro já tinha tirado', () => {
    // tinha 7,5 kg; a perda tirou 4 kg (sobrou 3,5); corrigir para 5 kg cabe
    expect(faltaParaAPerda([{ itemId: 1, quantidade: 5000 }], tem, new Map([[1, 4000]]))).toEqual(
      []
    )
  })

  it('item que não existe mais no estoque conta como zero', () => {
    expect(faltaParaAPerda([{ itemId: 9, quantidade: 1000 }], tem)).toEqual([9])
  })
})
