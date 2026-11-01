import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DadosItemNovo } from '../../src/compartilhado/contrato'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { clientes, fornecedores } from '../../src/main/servicos/cadastros'
import {
  cadastrarItem,
  compradoNoMes,
  desfazerExclusaoItem,
  editarItem,
  excluirItem,
  listarItens,
  obterItem,
  registrarEntrada
} from '../../src/main/servicos/estoque'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema

beforeEach(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

function historico(): string[] {
  return listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)
}

function hortifruti(): number {
  return fornecedores.salvar(s.db, s.relogio, null, {
    nome: 'Hortifruti São José',
    telefone: '',
    documento: '',
    contato: '',
    oQueFornece: 'frutas'
  })
}

const MORANGO = (fornecedorId: number | null): DadosItemNovo => ({
  tipo: 'materia_prima',
  unidade: 'kg',
  nomeUnidade: null,
  nome: 'Morango',
  quantidade: 20000,
  valorPago: centavos(28000),
  fornecedorId,
  minimo: 10000,
  validade: '2026-10-22'
})

describe('cadastrar insumo (item novo)', () => {
  it('T4: guarda o custo por quilo, a compra com validade e o histórico', () => {
    const forn = hortifruti()
    const id = cadastrarItem(s.db, s.relogio, { ...MORANGO(forn), valorPago: centavos(36000) })
    const item = obterItem(s.db, id)!
    expect(item).toMatchObject({
      nome: 'Morango',
      rotulo: 'kg',
      quantidade: 20000,
      custo: 180000,
      fornecedorNome: 'Hortifruti São José'
    })
    expect(item.lotes).toEqual([
      {
        id: expect.any(Number),
        validade: '2026-10-22',
        quantidade: 20000,
        compradoEm: '2026-10-16'
      }
    ])
    expect(historico()[0]).toBe('Cadastrou o insumo Morango: 20 kg por R$ 360,00')
    expect(compradoNoMes(s.db, forn, '2026-10')).toBe(36000)
  })

  it('quantidade zero ou nome repetido são recusados sem gravar nada', () => {
    expect(() => cadastrarItem(s.db, s.relogio, { ...MORANGO(null), quantidade: 0 })).toThrow(
      'Digite a quantidade.'
    )
    cadastrarItem(s.db, s.relogio, MORANGO(null))
    expect(() => cadastrarItem(s.db, s.relogio, { ...MORANGO(null), nome: ' morango ' })).toThrow(
      'Já existe um item com esse nome no estoque.'
    )
    expect(listarItens(s.db)).toHaveLength(1)
  })

  it('nome da unidade só vale para "Unidade" (D-039)', () => {
    const id = cadastrarItem(s.db, s.relogio, {
      ...MORANGO(null),
      nome: 'Leite condensado',
      unidade: 'un',
      nomeUnidade: 'lata',
      quantidade: 12000,
      valorPago: centavos(8280)
    })
    expect(obterItem(s.db, id)).toMatchObject({ rotulo: 'lata', custo: 69000 })
    expect(historico()[0]).toBe('Cadastrou o insumo Leite condensado: 12 lata por R$ 82,80')
  })
})

describe('chegou mercadoria (item já cadastrado)', () => {
  it('soma ao estoque, guarda a nova validade e avisa que o custo subiu (+29%)', () => {
    const forn = hortifruti()
    const id = cadastrarItem(s.db, s.relogio, {
      ...MORANGO(forn),
      quantidade: 3500,
      valorPago: centavos(4900)
    })
    expect(obterItem(s.db, id)?.custo).toBe(140000)

    const r = registrarEntrada(s.db, s.relogio, {
      itemId: id,
      quantidade: 20000,
      valorPago: centavos(36000),
      fornecedorId: forn,
      validade: '2026-10-25'
    })
    expect(r).toEqual({ custoAntes: 140000, custoDepois: 180000, aumento: 29 })
    const item = obterItem(s.db, id)!
    expect(item.quantidade).toBe(23500)
    expect(item.custo).toBe(180000)
    expect(item.lotes.map((l) => [l.validade, l.quantidade])).toEqual([
      ['2026-10-22', 3500],
      ['2026-10-25', 20000]
    ])
    expect(historico()[0]).toBe('Registrou entrada de mercadoria: Morango 20 kg (R$ 360,00)')
    expect(compradoNoMes(s.db, forn, '2026-10')).toBe(40900)

    const historicoCusto = s.db
      .prepare(
        'SELECT custo_antes_x10000 AS a, custo_depois_x10000 AS d, origem FROM historico_custo ORDER BY id'
      )
      .all()
    expect(historicoCusto).toEqual([
      { a: 0, d: 140000, origem: 'cadastro' },
      { a: 140000, d: 180000, origem: 'entrada' }
    ])
  })

  it('custo igual ou menor não é aumento', () => {
    const id = cadastrarItem(s.db, s.relogio, MORANGO(null))
    const r = registrarEntrada(s.db, s.relogio, {
      itemId: id,
      quantidade: 10000,
      valorPago: centavos(12000),
      fornecedorId: null,
      validade: null
    })
    expect(r.aumento).toBeNull()
  })
})

