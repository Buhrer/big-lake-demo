// Contas a pagar, tipos de conta e cartões (docs/03 R11; D-032 p.18, p.24; D-061).
import { z } from 'zod'
import type {
  CartaoPagamento,
  Conta,
  DadosConta,
  DadosPagamento,
  TipoConta
} from '../../compartilhado/contrato'
import { normalizar } from '../../dominio/cadastros'
import {
  deveAvisar,
  DIAS_DE_AVISO,
  formaUsaCartao,
  FORMAS_DE_PAGAR_CONTA,
  mesesParaGerar,
  NOME_DA_FORMA_CONTA,
  nomeDaContaDaCompra,
  vencimentoNoMes,
  type FormaPagamentoConta
} from '../../dominio/contas'
import { centavos } from '../../dominio/dinheiro'
import { formatarData, partes } from '../../dominio/datas'
import { formatarReais } from '../../dominio/formatar'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { obterItem } from './estoque'

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
const nomeCurto = z.string().trim().min(1, 'Digite o nome.').max(60)
const diaMes = (d: string) => formatarData(d).slice(0, 5)
/** Tipo das contas que nascem de uma compra (D-092); é criado de novo se foi removido. */
const NOME_TIPO_FORNECEDOR = 'Fornecedor'

// ---------- Tipos de conta ----------

export function listarTipos(db: Banco): TipoConta[] {
  return (
    db
      .prepare(
        `SELECT t.id, t.nome, t.especial,
           (SELECT count(*) FROM conta_pagar c WHERE c.tipo_id = t.id AND c.excluido_em IS NULL) AS em_uso
         FROM tipo_conta t WHERE t.excluido_em IS NULL ORDER BY t.especial IS NOT NULL, t.id`
      )
      .all() as { id: number; nome: string; especial: string | null; em_uso: number }[]
  ).map((t) => ({ id: t.id, nome: t.nome, fatura: t.especial !== null, emUso: t.em_uso }))
}

export function criarTipo(db: Banco, relogio: Relogio, nomeBruto: unknown): TipoConta {
  const nome = nomeCurto.parse(nomeBruto)
  return emTransacao(db, () => {
    if (listarTipos(db).some((t) => normalizar(t.nome) === normalizar(nome))) {
      throw new Error('Já existe um tipo de conta com esse nome.')
    }
    const r = db
      .prepare('INSERT INTO tipo_conta (nome, criado_em) VALUES (?, ?)')
      .run(nome, relogio.agora())
    const id = Number(r.lastInsertRowid)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'criar',
      entidade: 'tipo_conta',
      entidadeId: id,
      descricao: `Criou o tipo de conta ${nome}`
    })
    return listarTipos(db).find((t) => t.id === id)!
  })
}

export function removerTipo(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const t = listarTipos(db).find((x) => x.id === id)
    if (!t) throw new Error('Tipo de conta não encontrado.')
    if (t.fatura) throw new Error('Este tipo vem com o sistema e não pode ser removido.')
    if (t.emUso > 0) throw new Error('Só dá para remover um tipo que nenhuma conta usa.')
    db.prepare('UPDATE tipo_conta SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'excluir',
      entidade: 'tipo_conta',
      entidadeId: id,
      descricao: `Removeu o tipo de conta ${t.nome}`
    })
  })
}

// ---------- Cartões ----------

export function listarCartoes(db: Banco): CartaoPagamento[] {
  return (
    db
      .prepare(
        `SELECT k.id, k.nome, k.socio_id, s.nome AS dono,
           (SELECT count(*) FROM conta_pagar c WHERE c.cartao_id = k.id AND c.excluido_em IS NULL) AS em_uso
         FROM cartao k LEFT JOIN socio s ON s.id = k.socio_id
         WHERE k.excluido_em IS NULL ORDER BY k.socio_id IS NOT NULL, s.ordem, k.nome`
      )
      .all() as {
      id: number
      nome: string
      socio_id: number | null
      dono: string | null
      em_uso: number
    }[]
  ).map((k) => ({
    id: k.id,
    nome: k.nome,
    socioId: k.socio_id,
    donoNome: k.dono,
    emUso: k.em_uso
  }))
}

