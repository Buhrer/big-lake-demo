// D-092: a compra do "Chegou mercadoria" também vai para Contas a pagar.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { fornecedores } from '../../src/main/servicos/cadastros'
import {
  lancarContaDaCompra,
  listarContas,
  listarTipos,
  removerTipo
} from '../../src/main/servicos/contas'
import { cadastrarItem, registrarEntrada } from '../../src/main/servicos/estoque'
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

function morango(fornecedorId: number | null = null) {
  return cadastrarItem(s.db, s.relogio, {
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    nome: 'Morango',
    quantidade: 20_000,
    valorPago: centavos(36000),
    fornecedorId,
    minimo: 0,
    validade: null
  })
}

describe('lancarContaDaCompra (D-092)', () => {
  it('compra paga: conta do tipo Fornecedor, já paga, com o nome do item e do fornecedor', () => {
    const forn = fornecedores.salvar(s.db, s.relogio, null, {
      nome: 'Hortifruti São José',
      telefone: '',
      documento: '',
      contato: '',
      oQueFornece: ''
    })
    const item = morango(forn)
    const compra = { quantidade: 10_000, valorPago: 18000, fornecedorId: forn }
    registrarEntrada(s.db, s.relogio, {
      itemId: item,
      ...compra,
      valorPago: centavos(18000),
      validade: null
    })
    lancarContaDaCompra(s.db, s.relogio, item, compra, {
      vencimento: '2026-10-16',
      pagamento: { forma: 'pix', cartaoId: null, pagoEm: '2026-10-16' }
    })
    const [c] = listarContas(s.db)
    expect(c).toMatchObject({
      nome: 'Morango 10 kg · Hortifruti São José',
      valor: 18000,
      vencimento: '2026-10-16',
      tipoNome: 'Fornecedor',
      repete: false
    })
    expect(c!.pagamento?.forma).toBe('pix')
    expect(listarHistorico(s.db, '2026-10-16').map((h) => h.descricao)).toContain(
      'Lançou a conta Morango 10 kg · Hortifruti São José (Fornecedor): R$ 180,00, vence 16/10/2026; já paga com Pix em 16/10'
    )
  })

  it('para pagar depois: fica a pagar no vencimento escolhido', () => {
    const item = morango()
    lancarContaDaCompra(
      s.db,
      s.relogio,
      item,
      { quantidade: 20_000, valorPago: 36000, fornecedorId: null },
      { vencimento: '2026-10-30', pagamento: null }
    )
    const [c] = listarContas(s.db)
    expect(c).toMatchObject({ nome: 'Morango 20 kg', vencimento: '2026-10-30', pagamento: null })
  })

  it('tipo Fornecedor removido: é criado de novo', () => {
    const fornecedor = listarTipos(s.db).find((t) => t.nome === 'Fornecedor')!
    removerTipo(s.db, s.relogio, fornecedor.id)
    const item = morango()
    lancarContaDaCompra(
      s.db,
      s.relogio,
      item,
      { quantidade: 1_000, valorPago: 1800, fornecedorId: null },
      { vencimento: '2026-10-16', pagamento: null }
    )
    expect(listarContas(s.db)[0]!.tipoNome).toBe('Fornecedor')
  })

  it('compra de R$ 0,00 não vira conta; pagamento com data no futuro é recusado', () => {
    const item = morango()
    expect(
      lancarContaDaCompra(
        s.db,
        s.relogio,
        item,
        { quantidade: 1_000, valorPago: 0, fornecedorId: null },
        { vencimento: '2026-10-16', pagamento: null }
      )
    ).toBeNull()
    expect(() =>
      lancarContaDaCompra(
        s.db,
        s.relogio,
        item,
        { quantidade: 1_000, valorPago: 1800, fornecedorId: null },
        {
          vencimento: '2026-10-20',
          pagamento: { forma: 'pix', cartaoId: null, pagoEm: '2026-10-20' }
        }
      )
    ).toThrow('A data do pagamento ainda não chegou.')
    expect(listarContas(s.db)).toHaveLength(0)
  })
})
