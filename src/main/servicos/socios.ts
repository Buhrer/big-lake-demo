// Sócios: lucro do mês, participação por mês, reembolsos e retiradas (docs/03 R12; D-033, D-058).
import { z } from 'zod'
import type {
  DadosRetirada,
  MesDosSocios,
  Reembolso,
  Retirada,
  Socio
} from '../../compartilhado/contrato'
import { mesAnterior, mesSeguinte } from '../../dominio/contas'
import { centavos } from '../../dominio/dinheiro'
import { formatarData, nomeDoMes, somarDias } from '../../dominio/datas'
import { formatarPercentual, formatarReais } from '../../dominio/formatar'
import {
  lucroParaDividir,
  NOME_COMO_RETIROU,
  prejuizoQueChega,
  quantoCadaUmRecebe,
  REGRAS_PADRAO,
  resultadoDoMes,
  type ComoRetirou,
  type ContaParaOLucro,
  type Recebimento,
  type RegrasLucro
} from '../../dominio/socios'
import { fechamentoDoDia } from '../../dominio/vendas'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { obterTaxas } from './vendas'

const anoMes = z.string().regex(/^\d{4}-\d{2}$/, 'Mês inválido.')

function nomeDoMesAno(am: string): string {
  const [ano, mes] = am.split('-').map(Number) as [number, number]
  return `${nomeDoMes(mes)} de ${ano}`
}

export function listarSocios(db: Banco): Socio[] {
  return db.prepare('SELECT id, nome FROM socio ORDER BY ordem').all() as unknown as Socio[]
}

// ---------- Regras do lucro (Configurações, D-033) ----------

const esquemaRegras = z.object({
  despesa: z.enum(['pagamento', 'vencimento']),
  credito: z.enum(['venda', 'quando_cai']),
  taxas: z.enum(['despesa', 'descontar']),
  prejuizo: z.enum(['nao_dividir', 'dividir', 'levar'])
})

const TEXTOS_REGRAS: {
  [K in keyof RegrasLucro]: { rotulo: string; opcoes: Record<RegrasLucro[K], string> }
} = {
  despesa: {
    rotulo: 'conta entra nas despesas',
    opcoes: { pagamento: 'no mês em que foi paga', vencimento: 'no mês do vencimento' }
  },
  credito: {
    rotulo: 'venda no crédito conta',
    opcoes: { venda: 'no mês da venda', quando_cai: 'no mês em que o dinheiro cai' }
  },
  taxas: {
    rotulo: 'taxas da maquininha',
    opcoes: { despesa: 'como despesa', descontar: 'já descontadas das vendas' }
  },
  prejuizo: {
    rotulo: 'mês com prejuízo',
    opcoes: {
      nao_dividir: 'mostrar e não dividir',
      dividir: 'dividir entre os sócios',
      levar: 'levar para o mês seguinte'
    }
  }
}

export function obterRegras(db: Banco): RegrasLucro {
  const linha = db.prepare(`SELECT valor FROM config WHERE chave = 'regras_lucro'`).get() as
    { valor: string } | undefined
  if (!linha) return REGRAS_PADRAO
  const r = esquemaRegras.safeParse({ ...REGRAS_PADRAO, ...JSON.parse(linha.valor) })
  return r.success ? r.data : REGRAS_PADRAO
}

export function salvarRegras(db: Banco, relogio: Relogio, entrada: unknown): RegrasLucro {
  const depois = esquemaRegras.parse(entrada)
  return emTransacao(db, () => {
    const antes = obterRegras(db)
    const m: string[] = []
    for (const chave of Object.keys(TEXTOS_REGRAS) as (keyof RegrasLucro)[]) {
      if (antes[chave] === depois[chave]) continue
      const t = TEXTOS_REGRAS[chave] as { rotulo: string; opcoes: Record<string, string> }
      m.push(`${t.rotulo}: ${t.opcoes[antes[chave]]} → ${t.opcoes[depois[chave]]}`)
    }
    if (m.length === 0) return antes
    db.prepare(
      `INSERT INTO config (chave, valor, alterado_em) VALUES ('regras_lucro', ?, ?)
       ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, alterado_em = excluded.alterado_em`
    ).run(JSON.stringify(depois), relogio.agora())
    auditar(db, relogio, {
      modulo: 'configuracoes',
      acao: 'alterar',
      descricao: `Mudou como contar o lucro: ${m.join('; ')}`,
      antes,
      depois
    })
    return depois
  })
}

