// Estoque: cadastrar insumo, entrada de mercadoria, corrigir, excluir e desfazer.
import { z } from 'zod'
import type {
  DadosEdicaoItem,
  DadosEntrada,
  DadosItemNovo,
  ItemEstoque,
  ResultadoEntrada
} from '../../compartilhado/contrato'
import { normalizar } from '../../dominio/cadastros'
import { centavos, type CustoX10000 } from '../../dominio/dinheiro'
import { formatarData, lerData, type DataISO } from '../../dominio/datas'
import {
  ajustar,
  aumentoPercentual,
  baixarComDetalhe,
  custoPorUnidade,
  entrar,
  rotuloUnidade,
  textoEntrada,
  type EstadoEstoque
} from '../../dominio/estoque'
import { formatarCusto, formatarQuantidade, formatarReais } from '../../dominio/formatar'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { receitasQueUsam } from './receitas'

// ---------- Validação ----------

const quantidade = z.number().int().safe()
const positiva = quantidade.refine((q) => q > 0, 'Digite a quantidade.')
const naoNegativa = quantidade.refine((q) => q >= 0, 'O número não pode ser negativo.')
const data = z
  .string()
  .nullable()
  .refine((d) => d === null || lerData(formatarData(d)) === d, 'Data inválida.')
const idOpcional = z.number().int().positive().nullable()

const base = {
  tipo: z.enum(['materia_prima', 'insumo']),
  unidade: z.enum(['un', 'L', 'kg']),
  nomeUnidade: z.string().trim().max(20).nullable(),
  nome: z.string().trim().min(1, 'Digite o nome.').max(100),
  fornecedorId: idOpcional,
  minimo: naoNegativa
}

export const esquemaItemNovo = z.object({
  ...base,
  quantidade: positiva,
  valorPago: naoNegativa,
  validade: data
})

export const esquemaEntrada = z.object({
  itemId: z.number().int().positive(),
  quantidade: positiva,
  valorPago: naoNegativa,
  fornecedorId: idOpcional,
  validade: data
})

export const esquemaEdicao = z.object({
  ...base,
  quantidade,
  custo: naoNegativa,
  validades: z.array(z.object({ loteId: z.number().int().positive(), validade: data }))
})

// ---------- Leitura ----------

interface LinhaItem {
  id: number
  nome: string
  tipo: 'materia_prima' | 'insumo'
  unidade: 'un' | 'L' | 'kg'
  nome_unidade: string | null
  fornecedor_id: number | null
  fornecedor_nome: string | null
  quantidade_x1000: number
  estoque_minimo_x1000: number
  custo_unitario_x10000: number
}

const SELECT_ITEM = `
  SELECT i.id, i.nome, i.tipo, i.unidade, i.nome_unidade, i.fornecedor_id, f.nome AS fornecedor_nome,
         i.quantidade_x1000, i.estoque_minimo_x1000, i.custo_unitario_x10000
  FROM item_estoque i LEFT JOIN fornecedor f ON f.id = i.fornecedor_id AND f.excluido_em IS NULL`

function lotesDo(db: Banco, itemId: number): ItemEstoque['lotes'] {
  return (
    db
      .prepare(
        `SELECT l.id, l.validade, l.quantidade_x1000 AS quantidade, e.data AS comprado_em
         FROM lote l LEFT JOIN entrada_mercadoria e ON e.id = l.entrada_id
         WHERE l.item_id = ? AND l.quantidade_x1000 > 0 ORDER BY l.id`
      )
      .all(itemId) as {
      id: number
      validade: string | null
      quantidade: number
      comprado_em: string | null
    }[]
  ).map((l) => ({
    id: l.id,
    validade: l.validade,
    quantidade: l.quantidade,
    compradoEm: l.comprado_em
  }))
}

function deLinha(db: Banco, l: LinhaItem): ItemEstoque {
  return {
    id: l.id,
    nome: l.nome,
    tipo: l.tipo,
    unidade: l.unidade,
    nomeUnidade: l.nome_unidade,
    rotulo: rotuloUnidade(l.unidade, l.nome_unidade),
    fornecedorId: l.fornecedor_id,
    fornecedorNome: l.fornecedor_nome,
    quantidade: l.quantidade_x1000,
    minimo: l.estoque_minimo_x1000,
    custo: l.custo_unitario_x10000,
    lotes: lotesDo(db, l.id)
  }
}

