// T14 · banco com 10 anos de dados simulados: relatórios do ano em até 3 s e
// telas em menos de 1 s (docs/06, Desempenho). Os dados entram pelos próprios serviços.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { IdRelatorio } from '../../src/compartilhado/contrato'
import { centavos } from '../../src/dominio/dinheiro'
import { mesAnterior, mesSeguinte } from '../../src/dominio/contas'
import { emTransacao } from '../../src/main/banco/conexao'
import { clientes } from '../../src/main/servicos/cadastros'
import {
  listarContas,
  listarTipos,
  quantasNoAviso,
  salvarConta
} from '../../src/main/servicos/contas'
import { cadastrarItem, listarItens } from '../../src/main/servicos/estoque'
import { ligarGordurinha, obterGordurinha } from '../../src/main/servicos/gordurinha'
import { listarPerdas, salvarPerda } from '../../src/main/servicos/perdas'
import { listarProducoes, registrarProducao } from '../../src/main/servicos/producao'
import { salvarProduto } from '../../src/main/servicos/produtos'
import { listarCategorias, listarReceitas, salvarReceita } from '../../src/main/servicos/receitas'
import { mesesComDados, obterRelatorio } from '../../src/main/servicos/relatorios'
import { mesDosSocios } from '../../src/main/servicos/socios'
import {
  listarPedidos,
  resumoDasVendas,
  salvarFechamento,
  salvarPedido
} from '../../src/main/servicos/vendas'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

let s: Sistema
const HOJE = '2026-10-16'
const LIMITE_RELATORIO = 3000
const LIMITE_TELA = 1000

/** Tempo de uma chamada, em milissegundos. */
function medir<T>(fn: () => T): number {
  const inicio = performance.now()
  fn()
  return performance.now() - inicio
}

beforeAll(async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
  const { db, relogio } = s
  emTransacao(db, () => {
    const item = (nome: string) =>
      cadastrarItem(db, relogio, {
        tipo: 'materia_prima',
        unidade: 'kg',
        nomeUnidade: null,
        nome,
        quantidade: 1_000_000,
        valorPago: centavos(1_800_000),
        fornecedorId: null,
        minimo: 0,
        validade: null
      })
    const itens = ['Morango', 'Manga', 'Leite', 'Açúcar', 'Creme'].map(item)
    const paleta = listarCategorias(db).find((c) => c.nome === 'Paleta')!
    const receitas = ['Morango', 'Manga', 'Coco', 'Limão'].map((sabor, i) =>
      salvarReceita(db, relogio, null, {
        nome: `Paleta de ${sabor}`,
        categoriaId: paleta.id,
        rendimento: 100,
        ingredientes: [
          { itemId: itens[i % itens.length]!, quantidade: 5000 },
          { itemId: itens[4]!, quantidade: 2000 }
        ],
        embalagens: [],
        gasVezes: 1000,
        gasValor: null,
        precoBalcao: centavos(1000),
        precoAtacado: centavos(700),
        nomeUnidade: 'paleta'
      })
    )
    const produtos = receitas.map((receitaId, i) =>
      salvarProduto(db, relogio, null, {
        categoriaId: paleta.id,
        nome: `Paleta ${i + 1}`,
        vendidoComo: 'unidade',
        medida: null,
        medidaUnidade: null,
        unidadesPorCaixa: null,
        receitaId
      })
    )
    const clientesIds = Array.from({ length: 20 }, (_, i) =>
      clientes.salvar(db, relogio, null, {
        nome: `Cliente ${i + 1}`,
        telefone: '',
        documento: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: ''
      })
    )
    const tipos = listarTipos(db).filter((t) => !t.fatura)

    // 10 anos: balcão todo dia, ~20 pedidos, 8 contas pagas, 8 produções e 3 perdas por mês
    let mes = '2016-11'
    let n = 0
    while (mes <= HOJE.slice(0, 7)) {
      const [ano, m] = mes.split('-').map(Number) as [number, number]
      const dias = new Date(ano, m, 0).getDate()
      for (let d = 1; d <= dias; d++) {
        const data = `${mes}-${String(d).padStart(2, '0')}`
        if (data > HOJE) break
        n++
        salvarFechamento(db, relogio, {
          data,
          lojaFechada: false,
          dinheiro: centavos(40_000 + (n % 7) * 1000),
          pix: centavos(30_000),
          debito: centavos(20_000),
          credito: centavos(25_000)
        })
        if (d % 3 === 0 && data <= HOJE) {
          salvarPedido(db, relogio, null, {
            clienteId: clientesIds[n % clientesIds.length]!,
            data,
            forma: n % 2 ? 'pix' : 'credito',
            itens: [
              { produtoId: produtos[n % produtos.length]!, quantidade: 40 },
              { produtoId: produtos[(n + 1) % produtos.length]!, quantidade: 20 }
            ]
          })
        }
      }
      for (let c = 0; c < 8; c++) {
        const venc = `${mes}-${String(5 + c * 3).padStart(2, '0')}`
        if (venc > HOJE) continue
        salvarConta(
          db,
          relogio,
          null,
          {
            nome: `Conta ${c + 1}`,
            valor: centavos(150_000 + c * 10_000),
            vencimento: venc,
            tipoId: tipos[c % tipos.length]!.id,
            repete: false,
            avisarDias: 3
          },
          { forma: 'pix', cartaoId: null, pagoEm: venc }
        )
      }
      mes = mesSeguinte(mes)
    }
    // produções e perdas: a produção grava a data de hoje; espalha os meses no próprio banco
    for (let m = HOJE.slice(0, 7), i = 0; i < 120; i++, m = mesAnterior(m)) {
      for (let p = 0; p < 8; p++) {
        const prod = registrarProducao(db, relogio, {
          receitaId: receitas[p % receitas.length]!,
          vezes: 1000,
          unidadesFeitas: 100
        })
        db.prepare('UPDATE producao SET data = ? WHERE id = ?').run(`${m}-10`, prod.id)
      }
      for (let p = 0; p < 3; p++) {
        salvarPerda(db, relogio, null, {
          tipo: 'produto',
          data: `${m}-11` > HOJE ? HOJE : `${m}-11`,
          clienteId: null,
          itens: [{ id: receitas[p]!, quantidade: 5000 }],
          motivo: 'Derreteu',
          observacao: ''
        })
      }
    }
  })
  ligarGordurinha(s.db, s.relogio, {
    base: centavos(1_500_000),
    pct: 1000,
    desde: '2026-03-10'
  })
}, 300_000)

