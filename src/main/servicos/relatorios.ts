// Relatórios (docs/02 §10, R12, R14, R15; D-071, D-073, D-074).
import { z } from 'zod'
import type {
  IdRelatorio,
  RelComparar,
  RelFormas,
  RelLucroProduto,
  RelMaisVendidos,
  RelPerdas,
  RelResultado,
  Relatorio
} from '../../compartilhado/contrato'
import { mesAnterior, mesSeguinte } from '../../dominio/contas'
import { centavos, dividirArredondando, somarCentavos, type Centavos } from '../../dominio/dinheiro'
import { resumirPerdas } from '../../dominio/perdas'
import {
  diferencaPercentual,
  lucroPorProduto,
  maiorMotivo,
  porcentagens,
  rankingDeClientes,
  rankingDeProdutos,
  textoQuantidadeVendida
} from '../../dominio/relatorios'
import { resultadoDoMes, type ResultadoDoMes } from '../../dominio/socios'
import type { Banco } from '../banco/conexao'
import { obterGordurinha } from './gordurinha'
import { listarPerdas } from './perdas'
import { listarProducoes } from './producao'
import { listarProdutos } from './produtos'
import { listarReceitas } from './receitas'
import { contasParaOLucro, obterRegras, recebimentos } from './socios'
import { listarPedidos, obterTaxas } from './vendas'

export const anoMes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido.')
export const idRelatorio = z.enum([
  'resultado',
  'gordurinha',
  'mais_vendidos',
  'formas',
  'comparar',
  'lucro_produto',
  'perdas'
])

const barra = (valor: number, maior: number) =>
  maior > 0 ? Math.round((Math.max(valor, 0) * 100) / maior) : 0

/** Do primeiro mês com algum lançamento até o mês de hoje, do mais novo para o mais antigo. */
export function mesesComDados(db: Banco, hoje: string): string[] {
  const atual = hoje.slice(0, 7)
  const r = db
    .prepare(
      `SELECT min(m) AS primeiro FROM (
         SELECT min(data) AS m FROM fechamento_balcao
         UNION ALL SELECT min(data) FROM pedido WHERE cancelado_em IS NULL
         UNION ALL SELECT min(coalesce(pago_em, vencimento)) FROM conta_pagar WHERE excluido_em IS NULL
         UNION ALL SELECT min(data) FROM producao WHERE excluido_em IS NULL
         UNION ALL SELECT min(data) FROM perda WHERE excluido_em IS NULL
       )`
    )
    .get() as { primeiro: string | null }
  const primeiro = r.primeiro && r.primeiro.slice(0, 7) < atual ? r.primeiro.slice(0, 7) : atual
  const meses: string[] = []
  for (let m = atual; m >= primeiro; m = mesAnterior(m)) meses.push(m)
  return meses
}

function resultadosPorMes(db: Banco): (am: string) => ResultadoDoMes {
  const vendas = recebimentos(db)
  const contas = contasParaOLucro(db)
  const regras = obterRegras(db)
  return (am) => resultadoDoMes(am, vendas, contas, regras)
}

function resultado(db: Banco, am: string): RelResultado {
  const r = resultadosPorMes(db)(am)
  return {
    balcao: r.balcao,
    pedidos: r.pedidos,
    total: centavos(r.balcao + r.pedidos),
    despesas: r.porTipo,
    taxas: r.taxasDoMes,
    lucro: r.lucro
  }
}

function maisVendidos(db: Banco, am: string): RelMaisVendidos {
  const pedidos = listarPedidos(db, am).filter((p) => !p.cancelado)
  const produtos = new Map(listarProdutos(db).map((p) => [p.id, p]))
  const ranking = rankingDeProdutos(
    pedidos.flatMap((p) =>
      p.itens.map((i) => ({
        produtoId: i.produtoId,
        nome: i.nome,
        quantidade: i.quantidade,
        valor: centavos(i.quantidade * i.precoUnitario)
      }))
    )
  )
  const maior = ranking[0]?.valor ?? 0
  return {
    produtos: ranking.map((i) => {
      const p = produtos.get(i.produtoId)
      return {
        nome: i.nome,
        quantidade: textoQuantidadeVendida(
          i.quantidade,
          p?.vendidoComo ?? 'unidade',
          p?.unidadesPorCaixa ?? null
        ),
        valor: i.valor,
        barra: barra(i.valor, maior)
      }
    }),
    clientes: rankingDeClientes(pedidos).map((c) => ({
      nome: c.nome,
      pedidos: c.pedidos,
      valor: c.valor
    })),
    total: somarCentavos(pedidos.map((p) => p.total))
  }
}