export function listarItens(db: Banco): ItemEstoque[] {
  const linhas = db
    .prepare(
      `${SELECT_ITEM} WHERE i.excluido_em IS NULL
       ORDER BY CASE i.tipo WHEN 'materia_prima' THEN 0 ELSE 1 END, i.nome COLLATE NOCASE`
    )
    .all() as unknown as LinhaItem[]
  return linhas.map((l) => deLinha(db, l))
}

export function obterItem(db: Banco, id: number): ItemEstoque | null {
  const l = db.prepare(`${SELECT_ITEM} WHERE i.id = ? AND i.excluido_em IS NULL`).get(id) as
    LinhaItem | undefined
  return l ? deLinha(db, l) : null
}

/** Soma do que foi comprado de um fornecedor no mês ("AAAA-MM"). */
export function compradoNoMes(db: Banco, fornecedorId: number, anoMes: string): number {
  const r = db
    .prepare(
      `SELECT coalesce(sum(valor_pago_centavos), 0) AS total FROM entrada_mercadoria
       WHERE fornecedor_id = ? AND substr(data, 1, 7) = ?`
    )
    .get(fornecedorId, anoMes) as { total: number }
  return r.total
}

// ---------- Escrita ----------

function exigirNomeUnico(db: Banco, nome: string, ignorarId: number | null): void {
  const outros = db
    .prepare('SELECT id, nome FROM item_estoque WHERE excluido_em IS NULL')
    .all() as { id: number; nome: string }[]
  if (outros.some((o) => o.id !== ignorarId && normalizar(o.nome) === normalizar(nome))) {
    throw new Error('Já existe um item com esse nome no estoque.')
  }
}

function exigirFornecedor(db: Banco, id: number | null): void {
  if (id === null) return
  const f = db.prepare('SELECT 1 FROM fornecedor WHERE id = ? AND excluido_em IS NULL').get(id)
  if (!f) throw new Error('Fornecedor não encontrado.')
}

function estadoDe(item: ItemEstoque): EstadoEstoque {
  return {
    quantidade: item.quantidade,
    lotes: item.lotes.map((l) => ({ id: l.id, validade: l.validade, quantidade: l.quantidade }))
  }
}

/** Grava os saldos das compras: atualiza as existentes e cria as novas. */
function gravarLotes(
  db: Banco,
  itemId: number,
  estado: EstadoEstoque,
  entradaId: number | null,
  agora: string
): void {
  for (const l of estado.lotes) {
    if (l.id === null) {
      db.prepare(
        `INSERT INTO lote (item_id, entrada_id, validade, quantidade_x1000, criado_em) VALUES (?, ?, ?, ?, ?)`
      ).run(itemId, entradaId, l.validade, l.quantidade, agora)
    } else {
      db.prepare('UPDATE lote SET quantidade_x1000 = ? WHERE id = ?').run(l.quantidade, l.id)
    }
  }
}

