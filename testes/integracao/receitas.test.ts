import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DadosReceita } from '../../src/compartilhado/contrato'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { cadastrarItem, registrarEntrada } from '../../src/main/servicos/estoque'
import {
  criarCategoria,
  desfazerExclusaoReceita,
  excluirReceita,
  listarCategorias,
  listarReceitas,
  obterGas,
  obterReceita,
  removerCategoria,
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

/** Cadastra com o custo do protótipo: quantidade 1 (×1000) e valor = custo. */
function insumo(
  nome: string,
  unidade: 'un' | 'L' | 'kg',
  custoCentavos: number,
  tipo: 'materia_prima' | 'insumo' = 'materia_prima',
  nomeUnidade: string | null = null
) {
  return cadastrarItem(s.db, s.relogio, {
    tipo,
    unidade,
    nomeUnidade,
    nome,
    quantidade: 1000,
    valorPago: centavos(custoCentavos),
    fornecedorId: null,
    minimo: 0,
    validade: null
  })
}

function montarPaletaDeMaracuja() {
  const ids = {
    polpa: insumo('Polpa de maracujá', 'kg', 1400),
    acucar: insumo('Açúcar refinado', 'kg', 420),
    condensado: insumo('Leite condensado', 'un', 690, 'materia_prima', 'lata'),
    creme: insumo('Creme de leite', 'L', 2150),
    leite: insumo('Leite integral', 'L', 489),
    liga: insumo('Liga neutra', 'kg', 3200),
    palito: insumo('Palito', 'un', 8, 'insumo'),
    saquinho: insumo('Saquinho plástico', 'un', 27, 'insumo'),
    etiqueta: insumo('Etiqueta', 'un', 6, 'insumo')
  }
  salvarGas(s.db, s.relogio, { modo: 'ingrediente', precoPorVez: 800, valorFixo: 0 })
  const paleta = criarCategoria(s.db, s.relogio, 'Paleta')
  const dados: DadosReceita = {
    nome: 'Paleta de Maracujá',
    categoriaId: paleta.id,
    rendimento: 100,
    ingredientes: [
      { itemId: ids.polpa, quantidade: 5000 },
      { itemId: ids.acucar, quantidade: 3000 },
      { itemId: ids.condensado, quantidade: 10000 },
      { itemId: ids.creme, quantidade: 2500 },
      { itemId: ids.leite, quantidade: 5000 },
      { itemId: ids.liga, quantidade: 120 }
    ],
    embalagens: [ids.palito, ids.saquinho, ids.etiqueta],
    gasVezes: 1000,
    gasValor: null,
    precoBalcao: centavos(1000),
    precoAtacado: centavos(700),
    nomeUnidade: 'paleta'
  }
  const id = salvarReceita(s.db, s.relogio, null, dados)
  return { ids, paleta, dados, id }
}

describe('T1 de ponta a ponta: Paleta de Maracujá', () => {
  it('custo de cada R$ 2,8264; lucro R$ 7,17 (72%) e R$ 4,17 (60%)', () => {
    montarPaletaDeMaracuja()
    const [r] = listarReceitas(s.db)
    expect(r).toMatchObject({
      nome: 'Paleta de Maracujá',
      categoriaNome: 'Paleta',
      nomeUnidade: 'paleta',
      rendimento: 100,
      custoDeCada: 28264,
      balcao: { lucroDeCada: 71736, percentual: 72, lucroDaReceita: 71736 },
      atacado: { lucroDeCada: 41736, percentual: 60 }
    })
    expect(historico()[0]).toBe('Cadastrou a receita Paleta de Maracujá (rende 100 paletas)')
  })

  it('o preço salvo na receita vale para a categoria inteira, com histórico de preço', () => {
    montarPaletaDeMaracuja()
    const cat = listarCategorias(s.db)[0]!
    expect(cat).toMatchObject({ precoBalcao: 1000, precoAtacado: 700, emUso: 1 })
    expect(historico()).toContain('Mudou o preço da categoria Paleta no balcão: R$ 0,00 → R$ 10,00')
    const precos = s.db.prepare('SELECT * FROM historico_preco_categoria').all()
    expect(precos).toHaveLength(1)
  })
})

describe('custo sobe → lucro muda na hora (T3)', () => {
  it('morango de R$ 14,00 para R$ 18,00 o quilo', () => {
    const { ids, paleta } = montarPaletaDeMaracuja()
    const morango = insumo('Morango', 'kg', 1400)
    salvarReceita(s.db, s.relogio, null, {
      nome: 'Paleta de Morango recheada',
      categoriaId: paleta.id,
      rendimento: 100,
      ingredientes: [
        { itemId: morango, quantidade: 5000 },
        { itemId: ids.acucar, quantidade: 2500 },
        { itemId: ids.condensado, quantidade: 15000 },
        { itemId: ids.creme, quantidade: 2500 },
        { itemId: ids.leite, quantidade: 5000 },
        { itemId: ids.liga, quantidade: 120 }
      ],
      embalagens: [ids.palito, ids.saquinho, ids.etiqueta],
      gasVezes: 1000,
      gasValor: null,
      precoBalcao: centavos(1000),
      precoAtacado: centavos(700),
      nomeUnidade: 'paleta'
    })
    const antes = listarReceitas(s.db).find((r) => r.nome.includes('Morango'))!
    expect(antes.custoDeCada).toBe(31504)
    registrarEntrada(s.db, s.relogio, {
      itemId: morango,
      quantidade: 20000,
      valorPago: centavos(36000),
      fornecedorId: null,
      validade: null
    })
    const depois = listarReceitas(s.db)
    expect(depois.map((r) => [r.nome, r.custoDeCada])).toEqual([
      ['Paleta de Maracujá', 28264],
      ['Paleta de Morango recheada', 33504]
    ])
  })
})

describe('gás e energia: trocar o jeito em Configurações (D-041)', () => {
  it('A → B → C recalcula; os valores de cada jeito ficam guardados', () => {
    const { id } = montarPaletaDeMaracuja()
    expect(obterGas(s.db).modo).toBe('ingrediente')
    salvarGas(s.db, s.relogio, { modo: 'fixo', precoPorVez: 800, valorFixo: 1000 })
    expect(listarReceitas(s.db)[0]?.custoDeCada).toBe(28464)
    salvarGas(s.db, s.relogio, { modo: 'por_receita', precoPorVez: 800, valorFixo: 1000 })
    expect(listarReceitas(s.db)[0]?.custoDeCada).toBe(27464) // sem valor próprio ainda: R$ 274,64 ÷ 100
    const r = obterReceita(s.db, id)!
    salvarReceita(s.db, s.relogio, id, { ...r, gasValor: centavos(800) })
    expect(listarReceitas(s.db)[0]?.custoDeCada).toBe(28264)
    salvarGas(s.db, s.relogio, { modo: 'ingrediente', precoPorVez: 800, valorFixo: 1000 })
    expect(listarReceitas(s.db)[0]?.custoDeCada).toBe(28264)
    expect(historico()).toContain(
      'Mudou o jeito de contar o gás e energia da produção: item especial no estoque → valor fixo em toda receita'
    )
  })
})

describe('corrigir receita', () => {
  it('frase com o que mudou: rendimento, quantidade, ingrediente e embalagem', () => {
    const { ids, id } = montarPaletaDeMaracuja()
    const r = obterReceita(s.db, id)!
    salvarReceita(s.db, s.relogio, id, {
      ...r,
      rendimento: 90,
      ingredientes: r.ingredientes
        .filter((i) => i.itemId !== ids.liga)
        .map((i) => (i.itemId === ids.polpa ? { ...i, quantidade: 6000 } : i)),
      embalagens: [ids.palito, ids.saquinho]
    })
    expect(historico()[0]).toBe(
      'Mudou a receita Paleta de Maracujá: rende 100 → 90 paletas; Polpa de maracujá 5 kg → 6 kg; tirou Liga neutra; tirou da embalagem Etiqueta'
    )
  })

  it('validação: sem nome, sem categoria, sem rendimento', () => {
    const { dados } = montarPaletaDeMaracuja()
    expect(() => salvarReceita(s.db, s.relogio, null, { ...dados, nome: '' })).toThrow(
      'Digite o nome da receita.'
    )
    expect(() => salvarReceita(s.db, s.relogio, null, { ...dados, categoriaId: 999 })).toThrow(
      'Escolha a categoria do produto.'
    )
    expect(() => salvarReceita(s.db, s.relogio, null, { ...dados, rendimento: 0 })).toThrow(
      'Diga quantas unidades a receita rende.'
    )
  })

  it('matéria-prima não entra como embalagem', () => {
    const { ids, dados } = montarPaletaDeMaracuja()
    expect(() =>
      salvarReceita(s.db, s.relogio, null, { ...dados, embalagens: [ids.acucar] })
    ).toThrow('Um item de embalagem não está mais no estoque.')
  })
})

describe('categorias e exclusão', () => {
  it('categoria com receita não pode ser removida; nome repetido também não', () => {
    const { paleta } = montarPaletaDeMaracuja()
    expect(() => removerCategoria(s.db, s.relogio, paleta.id)).toThrow(
      'Só dá para remover uma categoria que não tem receitas nem produtos.'
    )
    expect(() => criarCategoria(s.db, s.relogio, ' paleta ')).toThrow(
      'Já existe uma categoria com esse nome.'
    )
    const picole = criarCategoria(s.db, s.relogio, 'Picolé')
    expect(picole.nomeUnidade).toBe('picolé')
    removerCategoria(s.db, s.relogio, picole.id)
    expect(listarCategorias(s.db).map((c) => c.nome)).toEqual(['Paleta'])
  })

  it('excluir receita e desfazer', () => {
    const { id } = montarPaletaDeMaracuja()
    excluirReceita(s.db, s.relogio, id)
    expect(listarReceitas(s.db)).toEqual([])
    expect(listarCategorias(s.db)[0]?.emUso).toBe(0)
    desfazerExclusaoReceita(s.db, s.relogio, id)
    expect(listarReceitas(s.db)).toHaveLength(1)
    expect(historico().slice(0, 2)).toEqual([
      'Desfez a exclusão da receita Paleta de Maracujá',
      'Excluiu a receita Paleta de Maracujá'
    ])
  })
})
