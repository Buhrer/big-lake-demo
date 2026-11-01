import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IdRelatorio, RelComparar, Relatorio } from '../../src/compartilhado/contrato'
import { centavos } from '../../src/dominio/dinheiro'
import { clientes } from '../../src/main/servicos/cadastros'
import { listarTipos, salvarConta } from '../../src/main/servicos/contas'
import { cadastrarItem } from '../../src/main/servicos/estoque'
import { salvarPerda } from '../../src/main/servicos/perdas'
import { registrarProducao } from '../../src/main/servicos/producao'
import { salvarProduto } from '../../src/main/servicos/produtos'
import { listarCategorias, salvarReceita } from '../../src/main/servicos/receitas'
import { mesesComDados, obterRelatorio } from '../../src/main/servicos/relatorios'
import { salvarFechamento, salvarPedido, salvarTaxas } from '../../src/main/servicos/vendas'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema

/**
 * Outubro de 2026 (hoje 16/10):
 * balcão 01/10 (dinheiro 1.000, débito 500, crédito 300, Pix 200) e 15/10 (dinheiro 500);
 * pedido 16/10: 40 paletas a R$ 7,00 (Pix); aluguel R$ 3.500,00 pago;
 * produção de 100 paletas (custo de cada R$ 0,90; balcão R$ 10,00); 5 paletas derreteram.
 * Outubro de 2025: balcão R$ 1.000,00.
 */