afterAll(() => {
  s?.fechar()
  delete process.env.BIGLAKE_PENDRIVE
})

describe('T14 · 10 anos de dados simulados', () => {
  it('o banco tem mesmo 10 anos', () => {
    expect(mesesComDados(s.db, HOJE)).toHaveLength(120)
    expect(listarPedidos(s.db, '2020-05').length).toBeGreaterThan(5)
    expect(listarProducoes(s.db, '2018-01')).toHaveLength(8)
    expect(listarPerdas(s.db, '2017-06')).toHaveLength(3)
  })

  const ids: IdRelatorio[] = [
    'resultado',
    'gordurinha',
    'mais_vendidos',
    'formas',
    'comparar',
    'lucro_produto',
    'perdas'
  ]
  for (const id of ids) {
    it(`relatório "${id}" em até 3 s`, () => {
      const ms = medir(() => obterRelatorio(s.db, id, '2026-09', HOJE))
      expect(ms).toBeLessThan(LIMITE_RELATORIO)
    })
  }

  it('o ano inteiro de relatórios (12 meses de Resultado) em até 3 s', () => {
    let am = '2025-10'
    const ms = medir(() => {
      for (let i = 0; i < 12; i++, am = mesSeguinte(am)) obterRelatorio(s.db, 'resultado', am, HOJE)
    })
    expect(ms).toBeLessThan(LIMITE_RELATORIO)
  })

  it('o que as telas leem ao abrir, em menos de 1 s cada', () => {
    const leituras: [string, () => unknown][] = [
      ['Início: resumo das vendas', () => resumoDasVendas(s.db, HOJE)],
      ['Início/Sócios: lucro do mês', () => mesDosSocios(s.db, '2026-10')],
      ['Contas a pagar', () => listarContas(s.db)],
      ['Bolinha do menu', () => quantasNoAviso(s.db, HOJE)],
      ['Estoque', () => listarItens(s.db)],
      ['Receitas', () => listarReceitas(s.db)],
      ['Pedidos do mês', () => listarPedidos(s.db, '2026-10')],
      ['Gordurinha', () => obterGordurinha(s.db, HOJE)]
    ]
    for (const [nome, ler] of leituras) {
      expect(medir(ler), nome).toBeLessThan(LIMITE_TELA)
    }
  })
})
