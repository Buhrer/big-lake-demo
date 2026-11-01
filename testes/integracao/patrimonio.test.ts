import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DadosBem, DadosManutencao } from '../../src/compartilhado/contrato'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import {
  criarCartao,
  excluirConta,
  listarContas,
  listarTipos,
  obterConta,
  pagarConta,
  removerTipo,
  salvarConta
} from '../../src/main/servicos/contas'
import {
  criarTipoBem,
  desfazerExclusaoBem,
  desfazerExclusaoManutencao,
  excluirBem,
  excluirManutencao,
  listarBens,
  listarManutencoes,
  listarTiposBem,
  removerTipoBem,
  salvarBem,
  salvarManutencao
} from '../../src/main/servicos/patrimonio'
import { mesDosSocios } from '../../src/main/servicos/socios'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema
let furgao: number

const tipo = (nome: string) => listarTiposBem(s.db).find((t) => t.nome === nome)!.id

const FURGAO = (): DadosBem => ({
  nome: 'Furgão de entrega 2019',
  tipoId: tipo('Veículo'),
  dataCompra: '2022-03',
  valor: centavos(6_800_000),
  identificacao: 'ABC-1D23'
})

const MANUTENCAO = (): DadosManutencao => ({
  bemId: furgao,
  data: '2026-10-16',
  oQueFoiFeito: 'Troca de óleo e filtros',
  quemFez: 'Auto Center Silva',
  valor: centavos(45000),
  garantiaDias: 90,
  tipo: 'conserto',
  vencimento: null
})

const PIX = { forma: 'pix' as const, cartaoId: null, pagoEm: '2026-10-16' }

beforeEach(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
  furgao = salvarBem(s.db, s.relogio, null, FURGAO())
})

afterEach(() => {
  s.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

const historico = () => listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)
const contaDa = (manutencaoId: number) =>
  listarContas(s.db).find((c) => c.manutencaoId === manutencaoId)

describe('bens e tipos de bem', () => {
  it('o sistema já vem com Veículo, Equipamento, Móvel e Informática', () => {
    expect(listarTiposBem(s.db).map((t) => t.nome)).toEqual([
      'Veículo',
      'Equipamento',
      'Móvel',
      'Informática'
    ])
  })

  it('cadastrar e corrigir um bem vão para o histórico', () => {
    expect(listarBens(s.db)[0]).toMatchObject({
      nome: 'Furgão de entrega 2019',
      tipoNome: 'Veículo',
      dataCompra: '2022-03',
      valor: 6_800_000,
      manutencoes: 0
    })
    expect(historico()[0]).toBe(
      'Cadastrou o bem Furgão de entrega 2019 (Veículo, comprado em 03/2022, R$ 68.000,00, ABC-1D23)'
    )
    salvarBem(s.db, s.relogio, furgao, { ...FURGAO(), valor: centavos(7_000_000) })
    expect(historico()[0]).toContain('R$ 68.000,00, ABC-1D23) → Furgão de entrega 2019')
    expect(historico()[0]).toContain('R$ 70.000,00')
  })

  it('data da compra pode ficar em branco', () => {
    const id = salvarBem(s.db, s.relogio, null, {
      ...FURGAO(),
      nome: 'Mesas e cadeiras',
      tipoId: tipo('Móvel'),
      dataCompra: null,
      identificacao: ''
    })
    expect(listarBens(s.db).find((b) => b.id === id)!.dataCompra).toBeNull()
  })

  it('tipo novo; tipo em uso não sai', () => {
    const t = criarTipoBem(s.db, s.relogio, 'Ferramenta')
    expect(() => criarTipoBem(s.db, s.relogio, ' ferramenta ')).toThrow('Já existe')
    expect(() => removerTipoBem(s.db, s.relogio, tipo('Veículo'))).toThrow(
      'Só dá para remover um tipo que nenhum bem usa.'
    )
    removerTipoBem(s.db, s.relogio, t.id)
    expect(listarTiposBem(s.db).map((x) => x.nome)).not.toContain('Ferramenta')
  })

  it('excluir bem sem manutenção → desfazer', () => {
    excluirBem(s.db, s.relogio, furgao)
    expect(listarBens(s.db)).toHaveLength(0)
    desfazerExclusaoBem(s.db, s.relogio, furgao)
    expect(listarBens(s.db)).toHaveLength(1)
  })

  it('bem com manutenção não pode ser excluído (D-067)', () => {
    salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), PIX)
    expect(listarBens(s.db)[0]!.manutencoes).toBe(1)
    expect(() => excluirBem(s.db, s.relogio, furgao)).toThrow(
      'Não dá para excluir: tem 1 manutenção.'
    )
  })
})

