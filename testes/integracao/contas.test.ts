import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DadosConta } from '../../src/compartilhado/contrato'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import {
  criarCartao,
  criarTipo,
  desfazerExclusaoConta,
  desfazerPagamento,
  excluirConta,
  gerarContasQueRepetem,
  listarCartoes,
  listarContas,
  listarTipos,
  obterConta,
  pagarConta,
  quantasNoAviso,
  removerCartao,
  removerTipo,
  salvarConta
} from '../../src/main/servicos/contas'
import { listarCategorias, removerCategoria } from '../../src/main/servicos/receitas'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema
let relogio: ReturnType<typeof relogioDeTeste>

beforeEach(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  relogio = relogioDeTeste()
  s = await Sistema.abrir(caminhosDeTeste(), relogio)
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

const historico = () => listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)
const tipo = (nome: string) => listarTipos(s.db).find((t) => t.nome === nome)!.id
const conta = (d: Partial<DadosConta> = {}): DadosConta => ({
  nome: 'Energia elétrica',
  valor: centavos(295000),
  vencimento: '2026-10-17',
  tipoId: tipo('Energia'),
  repete: false,
  avisarDias: 3,
  ...d
})

describe('dados iniciais', () => {
  it('tipos de conta padrão + "Fatura do cartão da empresa" no fim', () => {
    expect(listarTipos(s.db).map((t) => t.nome)).toEqual([
      'Fornecedor',
      'Energia',
      'Contas fixas',
      'Aluguel',
      'Funcionários',
      'Serviços',
      'Manutenção',
      'Outros',
      'Fatura do cartão da empresa'
    ])
    expect(
      listarTipos(s.db)
        .filter((t) => t.fatura)
        .map((t) => t.nome)
    ).toEqual(['Fatura do cartão da empresa'])
  })
  it('D-062: categorias Paleta, Picolé e Pote, que podem ser removidas', () => {
    const cats = listarCategorias(s.db)
    expect(cats.map((c) => [c.nome, c.nomeUnidade, c.precoBalcao])).toEqual([
      ['Paleta', 'paleta', 0],
      ['Picolé', 'picolé', 0],
      ['Pote', 'pote', 0]
    ])
    removerCategoria(s.db, s.relogio, cats[2]!.id)
    expect(listarCategorias(s.db).map((c) => c.nome)).toEqual(['Paleta', 'Picolé'])
  })
})

