import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DadosPerda } from '../../src/compartilhado/contrato'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { clientes } from '../../src/main/servicos/cadastros'
import { cadastrarItem, listarItens } from '../../src/main/servicos/estoque'
import {
  desfazerExclusaoPerda,
  excluirPerda,
  listarPerdas,
  salvarPerda
} from '../../src/main/servicos/perdas'
import {
  listarCategorias,
  listarReceitas,
  salvarGas,
  salvarReceita
} from '../../src/main/servicos/receitas'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema
let morango: number
let manga: number
let receitaId: number
let clienteId: number

/** T10: morango (R$ 18,00/kg, 7,5 kg em duas compras), manga (R$ 7,50/kg) e a Paleta de Morango recheada (T2). */
beforeEach(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
  const item = (
    nome: string,
    unidade: 'un' | 'L' | 'kg',
    quantidade: number,
    valorPago: number,
    tipo: 'materia_prima' | 'insumo' = 'materia_prima',
    validade: string | null = null
  ) =>
    cadastrarItem(s.db, s.relogio, {
      tipo,
      unidade,
      nomeUnidade: nome === 'Leite condensado' ? 'lata' : null,
      nome,
      quantidade,
      valorPago: centavos(valorPago),
      fornecedorId: null,
      minimo: 0,
      validade
    })
  morango = item('Morango', 'kg', 7500, 13500, 'materia_prima', '2026-10-20')
  manga = item('Manga', 'kg', 5000, 3750)
  const ids = [
    morango,
    item('Açúcar refinado', 'kg', 50000, 21000),
    item('Leite condensado', 'un', 30000, 20700),
    item('Creme de leite', 'L', 18000, 38700),
    item('Leite integral', 'L', 30000, 14670),
    item('Liga neutra', 'kg', 2000, 6400)
  ]
  const embalagens = [
    item('Palito', 'un', 1_200_000, 9600, 'insumo'),
    item('Saquinho plástico', 'un', 900_000, 24300, 'insumo'),
    item('Etiqueta', 'un', 2_000_000, 12000, 'insumo')
  ]
  salvarGas(s.db, s.relogio, { modo: 'ingrediente', precoPorVez: 800, valorFixo: 0 })
  const paleta = listarCategorias(s.db).find((c) => c.nome === 'Paleta')!
  receitaId = salvarReceita(s.db, s.relogio, null, {
    nome: 'Paleta de Morango recheada',
    categoriaId: paleta.id,
    rendimento: 100,
    ingredientes: [5000, 2500, 15000, 2500, 5000, 120].map((quantidade, i) => ({
      itemId: ids[i]!,
      quantidade
    })),
    embalagens,
    gasVezes: 1000,
    gasValor: null,
    precoBalcao: centavos(1000),
    precoAtacado: centavos(700),
    nomeUnidade: 'paleta'
  })
  clienteId = clientes.salvar(s.db, s.relogio, null, {
    nome: 'Mercado Bom Preço',
    telefone: '',
    documento: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: ''
  })
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

const estoque = () => new Map(listarItens(s.db).map((i) => [i.id, i.quantidade]))
const historico = () => listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)

const materia = (): DadosPerda => ({
  tipo: 'materia_prima',
  data: '2026-10-16',
  clienteId: null,
  motivo: 'Venceu',
  observacao: '',
  itens: [
    { id: morango, quantidade: 4000 },
    { id: manga, quantidade: 2000 }
  ]
})