interface LinhaBalcao {
  dinheiro_centavos: number
  pix_centavos: number
  debito_centavos: number
  credito_centavos: number
  taxa_debito_pct_x100: number
  taxa_credito_pct_x100: number
}

function formas(db: Banco, am: string): RelFormas {
  const dias = db
    .prepare(
      `SELECT dinheiro_centavos, pix_centavos, debito_centavos, credito_centavos,
         taxa_debito_pct_x100, taxa_credito_pct_x100
       FROM fechamento_balcao WHERE loja_fechada = 0 AND substr(data, 1, 7) = ?`
    )
    .all(am) as unknown as LinhaBalcao[]
  const soma = (f: (d: LinhaBalcao) => number) => centavos(dias.reduce((t, d) => t + f(d), 0))
  const valores = [
    soma((d) => d.dinheiro_centavos),
    soma((d) => d.debito_centavos),
    soma((d) => d.credito_centavos),
    soma((d) => d.pix_centavos)
  ]
  const pct = porcentagens(valores)
  const total = somarCentavos(valores)
  // a taxa de cada dia é o retrato daquele dia (igual ao fechamento)
  const taxa = (valor: number, pctX100: number) =>
    Number(dividirArredondando(BigInt(valor) * BigInt(pctX100), 10000n))
  const taxas = soma(
    (d) =>
      taxa(d.debito_centavos, d.taxa_debito_pct_x100) +
      taxa(d.credito_centavos, d.taxa_credito_pct_x100)
  )
  const atuais = obterTaxas(db)
  return {
    formas: ['Dinheiro', 'Cartão débito', 'Cartão crédito', 'Pix'].map((nome, i) => ({
      nome,
      valor: valores[i]!,
      pct: pct[i]!
    })),
    total,
    taxas,
    taxaDebitoPct: atuais.debitoPct,
    taxaCreditoPct: atuais.creditoPct,
    diasAbertos: dias.length,
    mediaPorDia: dias.length
      ? centavos(Number(dividirArredondando(BigInt(total), BigInt(dias.length))))
      : centavos(0)
  }
}

function unidadesProduzidas(db: Banco, am: string): number {
  return listarProducoes(db, am).reduce((t, p) => t + p.unidadesFeitas, 0)
}

function diasComVenda(db: Banco, am: string): number {
  const r = db
    .prepare(
      `SELECT count(*) AS n FROM (
         SELECT data FROM fechamento_balcao
           WHERE loja_fechada = 0 AND substr(data, 1, 7) = ?
             AND dinheiro_centavos + pix_centavos + debito_centavos + credito_centavos > 0
         UNION SELECT data FROM pedido WHERE cancelado_em IS NULL AND substr(data, 1, 7) = ?
       )`
    )
    .get(am, am) as { n: number }
  return r.n
}

function comparar(db: Banco, am: string): RelComparar {
  const doMes = resultadosPorMes(db)
  const [ano, mes] = am.split('-') as [string, string]
  const anterior = `${Number(ano) - 1}-${mes}`
  const a = doMes(anterior)
  const b = doMes(am)
  const media = (r: ResultadoDoMes, m: string) => {
    const dias = diasComVenda(db, m)
    return dias ? Number(dividirArredondando(BigInt(r.faturamento), BigInt(dias))) : 0
  }
  const linha = (nome: string, reais: boolean, antes: number, agora: number, subirEBom = true) => ({
    nome,
    reais,
    antes,
    agora,
    diferenca: diferencaPercentual(antes, agora),
    subirEBom
  })
  // 6 meses até o escolhido
  let inicio = am
  for (let i = 0; i < 5; i++) inicio = mesAnterior(inicio)
  const meses: RelComparar['meses'] = []
  for (let m = inicio; m <= am; m = mesSeguinte(m)) {
    const [anoM, mesM] = m.split('-') as [string, string]
    const agora = doMes(m)
    const antes = doMes(`${Number(anoM) - 1}-${mesM}`)
    meses.push({
      mes: Number(mesM),
      antes: centavos(antes.balcao + antes.pedidos),
      agora: centavos(agora.balcao + agora.pedidos)
    })
  }
  return {
    anoMesAnterior: anterior,
    linhas: [
      linha('Faturamento', true, a.faturamento, b.faturamento),
      linha('Despesas', true, a.despesas, b.despesas, false),
      {
        ...linha('Lucro líquido', true, a.lucro, b.lucro),
        // % só quando os dois anos tiveram lucro ("401% menor" não ajuda ninguém)
        diferenca: a.lucro > 0 && b.lucro >= 0 ? diferencaPercentual(a.lucro, b.lucro) : null
      },
      linha(
        'Unidades produzidas',
        false,
        unidadesProduzidas(db, anterior),
        unidadesProduzidas(db, am)
      ),
      linha('Média de vendas por dia', true, media(a, anterior), media(b, am))
    ],
    meses
  }
}

