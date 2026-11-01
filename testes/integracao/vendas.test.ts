import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico, paginaDoHistorico } from '../../src/main/servicos/auditoria'
import { clientes } from '../../src/main/servicos/cadastros'
import { salvarProduto } from '../../src/main/servicos/produtos'
import { criarCategoria, salvarReceita } from '../../src/main/servicos/receitas'
import {
  cancelarPedido,
  desfazerCancelamento,
  listarFechamentos,
  listarPedidos,
  obterFechamento,
  paginaDeFechamentos,
  paginaDePedidos,
  paginaVendasPorDia,
  resumoDasVendas,
  salvarFechamento,
  salvarPedido,
  salvarTaxas
} from '../../src/main/servicos/vendas'
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
const TAXAS = { debitoPct: 150, debitoDias: 1, creditoPct: 320, creditoDias: 30 }
const T5 = {
  data: '2026-10-16',
  lojaFechada: false,
  dinheiro: centavos(41250),
  pix: centavos(33400),
  debito: centavos(21800),
  credito: centavos(32000)
}

describe('T5 · fechamento do balcão', () => {
  it('total, taxas e quanto fica; com retrato das taxas do dia', () => {
    salvarTaxas(s.db, s.relogio, TAXAS)
    const f = salvarFechamento(s.db, s.relogio, T5)
    expect(f.calculado).toMatchObject({
      total: 128450,
      taxas: 1351,
      ficaParaASorveteria: 127099,
      creditoCaiEm: '2026-11-15'
    })
    expect(historico()[0]).toBe('Lançou as vendas do dia 16/10: R$ 1.284,50')

    // mudar a taxa depois não muda o passado
    salvarTaxas(s.db, s.relogio, { ...TAXAS, creditoPct: 400 })
    expect(obterFechamento(s.db, '2026-10-16')?.calculado.taxaCredito).toBe(1024)
  })

  it('lançar o mesmo dia de novo é correção (não duplica), com frase do que mudou', () => {
    salvarFechamento(s.db, s.relogio, T5)
    salvarFechamento(s.db, s.relogio, { ...T5, dinheiro: centavos(42000) })
    expect(listarFechamentos(s.db)).toHaveLength(1)
    expect(historico()[0]).toBe('Corrigiu as vendas do dia 16/10: dinheiro R$ 412,50 → R$ 420,00')
  })

  it('dia que passou (D-048) e loja fechada (D-055)', () => {
    salvarFechamento(s.db, s.relogio, { ...T5, data: '2026-10-12', lojaFechada: true })
    const f = obterFechamento(s.db, '2026-10-12')!
    expect(f.lojaFechada).toBe(true)
    expect(f.calculado.total).toBe(0)
    expect(historico()[0]).toBe('Marcou o dia 12/10 como loja fechada')
  })

  it('não lança dia que ainda não chegou', () => {
    expect(() => salvarFechamento(s.db, s.relogio, { ...T5, data: '2026-10-17' })).toThrow(
      'Não dá para lançar um dia que ainda não chegou.'
    )
  })
})

