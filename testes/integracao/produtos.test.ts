import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { entenderAvisoDeCusto, listarAvisosDeCusto } from '../../src/main/servicos/avisoCusto'
import {
  cadastrarItem,
  desfazerExclusaoItem,
  editarItem,
  excluirItem,
  obterItem,
  registrarEntrada
} from '../../src/main/servicos/estoque'
import {
  desfazerExclusaoProduto,
  excluirProduto,
  listarProdutos,
  salvarProduto
} from '../../src/main/servicos/produtos'
import {
  criarCategoria,
  excluirReceita,
  listarCategorias,
  listarReceitas,
  receitasQueUsam,
  salvarGas,
  salvarReceita
} from '../../src/main/servicos/receitas'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste, semCategoriasIniciais } from './ajuda'

let s: Sistema

beforeEach(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
  semCategoriasIniciais(s.db)
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

const historico = () => listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)

function insumo(
  nome: string,
  unidade: 'un' | 'L' | 'kg',
  custo: number,
  tipo: 'materia_prima' | 'insumo' = 'materia_prima'
) {
  return cadastrarItem(s.db, s.relogio, {
    tipo,
    unidade,
    nomeUnidade: null,
    nome,
    quantidade: 1000,
    valorPago: centavos(custo),
    fornecedorId: null,
    minimo: 0,
    validade: null
  })
}

/** Paleta de Morango recheada e Sorvete de Morango (pote 2 L), como no protótipo (T3). */
function montar() {
  const morango = insumo('Morango', 'kg', 1400)
  const acucar = insumo('Açúcar refinado', 'kg', 420)
  const condensado = insumo('Leite condensado', 'un', 690)
  const creme = insumo('Creme de leite', 'L', 2150)
  const leite = insumo('Leite integral', 'L', 489)
  const liga = insumo('Liga neutra', 'kg', 3200)
  const embalagem = [
    insumo('Palito', 'un', 8, 'insumo'),
    insumo('Saquinho plástico', 'un', 27, 'insumo'),
    insumo('Etiqueta', 'un', 6, 'insumo')
  ]
  const pote = insumo('Pote 2 L com tampa', 'un', 185, 'insumo')
  salvarGas(s.db, s.relogio, { modo: 'ingrediente', precoPorVez: 800, valorFixo: 0 })
  const paleta = criarCategoria(s.db, s.relogio, 'Paleta')
  const sorvete = criarCategoria(s.db, s.relogio, 'Sorvete de pote')
  const receitaPaleta = salvarReceita(s.db, s.relogio, null, {
    nome: 'Paleta de Morango recheada',
    categoriaId: paleta.id,
    rendimento: 100,
    ingredientes: [
      { itemId: morango, quantidade: 5000 },
      { itemId: acucar, quantidade: 2500 },
      { itemId: condensado, quantidade: 15000 },
      { itemId: creme, quantidade: 2500 },
      { itemId: leite, quantidade: 5000 },
      { itemId: liga, quantidade: 120 }
    ],
    embalagens: embalagem,
    gasVezes: 1000,
    gasValor: null,
    precoBalcao: centavos(1000),
    precoAtacado: centavos(700),
    nomeUnidade: 'paleta'
  })
  // Sorvete de Morango: R$ 324,4662 ÷ 10 = R$ 32,4466 com morango a R$ 14,00; +R$ 2,00 a R$ 18,00
  const receitaSorvete = salvarReceita(s.db, s.relogio, null, {
    nome: 'Sorvete de Morango',
    categoriaId: sorvete.id,
    rendimento: 10,
    ingredientes: [
      { itemId: morango, quantidade: 5000 },
      { itemId: creme, quantidade: 7500 },
      { itemId: condensado, quantidade: 9000 },
      { itemId: leite, quantidade: 2580 }
    ],
    embalagens: [pote],
    gasVezes: null,
    gasValor: null,
    precoBalcao: centavos(4900),
    precoAtacado: centavos(4500),
    nomeUnidade: 'pote'
  })
  return { morango, liga, pote, paleta, sorvete, receitaPaleta, receitaSorvete }
}

