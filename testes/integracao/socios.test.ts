import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { centavos } from '../../src/dominio/dinheiro'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import {
  criarCartao,
  desfazerPagamento,
  listarTipos,
  salvarConta
} from '../../src/main/servicos/contas'
import {
  desfazerExclusaoRetirada,
  excluirRetirada,
  mesDosSocios,
  mudarParticipacao,
  obterRegras,
  salvarRegras,
  salvarRetirada
} from '../../src/main/servicos/socios'
import { salvarFechamento, salvarTaxas } from '../../src/main/servicos/vendas'
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

const historico = () => listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)
const tipo = (nome: string) => listarTipos(s.db).find((t) => t.nome === nome)!.id

/** Balcão de um dia só em dinheiro. */
function vendeu(data: string, valor: number, credito = 0) {
  salvarFechamento(s.db, s.relogio, {
    data,
    lojaFechada: false,
    dinheiro: centavos(valor),
    pix: centavos(0),
    debito: centavos(0),
    credito: centavos(credito)
  })
}

function contaPaga(
  nome: string,
  valor: number,
  pagoEm: string,
  tipoNome = 'Outros',
  cartaoId: number | null = null
) {
  return salvarConta(
    s.db,
    s.relogio,
    null,
    {
      nome,
      valor: centavos(valor),
      vencimento: pagoEm,
      tipoId: tipo(tipoNome),
      repete: false,
      avisarDias: 3
    },
    { forma: cartaoId ? 'credito' : 'pix', cartaoId, pagoEm }
  )
}

describe('T7 · Sócios no mês', () => {
  it('faturamento 52.300 − despesas 33.850 = 18.450 → Carlos 11.070 e Paulo 7.380', () => {
    vendeu('2026-10-10', 5230000)
    contaPaga('Despesas do mês', 3385000, '2026-10-12')
    const m = mesDosSocios(s.db, '2026-10')
    expect(m.resultado).toMatchObject({ faturamento: 5230000, despesas: 3385000, lucro: 1845000 })
    expect(m.socios.map((x) => [x.nome, x.pct, x.parte])).toEqual([
      ['Carlos', 6000, 1107000],
      ['Paulo', 4000, 738000]
    ])
  })

  it('conta de R$ 320,00 no cartão pessoal do Paulo: reembolso e despesa; Desfazer tira', () => {
    vendeu('2026-10-10', 100000)
    const k = criarCartao(s.db, s.relogio, 'Débito final 2285', 2)
    const id = contaPaga('Frutas na feira', 32000, '2026-10-12', 'Fornecedor', k.id)
    let m = mesDosSocios(s.db, '2026-10')
    expect(m.reembolsos).toEqual([
      expect.objectContaining({ conta: 'Frutas na feira', socioNome: 'Paulo', valor: 32000 })
    ])
    expect(m.resultado.despesas).toBe(32000)
    const paulo = m.socios[1]!
    expect(paulo.reembolso).toBe(32000)
    expect(paulo.totalAReceber).toBe(paulo.parte + 32000)

    desfazerPagamento(s.db, s.relogio, id)
    m = mesDosSocios(s.db, '2026-10')
    expect(m.reembolsos).toHaveLength(0)
    expect(m.socios[1]!.reembolso).toBe(0)
  })

  it('retiradas descontam; excluir e desfazer', () => {
    vendeu('2026-10-10', 1000000)
    const id = salvarRetirada(s.db, s.relogio, null, {
      socioId: 1,
      valor: centavos(150000),
      data: '2026-10-05',
      como: 'pix_empresa',
      motivo: 'Adiantamento'
    })
    expect(historico()[0]).toBe(
      'Registrou a retirada: Carlos, R$ 1.500,00 em 05/10 (Pix da conta da empresa, Adiantamento)'
    )
    let carlos = mesDosSocios(s.db, '2026-10').socios[0]!
    expect(carlos).toMatchObject({ parte: 600000, retiradas: 150000, totalAReceber: 450000 })
    excluirRetirada(s.db, s.relogio, id)
    expect(mesDosSocios(s.db, '2026-10').retiradas).toHaveLength(0)
    desfazerExclusaoRetirada(s.db, s.relogio, id)
    carlos = mesDosSocios(s.db, '2026-10').socios[0]!
    expect(carlos.retiradas).toBe(150000)
    expect(() =>
      salvarRetirada(s.db, s.relogio, null, {
        socioId: 2,
        valor: centavos(100),
        data: '2026-10-17',
        como: 'dinheiro_caixa',
        motivo: ''
      })
    ).toThrow('Essa data ainda não chegou.')
  })

  it('D-061: a fatura do cartão da empresa não entra nas despesas', () => {
    vendeu('2026-10-10', 100000)
    contaPaga('Fatura Bradesco', 50000, '2026-10-12', 'Fatura do cartão da empresa')
    expect(mesDosSocios(s.db, '2026-10').resultado.despesas).toBe(0)
  })
})