/** Cliente e produtos do T6: potes a R$ 45 e R$ 52 no atacado e caixa de 20 picolés a R$ 5,50. */
function prepararPedido() {
  const cliente = clientes.salvar(s.db, s.relogio, null, {
    nome: 'Mercado Bom Preço',
    telefone: '',
    documento: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: ''
  })
  const pote = criarCategoria(s.db, s.relogio, 'Sorvete de pote')
  const acai = criarCategoria(s.db, s.relogio, 'Açaí')
  const picole = criarCategoria(s.db, s.relogio, 'Picolé')
  const preco = (categoriaId: number, balcao: number, atacado: number, nome: string) =>
    salvarReceita(s.db, s.relogio, null, {
      nome,
      categoriaId,
      rendimento: 10,
      ingredientes: [],
      embalagens: [],
      gasVezes: null,
      gasValor: null,
      precoBalcao: centavos(balcao),
      precoAtacado: centavos(atacado),
      nomeUnidade: 'pote'
    })
  preco(pote.id, 4900, 4500, 'Base pote')
  preco(acai.id, 5600, 5200, 'Base açaí')
  preco(picole.id, 700, 550, 'Base picolé')
  const produto = (categoriaId: number, nome: string, caixa: number | null = null) =>
    salvarProduto(s.db, s.relogio, null, {
      categoriaId,
      nome,
      vendidoComo: caixa ? 'caixa' : 'pote',
      medida: null,
      medidaUnidade: null,
      unidadesPorCaixa: caixa,
      receitaId: null
    })
  return {
    cliente,
    pote,
    morango: produto(pote.id, 'Pote 2 L · Morango'),
    chocolate: produto(pote.id, 'Pote 2 L · Chocolate'),
    acai: produto(acai.id, 'Pote 2 L · Creme de açaí'),
    caixa: produto(picole.id, 'Caixa 20 picolés cremosos', 20)
  }
}

describe('T6 · pedido de cliente', () => {
  it('R$ 574,00 no Pix, sem taxa; número 1; frase no histórico', () => {
    const p = prepararPedido()
    salvarTaxas(s.db, s.relogio, TAXAS)
    const pedido = salvarPedido(s.db, s.relogio, null, {
      clienteId: p.cliente,
      data: '2026-10-16',
      forma: 'pix',
      itens: [
        { produtoId: p.morango, quantidade: 4 },
        { produtoId: p.chocolate, quantidade: 4 },
        { produtoId: p.acai, quantidade: 2 },
        { produtoId: p.caixa, quantidade: 1 }
      ]
    })
    expect(pedido).toMatchObject({
      numero: 1,
      total: 57400,
      taxa: 0,
      clienteNome: 'Mercado Bom Preço'
    })
    expect(pedido.itens.find((i) => i.produtoId === p.caixa)?.precoUnitario).toBe(11000)
    expect(historico()[0]).toBe(
      'Fez o pedido nº 1 para Mercado Bom Preço: R$ 574,00 em Pix (4 Pote 2 L · Morango, 4 Pote 2 L · Chocolate, 2 Pote 2 L · Creme de açaí, 1 Caixa 20 picolés cremosos)'
    )
  })

  it('no crédito: taxa R$ 18,37 (3,2%)', () => {
    const p = prepararPedido()
    salvarTaxas(s.db, s.relogio, TAXAS)
    const pedido = salvarPedido(s.db, s.relogio, null, {
      clienteId: p.cliente,
      data: '2026-10-16',
      forma: 'credito',
      itens: [
        { produtoId: p.morango, quantidade: 4 },
        { produtoId: p.chocolate, quantidade: 4 },
        { produtoId: p.acai, quantidade: 2 },
        { produtoId: p.caixa, quantidade: 1 }
      ]
    })
    expect(pedido).toMatchObject({ total: 57400, taxaPct: 320, taxa: 1837 })
  })

  it('retrato: mudar o preço da categoria depois não muda o pedido antigo; corrigir mantém o preço do dia', () => {
    const p = prepararPedido()
    const pedido = salvarPedido(s.db, s.relogio, null, {
      clienteId: p.cliente,
      data: '2026-10-16',
      forma: 'pix',
      itens: [{ produtoId: p.morango, quantidade: 4 }]
    })
    salvarReceita(s.db, s.relogio, 1, {
      nome: 'Base pote',
      categoriaId: p.pote.id,
      rendimento: 10,
      ingredientes: [],
      embalagens: [],
      gasVezes: null,
      gasValor: null,
      precoBalcao: centavos(5100),
      precoAtacado: centavos(4700),
      nomeUnidade: 'pote'
    })
    expect(listarPedidos(s.db, '2026-10')[0]?.total).toBe(18000)

    const corrigido = salvarPedido(s.db, s.relogio, pedido.id, {
      clienteId: p.cliente,
      data: '2026-10-16',
      forma: 'pix',
      itens: [
        { produtoId: p.morango, quantidade: 5 },
        { produtoId: p.chocolate, quantidade: 1 }
      ]
    })
    // morango segue a R$ 45 (do dia do pedido); chocolate entra a R$ 47 (preço de hoje)
    expect(corrigido.total).toBe(5 * 4500 + 4700)
    expect(corrigido.numero).toBe(1)
    expect(historico()[0]).toMatch(/^Corrigiu o pedido nº 1: itens 4 Pote 2 L · Morango → 5 Pote/)
  })

  it('validações: sem cliente, sem itens, data futura', () => {
    const p = prepararPedido()
    const base = { clienteId: p.cliente, data: '2026-10-16', forma: 'pix' as const, itens: [] }
    expect(() => salvarPedido(s.db, s.relogio, null, base)).toThrow(
      'Coloque pelo menos um produto no pedido.'
    )
    expect(() =>
      salvarPedido(s.db, s.relogio, null, {
        ...base,
        clienteId: 999,
        itens: [{ produtoId: p.morango, quantidade: 1 }]
      })
    ).toThrow('Escolha o cliente.')
    expect(() =>
      salvarPedido(s.db, s.relogio, null, {
        ...base,
        data: '2026-10-20',
        itens: [{ produtoId: p.morango, quantidade: 1 }]
      })
    ).toThrow('Não dá para lançar um dia que ainda não chegou.')
  })
})

