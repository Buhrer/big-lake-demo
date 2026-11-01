// Perdas: produtos prontos, matéria-prima e trocas em clientes (docs/03 R10; D-032 p.6 e p.25; D-069).
// Matéria-prima baixa do estoque pelo mesmo caminho da produção (D-068 item 5).
// Produto pronto não tem estoque (D-032 p.6). Perda não é despesa (D-032 p.25).
import { z } from 'zod'
import type { DadosPerda, ItemPerda, Perda } from '../../compartilhado/contrato'
import { centavos } from '../../dominio/dinheiro'
import { formatarData } from '../../dominio/datas'
import { formatarReais } from '../../dominio/formatar'
import {
  NOME_TIPO_PERDA,
  rotuloDoProduto,
  textoDosItens,
  valorDaPerda,
  valorDoItem,
  type TipoPerda
} from '../../dominio/perdas'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { baixarDoEstoque, devolverAoEstoque, listarItens } from './estoque'
import { listarReceitas } from './receitas'

const esquema = z.object({
  tipo: z.enum(['produto', 'materia_prima', 'troca'], { message: 'Escolha o que se perdeu.' }),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Digite a data.'),
  clienteId: z.number().int().positive().nullable(),
  itens: z
    .array(
      z.object({
        id: z.number().int().positive(),
        quantidade: z
          .number()
          .int()
          .positive({ message: 'Digite a quantidade de cada item.' })
          .max(100_000_000, 'Confira a quantidade.')
      })
    )
    .min(1, 'Toque nos itens que se perderam.')
    .max(200),
  motivo: z.string().trim().min(1, 'Escolha o motivo.').max(60),
  observacao: z.string().trim().max(300)
})

const usaReceita = (t: TipoPerda) => t !== 'materia_prima'

interface LinhaPerda {
  id: number
  data: string
  tipo: TipoPerda
  cliente_id: number | null
  nome_cliente: string | null
  motivo: string
  observacao: string
  valor_centavos: number
}

interface LinhaItem {
  perda_id: number
  receita_id: number | null
  item_id: number | null
  nome: string
  rotulo: string
  quantidade_x1000: number
  custo_x10000: number
  valor_centavos: number
}

const deItem = (l: LinhaItem): ItemPerda => ({
  id: (l.receita_id ?? l.item_id)!,
  nome: l.nome,
  rotulo: l.rotulo,
  quantidade: l.quantidade_x1000,
  custo: l.custo_x10000,
  valor: centavos(l.valor_centavos)
})

function montar(db: Banco, linhas: LinhaPerda[]): Perda[] {
  if (linhas.length === 0) return []
  const itens = db
    .prepare(
      `SELECT perda_id, receita_id, item_id, nome, rotulo, quantidade_x1000, custo_x10000, valor_centavos
       FROM perda_item WHERE perda_id IN (${linhas.map(() => '?').join(', ')}) ORDER BY id`
    )
    .all(...linhas.map((l) => l.id)) as unknown as LinhaItem[]
  return linhas.map((l) => ({
    id: l.id,
    data: l.data,
    tipo: l.tipo,
    clienteId: l.cliente_id,
    clienteNome: l.nome_cliente,
    motivo: l.motivo,
    observacao: l.observacao,
    valor: centavos(l.valor_centavos),
    itens: itens.filter((i) => i.perda_id === l.id).map(deItem)
  }))
}

const SELECT = `SELECT id, data, tipo, cliente_id, nome_cliente, motivo, observacao, valor_centavos
  FROM perda`

export function listarPerdas(db: Banco, anoMes: string): Perda[] {
  return montar(
    db,
    db
      .prepare(
        `${SELECT} WHERE excluido_em IS NULL AND substr(data, 1, 7) = ? ORDER BY data DESC, id DESC`
      )
      .all(anoMes) as unknown as LinhaPerda[]
  )
}

function obterPerda(db: Banco, id: number): Perda | null {
  const l = db.prepare(`${SELECT} WHERE id = ? AND excluido_em IS NULL`).get(id) as
    LinhaPerda | undefined
  return l ? montar(db, [l])[0]! : null
}