export function criarCartao(
  db: Banco,
  relogio: Relogio,
  nomeBruto: unknown,
  socioBruto: unknown
): CartaoPagamento {
  const nome = nomeCurto.parse(nomeBruto)
  const socioId = z.number().int().positive().nullable().parse(socioBruto)
  return emTransacao(db, () => {
    const dono =
      socioId === null
        ? null
        : (db.prepare('SELECT nome FROM socio WHERE id = ?').get(socioId) as
            { nome: string } | undefined)
    if (socioId !== null && !dono) throw new Error('Escolha de quem é o cartão.')
    if (listarCartoes(db).some((k) => normalizar(k.nome) === normalizar(nome))) {
      throw new Error('Já existe um cartão com esse nome.')
    }
    const r = db
      .prepare('INSERT INTO cartao (nome, socio_id, criado_em) VALUES (?, ?, ?)')
      .run(nome, socioId, relogio.agora())
    const id = Number(r.lastInsertRowid)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'criar',
      entidade: 'cartao',
      entidadeId: id,
      descricao: `Criou o cartão ${nome} (${dono ? `pessoal do ${dono.nome}` : 'da empresa'})`
    })
    return listarCartoes(db).find((k) => k.id === id)!
  })
}

export function removerCartao(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const k = listarCartoes(db).find((x) => x.id === id)
    if (!k) throw new Error('Cartão não encontrado.')
    if (k.emUso > 0) throw new Error('Só dá para remover um cartão que nenhuma conta usa.')
    db.prepare('UPDATE cartao SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'excluir',
      entidade: 'cartao',
      entidadeId: id,
      descricao: `Removeu o cartão ${k.nome}`
    })
  })
}

// ---------- Contas ----------

interface LinhaConta {
  id: number
  nome: string
  valor_centavos: number
  vencimento: string
  tipo_id: number
  tipo_nome: string
  especial: string | null
  repete: number
  dia_vencimento: number
  avisar_dias: number
  pago_em: string | null
  forma_pagamento: FormaPagamentoConta | null
  cartao_id: number | null
  cartao_nome: string | null
  dono_nome: string | null
  manutencao_id: number | null
}

const SELECT_CONTA = `SELECT c.id, c.nome, c.valor_centavos, c.vencimento, c.tipo_id, t.nome AS tipo_nome,
  t.especial, c.repete, c.dia_vencimento, c.avisar_dias, c.pago_em, c.forma_pagamento, c.cartao_id,
  k.nome AS cartao_nome, s.nome AS dono_nome,
  (SELECT m.id FROM manutencao m WHERE m.conta_id = c.id) AS manutencao_id
  FROM conta_pagar c
  JOIN tipo_conta t ON t.id = c.tipo_id
  LEFT JOIN cartao k ON k.id = c.cartao_id
  LEFT JOIN socio s ON s.id = k.socio_id`

function deLinha(l: LinhaConta): Conta {
  return {
    id: l.id,
    nome: l.nome,
    valor: centavos(l.valor_centavos),
    vencimento: l.vencimento,
    tipoId: l.tipo_id,
    tipoNome: l.tipo_nome,
    fatura: l.especial !== null,
    manutencaoId: l.manutencao_id,
    repete: l.repete === 1,
    avisarDias: l.avisar_dias,
    pagamento:
      l.pago_em && l.forma_pagamento
        ? {
            forma: l.forma_pagamento,
            cartaoId: l.cartao_id,
            pagoEm: l.pago_em,
            cartaoNome: l.cartao_nome,
            donoNome: l.dono_nome
          }
        : null
  }
}

export function listarContas(db: Banco): Conta[] {
  return (
    db
      .prepare(`${SELECT_CONTA} WHERE c.excluido_em IS NULL ORDER BY c.vencimento, c.id`)
      .all() as unknown as LinhaConta[]
  ).map(deLinha)
}

export function obterConta(db: Banco, id: number): Conta | null {
  const l = db.prepare(`${SELECT_CONTA} WHERE c.id = ?`).get(id) as LinhaConta | undefined
  return l ? deLinha(l) : null
}

/** Quantas contas estão no aviso agora (bolinha vermelha do menu). */
export function quantasNoAviso(db: Banco, hoje: string): number {
  return listarContas(db).filter((c) =>
    deveAvisar({ ...c, pagoEm: c.pagamento?.pagoEm ?? null }, hoje)
  ).length
}

/**
 * Cria a conta do mês das contas que repetem (D-032 p.18: no dia 1º).
 * Segue a última conta de cada sequência; se ela foi excluída, a sequência para.
 */