describe('cancelar pedido (D-050) e numeração (D-056)', () => {
  it('cancelado mantém o número, não soma no resumo e pode ser desfeito', () => {
    const p = prepararPedido()
    const novo = () =>
      salvarPedido(s.db, s.relogio, null, {
        clienteId: p.cliente,
        data: '2026-10-16',
        forma: 'pix',
        itens: [{ produtoId: p.morango, quantidade: 2 }]
      })
    const primeiro = novo()
    cancelarPedido(s.db, s.relogio, primeiro.id, 'cliente desistiu')
    const segundo = novo()
    expect(segundo.numero).toBe(2)
    expect(listarPedidos(s.db, '2026-10').map((x) => [x.numero, x.cancelado])).toEqual([
      [2, false],
      [1, true]
    ])
    expect(resumoDasVendas(s.db, '2026-10-16').pedidos).toBe(9000)
    expect(historico()).toContain(
      'Cancelou o pedido nº 1 (Mercado Bom Preço, R$ 90,00): cliente desistiu'
    )
    expect(() =>
      salvarPedido(s.db, s.relogio, primeiro.id, {
        clienteId: p.cliente,
        data: '2026-10-16',
        forma: 'pix',
        itens: [{ produtoId: p.morango, quantidade: 3 }]
      })
    ).toThrow('Este pedido foi cancelado.')
    desfazerCancelamento(s.db, s.relogio, primeiro.id)
    expect(resumoDasVendas(s.db, '2026-10-16').pedidos).toBe(18000)
  })

  it('cliente com pedido não pode ser excluído', () => {
    const p = prepararPedido()
    salvarPedido(s.db, s.relogio, null, {
      clienteId: p.cliente,
      data: '2026-10-16',
      forma: 'pix',
      itens: [{ produtoId: p.morango, quantidade: 1 }]
    })
    expect(clientes.emUso(s.db, p.cliente)).toBe('tem 1 pedido')
  })
})