describe('T10 · perdas', () => {
  it('matéria-prima: morango 4 kg + manga 2 kg = R$ 87,00 e baixa o estoque', () => {
    const id = salvarPerda(s.db, s.relogio, null, materia())
    const [p] = listarPerdas(s.db, '2026-10')
    expect(p).toMatchObject({ id, tipo: 'materia_prima', valor: 8700, motivo: 'Venceu' })
    expect(p!.itens.map((i) => [i.nome, i.quantidade, i.rotulo, i.valor])).toEqual([
      ['Morango', 4000, 'kg', 7200],
      ['Manga', 2000, 'kg', 1500]
    ])
    expect(estoque().get(morango)).toBe(3500)
    expect(estoque().get(manga)).toBe(3000)
    expect(historico()[0]).toBe(
      'Registrou a perda: 16/10, Matéria-prima, Venceu: 4 kg Morango · 2 kg Manga, R$ 87,00. Baixou do estoque'
    )
  })

  it('troca em cliente: 2 paletas de morango pelo custo de fazer, ligada ao cliente; estoque não mexe', () => {
    const custo = listarReceitas(s.db).find((r) => r.id === receitaId)!.custoDeCada
    expect(custo).toBe(33504) // R$ 3,3504, aparece R$ 3,35
    const antes = estoque()
    salvarPerda(s.db, s.relogio, null, {
      tipo: 'troca',
      data: '2026-10-16',
      clienteId,
      itens: [{ id: receitaId, quantidade: 2000 }],
      motivo: 'Venceu no cliente',
      observacao: ''
    })
    const [p] = listarPerdas(s.db, '2026-10')
    expect(p).toMatchObject({ valor: 670, clienteId, clienteNome: 'Mercado Bom Preço' })
    expect(p!.itens[0]).toMatchObject({ rotulo: 'un', custo: 33504 })
    expect(estoque()).toEqual(antes)
    expect(historico()[0]).toContain('Troca em Mercado Bom Preço, Venceu no cliente')
  })

  it('excluir → desfazer: registro e estoque voltam ao que eram (às mesmas compras)', () => {
    const lotesAntes = listarItens(s.db).find((i) => i.id === morango)!.lotes
    const id = salvarPerda(s.db, s.relogio, null, materia())
    excluirPerda(s.db, s.relogio, id)
    expect(listarPerdas(s.db, '2026-10')).toHaveLength(0)
    expect(estoque().get(morango)).toBe(7500)
    expect(estoque().get(manga)).toBe(5000)
    expect(listarItens(s.db).find((i) => i.id === morango)!.lotes).toEqual(lotesAntes)
    expect(historico()[0]).toContain('Voltou para o estoque')

    desfazerExclusaoPerda(s.db, s.relogio, id)
    expect(listarPerdas(s.db, '2026-10')).toHaveLength(1)
    expect(estoque().get(morango)).toBe(3500)
    expect(estoque().get(manga)).toBe(3000)
    expect(() => desfazerExclusaoPerda(s.db, s.relogio, id)).toThrow('Não há exclusão')
  })

  it('editar acerta o estoque e guarda o valor do dia dos itens que já estavam (D-069)', () => {
    const id = salvarPerda(s.db, s.relogio, null, materia())
    // o morango ficou mais caro depois da perda
    s.db.prepare('UPDATE item_estoque SET custo_unitario_x10000 = 250000 WHERE id = ?').run(morango)
    s.db.prepare('UPDATE item_estoque SET custo_unitario_x10000 = 90000 WHERE id = ?').run(manga)
    salvarPerda(s.db, s.relogio, id, {
      ...materia(),
      itens: [{ id: morango, quantidade: 5000 }],
      observacao: 'caixa de baixo'
    })
    const [p] = listarPerdas(s.db, '2026-10')
    expect(p!.valor).toBe(9000) // 5 kg × 18,00
    expect(estoque().get(morango)).toBe(2500)
    expect(estoque().get(manga)).toBe(5000)
    expect(historico()[0]).toBe(
      'Corrigiu a perda: 16/10, Matéria-prima, Venceu: 4 kg Morango · 2 kg Manga, R$ 87,00 → ' +
        '16/10, Matéria-prima, Venceu: 5 kg Morango, R$ 90,00 (caixa de baixo). Estoque acertado'
    )
    // item novo na edição entra com o preço de hoje
    salvarPerda(s.db, s.relogio, id, {
      ...materia(),
      itens: [
        { id: morango, quantidade: 5000 },
        { id: manga, quantidade: 1000 }
      ]
    })
    expect(listarPerdas(s.db, '2026-10')[0]!.valor).toBe(9900)
  })

  it('mudar de matéria-prima para produto pronto devolve o estoque', () => {
    const id = salvarPerda(s.db, s.relogio, null, materia())
    salvarPerda(s.db, s.relogio, id, {
      ...materia(),
      tipo: 'produto',
      motivo: 'Derreteu',
      itens: [{ id: receitaId, quantidade: 6000 }]
    })
    expect(estoque().get(morango)).toBe(7500)
    expect(listarPerdas(s.db, '2026-10')[0]).toMatchObject({ tipo: 'produto', valor: 2010 })
  })

  it('salvar sem mudar nada não grava no histórico', () => {
    const id = salvarPerda(s.db, s.relogio, null, materia())
    const n = historico().length
    salvarPerda(s.db, s.relogio, id, materia())
    expect(historico()).toHaveLength(n)
  })

  it('perda maior que o estoque deixa negativo (D-069)', () => {
    salvarPerda(s.db, s.relogio, null, { ...materia(), itens: [{ id: manga, quantidade: 6000 }] })
    expect(estoque().get(manga)).toBe(-1000)
  })

  it('data no mês anterior aparece no mês dela', () => {
    salvarPerda(s.db, s.relogio, null, { ...materia(), data: '2026-09-30' })
    expect(listarPerdas(s.db, '2026-10')).toHaveLength(0)
    expect(listarPerdas(s.db, '2026-09')).toHaveLength(1)
  })

  it('cliente com troca não pode ser excluído', () => {
    salvarPerda(s.db, s.relogio, null, {
      tipo: 'troca',
      data: '2026-10-16',
      clienteId,
      itens: [{ id: receitaId, quantidade: 1000 }],
      motivo: 'Outro',
      observacao: ''
    })
    expect(clientes.emUso(s.db, clienteId)).toBe('tem 1 troca em Perdas')
  })

  it('validações', () => {
    const v = (d: Partial<DadosPerda>) => () =>
      salvarPerda(s.db, s.relogio, null, { ...materia(), ...d })
    expect(v({ itens: [] })).toThrow('Toque nos itens que se perderam.')
    expect(v({ data: '2026-10-17' })).toThrow('Essa data ainda não chegou.')
    expect(v({ tipo: 'troca', itens: [{ id: receitaId, quantidade: 1000 }] })).toThrow(
      'Escolha o cliente.'
    )
    expect(v({ tipo: 'produto', itens: [{ id: receitaId, quantidade: 1500 }] })).toThrow(
      'Produto pronto vai em unidades inteiras.'
    )
    expect(v({ itens: [{ id: morango, quantidade: 0 }] })).toThrow(
      'Digite a quantidade de cada item.'
    )
    expect(v({ motivo: ' ' })).toThrow('Escolha o motivo.')
  })
})