describe('T3 · aviso "O custo subiu"', () => {
  it('morango R$ 14,00 → R$ 18,00 (+29%): custo e lucro de cada receita, antes e agora', () => {
    const { morango } = montar()
    expect(listarAvisosDeCusto(s.db)).toEqual([])
    registrarEntrada(s.db, s.relogio, {
      itemId: morango,
      quantidade: 20000,
      valorPago: centavos(36000),
      fornecedorId: null,
      validade: null
    })
    const [aviso] = listarAvisosDeCusto(s.db)
    expect(aviso).toMatchObject({
      nome: 'Morango',
      custoAntes: 140000,
      custoAgora: 180000,
      aumento: 29,
      quando: '2026-10-16'
    })
    const porNome = new Map(aviso!.receitas.map((r) => [r.nome, r]))
    expect(porNome.get('Paleta de Morango recheada')).toMatchObject({
      custoAntes: 31504,
      custoAgora: 33504,
      lucroAntes: 68496,
      lucroAgora: 66496
    })
    expect(porNome.get('Sorvete de Morango')).toMatchObject({
      custoAntes: 324466,
      custoAgora: 344466 // 5 kg × R$ 4,00 ÷ 10 potes = +R$ 2,00
    })
  })

  it('"Entendi" tira o aviso até o próximo aumento; dois aumentos seguidos viram um aviso só', () => {
    const { morango } = montar()
    const entrada = (valor: number) =>
      registrarEntrada(s.db, s.relogio, {
        itemId: morango,
        quantidade: 1000,
        valorPago: centavos(valor),
        fornecedorId: null,
        validade: null
      })
    entrada(1600)
    entrada(1800)
    expect(listarAvisosDeCusto(s.db)).toHaveLength(1)
    expect(listarAvisosDeCusto(s.db)[0]).toMatchObject({ custoAntes: 140000, custoAgora: 180000 })
    entenderAvisoDeCusto(s.db, s.relogio, morango)
    expect(listarAvisosDeCusto(s.db)).toEqual([])
    entrada(2000)
    expect(listarAvisosDeCusto(s.db)[0]).toMatchObject({ custoAntes: 180000, custoAgora: 200000 })
  })

  it('aumento pelo Editar também avisa; se o custo voltar, o aviso some', () => {
    const { liga } = montar()
    const item = obterItem(s.db, liga)!
    editarItem(s.db, s.relogio, liga, { ...item, nomeUnidade: null, custo: 350000, validades: [] })
    expect(listarAvisosDeCusto(s.db).map((a) => a.nome)).toEqual(['Liga neutra'])
    editarItem(s.db, s.relogio, liga, { ...item, nomeUnidade: null, custo: 320000, validades: [] })
    expect(listarAvisosDeCusto(s.db)).toEqual([])
  })
})