describe('resumo das vendas · hoje', () => {
  it('balcão (T5) + pedido no crédito: taxas e quanto fica para a sorveteria', () => {
    const p = prepararPedido()
    salvarTaxas(s.db, s.relogio, TAXAS)
    salvarFechamento(s.db, s.relogio, T5)
    salvarPedido(s.db, s.relogio, null, {
      clienteId: p.cliente,
      data: '2026-10-16',
      forma: 'credito',
      itens: [{ produtoId: p.caixa, quantidade: 1 }]
    })
    const r = resumoDasVendas(s.db, '2026-10-16')
    expect(r.hoje).toMatchObject({
      vendas: 128450 + 11000,
      pedidos: 11000,
      taxaPedidos: 352, // 3,2% de R$ 110,00
      taxas: 1351 + 352
    })
    expect(r.hoje.ficaParaASorveteria).toBe(128450 + 11000 - 1703)
    expect(r.diasLancados).toBe(1)
    expect(r.diasSemLancamento).toEqual([])
  })
})

describe('D-085 · históricos: últimos 15, "Ver mais" e filtro por mês', () => {
  /** 20 dias de setembro e 10 de outubro (até 16/10, "hoje" dos testes). */
  function lancarDias() {
    const dias = [
      ...Array.from({ length: 20 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`),
      ...Array.from({ length: 10 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
    ]
    for (const data of dias) salvarFechamento(s.db, s.relogio, { ...T5, data })
  }

  it('balcão: "Últimos" traz os 10 mais novos; "Ver mais" passa de outubro para setembro', () => {
    lancarDias()
    const p = paginaDeFechamentos(s.db, { anoMes: null, limite: 10 })
    expect(p.total).toBe(30)
    expect(p.meses).toEqual(['2026-10', '2026-09'])
    expect(p.itens).toHaveLength(10)
    expect(p.itens[0]?.data).toBe('2026-10-10')
    expect(p.itens[9]?.data).toBe('2026-10-01')
    // "Ver mais" (+10): já entra setembro; mais um, chega aos 30
    expect(paginaDeFechamentos(s.db, { anoMes: null, limite: 20 }).itens[19]?.data).toBe(
      '2026-09-11'
    )
    expect(paginaDeFechamentos(s.db, { anoMes: null, limite: 30 }).itens).toHaveLength(30)
  })

  it('balcão: escolhendo setembro, só setembro (10, e o mês inteiro com "Ver mais")', () => {
    lancarDias()
    const p = paginaDeFechamentos(s.db, { anoMes: '2026-09', limite: 10 })
    expect(p.total).toBe(20)
    expect(p.itens.map((f) => f.data.slice(0, 7))).toEqual(Array(10).fill('2026-09'))
    expect(paginaDeFechamentos(s.db, { anoMes: '2026-09', limite: 20 }).itens).toHaveLength(20)
    expect(paginaDeFechamentos(s.db, { anoMes: '2026-08', limite: 10 })).toMatchObject({
      itens: [],
      total: 0
    })
  })

  it('pedidos: o mais novo primeiro, de qualquer mês; e só do mês escolhido', () => {
    const p = prepararPedido()
    for (const data of ['2026-08-30', '2026-09-12', '2026-10-02', '2026-10-15']) {
      salvarPedido(s.db, s.relogio, null, {
        clienteId: p.cliente,
        data,
        forma: 'pix',
        itens: [{ produtoId: p.morango, quantidade: 1 }]
      })
    }
    const ultimos = paginaDePedidos(s.db, { anoMes: null, limite: 15 })
    expect(ultimos.itens.map((x) => x.data)).toEqual([
      '2026-10-15',
      '2026-10-02',
      '2026-09-12',
      '2026-08-30'
    ])
    expect(ultimos.meses).toEqual(['2026-10', '2026-09', '2026-08'])
    expect(paginaDePedidos(s.db, { anoMes: '2026-09', limite: 15 }).itens).toHaveLength(1)
    expect(paginaDePedidos(s.db, { anoMes: null, limite: 2 })).toMatchObject({ total: 4 })
  })

  it('o que foi feito (Configurações): mesmo filtro, com "Hoje, 08:00"', () => {
    lancarDias()
    const p = paginaDoHistorico(s.db, s.relogio.hoje(), { anoMes: null, limite: 15 })
    expect(p.itens).toHaveLength(15)
    expect(p.total).toBe(30)
    expect(p.meses).toEqual(['2026-10'])
    expect(p.itens[0]?.quando).toMatch(/^Hoje, /)
    expect(paginaDoHistorico(s.db, s.relogio.hoje(), { anoMes: '2026-09', limite: 15 }).total).toBe(
      0
    )
  })

  it('filtro inválido é recusado', () => {
    expect(() => paginaDeFechamentos(s.db, { anoMes: '2026-13', limite: 15 })).toThrow()
    expect(() => paginaDeFechamentos(s.db, { anoMes: null, limite: 0 })).toThrow()
  })
})

describe('D-086 · Resumo › Vendas por dia: últimos 10, "Ver mais" e mês', () => {
  /** balcão de 25/09 a 10/10, sem 05/10; um pedido em 12/10 (hoje = 16/10). */
  function lancar() {
    const p = prepararPedido()
    for (let i = 0; i < 16; i++) {
      const data = new Date(Date.UTC(2026, 8, 25 + i)).toISOString().slice(0, 10)
      if (data !== '2026-10-05') salvarFechamento(s.db, s.relogio, { ...T5, data })
    }
    salvarPedido(s.db, s.relogio, null, {
      clienteId: p.cliente,
      data: '2026-10-12',
      forma: 'pix',
      itens: [{ produtoId: p.morango, quantidade: 2 }]
    })
  }

  it('"Últimos": um dia por linha, de hoje para trás, com os dias que faltam lançar', () => {
    lancar()
    const pag = paginaVendasPorDia(s.db, '2026-10-16', { anoMes: null, limite: 10 })
    // 25/09 (primeiro dia de uso) até 16/10
    expect(pag.total).toBe(22)
    expect(pag.meses).toEqual(['2026-10', '2026-09'])
    expect(pag.itens.map((d) => d.data)).toEqual([
      '2026-10-16',
      '2026-10-15',
      '2026-10-14',
      '2026-10-13',
      '2026-10-12',
      '2026-10-11',
      '2026-10-10',
      '2026-10-09',
      '2026-10-08',
      '2026-10-07'
    ])
    const dia12 = pag.itens.find((d) => d.data === '2026-10-12')!
    // 2 potes de morango no atacado (R$ 45,00)
    expect(dia12).toMatchObject({ balcao: null, pedidos: 9000, total: 9000 })
    expect(pag.itens.find((d) => d.data === '2026-10-10')).toMatchObject({
      balcao: 128450,
      total: 128450
    })
    // dois "Ver mais" (+10 +10) chegam aos 22 e mostram o 05/10 sem balcão
    const tudo = paginaVendasPorDia(s.db, '2026-10-16', { anoMes: null, limite: 30 })
    expect(tudo.itens).toHaveLength(22)
    expect(tudo.itens.at(-1)?.data).toBe('2026-09-25')
    expect(tudo.itens.find((d) => d.data === '2026-10-05')?.balcao).toBeNull()
  })

  it('escolhendo um mês: só os dias dele (setembro desde o primeiro dia de uso)', () => {
    lancar()
    const set = paginaVendasPorDia(s.db, '2026-10-16', { anoMes: '2026-09', limite: 10 })
    expect(set.total).toBe(6)
    expect(set.itens.map((d) => d.data)).toEqual([
      '2026-09-30',
      '2026-09-29',
      '2026-09-28',
      '2026-09-27',
      '2026-09-26',
      '2026-09-25'
    ])
    expect(paginaVendasPorDia(s.db, '2026-10-16', { anoMes: '2026-08', limite: 10 })).toMatchObject(
      { itens: [], total: 0 }
    )
  })

  it('sem nada lançado: lista vazia', () => {
    expect(paginaVendasPorDia(s.db, '2026-10-16', { anoMes: null, limite: 10 })).toEqual({
      itens: [],
      total: 0,
      meses: []
    })
  })
})