// ---------- Participação por mês (D-058) ----------

/** A porcentagem de cada sócio no mês: vale a última mudança feita até aquele mês. */
export function participacaoNoMes(
  db: Banco,
  am: string
): { id: number; nome: string; pct: number }[] {
  return listarSocios(db).map((s) => {
    const l = db
      .prepare(
        `SELECT pct_x100 FROM participacao_socio WHERE socio_id = ? AND ano_mes <= ?
         ORDER BY ano_mes DESC LIMIT 1`
      )
      .get(s.id, am) as { pct_x100: number } | undefined
    return { ...s, pct: l?.pct_x100 ?? 0 }
  })
}

/** Muda a porcentagem do primeiro sócio; o outro completa 100%. Vale do mês em diante. */
export function mudarParticipacao(
  db: Banco,
  relogio: Relogio,
  amBruto: unknown,
  pctBruto: unknown
): void {
  const am = anoMes.parse(amBruto)
  const pct = z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .refine((n) => n % 100 === 0, 'A porcentagem muda de 1 em 1%.')
    .parse(pctBruto)
  emTransacao(db, () => {
    const antes = participacaoNoMes(db, am)
    if (antes.length !== 2) throw new Error('A divisão é feita entre dois sócios.')
    const novos = [pct, 10_000 - pct]
    if (antes.every((s, i) => s.pct === novos[i])) return
    const agora = relogio.agora()
    antes.forEach((s, i) => {
      db.prepare(
        `INSERT INTO participacao_socio (ano_mes, socio_id, pct_x100, alterado_em) VALUES (?, ?, ?, ?)
         ON CONFLICT (ano_mes, socio_id) DO UPDATE SET pct_x100 = excluded.pct_x100,
           alterado_em = excluded.alterado_em`
      ).run(am, s.id, novos[i]!, agora)
    })
    auditar(db, relogio, {
      modulo: 'socios',
      acao: 'alterar',
      descricao:
        `Mudou a participação a partir de ${nomeDoMesAno(am)}: ` +
        antes
          .map(
            (s, i) => `${s.nome} ${formatarPercentual(s.pct)} → ${formatarPercentual(novos[i]!)}`
          )
          .join(', '),
      antes,
      depois: novos
    })
  })
}

// ---------- Vendas e contas para o lucro ----------

/** Cada dia do balcão vira 4 pedaços (dinheiro, Pix, débito, crédito); cada pedido, 1. */
export function recebimentos(db: Banco): Recebimento[] {
  const lista: Recebimento[] = []
  const dias = db
    .prepare(
      `SELECT data, dinheiro_centavos, pix_centavos, debito_centavos, credito_centavos,
         taxa_debito_pct_x100, taxa_credito_pct_x100, dias_debito, dias_credito
       FROM fechamento_balcao WHERE loja_fechada = 0`
    )
    .all() as {
    data: string
    dinheiro_centavos: number
    pix_centavos: number
    debito_centavos: number
    credito_centavos: number
    taxa_debito_pct_x100: number
    taxa_credito_pct_x100: number
    dias_debito: number
    dias_credito: number
  }[]
  const zero = centavos(0)
  for (const d of dias) {
    const f = fechamentoDoDia(
      {
        dinheiro: centavos(d.dinheiro_centavos),
        pix: centavos(d.pix_centavos),
        debito: centavos(d.debito_centavos),
        credito: centavos(d.credito_centavos)
      },
      {
        debitoPct: d.taxa_debito_pct_x100,
        debitoDias: d.dias_debito,
        creditoPct: d.taxa_credito_pct_x100,
        creditoDias: d.dias_credito
      },
      d.data
    )
    const vista = { data: d.data, caiEm: d.data, credito: false, taxa: zero }
    lista.push(
      { ...vista, valor: centavos(d.dinheiro_centavos + d.pix_centavos) },
      { ...vista, caiEm: f.debitoCaiEm, valor: centavos(d.debito_centavos), taxa: f.taxaDebito },
      {
        data: d.data,
        caiEm: f.creditoCaiEm,
        credito: true,
        valor: centavos(d.credito_centavos),
        taxa: f.taxaCredito
      }
    )
  }
  // O pedido guarda a taxa do dia, mas não o prazo: usa o prazo de crédito de hoje.
  const prazoCredito = obterTaxas(db).creditoDias
  const pedidos = db
    .prepare(
      `SELECT data, forma_pagamento, total_centavos, taxa_centavos FROM pedido WHERE cancelado_em IS NULL`
    )
    .all() as {
    data: string
    forma_pagamento: string
    total_centavos: number
    taxa_centavos: number
  }[]
  for (const p of pedidos) {
    const credito = p.forma_pagamento === 'credito'
    lista.push({
      data: p.data,
      caiEm: credito ? somarDias(p.data, prazoCredito) : p.data,
      credito,
      valor: centavos(p.total_centavos),
      taxa: centavos(p.taxa_centavos),
      pedido: true
    })
  }
  return lista
}