export function gerarContasQueRepetem(db: Banco, relogio: Relogio): number {
  const hoje = relogio.hoje()
  return emTransacao(db, () => {
    const ultimas = db
      .prepare(
        `SELECT id, nome, valor_centavos, vencimento, tipo_id, dia_vencimento, avisar_dias
         FROM conta_pagar c
         WHERE c.repete = 1 AND c.excluido_em IS NULL
           AND NOT EXISTS (SELECT 1 FROM conta_pagar f WHERE f.anterior_id = c.id)`
      )
      .all() as {
      id: number
      nome: string
      valor_centavos: number
      vencimento: string
      tipo_id: number
      dia_vencimento: number
      avisar_dias: number
    }[]
    let criadas = 0
    for (const u of ultimas) {
      let anterior = u.id
      for (const mes of mesesParaGerar(u.vencimento, hoje)) {
        const vencimento = vencimentoNoMes(u.dia_vencimento, mes)
        const agora = relogio.agora()
        const r = db
          .prepare(
            `INSERT INTO conta_pagar (nome, valor_centavos, vencimento, tipo_id, repete, dia_vencimento,
               avisar_dias, anterior_id, criado_em, alterado_em)
             VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
          )
          .run(
            u.nome,
            u.valor_centavos,
            vencimento,
            u.tipo_id,
            u.dia_vencimento,
            u.avisar_dias,
            anterior,
            agora,
            agora
          )
        anterior = Number(r.lastInsertRowid)
        criadas++
        auditar(db, relogio, {
          modulo: 'contas',
          acao: 'criar',
          entidade: 'conta_pagar',
          entidadeId: anterior,
          descricao: `Criou sozinho a conta do mês: ${u.nome}, ${formatarReais(centavos(u.valor_centavos))}, vence ${formatarData(vencimento)}`
        })
      }
    }
    return criadas
  })
}

const esquemaConta = z.object({
  nome: z.string().trim().min(1, 'Digite o que é a conta.').max(120),
  valor: z.number().int().positive({ message: 'Digite o valor.' }).max(100_000_000_00),
  vencimento: data,
  tipoId: z.number().int().positive({ message: 'Escolha o tipo de conta.' }),
  repete: z.boolean(),
  avisarDias: z
    .number()
    .int()
    .refine((n) => (DIAS_DE_AVISO as readonly number[]).includes(n), 'Escolha quando avisar.')
})

const esquemaPagamento = z.object({
  forma: z.enum(FORMAS_DE_PAGAR_CONTA as [FormaPagamentoConta, ...FormaPagamentoConta[]], {
    message: 'Escolha como a conta foi paga.'
  }),
  cartaoId: z.number().int().positive().nullable(),
  pagoEm: data
})

function validarPagamento(db: Banco, hoje: string, bruto: unknown): DadosPagamento {
  const p = esquemaPagamento.parse(bruto)
  if (p.pagoEm > hoje) throw new Error('A data do pagamento ainda não chegou.')
  if (!formaUsaCartao(p.forma)) return { ...p, cartaoId: null }
  if (p.cartaoId === null) throw new Error('Escolha qual cartão.')
  if (!listarCartoes(db).some((k) => k.id === p.cartaoId)) throw new Error('Escolha qual cartão.')
  return p
}

function tipoValido(db: Banco, tipoId: number): string {
  const t = db
    .prepare('SELECT nome FROM tipo_conta WHERE id = ? AND excluido_em IS NULL')
    .get(tipoId) as { nome: string } | undefined
  if (!t) throw new Error('Escolha o tipo de conta.')
  return t.nome
}

/** "com Pix em 16/10" · "com cartão de crédito Final 4421 em 16/10, reembolso para o Carlos" */
function comoFoiPago(db: Banco, p: DadosPagamento): string {
  const forma = p.forma === 'pix' ? 'Pix' : NOME_DA_FORMA_CONTA[p.forma].toLowerCase()
  const k = p.cartaoId === null ? null : listarCartoes(db).find((x) => x.id === p.cartaoId)
  const reembolso = k?.donoNome ? `, reembolso para o ${k.donoNome}` : ''
  return `com ${forma}${k ? ` ${k.nome}` : ''} em ${diaMes(p.pagoEm)}${reembolso}`
}

/** Opções só do processo principal: a manutenção mexe na própria conta (D-066, D-070). */
export interface OpcoesConta {
  daManutencao?: boolean
}

const DA_MANUTENCAO = 'Esta conta vem de uma manutenção. Corrija em Patrimônio.'

function travarSeDaManutencao(c: Conta, opcoes: OpcoesConta): void {
  if (c.manutencaoId !== null && !opcoes.daManutencao) throw new Error(DA_MANUTENCAO)
}

function gravarPagamento(db: Banco, relogio: Relogio, id: number, p: DadosPagamento | null): void {
  db.prepare(
    'UPDATE conta_pagar SET pago_em = ?, forma_pagamento = ?, cartao_id = ?, alterado_em = ? WHERE id = ?'
  ).run(p?.pagoEm ?? null, p?.forma ?? null, p?.cartaoId ?? null, relogio.agora(), id)
}

/** Lança (id null) ou corrige uma conta. Com `pagamentoBruto`, a conta nova já nasce paga. */
export function salvarConta(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosConta,
  pagamentoBruto: unknown,
  opcoes: OpcoesConta = {}
): number {
  const d = esquemaConta.parse(entrada)
  const pagamento =
    id === null && pagamentoBruto != null
      ? validarPagamento(db, relogio.hoje(), pagamentoBruto)
      : null
  const dia = partes(d.vencimento).dia
  return emTransacao(db, () => {
    const tipoNome = tipoValido(db, d.tipoId)
    const agora = relogio.agora()
    if (id === null) {
      const r = db
        .prepare(
          `INSERT INTO conta_pagar (nome, valor_centavos, vencimento, tipo_id, repete, dia_vencimento,
             avisar_dias, criado_em, alterado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          d.nome,
          d.valor,
          d.vencimento,
          d.tipoId,
          d.repete ? 1 : 0,
          dia,
          d.avisarDias,
          agora,
          agora
        )
      const novo = Number(r.lastInsertRowid)
      if (pagamento) gravarPagamento(db, relogio, novo, pagamento)
      auditar(db, relogio, {
        modulo: 'contas',
        acao: 'criar',
        entidade: 'conta_pagar',
        entidadeId: novo,
        descricao:
          `Lançou a conta ${d.nome} (${tipoNome}): ${formatarReais(centavos(d.valor))}, ` +
          `vence ${formatarData(d.vencimento)}${d.repete ? ', todo mês' : ''}` +
          (pagamento ? `; já paga ${comoFoiPago(db, pagamento)}` : ''),
        depois: { ...d, pagamento }
      })
      return novo
    }

    const antes = obterConta(db, id)
    if (!antes) throw new Error('Conta não encontrada.')
    travarSeDaManutencao(antes, opcoes)
    const m: string[] = []
    if (antes.nome !== d.nome) m.push(`nome ${antes.nome} → ${d.nome}`)
    if (antes.valor !== d.valor) {
      m.push(`valor ${formatarReais(antes.valor)} → ${formatarReais(centavos(d.valor))}`)
    }
    if (antes.vencimento !== d.vencimento) {
      m.push(`vencimento ${formatarData(antes.vencimento)} → ${formatarData(d.vencimento)}`)
    }
    if (antes.tipoId !== d.tipoId) m.push(`tipo ${antes.tipoNome} → ${tipoNome}`)
    if (antes.repete !== d.repete)
      m.push(d.repete ? 'passou a repetir todo mês' : 'não repete mais')
    if (antes.avisarDias !== d.avisarDias) {
      m.push(
        `aviso ${antes.avisarDias} → ${d.avisarDias} ${d.avisarDias === 1 ? 'dia' : 'dias'} antes`
      )
    }
    if (m.length === 0) return id
    db.prepare(
      `UPDATE conta_pagar SET nome = ?, valor_centavos = ?, vencimento = ?, tipo_id = ?, repete = ?,
         dia_vencimento = ?, avisar_dias = ?, alterado_em = ? WHERE id = ?`
    ).run(d.nome, d.valor, d.vencimento, d.tipoId, d.repete ? 1 : 0, dia, d.avisarDias, agora, id)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'alterar',
      entidade: 'conta_pagar',
      entidadeId: id,
      descricao: `Corrigiu a conta ${antes.nome}: ${m.join('; ')}`,
      antes,
      depois: d
    })
    return id
  })
}