describe('D-058 · participação vale do mês da mudança em diante', () => {
  it('mudar em novembro não muda outubro; vale para dezembro', () => {
    mudarParticipacao(s.db, s.relogio, '2026-11', 6500)
    expect(historico()[0]).toBe(
      'Mudou a participação a partir de novembro de 2026: Carlos 60% → 65%, Paulo 40% → 35%'
    )
    const pcts = (am: string) => mesDosSocios(s.db, am).socios.map((x) => x.pct)
    expect(pcts('2026-10')).toEqual([6000, 4000])
    expect(pcts('2026-11')).toEqual([6500, 3500])
    expect(pcts('2026-12')).toEqual([6500, 3500])
    expect(() => mudarParticipacao(s.db, s.relogio, '2026-11', 6550)).toThrow('1 em 1%')
  })
})

describe('Como contar o lucro (Configurações)', () => {
  it('padrão = sugestão; mudar vai para o histórico', () => {
    expect(obterRegras(s.db)).toEqual({
      despesa: 'pagamento',
      credito: 'venda',
      taxas: 'despesa',
      prejuizo: 'nao_dividir'
    })
    salvarRegras(s.db, s.relogio, { ...obterRegras(s.db), prejuizo: 'levar' })
    expect(historico()[0]).toBe(
      'Mudou como contar o lucro: mês com prejuízo: mostrar e não dividir → levar para o mês seguinte'
    )
  })

  it('taxas como despesa × já descontadas; crédito no mês da venda × quando cai', () => {
    salvarTaxas(s.db, s.relogio, { debitoPct: 0, debitoDias: 0, creditoPct: 320, creditoDias: 30 })
    vendeu('2026-10-10', 0, 100000)
    let r = mesDosSocios(s.db, '2026-10').resultado
    expect(r).toMatchObject({ faturamento: 100000, taxas: 3200, despesas: 3200, lucro: 96800 })
    salvarRegras(s.db, s.relogio, { ...obterRegras(s.db), taxas: 'descontar' })
    r = mesDosSocios(s.db, '2026-10').resultado
    expect(r).toMatchObject({ faturamento: 96800, taxas: 0, lucro: 96800 })
    salvarRegras(s.db, s.relogio, { ...obterRegras(s.db), credito: 'quando_cai' })
    expect(mesDosSocios(s.db, '2026-10').resultado.faturamento).toBe(0)
    expect(mesDosSocios(s.db, '2026-11').resultado.faturamento).toBe(96800)
  })

  it('prejuízo: não divide (padrão) × divide × leva para o mês seguinte', () => {
    vendeu('2026-09-10', 10000)
    contaPaga('Aluguel', 30000, '2026-09-12', 'Aluguel')
    vendeu('2026-10-10', 50000)
    expect(mesDosSocios(s.db, '2026-09')).toMatchObject({ paraDividir: 0 })
    expect(mesDosSocios(s.db, '2026-10')).toMatchObject({ paraDividir: 50000, prejuizoAnterior: 0 })

    salvarRegras(s.db, s.relogio, { ...obterRegras(s.db), prejuizo: 'dividir' })
    expect(mesDosSocios(s.db, '2026-09').socios.map((x) => x.parte)).toEqual([-12000, -8000])

    salvarRegras(s.db, s.relogio, { ...obterRegras(s.db), prejuizo: 'levar' })
    expect(mesDosSocios(s.db, '2026-10')).toMatchObject({
      prejuizoAnterior: -20000,
      paraDividir: 30000
    })
  })
})