/** "16/10, Matéria-prima, Venceu: 4 kg Morango · 2 kg Manga, R$ 87,00" */
function descrever(p: Omit<Perda, 'id'>): string {
  const quem = p.tipo === 'troca' ? `Troca em ${p.clienteNome}` : NOME_TIPO_PERDA[p.tipo]
  const obs = p.observacao ? ` (${p.observacao})` : ''
  return (
    `${formatarData(p.data).slice(0, 5)}, ${quem}, ${p.motivo}: ` +
    `${textoDosItens(p.itens)}, ${formatarReais(p.valor)}${obs}`
  )
}

/** Os itens com nome, rótulo e custo; quem já estava no registro guarda o custo do dia (D-069). */
function montarItens(
  db: Banco,
  tipo: TipoPerda,
  pedidos: readonly { id: number; quantidade: number }[],
  anteriores: readonly ItemPerda[]
): ItemPerda[] {
  const somados = new Map<number, number>()
  for (const p of pedidos) somados.set(p.id, (somados.get(p.id) ?? 0) + p.quantidade)
  const receitas = usaReceita(tipo) ? new Map(listarReceitas(db).map((r) => [r.id, r])) : null
  const estoque = usaReceita(tipo) ? null : new Map(listarItens(db).map((i) => [i.id, i]))
  return [...somados.entries()].map(([id, quantidade]) => {
    const antes = anteriores.find((a) => a.id === id)
    let nome: string
    let rotulo: string
    let custo: number
    if (receitas) {
      if (quantidade % 1000 !== 0) throw new Error('Produto pronto vai em unidades inteiras.')
      const r = receitas.get(id)
      if (!r && !antes) throw new Error('Receita não encontrada.')
      nome = antes?.nome ?? r!.nome
      custo = antes?.custo ?? r!.custoDeCada
      rotulo = r ? rotuloDoProduto(r.nome, r.nomeUnidade, quantidade / 1000) : antes!.rotulo
    } else {
      const i = estoque!.get(id)
      if (!i && !antes) throw new Error('Item do estoque não encontrado.')
      nome = antes?.nome ?? i!.nome
      custo = antes?.custo ?? i!.custo
      rotulo = antes?.rotulo ?? i!.rotulo
    }
    return { id, nome, rotulo, quantidade, custo, valor: valorDoItem(quantidade, custo) }
  })
}

