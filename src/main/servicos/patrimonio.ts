// Patrimônio: bens da empresa, tipos de bem e manutenções (docs/02 §9; D-032 p.19; D-066, D-067, D-070).
// A manutenção com valor cria a conta "Manutenção" em Contas a pagar e mexe nela junto.
import { z } from 'zod'
import type {
  Bem,
  DadosBem,
  DadosManutencao,
  Manutencao,
  TipoBem
} from '../../compartilhado/contrato'
import { normalizar } from '../../dominio/cadastros'
import { centavos } from '../../dominio/dinheiro'
import { formatarData } from '../../dominio/datas'
import { formatarReais } from '../../dominio/formatar'
import {
  formatarMesAno,
  garantiaAte,
  NOME_TIPO_MANUTENCAO,
  nomeDaConta,
  type TipoManutencao
} from '../../dominio/patrimonio'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import {
  criarTipo as criarTipoConta,
  desfazerExclusaoConta,
  excluirConta,
  obterConta,
  salvarConta
} from './contas'

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Digite a data.')
const DA_MANUTENCAO = { daManutencao: true }

// ---------- Tipos de bem ----------

export function listarTiposBem(db: Banco): TipoBem[] {
  return (
    db
      .prepare(
        `SELECT t.id, t.nome,
           (SELECT count(*) FROM bem b WHERE b.tipo_id = t.id AND b.excluido_em IS NULL) AS em_uso
         FROM tipo_bem t WHERE t.excluido_em IS NULL ORDER BY t.id`
      )
      .all() as { id: number; nome: string; em_uso: number }[]
  ).map((t) => ({ id: t.id, nome: t.nome, emUso: t.em_uso }))
}

export function criarTipoBem(db: Banco, relogio: Relogio, nomeBruto: unknown): TipoBem {
  const nome = z.string().trim().min(1, 'Digite o nome.').max(40).parse(nomeBruto)
  return emTransacao(db, () => {
    if (listarTiposBem(db).some((t) => normalizar(t.nome) === normalizar(nome))) {
      throw new Error('Já existe um tipo com esse nome.')
    }
    const r = db
      .prepare('INSERT INTO tipo_bem (nome, criado_em) VALUES (?, ?)')
      .run(nome, relogio.agora())
    const id = Number(r.lastInsertRowid)
    auditar(db, relogio, {
      modulo: 'patrimonio',
      acao: 'criar',
      entidade: 'tipo_bem',
      entidadeId: id,
      descricao: `Criou o tipo de bem ${nome}`
    })
    return listarTiposBem(db).find((t) => t.id === id)!
  })
}

export function removerTipoBem(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const t = listarTiposBem(db).find((x) => x.id === id)
    if (!t) throw new Error('Tipo de bem não encontrado.')
    if (t.emUso > 0) throw new Error('Só dá para remover um tipo que nenhum bem usa.')
    db.prepare('UPDATE tipo_bem SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'patrimonio',
      acao: 'excluir',
      entidade: 'tipo_bem',
      entidadeId: id,
      descricao: `Removeu o tipo de bem ${t.nome}`
    })
  })
}

// ---------- Bens ----------

const esquemaBem = z.object({
  nome: z.string().trim().min(1, 'Digite o que é.').max(120),
  tipoId: z.number().int().positive({ message: 'Escolha o tipo.' }),
  dataCompra: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Digite a data da compra como mês/ano, ex.: 03/2022.')
    .nullable(),
  valor: z.number().int().min(0, 'Digite o valor pago.').max(100_000_000_00),
  identificacao: z.string().trim().max(60)
})

interface LinhaBem {
  id: number
  nome: string
  tipo_id: number
  tipo_nome: string
  data_compra: string | null
  valor_centavos: number
  identificacao: string
  manutencoes: number
}

const SELECT_BEM = `SELECT b.id, b.nome, b.tipo_id, t.nome AS tipo_nome, b.data_compra, b.valor_centavos,
  b.identificacao,
  (SELECT count(*) FROM manutencao m WHERE m.bem_id = b.id AND m.excluido_em IS NULL) AS manutencoes
  FROM bem b JOIN tipo_bem t ON t.id = b.tipo_id`

const deBem = (l: LinhaBem): Bem => ({
  id: l.id,
  nome: l.nome,
  tipoId: l.tipo_id,
  tipoNome: l.tipo_nome,
  dataCompra: l.data_compra,
  valor: centavos(l.valor_centavos),
  identificacao: l.identificacao,
  manutencoes: l.manutencoes
})

export function listarBens(db: Banco): Bem[] {
  return (
    db
      .prepare(
        `${SELECT_BEM} WHERE b.excluido_em IS NULL ORDER BY b.tipo_id, b.nome COLLATE NOCASE`
      )
      .all() as unknown as LinhaBem[]
  ).map(deBem)
}