export function contasParaOLucro(db: Banco): ContaParaOLucro[] {
  return (
    db
      .prepare(
        `SELECT c.vencimento, c.pago_em, c.valor_centavos, t.nome AS tipo, t.especial
         FROM conta_pagar c JOIN tipo_conta t ON t.id = c.tipo_id WHERE c.excluido_em IS NULL`
      )
      .all() as {
      vencimento: string
      pago_em: string | null
      valor_centavos: number
      tipo: string
      especial: string | null
    }[]
  ).map((c) => ({
    vencimento: c.vencimento,
    pagoEm: c.pago_em,
    valor: centavos(c.valor_centavos),
    tipo: c.tipo,
    entraNasDespesas: c.especial === null
  }))
}

function reembolsosDoMes(db: Banco, am: string): Reembolso[] {
  return (
    db
      .prepare(
        `SELECT c.id, c.pago_em, c.nome, k.nome AS cartao, s.id AS socio_id, s.nome AS socio,
           c.valor_centavos
         FROM conta_pagar c JOIN cartao k ON k.id = c.cartao_id JOIN socio s ON s.id = k.socio_id
         WHERE c.excluido_em IS NULL AND substr(c.pago_em, 1, 7) = ?
         ORDER BY c.pago_em, c.id`
      )
      .all(am) as {
      id: number
      pago_em: string
      nome: string
      cartao: string
      socio_id: number
      socio: string
      valor_centavos: number
    }[]
  ).map((r) => ({
    contaId: r.id,
    data: r.pago_em,
    conta: r.nome,
    cartao: r.cartao,
    socioId: r.socio_id,
    socioNome: r.socio,
    valor: centavos(r.valor_centavos)
  }))
}

// ---------- Retiradas ----------

interface LinhaRetirada {
  id: number
  socio_id: number
  socio: string
  valor_centavos: number
  data: string
  como: ComoRetirou
  motivo: string
}

const SELECT_RETIRADA = `SELECT r.id, r.socio_id, s.nome AS socio, r.valor_centavos, r.data, r.como, r.motivo
  FROM retirada r JOIN socio s ON s.id = r.socio_id`

function deLinhaRetirada(l: LinhaRetirada): Retirada {
  return {
    id: l.id,
    socioId: l.socio_id,
    socioNome: l.socio,
    valor: centavos(l.valor_centavos),
    data: l.data,
    como: l.como,
    motivo: l.motivo
  }
}

export function listarRetiradas(db: Banco, am: string): Retirada[] {
  return (
    db
      .prepare(
        `${SELECT_RETIRADA} WHERE r.excluido_em IS NULL AND substr(r.data, 1, 7) = ?
         ORDER BY r.data, r.id`
      )
      .all(am) as unknown as LinhaRetirada[]
  ).map(deLinhaRetirada)
}

function obterRetirada(db: Banco, id: number): Retirada | null {
  const l = db.prepare(`${SELECT_RETIRADA} WHERE r.id = ?`).get(id) as LinhaRetirada | undefined
  return l ? deLinhaRetirada(l) : null
}

const esquemaRetirada = z.object({
  socioId: z.number().int().positive({ message: 'Escolha quem retirou.' }),
  valor: z.number().int().positive({ message: 'Digite o valor.' }).max(100_000_000_00),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Digite a data.'),
  como: z.enum(['pix_empresa', 'dinheiro_caixa'], { message: 'Escolha como pegou.' }),
  motivo: z.string().trim().max(200)
})

function descreverRetirada(r: DadosRetirada & { socioNome: string }): string {
  return `${r.socioNome}, ${formatarReais(centavos(r.valor))} em ${formatarData(r.data).slice(0, 5)} (${NOME_COMO_RETIROU[r.como]}${r.motivo ? `, ${r.motivo}` : ''})`
}