beforeEach(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
  const { db, relogio } = s
  salvarTaxas(db, relogio, { debitoPct: 150, debitoDias: 1, creditoPct: 320, creditoDias: 30 })
  const balcao = (data: string, dinheiro: number, debito = 0, credito = 0, pix = 0) =>
    salvarFechamento(db, relogio, {
      data,
      lojaFechada: false,
      dinheiro: centavos(dinheiro),
      debito: centavos(debito),
      credito: centavos(credito),
      pix: centavos(pix)
    })
  balcao('2025-10-10', 100000)
  balcao('2026-10-01', 100000, 50000, 30000, 20000)
  balcao('2026-10-15', 50000)

  const morango = cadastrarItem(db, relogio, {
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    nome: 'Morango',
    quantidade: 10000,
    valorPago: centavos(18000),
    fornecedorId: null,
    minimo: 0,
    validade: null
  })
  const paleta = listarCategorias(db).find((c) => c.nome === 'Paleta')!
  const receitaId = salvarReceita(db, relogio, null, {
    nome: 'Paleta de Morango',
    categoriaId: paleta.id,
    rendimento: 100,
    ingredientes: [{ itemId: morango, quantidade: 5000 }],
    embalagens: [],
    gasVezes: 1000,
    gasValor: null,
    precoBalcao: centavos(1000),
    precoAtacado: centavos(700),
    nomeUnidade: 'paleta'
  })
  const produtoId = salvarProduto(db, relogio, null, {
    categoriaId: paleta.id,
    nome: 'Paleta de Morango',
    vendidoComo: 'unidade',
    medida: null,
    medidaUnidade: null,
    unidadesPorCaixa: null,
    receitaId
  })
  const mercado = clientes.salvar(db, relogio, null, {
    nome: 'Mercado Bom Preço',
    telefone: '',
    documento: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: ''
  })
  salvarPedido(db, relogio, null, {
    clienteId: mercado,
    data: '2026-10-16',
    forma: 'pix',
    itens: [{ produtoId, quantidade: 40 }]
  })
  const aluguel = listarTipos(db).find((t) => t.nome === 'Aluguel')!
  salvarConta(
    db,
    relogio,
    null,
    {
      nome: 'Aluguel',
      valor: centavos(350000),
      vencimento: '2026-10-05',
      tipoId: aluguel.id,
      repete: false,
      avisarDias: 3
    },
    { forma: 'pix', cartaoId: null, pagoEm: '2026-10-05' }
  )
  registrarProducao(db, relogio, { receitaId, vezes: 1000, unidadesFeitas: 100 })
  salvarPerda(db, relogio, null, {
    tipo: 'produto',
    data: '2026-10-16',
    clienteId: null,
    itens: [{ id: receitaId, quantidade: 5000 }],
    motivo: 'Derreteu',
    observacao: ''
  })
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

type Dados = { [R in Relatorio as R['id']]: R['dados'] }
const dados = <I extends IdRelatorio>(id: I, am = '2026-10') =>
  obterRelatorio(s.db, id, am, '2026-10-16').dados as Dados[I]

describe('relatórios de outubro de 2026', () => {
  it('meses com dados: de outubro de 2025 até hoje, do mais novo', () => {
    const m = mesesComDados(s.db, '2026-10-16')
    expect(m[0]).toBe('2026-10')
    expect(m.at(-1)).toBe('2025-10')
    expect(m).toHaveLength(13)
  })

  it('Resultado do mês: balcão, pedidos, despesas por tipo, taxas e lucro', () => {
    expect(dados('resultado')).toEqual({
      balcao: 250000,
      pedidos: 28000,
      total: 278000,
      despesas: [{ tipo: 'Aluguel', valor: 350000 }],
      // débito 500 × 1,5% + crédito 300 × 3,2%
      taxas: 1710,
      lucro: 278000 - 350000 - 1710
    })
  })

  it('Mais vendidos nos pedidos', () => {
    expect(dados('mais_vendidos')).toEqual({
      produtos: [{ nome: 'Paleta de Morango', quantidade: '40 un', valor: 28000, barra: 100 }],
      clientes: [{ nome: 'Mercado Bom Preço', pedidos: 1, valor: 28000 }],
      total: 28000
    })
  })

  it('Dinheiro, cartão e Pix', () => {
    expect(dados('formas')).toEqual({
      formas: [
        { nome: 'Dinheiro', valor: 150000, pct: 60 },
        { nome: 'Cartão débito', valor: 50000, pct: 20 },
        { nome: 'Cartão crédito', valor: 30000, pct: 12 },
        { nome: 'Pix', valor: 20000, pct: 8 }
      ],
      total: 250000,
      taxas: 1710,
      taxaDebitoPct: 150,
      taxaCreditoPct: 320,
      diasAbertos: 2,
      mediaPorDia: 125000
    })
  })

  it('Comparar com o ano passado', () => {
    const c: RelComparar = dados('comparar')
    expect(c.anoMesAnterior).toBe('2025-10')
    const linha = (nome: string) => c.linhas.find((l) => l.nome === nome)!
    expect(linha('Faturamento')).toMatchObject({ antes: 100000, agora: 278000, diferenca: 1780 })
    expect(linha('Despesas')).toMatchObject({ antes: 0, diferenca: null, subirEBom: false })
    expect(linha('Unidades produzidas')).toMatchObject({ antes: 0, agora: 100 })
    // 2 dias com venda em 2025? só 1 (10/10); em 2026: 01, 15 e 16/10
    expect(linha('Média de vendas por dia')).toMatchObject({ antes: 100000, agora: 92667 })
    expect(c.meses.map((m) => m.mes)).toEqual([5, 6, 7, 8, 9, 10])
    expect(c.meses.at(-1)).toEqual({ mes: 10, antes: 100000, agora: 278000 })
  })

  it('Lucro por produto (R15): pedidos pelo valor real, o resto no balcão', () => {
    // saíram 100 − 5 = 95; 40 nos pedidos a 7,00 e 55 no balcão a 10,00; custo de cada 0,90
    // 40 × 6,10 + 55 × 9,10 = 244,00 + 500,50 = 744,50
    expect(dados('lucro_produto')).toEqual({
      produtos: [
        { nome: 'Paleta de Morango', sairam: 95, lucroDeCada: 78368, lucro: 74450, barra: 100 }
      ]
    })
  })

  it('Perdas', () => {
    expect(dados('perdas')).toEqual({
      produtos: 450,
      materiaPrima: 0,
      trocas: 0,
      total: 450,
      quemMaisTrocou: null,
      maiorMotivo: 'Derreteu'
    })
  })

  it('mês sem nada', () => {
    expect(dados('resultado', '2026-03')).toMatchObject({ total: 0, despesas: [], lucro: 0 })
    expect(dados('mais_vendidos', '2026-03').produtos).toEqual([])
    expect(dados('lucro_produto', '2026-03').produtos).toEqual([])
    expect(dados('formas', '2026-03')).toMatchObject({ diasAbertos: 0, mediaPorDia: 0 })
  })

  it('id ou mês inválido', () => {
    expect(() => obterRelatorio(s.db, 'xyz', '2026-10', '2026-10-16')).toThrow()
    expect(() => obterRelatorio(s.db, 'resultado', '2026-13', '2026-10-16')).toThrow()
  })
})