describe('produtos à venda', () => {
  it('herda o preço da categoria (pote R$ 49 / R$ 45) e o custo da receita', () => {
    const { sorvete, receitaSorvete } = montar()
    salvarProduto(s.db, s.relogio, null, {
      categoriaId: sorvete.id,
      nome: 'Sorvete de Morango',
      vendidoComo: 'pote',
      medida: 2000,
      medidaUnidade: 'L',
      unidadesPorCaixa: null,
      receitaId: receitaSorvete
    })
    const [p] = listarProdutos(s.db)
    expect(p).toMatchObject({
      categoriaNome: 'Sorvete de pote',
      receitaNome: 'Sorvete de Morango',
      precoBalcao: 4900,
      precoAtacado: 4500,
      custo: 324466,
      lucroBalcao: 165534,
      lucroAtacado: 125534
    })
    expect(historico()[0]).toBe('Cadastrou o produto Sorvete de Morango (Sorvete de pote)')
  })

  it('caixa: quantidade × preço e custo (T6: 20 × R$ 5,50 = R$ 110,00)', () => {
    montar()
    const picole = criarCategoria(s.db, s.relogio, 'Picolé')
    const cacau = insumo('Cacau em pó', 'kg', 4800)
    const receita = salvarReceita(s.db, s.relogio, null, {
      nome: 'Picolé de Chocolate',
      categoriaId: picole.id,
      rendimento: 100,
      ingredientes: [{ itemId: cacau, quantidade: 2500 }],
      embalagens: [],
      gasVezes: null,
      gasValor: null,
      precoBalcao: centavos(700),
      precoAtacado: centavos(550),
      nomeUnidade: 'picolé'
    })
    salvarProduto(s.db, s.relogio, null, {
      categoriaId: picole.id,
      nome: 'Caixa 20 picolés de chocolate',
      vendidoComo: 'caixa',
      medida: null,
      medidaUnidade: null,
      unidadesPorCaixa: 20,
      receitaId: receita
    })
    const p = listarProdutos(s.db).find((x) => x.vendidoComo === 'caixa')!
    expect(p.precoAtacado).toBe(11000)
    expect(p.precoBalcao).toBe(14000)
    expect(p.custo).toBe(20 * 12000)
  })

  it('validações: caixa sem quantidade, receita de outra categoria, nome repetido', () => {
    const { paleta, sorvete, receitaSorvete } = montar()
    const base = {
      categoriaId: paleta.id,
      nome: 'Paleta de Morango',
      vendidoComo: 'unidade' as const,
      medida: 110000,
      medidaUnidade: 'g' as const,
      unidadesPorCaixa: null,
      receitaId: null
    }
    expect(() => salvarProduto(s.db, s.relogio, null, { ...base, vendidoComo: 'caixa' })).toThrow(
      'Diga quantas unidades vêm na caixa.'
    )
    expect(() =>
      salvarProduto(s.db, s.relogio, null, { ...base, receitaId: receitaSorvete })
    ).toThrow('A receita escolhida é de outra categoria.')
    salvarProduto(s.db, s.relogio, null, base)
    expect(() => salvarProduto(s.db, s.relogio, null, base)).toThrow(
      'Já existe Paleta de Morango na categoria Paleta.'
    )
    expect(listarCategorias(s.db).find((c) => c.id === paleta.id)?.emUso).toBe(2)
    expect(listarCategorias(s.db).find((c) => c.id === sorvete.id)?.emUso).toBe(1)
  })

  it('receita usada em produto não pode ser excluída; produto exclui e desfaz', () => {
    const { paleta, receitaPaleta } = montar()
    const id = salvarProduto(s.db, s.relogio, null, {
      categoriaId: paleta.id,
      nome: 'Paleta de Morango recheada',
      vendidoComo: 'unidade',
      medida: 110000,
      medidaUnidade: 'g',
      unidadesPorCaixa: null,
      receitaId: receitaPaleta
    })
    expect(() => excluirReceita(s.db, s.relogio, receitaPaleta)).toThrow(
      'Não dá para excluir: é usada em 1 produto à venda.'
    )
    excluirProduto(s.db, s.relogio, id)
    expect(listarProdutos(s.db)).toEqual([])
    desfazerExclusaoProduto(s.db, s.relogio, id)
    expect(listarProdutos(s.db)).toHaveLength(1)
  })

  it('corrigir produto: frase com o que mudou', () => {
    const { paleta, receitaPaleta } = montar()
    const dados = {
      categoriaId: paleta.id,
      nome: 'Paleta de Morango recheada',
      vendidoComo: 'unidade' as const,
      medida: 110000,
      medidaUnidade: 'g' as const,
      unidadesPorCaixa: null,
      receitaId: null
    }
    const id = salvarProduto(s.db, s.relogio, null, dados)
    salvarProduto(s.db, s.relogio, id, { ...dados, medida: 120000, receitaId: receitaPaleta })
    expect(historico()[0]).toBe(
      'Mudou o produto Paleta de Morango recheada: peso ou volume 110 g → 120 g; receita usada (vazio) → Paleta de Morango recheada'
    )
  })
})

describe('apagar ingrediente usado em receitas (pergunta 11, D-047)', () => {
  it('lista as receitas, tira das receitas (custo muda) e o Desfazer devolve tudo', () => {
    const { liga } = montar()
    expect(receitasQueUsam(s.db, liga).map((r) => r.nome)).toEqual(['Paleta de Morango recheada'])
    const custoCom = listarReceitas(s.db).find((r) => r.nome.startsWith('Paleta'))!.custoDeCada
    excluirItem(s.db, s.relogio, liga)
    const custoSem = listarReceitas(s.db).find((r) => r.nome.startsWith('Paleta'))!.custoDeCada
    expect(custoCom - custoSem).toBe(384) // 0,12 kg × R$ 32,00 = R$ 3,84 ÷ 100
    expect(historico().slice(0, 2)).toEqual([
      'Tirou Liga neutra da receita Paleta de Morango recheada (o item foi apagado do estoque)',
      'Excluiu o insumo Liga neutra'
    ])
    desfazerExclusaoItem(s.db, s.relogio, liga)
    expect(listarReceitas(s.db).find((r) => r.nome.startsWith('Paleta'))!.custoDeCada).toBe(
      custoCom
    )
  })
})