const esquemaContaDaCompra = z.object({ vencimento: data, pagamento: z.unknown().nullable() })

/**
 * A compra do "Chegou mercadoria" também vai para Contas a pagar (D-092), para entrar no
 * lucro. Conta comum (tipo Fornecedor), sem ligação com a entrada: corrige-se em Contas.
 * Roda dentro da transação da entrada (ipc.ts). Compra de R$ 0,00 não vira conta.
 */
export function lancarContaDaCompra(
  db: Banco,
  relogio: Relogio,
  itemId: number,
  compra: { quantidade: number; valorPago: number; fornecedorId: number | null },
  bruto: unknown
): number | null {
  const c = esquemaContaDaCompra.parse(bruto)
  if (compra.valorPago <= 0) return null
  return emTransacao(db, () => {
    const item = obterItem(db, itemId)
    if (!item) throw new Error('Item não encontrado.')
    const fornecedor =
      compra.fornecedorId === null
        ? null
        : ((
            db.prepare('SELECT nome FROM fornecedor WHERE id = ?').get(compra.fornecedorId) as
              { nome: string } | undefined
          )?.nome ?? null)
    const tipo =
      listarTipos(db).find((t) => normalizar(t.nome) === normalizar(NOME_TIPO_FORNECEDOR)) ??
      criarTipo(db, relogio, NOME_TIPO_FORNECEDOR)
    return salvarConta(
      db,
      relogio,
      null,
      {
        nome: nomeDaContaDaCompra(item.nome, compra.quantidade, item.rotulo, fornecedor),
        valor: centavos(compra.valorPago),
        vencimento: c.vencimento,
        tipoId: tipo.id,
        repete: false,
        avisarDias: 3
      },
      c.pagamento
    )
  })
}