describe('T11 · contas a pagar', () => {
  it('lança a conta, avisa (bolinha) e paga; frases no histórico', () => {
    const id = salvarConta(s.db, s.relogio, null, conta(), null)
    expect(historico()[0]).toBe(
      'Lançou a conta Energia elétrica (Energia): R$ 2.950,00, vence 17/10/2026'
    )
    expect(quantasNoAviso(s.db, '2026-10-16')).toBe(1)
    pagarConta(s.db, s.relogio, id, { forma: 'pix', cartaoId: null, pagoEm: '2026-10-16' })
    expect(obterConta(s.db, id)?.pagamento).toMatchObject({ forma: 'pix', pagoEm: '2026-10-16' })
    expect(quantasNoAviso(s.db, '2026-10-16')).toBe(0)
    expect(historico()[0]).toBe('Pagou a conta Energia elétrica (R$ 2.950,00) com Pix em 16/10')
  })

  it('aviso de 3 dias: conta para daqui a 5 dias ainda não entra na bolinha', () => {
    salvarConta(s.db, s.relogio, null, conta({ vencimento: '2026-10-21' }), null)
    expect(quantasNoAviso(s.db, '2026-10-16')).toBe(0)
    expect(quantasNoAviso(s.db, '2026-10-18')).toBe(1)
  })

  it('conta que já nasce paga, no cartão pessoal do Carlos (reembolso)', () => {
    const k = criarCartao(s.db, s.relogio, 'Crédito final 4421', 1)
    expect(k).toMatchObject({ donoNome: 'Carlos', emUso: 0 })
    const id = salvarConta(
      s.db,
      s.relogio,
      null,
      conta({ nome: 'Combustível da entrega', valor: centavos(28000), vencimento: '2026-10-16' }),
      { forma: 'credito', cartaoId: k.id, pagoEm: '2026-10-16' }
    )
    expect(obterConta(s.db, id)?.pagamento).toMatchObject({
      cartaoNome: 'Crédito final 4421',
      donoNome: 'Carlos'
    })
    expect(historico()[0]).toContain(
      '; já paga com cartão de crédito Crédito final 4421 em 16/10, reembolso para o Carlos'
    )
  })

  it('validações do pagamento: cartão obrigatório no cartão; data futura não', () => {
    const id = salvarConta(s.db, s.relogio, null, conta(), null)
    expect(() =>
      pagarConta(s.db, s.relogio, id, { forma: 'debito', cartaoId: null, pagoEm: '2026-10-16' })
    ).toThrow('Escolha qual cartão.')
    expect(() =>
      pagarConta(s.db, s.relogio, id, { forma: 'pix', cartaoId: null, pagoEm: '2026-10-17' })
    ).toThrow('A data do pagamento ainda não chegou.')
    // Pix com cartão: o cartão é ignorado
    const k = criarCartao(s.db, s.relogio, 'Bradesco', null)
    pagarConta(s.db, s.relogio, id, { forma: 'pix', cartaoId: k.id, pagoEm: '2026-10-16' })
    expect(obterConta(s.db, id)?.pagamento?.cartaoId).toBeNull()
    expect(() =>
      pagarConta(s.db, s.relogio, id, { forma: 'pix', cartaoId: null, pagoEm: '2026-10-16' })
    ).toThrow('Esta conta já está paga.')
  })

  it('Desfazer o pagamento volta a conta para em aberto', () => {
    const id = salvarConta(s.db, s.relogio, null, conta(), null)
    pagarConta(s.db, s.relogio, id, { forma: 'boleto', cartaoId: null, pagoEm: '2026-10-16' })
    desfazerPagamento(s.db, s.relogio, id)
    expect(obterConta(s.db, id)?.pagamento).toBeNull()
    expect(historico()[0]).toBe(
      'Desfez o pagamento da conta Energia elétrica (R$ 2.950,00): voltou para em aberto'
    )
  })

  it('corrigir: frase com o que mudou; sem mudança não grava', () => {
    const id = salvarConta(s.db, s.relogio, null, conta(), null)
    const linhas = historico().length
    salvarConta(s.db, s.relogio, id, conta(), null)
    expect(historico()).toHaveLength(linhas)
    salvarConta(
      s.db,
      s.relogio,
      id,
      conta({ valor: centavos(300000), repete: true, tipoId: tipo('Contas fixas') }),
      null
    )
    expect(historico()[0]).toBe(
      'Corrigiu a conta Energia elétrica: valor R$ 2.950,00 → R$ 3.000,00; tipo Energia → Contas fixas; passou a repetir todo mês'
    )
  })

  it('excluir e desfazer', () => {
    const id = salvarConta(s.db, s.relogio, null, conta(), null)
    excluirConta(s.db, s.relogio, id)
    expect(listarContas(s.db)).toHaveLength(0)
    desfazerExclusaoConta(s.db, s.relogio, id)
    expect(listarContas(s.db)).toHaveLength(1)
    expect(historico()[0]).toBe('Desfez a exclusão da conta Energia elétrica')
  })

  it('remover tipo de conta em uso: bloqueado ("em uso · N"); a fatura nunca', () => {
    salvarConta(s.db, s.relogio, null, conta(), null)
    expect(listarTipos(s.db).find((t) => t.nome === 'Energia')?.emUso).toBe(1)
    expect(() => removerTipo(s.db, s.relogio, tipo('Energia'))).toThrow(
      'Só dá para remover um tipo que nenhuma conta usa.'
    )
    expect(() => removerTipo(s.db, s.relogio, tipo('Fatura do cartão da empresa'))).toThrow(
      'não pode ser removido'
    )
    const novo = criarTipo(s.db, s.relogio, 'Impostos')
    expect(() => criarTipo(s.db, s.relogio, ' impostos ')).toThrow('Já existe')
    removerTipo(s.db, s.relogio, novo.id)
    expect(historico()[0]).toBe('Removeu o tipo de conta Impostos')
  })

  it('remover cartão em uso: bloqueado', () => {
    const k = criarCartao(s.db, s.relogio, 'Débito final 2285', 2)
    const id = salvarConta(s.db, s.relogio, null, conta(), null)
    pagarConta(s.db, s.relogio, id, { forma: 'debito', cartaoId: k.id, pagoEm: '2026-10-16' })
    expect(listarCartoes(s.db)[0]?.emUso).toBe(1)
    expect(() => removerCartao(s.db, s.relogio, k.id)).toThrow('nenhuma conta usa')
    desfazerPagamento(s.db, s.relogio, id)
    removerCartao(s.db, s.relogio, k.id)
    expect(listarCartoes(s.db)).toHaveLength(0)
  })
})

describe('T11 · conta que repete (criada no dia 1º)', () => {
  it('dia 31 → novembro vence 30/11 e dezembro volta ao 31', () => {
    salvarConta(
      s.db,
      s.relogio,
      null,
      conta({ nome: 'Salários', vencimento: '2026-10-31', repete: true }),
      null
    )
    expect(gerarContasQueRepetem(s.db, s.relogio)).toBe(0)
    relogio.avancarDias(16) // 01/11
    expect(gerarContasQueRepetem(s.db, s.relogio)).toBe(1)
    expect(gerarContasQueRepetem(s.db, s.relogio)).toBe(0)
    expect(historico()[0]).toBe(
      'Criou sozinho a conta do mês: Salários, R$ 2.950,00, vence 30/11/2026'
    )
    relogio.avancarDias(30) // 01/12
    gerarContasQueRepetem(s.db, s.relogio)
    expect(listarContas(s.db).map((c) => c.vencimento)).toEqual([
      '2026-10-31',
      '2026-11-30',
      '2026-12-31'
    ])
  })

  it('a nova conta copia a última (valor corrigido) e nasce em aberto', () => {
    const id = salvarConta(s.db, s.relogio, null, conta({ repete: true }), null)
    pagarConta(s.db, s.relogio, id, { forma: 'pix', cartaoId: null, pagoEm: '2026-10-16' })
    salvarConta(s.db, s.relogio, id, conta({ repete: true, valor: centavos(310000) }), null)
    relogio.avancarDias(20)
    gerarContasQueRepetem(s.db, s.relogio)
    const nova = listarContas(s.db)[1]!
    expect(nova).toMatchObject({ vencimento: '2026-11-17', valor: 310000, pagamento: null })
  })

  it('excluir a última conta da sequência para a repetição; "não repete" também', () => {
    const id = salvarConta(s.db, s.relogio, null, conta({ repete: true }), null)
    excluirConta(s.db, s.relogio, id)
    salvarConta(s.db, s.relogio, null, conta({ nome: 'Aluguel', repete: false }), null)
    relogio.avancarDias(20)
    expect(gerarContasQueRepetem(s.db, s.relogio)).toBe(0)
  })
})