describe('T12 · manutenção', () => {
  it('paga no Pix: conta "Manutenção" paga de R$ 450,00, garantia até 14/01/2027', () => {
    const id = salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), PIX)
    const c = contaDa(id)!
    expect(c).toMatchObject({
      nome: 'Troca de óleo e filtros · Furgão de entrega 2019',
      valor: 45000,
      tipoNome: 'Manutenção',
      vencimento: '2026-10-16',
      repete: false
    })
    expect(c.pagamento).toMatchObject({ forma: 'pix', pagoEm: '2026-10-16' })
    expect(listarManutencoes(s.db)[0]).toMatchObject({
      bemNome: 'Furgão de entrega 2019',
      conta: { id: c.id, vencimento: '2026-10-16' }
    })
    expect(historico()[0]).toBe(
      'Registrou a manutenção: 16/10, Furgão de entrega 2019: Troca de óleo e filtros ' +
        '(Conserto, feito por Auto Center Silva), R$ 450,00, garantia até 14/01/2027. Conta já paga'
    )
  })

  it('não paga: conta em aberto com o vencimento digitado (D-032 p.19)', () => {
    expect(() => salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), null)).toThrow(
      'Digite quando a conta vence.'
    )
    const id = salvarManutencao(
      s.db,
      s.relogio,
      null,
      { ...MANUTENCAO(), vencimento: '2026-11-05' },
      null
    )
    const c = contaDa(id)!
    expect(c.vencimento).toBe('2026-11-05')
    expect(c.pagamento).toBeNull()
    expect(listarManutencoes(s.db)[0]!.vencimento).toBe('2026-11-05')
  })

  it('paga no cartão pessoal do Carlos: reembolso em Sócios', () => {
    const k = criarCartao(s.db, s.relogio, 'Crédito final 4421', 1)
    salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), {
      forma: 'credito',
      cartaoId: k.id,
      pagoEm: '2026-10-16'
    })
    const carlos = mesDosSocios(s.db, '2026-10').reembolsos
    expect(carlos.map((r) => r.valor)).toEqual([45000])
  })

  it('de graça (R$ 0,00): registra sem conta (D-070)', () => {
    const id = salvarManutencao(
      s.db,
      s.relogio,
      null,
      { ...MANUTENCAO(), valor: centavos(0) },
      null
    )
    expect(contaDa(id)).toBeUndefined()
    expect(listarManutencoes(s.db)[0]!.conta).toBeNull()
    expect(historico()[0]).toContain('Sem conta (saiu de graça)')
  })

  it('corrigir muda o nome e o valor da conta ligada; o pagamento continua (D-066, D-070)', () => {
    const id = salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), PIX)
    salvarManutencao(
      s.db,
      s.relogio,
      id,
      { ...MANUTENCAO(), oQueFoiFeito: 'Troca de óleo', valor: centavos(38000) },
      null
    )
    const c = contaDa(id)!
    expect(c).toMatchObject({ nome: 'Troca de óleo · Furgão de entrega 2019', valor: 38000 })
    expect(c.pagamento?.forma).toBe('pix')
    expect(historico()[0]).toContain('Corrigiu a manutenção: ')
    expect(historico()[1]).toContain('Corrigiu a conta Troca de óleo e filtros')
  })

  it('corrigir a conta em aberto muda o vencimento', () => {
    const id = salvarManutencao(
      s.db,
      s.relogio,
      null,
      { ...MANUTENCAO(), vencimento: '2026-11-05' },
      null
    )
    salvarManutencao(s.db, s.relogio, id, { ...MANUTENCAO(), vencimento: '2026-11-20' }, null)
    expect(contaDa(id)!.vencimento).toBe('2026-11-20')
  })

  it('corrigir para R$ 0,00 tira a conta; voltar a ter valor cria de novo', () => {
    const id = salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), PIX)
    const contaAntiga = contaDa(id)!.id
    salvarManutencao(s.db, s.relogio, id, { ...MANUTENCAO(), valor: centavos(0) }, null)
    expect(contaDa(id)).toBeUndefined()
    expect(obterConta(s.db, contaAntiga)?.manutencaoId).toBeNull()
    salvarManutencao(s.db, s.relogio, id, MANUTENCAO(), PIX)
    expect(contaDa(id)?.valor).toBe(45000)
  })

  it('excluir a manutenção tira a conta; desfazer traz as duas de volta', () => {
    const id = salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), PIX)
    excluirManutencao(s.db, s.relogio, id)
    expect(listarManutencoes(s.db)).toHaveLength(0)
    expect(contaDa(id)).toBeUndefined()
    expect(listarContas(s.db)).toHaveLength(0)
    expect(historico()[0]).toContain('A conta saiu de Contas a pagar')
    desfazerExclusaoManutencao(s.db, s.relogio, id)
    expect(listarManutencoes(s.db)).toHaveLength(1)
    expect(contaDa(id)?.pagamento?.forma).toBe('pix')
  })

  it('em Contas a pagar, a conta da manutenção só se paga (D-070)', () => {
    const id = salvarManutencao(
      s.db,
      s.relogio,
      null,
      { ...MANUTENCAO(), vencimento: '2026-11-05' },
      null
    )
    const c = contaDa(id)!
    expect(() => salvarConta(s.db, s.relogio, c.id, { ...c, valor: centavos(1) }, null)).toThrow(
      'Esta conta vem de uma manutenção. Corrija em Patrimônio.'
    )
    expect(() => excluirConta(s.db, s.relogio, c.id)).toThrow('Corrija em Patrimônio')
    pagarConta(s.db, s.relogio, c.id, PIX)
    expect(listarManutencoes(s.db)[0]!.conta?.pagamento?.forma).toBe('pix')
  })

  it('tipo de conta "Manutenção" removido volta sozinho', () => {
    const t = listarTipos(s.db).find((x) => x.nome === 'Manutenção')!
    removerTipo(s.db, s.relogio, t.id)
    const id = salvarManutencao(s.db, s.relogio, null, MANUTENCAO(), PIX)
    expect(contaDa(id)?.tipoNome).toBe('Manutenção')
  })

  it('validações', () => {
    const v = (d: Partial<DadosManutencao>) => () =>
      salvarManutencao(s.db, s.relogio, null, { ...MANUTENCAO(), ...d }, PIX)
    expect(v({ data: '2026-10-17' })).toThrow('Essa data ainda não chegou.')
    expect(v({ oQueFoiFeito: ' ' })).toThrow('Digite o que foi feito.')
    expect(v({ bemId: 999 })).toThrow('Escolha o patrimônio.')
    expect(v({ garantiaDias: 5000 })).toThrow('Confira a garantia')
  })
})