export function pagarConta(db: Banco, relogio: Relogio, id: number, bruto: unknown): void {
  const p = validarPagamento(db, relogio.hoje(), bruto)
  emTransacao(db, () => {
    const c = obterConta(db, id)
    if (!c) throw new Error('Conta não encontrada.')
    if (c.pagamento) throw new Error('Esta conta já está paga.')
    gravarPagamento(db, relogio, id, p)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'alterar',
      entidade: 'conta_pagar',
      entidadeId: id,
      descricao: `Pagou a conta ${c.nome} (${formatarReais(c.valor)}) ${comoFoiPago(db, p)}`,
      depois: p
    })
  })
}

/** "Desfazer" volta a conta para em aberto (e tira o reembolso, se houver). */
export function desfazerPagamento(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const c = obterConta(db, id)
    if (!c) throw new Error('Conta não encontrada.')
    if (!c.pagamento) return
    gravarPagamento(db, relogio, id, null)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'desfazer',
      entidade: 'conta_pagar',
      entidadeId: id,
      descricao: `Desfez o pagamento da conta ${c.nome} (${formatarReais(c.valor)}): voltou para em aberto`,
      antes: c.pagamento
    })
  })
}

export function excluirConta(
  db: Banco,
  relogio: Relogio,
  id: number,
  opcoes: OpcoesConta = {}
): void {
  emTransacao(db, () => {
    const c = obterConta(db, id)
    if (!c) throw new Error('Conta não encontrada.')
    travarSeDaManutencao(c, opcoes)
    db.prepare('UPDATE conta_pagar SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'excluir',
      entidade: 'conta_pagar',
      entidadeId: id,
      descricao: `Excluiu a conta ${c.nome} (${formatarReais(c.valor)}, vence ${formatarData(c.vencimento)})`
    })
  })
}

export function desfazerExclusaoConta(
  db: Banco,
  relogio: Relogio,
  id: number,
  opcoes: OpcoesConta = {}
): void {
  emTransacao(db, () => {
    const c = obterConta(db, id)
    if (!c) throw new Error('Conta não encontrada.')
    travarSeDaManutencao(c, opcoes)
    db.prepare('UPDATE conta_pagar SET excluido_em = NULL WHERE id = ?').run(id)
    // o tipo e o cartão podem ter sido removidos enquanto a conta estava excluída
    db.prepare('UPDATE tipo_conta SET excluido_em = NULL WHERE id = ?').run(c.tipoId)
    if (c.pagamento?.cartaoId) {
      db.prepare('UPDATE cartao SET excluido_em = NULL WHERE id = ?').run(c.pagamento.cartaoId)
    }
    auditar(db, relogio, {
      modulo: 'contas',
      acao: 'desfazer',
      entidade: 'conta_pagar',
      entidadeId: id,
      descricao: `Desfez a exclusão da conta ${c.nome}`
    })
  })
}
