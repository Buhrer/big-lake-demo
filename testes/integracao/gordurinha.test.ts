import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { listarContas, listarTipos, salvarConta } from '../../src/main/servicos/contas'
import { cadastrarItem, registrarEntrada } from '../../src/main/servicos/estoque'
import {
  jaReajustei,
  ligarGordurinha,
  marcarContaFixa,
  mudarGordurinha,
  obterGordurinha
} from '../../src/main/servicos/gordurinha'
import { registrarProducao } from '../../src/main/servicos/producao'
import { listarCategorias, salvarReceita } from '../../src/main/servicos/receitas'
import { salvarFechamento } from '../../src/main/servicos/vendas'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema
let morango: number

const hoje = () => s.relogio.hoje()
const historico = () => listarHistorico(s.db, hoje()).map((h) => h.descricao)

const tipo = (nome: string) => listarTipos(s.db).find((t) => t.nome === nome)!.id
const contaQueRepete = (nome: string, tipoNome: string, valor: number) =>
  salvarConta(
    s.db,
    s.relogio,
    null,
    {
      nome,
      valor: centavos(valor),
      vencimento: '2026-10-10',
      tipoId: tipo(tipoNome),
      repete: true,
      avisarDias: 3
    },
    null
  )

/** Morango a R$ 18,00/kg; Paleta (R$ 10,00 no balcão, 7,00 no atacado) usa 5 kg por receita. */
beforeEach(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
  morango = cadastrarItem(s.db, s.relogio, {
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    nome: 'Morango',
    quantidade: 20000,
    valorPago: centavos(36000),
    fornecedorId: null,
    minimo: 0,
    validade: null
  })
  const paleta = listarCategorias(s.db).find((c) => c.nome === 'Paleta')!
  const receitaId = salvarReceita(s.db, s.relogio, null, {
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
  // 2 receitas em outubro = 10 kg de morango no mês
  registrarProducao(s.db, s.relogio, { receitaId, vezes: 2000, unidadesFeitas: 200 })
  contaQueRepete('Energia elétrica', 'Energia', 284000)
  contaQueRepete('Aluguel', 'Aluguel', 350000)
  // setembro: R$ 40.000,00 de vendas
  salvarFechamento(s.db, s.relogio, {
    data: '2026-09-10',
    lojaFechada: false,
    dinheiro: centavos(4_000_000),
    pix: centavos(0),
    debito: centavos(0),
    credito: centavos(0)
  })
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

const ligar = () =>
  ligarGordurinha(s.db, s.relogio, { base: centavos(1_500_000), pct: 1000, desde: '2026-03-10' })

describe('Gordurinha', () => {
  it('antes de ligar: pede a base; contas que repetem já aparecem (aluguel desmarcado)', () => {
    const g = obterGordurinha(s.db, hoje())
    expect(g.ligada).toBe(false)
    expect(g.contas.map((c) => [c.nome, c.entra])).toEqual([
      ['Aluguel', false],
      ['Energia elétrica', true]
    ])
  })

  it('ligar: data do último reajuste e preços de hoje; nada comido ainda', () => {
    ligar()
    const g = obterGordurinha(s.db, hoje())
    expect(g).toMatchObject({ ligada: true, desde: '2026-03-10', base: 1_500_000, pct: 1000 })
    expect(g.situacao).toMatchObject({
      total: 150_000,
      comido: 0,
      resta: 150_000,
      status: 'tranquilo'
    })
    expect(g.previsao).toBeNull()
    expect(g.reajuste).toBeNull()
    expect(historico()[0]).toBe(
      'Ligou a Gordurinha: último reajuste em 10/03/2026, base R$ 15.000,00, 10%'
    )
    expect(() => ligar()).toThrow('A Gordurinha já está ligada.')
  })

  it('o que subiu come a gordurinha: insumo × uso do mês e conta fixa', () => {
    ligar()
    // morango passa a R$ 22,00/kg: +4,00 × 10 kg por mês = R$ 40,00
    registrarEntrada(s.db, s.relogio, {
      itemId: morango,
      quantidade: 1000,
      valorPago: centavos(2200),
      fornecedorId: null,
      validade: null
    })
    // energia de R$ 2.840,00 para R$ 2.950,00 = R$ 110,00
    const energia = listarContas(s.db).find((c) => c.nome === 'Energia elétrica')!
    salvarConta(s.db, s.relogio, energia.id, { ...energia, valor: centavos(295000) }, null)

    const g = obterGordurinha(s.db, hoje())
    expect(g.itens.map((i) => [i.nome, i.tipo, i.valor, i.barra])).toEqual([
      ['Energia elétrica', 'conta', 11000, 100],
      ['Morango', 'insumo', 4000, 36]
    ])
    expect(g.itens[1]).toMatchObject({ antes: 180000, agora: 220000, usoPorMes: 10000 })
    expect(g.situacao).toMatchObject({ comido: 15000, resta: 135000, percentual: 90 })
    expect(g.maisComeram).toBe('Mais comeram: energia elétrica e morango.')
    expect(g.previsao).not.toBeNull()
    // R$ 150,00 ÷ R$ 40.000,00 = 0,375% → 0,4%
    expect(g.faturamentoMedio).toBe(4_000_000)
    expect(g.reajuste).toBe(4)
    const paleta = g.precos.find((p) => p.categoria === 'Paleta')!
    expect(paleta.balcao).toEqual({ antes: 1000, novo: 1004, arredondado: 1050 })
    expect(paleta.atacado).toEqual({ antes: 700, novo: 703, arredondado: 750 })

    // marcar o aluguel não muda nada (não subiu); desmarcar a energia tira os R$ 110,00
    const serie = (nome: string) => g.contas.find((c) => c.nome === nome)!.serieId
    marcarContaFixa(s.db, s.relogio, serie('Aluguel'), true)
    marcarContaFixa(s.db, s.relogio, serie('Energia elétrica'), false)
    expect(obterGordurinha(s.db, hoje()).situacao.comido).toBe(4000)
    expect(historico()[0]).toBe('Tirou a conta Energia elétrica da Gordurinha')

    // "Já reajustei": zera a conta a partir de hoje (sem 12 meses, a base continua)
    jaReajustei(s.db, s.relogio)
    const depois = obterGordurinha(s.db, hoje())
    expect(depois).toMatchObject({ desde: hoje(), base: 1_500_000 })
    expect(depois.situacao.comido).toBe(0)
    expect(depois.itens).toEqual([])
    expect(historico()[0]).toContain('a Gordurinha voltou a ficar cheia')
  })

  it('mudar base e porcentagem', () => {
    ligar()
    mudarGordurinha(s.db, s.relogio, { base: centavos(2_000_000), pct: 1500 })
    expect(obterGordurinha(s.db, hoje()).situacao.total).toBe(300_000)
    expect(historico()[0]).toBe(
      'Mudou a Gordurinha: base R$ 15.000,00, 10% → base R$ 20.000,00, 15%'
    )
  })

  it('com 12 meses de vendas, o reajuste calcula a base sozinho (média do lucro)', () => {
    ligar()
    for (let m = 10; m <= 21; m++) {
      const ano = m > 12 ? 2026 : 2025
      const mes = String(m > 12 ? m - 12 : m).padStart(2, '0')
      if (`${ano}-${mes}` === '2026-09') continue // já tem R$ 40.000,00
      salvarFechamento(s.db, s.relogio, {
        data: `${ano}-${mes}-15`,
        lojaFechada: false,
        dinheiro: centavos(1_000_000),
        pix: centavos(0),
        debito: centavos(0),
        credito: centavos(0)
      })
    }
    expect(obterGordurinha(s.db, hoje()).baseAutomatica).toBe(true)
    jaReajustei(s.db, s.relogio)
    // 11 meses de R$ 10.000,00 + setembro R$ 40.000,00, sem despesas pagas → média R$ 12.500,00
    expect(obterGordurinha(s.db, hoje()).base).toBe(1_250_000)
    expect(historico()[0]).toContain('a base passou a ser a média do lucro dos últimos 12 meses')
  })

  it('validações', () => {
    expect(() =>
      ligarGordurinha(s.db, s.relogio, { base: centavos(0), pct: 1000, desde: '2026-03-10' })
    ).toThrow('Digite o lucro líquido base.')
    expect(() =>
      ligarGordurinha(s.db, s.relogio, { base: centavos(100), pct: 1000, desde: '2026-10-17' })
    ).toThrow('Essa data ainda não chegou.')
    expect(() => ligarGordurinha(s.db, s.relogio, { base: centavos(100), pct: 1000 })).toThrow(
      'Digite a data do último reajuste.'
    )
    expect(() => jaReajustei(s.db, s.relogio)).toThrow('ainda não foi ligada')
  })
})