describe('Editar', () => {
  it('diminuir a quantidade tira da compra que vence antes; frase com o que mudou', () => {
    const id = cadastrarItem(s.db, s.relogio, MORANGO(null))
    registrarEntrada(s.db, s.relogio, {
      itemId: id,
      quantidade: 6000,
      valorPago: centavos(8400),
      fornecedorId: null,
      validade: '2026-10-18'
    })
    const item = obterItem(s.db, id)!
    editarItem(s.db, s.relogio, id, {
      tipo: item.tipo,
      unidade: item.unidade,
      nomeUnidade: null,
      nome: item.nome,
      quantidade: 22000,
      custo: 150000,
      fornecedorId: null,
      minimo: item.minimo,
      validades: []
    })
    const depois = obterItem(s.db, id)!
    expect(depois.lotes.map((l) => [l.validade, l.quantidade])).toEqual([
      ['2026-10-22', 20000],
      ['2026-10-18', 2000]
    ])
    expect(historico()[0]).toBe(
      'Mudou o insumo Morango: quantidade em estoque 26 kg → 22 kg; custo R$ 14,00/kg → R$ 15,00/kg'
    )
  })

  it('corrigir a validade de uma compra', () => {
    const id = cadastrarItem(s.db, s.relogio, MORANGO(null))
    const item = obterItem(s.db, id)!
    editarItem(s.db, s.relogio, id, {
      ...item,
      nomeUnidade: null,
      validades: [{ loteId: item.lotes[0]!.id, validade: '2026-10-24' }]
    })
    expect(obterItem(s.db, id)?.lotes[0]?.validade).toBe('2026-10-24')
    expect(historico()[0]).toBe(
      'Mudou o insumo Morango: validade da compra de 16/10 22/10/2026 → 24/10/2026'
    )
  })

  it('salvar sem mudar nada não suja o histórico', () => {
    const id = cadastrarItem(s.db, s.relogio, MORANGO(null))
    const item = obterItem(s.db, id)!
    editarItem(s.db, s.relogio, id, { ...item, nomeUnidade: null, validades: [] })
    expect(historico()).toHaveLength(1)
  })
})

describe('excluir e desfazer', () => {
  it('insumo some da lista e volta com Desfazer', () => {
    const id = cadastrarItem(s.db, s.relogio, MORANGO(null))
    excluirItem(s.db, s.relogio, id)
    expect(listarItens(s.db)).toEqual([])
    desfazerExclusaoItem(s.db, s.relogio, id)
    expect(listarItens(s.db).map((i) => i.nome)).toEqual(['Morango'])
    expect(historico().slice(0, 2)).toEqual([
      'Desfez a exclusão do insumo Morango',
      'Excluiu o insumo Morango'
    ])
  })

  it('fornecedor ligado a insumo não pode ser excluído (D-038)', () => {
    const forn = hortifruti()
    cadastrarItem(s.db, s.relogio, MORANGO(forn))
    expect(fornecedores.emUso(s.db, forn)).toBe('fornece 1 item do estoque')
    expect(() => fornecedores.excluir(s.db, s.relogio, forn)).toThrow(
      'Não dá para excluir: fornece 1 item do estoque.'
    )
  })

  it('fornecedor que só tem compras antigas também fica', () => {
    const forn = hortifruti()
    const id = cadastrarItem(s.db, s.relogio, MORANGO(forn))
    excluirItem(s.db, s.relogio, id)
    expect(fornecedores.emUso(s.db, forn)).toBe('tem 1 compra registrada')
  })

  it('cliente sem pedidos: exclui e desfaz', () => {
    const id = clientes.salvar(s.db, s.relogio, null, {
      nome: 'Padaria Pão Quente',
      telefone: '',
      documento: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: ''
    })
    clientes.excluir(s.db, s.relogio, id)
    expect(clientes.listar(s.db)).toEqual([])
    clientes.desfazerExclusao(s.db, s.relogio, id)
    expect(clientes.listar(s.db)).toHaveLength(1)
    expect(historico().slice(0, 2)).toEqual([
      'Desfez a exclusão do cliente Padaria Pão Quente',
      'Excluiu o cliente Padaria Pão Quente'
    ])
  })
})