function gravarItens(db: Banco, perdaId: number, tipo: TipoPerda, itens: readonly ItemPerda[]) {
  db.prepare('DELETE FROM perda_item WHERE perda_id = ?').run(perdaId)
  for (const i of itens) {
    db.prepare(
      `INSERT INTO perda_item (perda_id, receita_id, item_id, nome, rotulo, quantidade_x1000,
         custo_x10000, valor_centavos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      perdaId,
      usaReceita(tipo) ? i.id : null,
      usaReceita(tipo) ? null : i.id,
      i.nome,
      i.rotulo,
      i.quantidade,
      i.custo,
      i.valor
    )
  }
}

/** Matéria-prima sai do estoque (pode ficar negativo, D-069); produto pronto não tem estoque. */
function baixarItensDa(db: Banco, agora: string, perdaId: number): void {
  const itens = db
    .prepare(
      'SELECT item_id, quantidade_x1000 FROM perda_item WHERE perda_id = ? AND item_id IS NOT NULL'
    )
    .all(perdaId) as { item_id: number; quantidade_x1000: number }[]
  for (const i of itens) {
    baixarDoEstoque(db, agora, i.item_id, i.quantidade_x1000, 'perda', perdaId)
  }
}

/** Registra (id null) ou corrige uma perda. Devolve o id. */
export function salvarPerda(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosPerda
): number {
  const d = esquema.parse(entrada)
  if (d.data > relogio.hoje()) throw new Error('Essa data ainda não chegou.')
  return emTransacao(db, () => {
    let clienteNome: string | null = null
    if (d.tipo === 'troca') {
      if (!d.clienteId) throw new Error('Escolha o cliente.')
      const c = db
        .prepare('SELECT nome FROM cliente WHERE id = ? AND excluido_em IS NULL')
        .get(d.clienteId) as { nome: string } | undefined
      if (!c) throw new Error('Escolha o cliente.')
      clienteNome = c.nome
    }
    const antes = id === null ? null : obterPerda(db, id)
    if (id !== null && !antes) throw new Error('Perda não encontrada.')
    const mesmoTipoDeItem = antes && usaReceita(antes.tipo) === usaReceita(d.tipo)
    const itens = montarItens(db, d.tipo, d.itens, mesmoTipoDeItem ? antes.itens : [])
    const nova: Omit<Perda, 'id'> = {
      data: d.data,
      tipo: d.tipo,
      clienteId: d.tipo === 'troca' ? d.clienteId : null,
      clienteNome,
      motivo: d.motivo,
      observacao: d.observacao,
      valor: valorDaPerda(itens),
      itens
    }
    const agora = relogio.agora()
    const baixa = d.tipo === 'materia_prima' ? '. Baixou do estoque' : ''

    if (antes === null) {
      const r = db
        .prepare(
          `INSERT INTO perda (data, tipo, cliente_id, nome_cliente, motivo, observacao, valor_centavos,
             criado_em, alterado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          nova.data,
          nova.tipo,
          nova.clienteId,
          nova.clienteNome,
          nova.motivo,
          nova.observacao,
          nova.valor,
          agora,
          agora
        )
      const novo = Number(r.lastInsertRowid)
      gravarItens(db, novo, d.tipo, itens)
      baixarItensDa(db, agora, novo)
      auditar(db, relogio, {
        modulo: 'perdas',
        acao: 'criar',
        entidade: 'perda',
        entidadeId: novo,
        descricao: `Registrou a perda: ${descrever(nova)}${baixa}`,
        depois: d
      })
      return novo
    }

    const textoAntes = descrever(antes)
    const textoDepois = descrever(nova)
    if (textoAntes === textoDepois) return antes.id
    db.prepare(
      `UPDATE perda SET data = ?, tipo = ?, cliente_id = ?, nome_cliente = ?, motivo = ?, observacao = ?,
         valor_centavos = ?, alterado_em = ? WHERE id = ?`
    ).run(
      nova.data,
      nova.tipo,
      nova.clienteId,
      nova.clienteNome,
      nova.motivo,
      nova.observacao,
      nova.valor,
      agora,
      antes.id
    )
    devolverAoEstoque(db, agora, 'perda', antes.id)
    gravarItens(db, antes.id, d.tipo, itens)
    baixarItensDa(db, agora, antes.id)
    const estoque =
      antes.tipo === 'materia_prima' || d.tipo === 'materia_prima' ? '. Estoque acertado' : ''
    auditar(db, relogio, {
      modulo: 'perdas',
      acao: 'alterar',
      entidade: 'perda',
      entidadeId: antes.id,
      descricao: `Corrigiu a perda: ${textoAntes} → ${textoDepois}${estoque}`,
      antes,
      depois: d
    })
    return antes.id
  })
}

export function excluirPerda(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const p = obterPerda(db, id)
    if (!p) throw new Error('Perda não encontrada.')
    const agora = relogio.agora()
    db.prepare('UPDATE perda SET excluido_em = ? WHERE id = ?').run(agora, id)
    devolverAoEstoque(db, agora, 'perda', id)
    auditar(db, relogio, {
      modulo: 'perdas',
      acao: 'excluir',
      entidade: 'perda',
      entidadeId: id,
      descricao:
        `Excluiu a perda: ${descrever(p)}` +
        (p.tipo === 'materia_prima' ? '. Voltou para o estoque' : '')
    })
  })
}

export function desfazerExclusaoPerda(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const l = db.prepare('SELECT excluido_em FROM perda WHERE id = ?').get(id) as
      { excluido_em: string | null } | undefined
    if (!l?.excluido_em) throw new Error('Não há exclusão para desfazer.')
    const agora = relogio.agora()
    db.prepare('UPDATE perda SET excluido_em = NULL WHERE id = ?').run(id)
    baixarItensDa(db, agora, id)
    const p = obterPerda(db, id)!
    auditar(db, relogio, {
      modulo: 'perdas',
      acao: 'desfazer',
      entidade: 'perda',
      entidadeId: id,
      descricao:
        `Desfez a exclusão da perda: ${descrever(p)}` +
        (p.tipo === 'materia_prima' ? '. Baixou de novo do estoque' : '')
    })
  })
}