export function salvarRetirada(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosRetirada
): number {
  const d = esquemaRetirada.parse(entrada)
  if (d.data > relogio.hoje()) throw new Error('Essa data ainda não chegou.')
  return emTransacao(db, () => {
    const socio = listarSocios(db).find((s) => s.id === d.socioId)
    if (!socio) throw new Error('Escolha quem retirou.')
    const agora = relogio.agora()
    const nova = { ...d, valor: centavos(d.valor), socioNome: socio.nome }
    if (id === null) {
      const r = db
        .prepare(
          `INSERT INTO retirada (socio_id, valor_centavos, data, como, motivo, criado_em, alterado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(d.socioId, d.valor, d.data, d.como, d.motivo, agora, agora)
      const novo = Number(r.lastInsertRowid)
      auditar(db, relogio, {
        modulo: 'socios',
        acao: 'criar',
        entidade: 'retirada',
        entidadeId: novo,
        descricao: `Registrou a retirada: ${descreverRetirada(nova)}`,
        depois: d
      })
      return novo
    }
    const antes = obterRetirada(db, id)
    if (!antes) throw new Error('Retirada não encontrada.')
    const textoAntes = descreverRetirada(antes)
    const textoDepois = descreverRetirada(nova)
    if (textoAntes === textoDepois) return id
    db.prepare(
      `UPDATE retirada SET socio_id = ?, valor_centavos = ?, data = ?, como = ?, motivo = ?, alterado_em = ?
       WHERE id = ?`
    ).run(d.socioId, d.valor, d.data, d.como, d.motivo, agora, id)
    auditar(db, relogio, {
      modulo: 'socios',
      acao: 'alterar',
      entidade: 'retirada',
      entidadeId: id,
      descricao: `Corrigiu a retirada: ${textoAntes} → ${textoDepois}`,
      antes,
      depois: d
    })
    return id
  })
}

export function excluirRetirada(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const r = obterRetirada(db, id)
    if (!r) throw new Error('Retirada não encontrada.')
    db.prepare('UPDATE retirada SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'socios',
      acao: 'excluir',
      entidade: 'retirada',
      entidadeId: id,
      descricao: `Excluiu a retirada: ${descreverRetirada(r)}`
    })
  })
}

export function desfazerExclusaoRetirada(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const r = obterRetirada(db, id)
    if (!r) throw new Error('Retirada não encontrada.')
    db.prepare('UPDATE retirada SET excluido_em = NULL WHERE id = ?').run(id)
    auditar(db, relogio, {
      modulo: 'socios',
      acao: 'desfazer',
      entidade: 'retirada',
      entidadeId: id,
      descricao: `Desfez a exclusão da retirada: ${descreverRetirada(r)}`
    })
  })
}

// ---------- O mês na tela Sócios ----------

export function mesDosSocios(db: Banco, amBruto: unknown): MesDosSocios {
  const am = anoMes.parse(amBruto)
  const regras = obterRegras(db)
  const vendas = recebimentos(db)
  const contas = contasParaOLucro(db)
  const resultado = resultadoDoMes(am, vendas, contas, regras)

  // Regra "levar para o mês seguinte": soma os meses desde o primeiro com movimento.
  let prejuizoAnterior = centavos(0)
  if (regras.prejuizo === 'levar') {
    const datas = [
      ...vendas.map((v) => v.data),
      ...contas.flatMap((c) => [c.pagoEm ?? c.vencimento, c.vencimento])
    ]
    const primeiro = datas.length ? datas.reduce((a, b) => (a < b ? a : b)).slice(0, 7) : am
    const lucros = []
    for (let m = primeiro; m <= mesAnterior(am); m = mesSeguinte(m)) {
      lucros.push(resultadoDoMes(m, vendas, contas, regras).lucro)
    }
    prejuizoAnterior = prejuizoQueChega(lucros)
  }
  const { paraDividir } = lucroParaDividir(resultado.lucro, prejuizoAnterior, regras.prejuizo)

  const participacao = participacaoNoMes(db, am)
  const reembolsos = reembolsosDoMes(db, am)
  const retiradas = listarRetiradas(db, am)
  const socios = quantoCadaUmRecebe(paraDividir, participacao, reembolsos, retiradas).map(
    (s, i) => ({
      ...s,
      nome: participacao[i]!.nome
    })
  )
  return {
    anoMes: am,
    regras,
    resultado,
    prejuizoAnterior,
    paraDividir,
    socios,
    reembolsos,
    retiradas
  }
}