function lucroProduto(db: Banco, am: string): RelLucroProduto {
  const receitas = new Map(listarReceitas(db).map((r) => [r.id, r]))
  const produtos = new Map(listarProdutos(db).map((p) => [p.id, p]))
  const porReceita = new Map<
    number,
    {
      nome: string
      produzidas: number
      perdidas: number
      pedidos: { unidades: number; valor: Centavos }[]
    }
  >()
  const da = (id: number, nome: string) => {
    const r = porReceita.get(id) ?? { nome, produzidas: 0, perdidas: 0, pedidos: [] }
    porReceita.set(id, r)
    return r
  }
  for (const p of listarProducoes(db, am))
    da(p.receitaId, p.nomeReceita).produzidas += p.unidadesFeitas
  const perdidas = db
    .prepare(
      `SELECT i.receita_id, i.nome, sum(i.quantidade_x1000) AS q
       FROM perda_item i JOIN perda p ON p.id = i.perda_id
       WHERE p.excluido_em IS NULL AND i.receita_id IS NOT NULL AND substr(p.data, 1, 7) = ?
       GROUP BY i.receita_id`
    )
    .all(am) as { receita_id: number; nome: string; q: number }[]
  for (const l of perdidas) da(l.receita_id, l.nome).perdidas += Math.round(l.q / 1000)
  for (const ped of listarPedidos(db, am).filter((p) => !p.cancelado)) {
    for (const i of ped.itens) {
      const produto = produtos.get(i.produtoId)
      if (!produto?.receitaId) continue
      const porVenda = produto.vendidoComo === 'caixa' ? (produto.unidadesPorCaixa ?? 1) : 1
      da(produto.receitaId, produto.receitaNome ?? i.nome).pedidos.push({
        unidades: i.quantidade * porVenda,
        valor: centavos(i.quantidade * i.precoUnitario)
      })
    }
  }
  const lista = lucroPorProduto(
    [...porReceita.entries()]
      .filter(([id]) => receitas.has(id))
      .map(([id, r]) => {
        const receita = receitas.get(id)!
        return {
          receitaId: id,
          nome: receita.nome,
          produzidas: r.produzidas,
          perdidas: r.perdidas,
          pedidos: r.pedidos,
          // preço de balcão = custo + lucro de cada (×10.000)
          precoBalcao: centavos((receita.custoDeCada + receita.balcao.lucroDeCada) / 100),
          custoDeCada: receita.custoDeCada
        }
      })
  )
  const maior = lista[0]?.lucro ?? 0
  return {
    produtos: lista.map((p) => ({
      nome: p.nome,
      sairam: p.sairam,
      lucroDeCada: p.lucroDeCada,
      lucro: p.lucro,
      barra: barra(p.lucro, maior)
    }))
  }
}

function perdas(db: Banco, am: string): RelPerdas {
  const lista = listarPerdas(db, am)
  const r = resumirPerdas(lista)
  const quem = r.porCliente[0]
  return {
    produtos: r.porTipo.produto.valor,
    materiaPrima: r.porTipo.materia_prima.valor,
    trocas: r.porTipo.troca.valor,
    total: r.total,
    quemMaisTrocou: quem ? { nome: quem.clienteNome, valor: quem.valor } : null,
    maiorMotivo: maiorMotivo(lista)
  }
}

export function obterRelatorio(
  db: Banco,
  idBruto: unknown,
  amBruto: unknown,
  hoje: string
): Relatorio {
  const id: IdRelatorio = idRelatorio.parse(idBruto)
  const am = anoMes.parse(amBruto)
  switch (id) {
    case 'resultado':
      return { id, anoMes: am, dados: resultado(db, am) }
    case 'gordurinha':
      return { id, anoMes: am, dados: obterGordurinha(db, hoje) }
    case 'mais_vendidos':
      return { id, anoMes: am, dados: maisVendidos(db, am) }
    case 'formas':
      return { id, anoMes: am, dados: formas(db, am) }
    case 'comparar':
      return { id, anoMes: am, dados: comparar(db, am) }
    case 'lucro_produto':
      return { id, anoMes: am, dados: lucroProduto(db, am) }
    case 'perdas':
      return { id, anoMes: am, dados: perdas(db, am) }
  }
}