function registrarMovimento(
  db: Banco,
  itemId: number,
  agora: string,
  tipo: 'entrada' | 'ajuste' | 'producao' | 'perda',
  quantidade: number,
  referenciaId: number | null
): void {
  db.prepare(
    `INSERT INTO movimento_estoque (item_id, data_hora, tipo, quantidade_x1000, referencia_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(itemId, agora, tipo, quantidade, referenciaId)
}

function registrarCusto(
  db: Banco,
  itemId: number,
  agora: string,
  antes: CustoX10000,
  depois: CustoX10000,
  origem: 'cadastro' | 'entrada' | 'edicao'
): void {
  if (antes === depois) return
  db.prepare(
    `INSERT INTO historico_custo (item_id, data_hora, custo_antes_x10000, custo_depois_x10000, origem)
     VALUES (?, ?, ?, ?, ?)`
  ).run(itemId, agora, antes, depois, origem)
}

function inserirEntrada(
  db: Banco,
  hoje: DataISO,
  agora: string,
  itemId: number,
  d: {
    fornecedorId: number | null
    quantidade: number
    valorPago: number
    validade: string | null
  },
  custo: CustoX10000
): number {
  const r = db
    .prepare(
      `INSERT INTO entrada_mercadoria
         (data, item_id, fornecedor_id, quantidade_x1000, valor_pago_centavos, custo_unitario_x10000, validade, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(hoje, itemId, d.fornecedorId, d.quantidade, d.valorPago, custo, d.validade, agora)
  return Number(r.lastInsertRowid)
}

/** Item novo: cadastra e já registra a primeira entrada (a compra que chegou). */
export function cadastrarItem(db: Banco, relogio: Relogio, entrada: DadosItemNovo): number {
  const d = esquemaItemNovo.parse(entrada)
  const custo = custoPorUnidade(centavos(d.valorPago), d.quantidade)
  const nomeUnidade = d.unidade === 'un' ? d.nomeUnidade || null : null
  return emTransacao(db, () => {
    exigirNomeUnico(db, d.nome, null)
    exigirFornecedor(db, d.fornecedorId)
    const agora = relogio.agora()
    const r = db
      .prepare(
        `INSERT INTO item_estoque (nome, tipo, unidade, nome_unidade, fornecedor_id, quantidade_x1000,
           estoque_minimo_x1000, custo_unitario_x10000, criado_em, alterado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        d.nome,
        d.tipo,
        d.unidade,
        nomeUnidade,
        d.fornecedorId,
        d.quantidade,
        d.minimo,
        custo,
        agora,
        agora
      )
    const id = Number(r.lastInsertRowid)
    const entradaId = inserirEntrada(db, relogio.hoje(), agora, id, d, custo)
    gravarLotes(
      db,
      id,
      entrar({ quantidade: 0, lotes: [] }, d.quantidade, d.validade),
      entradaId,
      agora
    )
    registrarMovimento(db, id, agora, 'entrada', d.quantidade, entradaId)
    registrarCusto(db, id, agora, 0, custo, 'cadastro')
    const rotulo = rotuloUnidade(d.unidade, nomeUnidade)
    auditar(db, relogio, {
      modulo: 'estoque',
      acao: 'criar',
      entidade: 'item_estoque',
      entidadeId: id,
      descricao: `Cadastrou o insumo ${d.nome}: ${formatarQuantidade(d.quantidade)} ${rotulo} por ${formatarReais(centavos(d.valorPago))}`,
      depois: d
    })
    return id
  })
}

/** Chegou mais de um item já cadastrado: soma, atualiza o preço e anota se o custo subiu. */
export function registrarEntrada(
  db: Banco,
  relogio: Relogio,
  entrada: DadosEntrada
): ResultadoEntrada {
  const d = esquemaEntrada.parse(entrada)
  const custo = custoPorUnidade(centavos(d.valorPago), d.quantidade)
  return emTransacao(db, () => {
    const item = obterItem(db, d.itemId)
    if (!item) throw new Error('Item não encontrado.')
    exigirFornecedor(db, d.fornecedorId)
    const agora = relogio.agora()
    const entradaId = inserirEntrada(db, relogio.hoje(), agora, item.id, d, custo)
    const novo = entrar(estadoDe(item), d.quantidade, d.validade)
    gravarLotes(db, item.id, novo, entradaId, agora)
    db.prepare(
      `UPDATE item_estoque SET quantidade_x1000 = ?, custo_unitario_x10000 = ?,
         fornecedor_id = coalesce(?, fornecedor_id), alterado_em = ? WHERE id = ?`
    ).run(novo.quantidade, custo, d.fornecedorId, agora, item.id)
    registrarMovimento(db, item.id, agora, 'entrada', d.quantidade, entradaId)
    registrarCusto(db, item.id, agora, item.custo, custo, 'entrada')
    auditar(db, relogio, {
      modulo: 'estoque',
      acao: 'criar',
      entidade: 'entrada_mercadoria',
      entidadeId: entradaId,
      descricao: textoEntrada(item.nome, d.quantidade, item.rotulo, centavos(d.valorPago)),
      depois: d
    })
    return {
      custoAntes: item.custo,
      custoDepois: custo,
      aumento: custo > item.custo ? aumentoPercentual(item.custo, custo) : null
    }
  })
}

const NOME_DO_TIPO = { materia_prima: 'matéria-prima', insumo: 'insumo' } as const

/** Corrige o cadastro (Editar). A quantidade corrigida baixa/soma pelas regras de D-036. */
export function editarItem(
  db: Banco,
  relogio: Relogio,
  id: number,
  entrada: DadosEdicaoItem
): void {
  const d = esquemaEdicao.parse(entrada)
  const nomeUnidade = d.unidade === 'un' ? d.nomeUnidade || null : null
  emTransacao(db, () => {
    const item = obterItem(db, id)
    if (!item) throw new Error('Item não encontrado.')
    exigirNomeUnico(db, d.nome, id)
    exigirFornecedor(db, d.fornecedorId)
    const agora = relogio.agora()
    const rotuloAntes = item.rotulo
    const rotulo = rotuloUnidade(d.unidade, nomeUnidade)
    const mudancas: string[] = []
    const mudou = (rotuloCampo: string, antes: string, depois: string) => {
      if (antes !== depois)
        mudancas.push(`${rotuloCampo} ${antes || '(vazio)'} → ${depois || '(vazio)'}`)
    }
    mudou('nome', item.nome, d.nome)
    mudou('tipo', NOME_DO_TIPO[item.tipo], NOME_DO_TIPO[d.tipo])
    mudou('medida', rotuloAntes, rotulo)
    if (item.fornecedorId !== d.fornecedorId) {
      const novoNome =
        d.fornecedorId === null
          ? ''
          : (
              db.prepare('SELECT nome FROM fornecedor WHERE id = ?').get(d.fornecedorId) as {
                nome: string
              }
            ).nome
      mudou('fornecedor', item.fornecedorNome ?? '', novoNome)
    }
    mudou(
      'estoque mínimo',
      `${formatarQuantidade(item.minimo)} ${rotuloAntes}`,
      `${formatarQuantidade(d.minimo)} ${rotulo}`
    )

    // validade de cada compra
    for (const v of d.validades) {
      const lote = item.lotes.find((l) => l.id === v.loteId)
      if (!lote || lote.validade === v.validade) continue
      db.prepare('UPDATE lote SET validade = ? WHERE id = ?').run(v.validade, lote.id)
      const de = lote.compradoEm ? ` da compra de ${formatarData(lote.compradoEm).slice(0, 5)}` : ''
      mudou(
        `validade${de}`,
        lote.validade ? formatarData(lote.validade) : '',
        v.validade ? formatarData(v.validade) : ''
      )
    }
    const atual = estadoDe(obterItem(db, id) ?? item)

    if (d.quantidade !== item.quantidade) {
      gravarLotes(db, id, ajustar(atual, d.quantidade), null, agora)
      registrarMovimento(db, id, agora, 'ajuste', d.quantidade - item.quantidade, null)
      mudou(
        'quantidade em estoque',
        `${formatarQuantidade(item.quantidade)} ${rotuloAntes}`,
        `${formatarQuantidade(d.quantidade)} ${rotulo}`
      )
    }
    if (d.custo !== item.custo) {
      registrarCusto(db, id, agora, item.custo, d.custo, 'edicao')
      mudou(
        'custo',
        `${formatarCusto(item.custo)}/${rotuloAntes}`,
        `${formatarCusto(d.custo)}/${rotulo}`
      )
    }
    if (mudancas.length === 0) return

    db.prepare(
      `UPDATE item_estoque SET nome = ?, tipo = ?, unidade = ?, nome_unidade = ?, fornecedor_id = ?,
         quantidade_x1000 = ?, estoque_minimo_x1000 = ?, custo_unitario_x10000 = ?, alterado_em = ?
       WHERE id = ?`
    ).run(
      d.nome,
      d.tipo,
      d.unidade,
      nomeUnidade,
      d.fornecedorId,
      d.quantidade,
      d.minimo,
      d.custo,
      agora,
      id
    )
    auditar(db, relogio, {
      modulo: 'estoque',
      acao: 'alterar',
      entidade: 'item_estoque',
      entidadeId: id,
      descricao: `Mudou o insumo ${item.nome}: ${mudancas.join('; ')}`,
      antes: item,
      depois: d
    })
  })
}

export function excluirItem(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const item = obterItem(db, id)
    if (!item) throw new Error('Item não encontrado.')
    db.prepare('UPDATE item_estoque SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'estoque',
      acao: 'excluir',
      entidade: 'item_estoque',
      entidadeId: id,
      descricao: `Excluiu o insumo ${item.nome}`
    })
    // Pergunta 11 / D-047: o item sai das receitas (as linhas ficam guardadas para o Desfazer).
    for (const r of receitasQueUsam(db, id)) {
      auditar(db, relogio, {
        modulo: 'producao',
        acao: 'alterar',
        entidade: 'receita',
        entidadeId: r.id,
        descricao: `Tirou ${item.nome} da receita ${r.nome} (o item foi apagado do estoque)`
      })
    }
  })
}

export function desfazerExclusaoItem(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const linha = db
      .prepare('SELECT nome FROM item_estoque WHERE id = ? AND excluido_em IS NOT NULL')
      .get(id) as { nome: string } | undefined
    if (!linha) throw new Error('Não há exclusão para desfazer.')
    exigirNomeUnico(db, linha.nome, id)
    db.prepare('UPDATE item_estoque SET excluido_em = NULL, alterado_em = ? WHERE id = ?').run(
      relogio.agora(),
      id
    )
    auditar(db, relogio, {
      modulo: 'estoque',
      acao: 'desfazer',
      entidade: 'item_estoque',
      entidadeId: id,
      descricao: `Desfez a exclusão do insumo ${linha.nome}`
    })
  })
}

// ---------- Baixa e devolução (produção e perda) ----------

export type OrigemSaida = 'producao' | 'perda'

/** Tira do estoque (vence antes, sai antes) e anota de que compra saiu, para o Desfazer. */
export function baixarDoEstoque(
  db: Banco,
  agora: string,
  itemId: number,
  qtd: number,
  origem: OrigemSaida,
  origemId: number
): void {
  const item = obterItem(db, itemId)
  if (!item || qtd <= 0) return
  const { estado, saidas } = baixarComDetalhe(estadoDe(item), qtd)
  db.prepare('UPDATE item_estoque SET quantidade_x1000 = ?, alterado_em = ? WHERE id = ?').run(
    estado.quantidade,
    agora,
    itemId
  )
  gravarLotes(db, itemId, estado, null, agora)
  for (const sa of saidas) {
    db.prepare(
      `INSERT INTO saida_estoque (origem, origem_id, item_id, lote_id, quantidade_x1000)
       VALUES (?, ?, ?, ?, ?)`
    ).run(origem, origemId, itemId, sa.loteId, sa.quantidade)
  }
  registrarMovimento(db, itemId, agora, origem, -qtd, origemId)
}

/** Devolve ao estoque tudo o que a produção ou a perda tirou, às mesmas compras. */
export function devolverAoEstoque(
  db: Banco,
  agora: string,
  origem: OrigemSaida,
  origemId: number
): void {
  const saidas = db
    .prepare(
      'SELECT item_id, lote_id, quantidade_x1000 FROM saida_estoque WHERE origem = ? AND origem_id = ?'
    )
    .all(origem, origemId) as {
    item_id: number
    lote_id: number | null
    quantidade_x1000: number
  }[]
  const porItem = new Map<number, number>()
  for (const sa of saidas) {
    porItem.set(sa.item_id, (porItem.get(sa.item_id) ?? 0) + sa.quantidade_x1000)
    if (sa.lote_id !== null) {
      db.prepare('UPDATE lote SET quantidade_x1000 = quantidade_x1000 + ? WHERE id = ?').run(
        sa.quantidade_x1000,
        sa.lote_id
      )
    }
  }
  for (const [itemId, qtd] of porItem) {
    db.prepare(
      'UPDATE item_estoque SET quantidade_x1000 = quantidade_x1000 + ?, alterado_em = ? WHERE id = ?'
    ).run(qtd, agora, itemId)
    registrarMovimento(db, itemId, agora, origem, qtd, origemId)
  }
  db.prepare('DELETE FROM saida_estoque WHERE origem = ? AND origem_id = ?').run(origem, origemId)
}