function obterBem(db: Banco, id: number): Bem | null {
  const l = db.prepare(`${SELECT_BEM} WHERE b.id = ? AND b.excluido_em IS NULL`).get(id) as
    LinhaBem | undefined
  return l ? deBem(l) : null
}

function descreverBem(b: Omit<Bem, 'id' | 'manutencoes'>): string {
  const compra = b.dataCompra ? `, comprado em ${formatarMesAno(b.dataCompra)}` : ''
  const ident = b.identificacao ? `, ${b.identificacao}` : ''
  return `${b.nome} (${b.tipoNome}${compra}, ${formatarReais(b.valor)}${ident})`
}

/** Cadastra (id null) ou corrige um bem. Devolve o id. */
export function salvarBem(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosBem
): number {
  const d = esquemaBem.parse(entrada)
  return emTransacao(db, () => {
    const tipo = listarTiposBem(db).find((t) => t.id === d.tipoId)
    if (!tipo) throw new Error('Escolha o tipo.')
    const novo = { ...d, valor: centavos(d.valor), tipoNome: tipo.nome }
    const agora = relogio.agora()
    if (id === null) {
      const r = db
        .prepare(
          `INSERT INTO bem (nome, tipo_id, data_compra, valor_centavos, identificacao, criado_em, alterado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(d.nome, d.tipoId, d.dataCompra, d.valor, d.identificacao, agora, agora)
      const criado = Number(r.lastInsertRowid)
      auditar(db, relogio, {
        modulo: 'patrimonio',
        acao: 'criar',
        entidade: 'bem',
        entidadeId: criado,
        descricao: `Cadastrou o bem ${descreverBem(novo)}`,
        depois: d
      })
      return criado
    }
    const antes = obterBem(db, id)
    if (!antes) throw new Error('Bem não encontrado.')
    const textoAntes = descreverBem(antes)
    const textoDepois = descreverBem(novo)
    if (textoAntes === textoDepois) return id
    db.prepare(
      `UPDATE bem SET nome = ?, tipo_id = ?, data_compra = ?, valor_centavos = ?, identificacao = ?,
         alterado_em = ? WHERE id = ?`
    ).run(d.nome, d.tipoId, d.dataCompra, d.valor, d.identificacao, agora, id)
    auditar(db, relogio, {
      modulo: 'patrimonio',
      acao: 'alterar',
      entidade: 'bem',
      entidadeId: id,
      descricao: `Corrigiu o bem: ${textoAntes} → ${textoDepois}`,
      antes,
      depois: d
    })
    return id
  })
}

/** Bem com manutenção não pode ser excluído (D-067). */
export function excluirBem(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const b = obterBem(db, id)
    if (!b) throw new Error('Bem não encontrado.')
    if (b.manutencoes > 0) {
      throw new Error(
        `Não dá para excluir: tem ${b.manutencoes === 1 ? '1 manutenção' : `${b.manutencoes} manutenções`}.`
      )
    }
    db.prepare('UPDATE bem SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'patrimonio',
      acao: 'excluir',
      entidade: 'bem',
      entidadeId: id,
      descricao: `Excluiu o bem ${b.nome}`
    })
  })
}

export function desfazerExclusaoBem(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const l = db.prepare('SELECT nome, tipo_id, excluido_em FROM bem WHERE id = ?').get(id) as
      { nome: string; tipo_id: number; excluido_em: string | null } | undefined
    if (!l?.excluido_em) throw new Error('Não há exclusão para desfazer.')
    db.prepare('UPDATE bem SET excluido_em = NULL WHERE id = ?').run(id)
    // o tipo pode ter sido removido enquanto o bem estava excluído
    db.prepare('UPDATE tipo_bem SET excluido_em = NULL WHERE id = ?').run(l.tipo_id)
    auditar(db, relogio, {
      modulo: 'patrimonio',
      acao: 'desfazer',
      entidade: 'bem',
      entidadeId: id,
      descricao: `Desfez a exclusão do bem ${l.nome}`
    })
  })
}

// ---------- Manutenções ----------

const esquemaManutencao = z.object({
  bemId: z.number().int().positive({ message: 'Escolha o patrimônio.' }),
  data,
  oQueFoiFeito: z.string().trim().min(1, 'Digite o que foi feito.').max(120),
  quemFez: z.string().trim().max(80),
  valor: z.number().int().min(0, 'Digite o valor.').max(100_000_000_00),
  garantiaDias: z
    .number()
    .int()
    .min(0, 'Confira a garantia.')
    .max(3650, 'Confira a garantia (até 10 anos).'),
  tipo: z.enum(['revisao', 'conserto'], { message: 'Escolha o tipo.' }),
  vencimento: data.nullable()
})

interface LinhaManutencao {
  id: number
  bem_id: number
  bem_nome: string
  data: string
  o_que_foi_feito: string
  quem_fez: string
  valor_centavos: number
  garantia_dias: number
  tipo: TipoManutencao
  conta_id: number | null
}

const SELECT_MANUTENCAO = `SELECT m.id, m.bem_id, b.nome AS bem_nome, m.data, m.o_que_foi_feito, m.quem_fez,
  m.valor_centavos, m.garantia_dias, m.tipo, m.conta_id
  FROM manutencao m JOIN bem b ON b.id = m.bem_id`

function deManutencao(db: Banco, l: LinhaManutencao): Manutencao {
  const c = l.conta_id === null ? null : obterConta(db, l.conta_id)
  return {
    id: l.id,
    bemId: l.bem_id,
    bemNome: l.bem_nome,
    data: l.data,
    oQueFoiFeito: l.o_que_foi_feito,
    quemFez: l.quem_fez,
    valor: centavos(l.valor_centavos),
    garantiaDias: l.garantia_dias,
    tipo: l.tipo,
    vencimento: c && !c.pagamento ? c.vencimento : null,
    conta: c ? { id: c.id, vencimento: c.vencimento, pagamento: c.pagamento } : null
  }
}

export function listarManutencoes(db: Banco): Manutencao[] {
  return (
    db
      .prepare(`${SELECT_MANUTENCAO} WHERE m.excluido_em IS NULL ORDER BY m.data DESC, m.id DESC`)
      .all() as unknown as LinhaManutencao[]
  ).map((l) => deManutencao(db, l))
}

function obterManutencao(db: Banco, id: number): Manutencao | null {
  const l = db.prepare(`${SELECT_MANUTENCAO} WHERE m.id = ? AND m.excluido_em IS NULL`).get(id) as
    LinhaManutencao | undefined
  return l ? deManutencao(db, l) : null
}

/** "16/10, Furgão: Troca de óleo (Conserto, feito por Auto Center), R$ 450,00, garantia até 14/01/2027" */
function descreverManutencao(m: Omit<Manutencao, 'id' | 'conta'>): string {
  const quem = m.quemFez ? `, feito por ${m.quemFez}` : ''
  const ate = garantiaAte(m.data, m.garantiaDias)
  const garantia = ate ? `, garantia até ${formatarData(ate)}` : ''
  return (
    `${formatarData(m.data).slice(0, 5)}, ${m.bemNome}: ${m.oQueFoiFeito} ` +
    `(${NOME_TIPO_MANUTENCAO[m.tipo]}${quem}), ${formatarReais(m.valor)}${garantia}`
  )
}

/** O tipo de conta "Manutenção" (D-032 p.19); volta ou é criado se tiver sido removido. */
function tipoManutencao(db: Banco, relogio: Relogio): number {
  const t = db
    .prepare(
      `SELECT id, excluido_em FROM tipo_conta WHERE lower(trim(nome)) = 'manutenção'
       ORDER BY excluido_em IS NOT NULL, id LIMIT 1`
    )
    .get() as { id: number; excluido_em: string | null } | undefined
  if (!t) return criarTipoConta(db, relogio, 'Manutenção').id
  if (t.excluido_em) db.prepare('UPDATE tipo_conta SET excluido_em = NULL WHERE id = ?').run(t.id)
  return t.id
}

/** Cria a conta da manutenção: paga (vence no dia do serviço) ou em aberto (vence no dia digitado). */
function criarConta(
  db: Banco,
  relogio: Relogio,
  nome: string,
  d: z.infer<typeof esquemaManutencao>,
  pagamento: unknown
): number {
  if (pagamento == null && !d.vencimento) throw new Error('Digite quando a conta vence.')
  return salvarConta(
    db,
    relogio,
    null,
    {
      nome,
      valor: centavos(d.valor),
      vencimento: pagamento == null ? d.vencimento! : d.data,
      tipoId: tipoManutencao(db, relogio),
      repete: false,
      avisarDias: 3
    },
    pagamento,
    DA_MANUTENCAO
  )
}

/**
 * Registra (id null) ou corrige uma manutenção e mexe junto na conta ligada (D-066).
 * Ao corrigir, o pagamento não muda aqui: paga-se ou desfaz-se em Contas a pagar (D-070).
 */
export function salvarManutencao(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosManutencao,
  pagamento: unknown
): number {
  const d = esquemaManutencao.parse(entrada)
  if (d.data > relogio.hoje()) throw new Error('Essa data ainda não chegou.')
  return emTransacao(db, () => {
    const bem = obterBem(db, d.bemId)
    if (!bem) throw new Error('Escolha o patrimônio.')
    const nome = nomeDaConta(d.oQueFoiFeito, bem.nome)
    const agora = relogio.agora()
    const nova = { ...d, valor: centavos(d.valor), bemNome: bem.nome }

    if (id === null) {
      const contaId = d.valor > 0 ? criarConta(db, relogio, nome, d, pagamento) : null
      const r = db
        .prepare(
          `INSERT INTO manutencao (bem_id, data, o_que_foi_feito, quem_fez, valor_centavos, garantia_dias,
             tipo, conta_id, criado_em, alterado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          d.bemId,
          d.data,
          d.oQueFoiFeito,
          d.quemFez,
          d.valor,
          d.garantiaDias,
          d.tipo,
          contaId,
          agora,
          agora
        )
      const criada = Number(r.lastInsertRowid)
      const conta =
        contaId === null
          ? '. Sem conta (saiu de graça)'
          : pagamento == null
            ? `. Conta em aberto, vence ${formatarData(d.vencimento!)}`
            : '. Conta já paga'
      auditar(db, relogio, {
        modulo: 'patrimonio',
        acao: 'criar',
        entidade: 'manutencao',
        entidadeId: criada,
        descricao: `Registrou a manutenção: ${descreverManutencao(nova)}${conta}`,
        depois: { ...d, pagamento }
      })
      return criada
    }

    const antes = obterManutencao(db, id)
    if (!antes) throw new Error('Manutenção não encontrada.')
    let contaId = antes.conta?.id ?? null
    if (antes.conta && d.valor === 0) {
      // ficou de graça: a conta sai de Contas a pagar
      excluirConta(db, relogio, antes.conta.id, DA_MANUTENCAO)
      contaId = null
    } else if (antes.conta) {
      const c = obterConta(db, antes.conta.id)!
      const vencimento = !c.pagamento && d.vencimento ? d.vencimento : c.vencimento
      salvarConta(
        db,
        relogio,
        c.id,
        { ...c, nome, valor: centavos(d.valor), vencimento },
        null,
        DA_MANUTENCAO
      )
    } else if (d.valor > 0) {
      contaId = criarConta(db, relogio, nome, d, pagamento)
    }
    const textoAntes = descreverManutencao(antes)
    const textoDepois = descreverManutencao(nova)
    if (textoAntes === textoDepois && contaId === (antes.conta?.id ?? null)) return id
    db.prepare(
      `UPDATE manutencao SET bem_id = ?, data = ?, o_que_foi_feito = ?, quem_fez = ?, valor_centavos = ?,
         garantia_dias = ?, tipo = ?, conta_id = ?, alterado_em = ? WHERE id = ?`
    ).run(
      d.bemId,
      d.data,
      d.oQueFoiFeito,
      d.quemFez,
      d.valor,
      d.garantiaDias,
      d.tipo,
      contaId,
      agora,
      id
    )
    if (textoAntes !== textoDepois) {
      auditar(db, relogio, {
        modulo: 'patrimonio',
        acao: 'alterar',
        entidade: 'manutencao',
        entidadeId: id,
        descricao: `Corrigiu a manutenção: ${textoAntes} → ${textoDepois}`,
        antes,
        depois: d
      })
    }
    return id
  })
}

/** Excluir a manutenção exclui junto a conta ligada (D-066). */
export function excluirManutencao(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const m = obterManutencao(db, id)
    if (!m) throw new Error('Manutenção não encontrada.')
    db.prepare('UPDATE manutencao SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    if (m.conta) excluirConta(db, relogio, m.conta.id, DA_MANUTENCAO)
    auditar(db, relogio, {
      modulo: 'patrimonio',
      acao: 'excluir',
      entidade: 'manutencao',
      entidadeId: id,
      descricao:
        `Excluiu a manutenção: ${descreverManutencao(m)}` +
        (m.conta ? '. A conta saiu de Contas a pagar' : '')
    })
  })
}

export function desfazerExclusaoManutencao(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const l = db
      .prepare('SELECT bem_id, conta_id, excluido_em FROM manutencao WHERE id = ?')
      .get(id) as
      { bem_id: number; conta_id: number | null; excluido_em: string | null } | undefined
    if (!l?.excluido_em) throw new Error('Não há exclusão para desfazer.')
    db.prepare('UPDATE manutencao SET excluido_em = NULL WHERE id = ?').run(id)
    // o bem pode ter sido excluído enquanto a manutenção estava excluída
    db.prepare('UPDATE bem SET excluido_em = NULL WHERE id = ?').run(l.bem_id)
    if (l.conta_id !== null) desfazerExclusaoConta(db, relogio, l.conta_id, DA_MANUTENCAO)
    const m = obterManutencao(db, id)!
    auditar(db, relogio, {
      modulo: 'patrimonio',
      acao: 'desfazer',
      entidade: 'manutencao',
      entidadeId: id,
      descricao:
        `Desfez a exclusão da manutenção: ${descreverManutencao(m)}` +
        (m.conta ? '. A conta voltou para Contas a pagar' : '')
    })
  })
}
