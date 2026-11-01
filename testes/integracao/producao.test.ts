import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { cadastrarItem, listarItens } from '../../src/main/servicos/estoque'
import {
  desfazerExclusaoProducao,
  excluirProducao,
  listarProducoes,
  registrarProducao
} from '../../src/main/servicos/producao'
import { listarCategorias, salvarGas, salvarReceita } from '../../src/main/servicos/receitas'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema
let receitaId: number

/** T2/T13: Paleta de Morango recheada, com 3,5 kg de morango no estoque (em duas compras). */
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
  const morango = item('Morango', 'kg', 3500, 6300, 'materia_prima', '2026-10-20')
  const ids = [
    morango,
    item('Açúcar refinado', 'kg', 50000, 21000),
    item('Leite condensado', 'un', 30000, 20700),
    item('Creme de leite', 'L', 18000, 38700),
    item('Leite integral', 'L', 30000, 14670),
    item('Liga neutra', 'kg', 2000, 6400)
  ]
  const palito = item('Palito', 'un', 1_200_000, 9600, 'insumo')
  const saquinho = item('Saquinho plástico', 'un', 900_000, 24300, 'insumo')
  const etiqueta = item('Etiqueta', 'un', 2_000_000, 12000, 'insumo')
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
    embalagens: [palito, saquinho, etiqueta],
    gasVezes: 1000,
    gasValor: null,
    precoBalcao: centavos(1000),
    precoAtacado: centavos(700),
    nomeUnidade: 'paleta'
  })
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

const estoque = () => new Map(listarItens(s.db).map((i) => [i.nome, i.quantidade]))
const historico = () => listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)

describe('T13 · registrar produção', () => {
  it('baixa ingredientes e embalagens (gás não); estoque de morango fica negativo', () => {
    const p = registrarProducao(s.db, s.relogio, { receitaId, vezes: 1000, unidadesFeitas: 100 })
    expect(p).toMatchObject({
      data: '2026-10-16',
      nomeReceita: 'Paleta de Morango recheada',
      nomeUnidade: 'paleta',
      unidadesPrevistas: 100,
      unidadesFeitas: 100
    })
    const e = estoque()
    expect(e.get('Morango')).toBe(-1500)
    expect(e.get('Açúcar refinado')).toBe(47500)
    expect(e.get('Leite condensado')).toBe(15000)
    expect(e.get('Liga neutra')).toBe(1880)
    expect(e.get('Palito')).toBe(1_100_000)
    expect(e.get('Etiqueta')).toBe(1_900_000)
    expect(historico()[0]).toBe(
      'Registrou a produção: 1 receita de Paleta de Morango recheada, 100 paletas. Ingredientes e embalagens baixados do estoque; ficou negativo: Morango'
    )
    expect(listarProducoes(s.db, '2026-10')).toHaveLength(1)
  })

  it('meia receita e quanto saiu de verdade (p.32 e p.33)', () => {
    registrarProducao(s.db, s.relogio, { receitaId, vezes: 500, unidadesFeitas: 48 })
    expect(estoque().get('Morango')).toBe(1000)
    expect(estoque().get('Palito')).toBe(1_150_000)
    expect(historico()[0]).toContain(
      '½ receita de Paleta de Morango recheada, 48 paletas (a receita previa 50)'
    )
  })

  it('excluir devolve o estoque às mesmas compras; desfazer baixa de novo', () => {
    const antes = listarItens(s.db).find((i) => i.nome === 'Morango')!
    const p = registrarProducao(s.db, s.relogio, { receitaId, vezes: 500, unidadesFeitas: 50 })
    expect(listarItens(s.db).find((i) => i.nome === 'Morango')!.lotes[0]!.quantidade).toBe(1000)

    excluirProducao(s.db, s.relogio, p.id)
    const depois = listarItens(s.db).find((i) => i.nome === 'Morango')!
    expect(depois.quantidade).toBe(3500)
    expect(depois.lotes).toEqual(antes.lotes)
    expect(listarProducoes(s.db, '2026-10')).toHaveLength(0)
    expect(historico()[0]).toContain('os ingredientes e as embalagens voltaram para o estoque')

    desfazerExclusaoProducao(s.db, s.relogio, p.id)
    expect(estoque().get('Morango')).toBe(1000)
    expect(estoque().get('Palito')).toBe(1_150_000)
    expect(listarProducoes(s.db, '2026-10')).toHaveLength(1)
  })

  it('excluir produção com estoque negativo volta ao que era', () => {
    const p = registrarProducao(s.db, s.relogio, { receitaId, vezes: 1000, unidadesFeitas: 100 })
    excluirProducao(s.db, s.relogio, p.id)
    const m = listarItens(s.db).find((i) => i.nome === 'Morango')!
    expect(m.quantidade).toBe(3500)
    expect(m.lotes.reduce((t, l) => t + l.quantidade, 0)).toBe(3500)
  })

  it('validações', () => {
    expect(() =>
      registrarProducao(s.db, s.relogio, { receitaId, vezes: 0, unidadesFeitas: 100 })
    ).toThrow('Digite quantas receitas fez.')
    expect(() =>
      registrarProducao(s.db, s.relogio, { receitaId: 999, vezes: 1000, unidadesFeitas: 100 })
    ).toThrow('Escolha a receita.')
  })
})
