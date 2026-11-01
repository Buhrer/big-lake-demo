// Categorias (preço fixo), gás e energia da produção e receitas (custo e lucro).
import { z } from 'zod'
import type {
  Categoria,
  ConfigGasEnergia,
  DadosReceita,
  Receita,
  ResumoReceita
} from '../../compartilhado/contrato'
import { normalizar } from '../../dominio/cadastros'
import { centavos } from '../../dominio/dinheiro'
import { formatarQuantidade, formatarReais } from '../../dominio/formatar'
import { rotuloUnidade, type Unidade } from '../../dominio/estoque'
import { calcularReceita, lucroNaVenda, pluralizar, type GasEnergia } from '../../dominio/receita'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'

const dinheiro = z.number().int().nonnegative()

// ---------- Gás e energia (D-041) ----------

export const GAS_PADRAO: ConfigGasEnergia = {
  modo: 'ingrediente',
  precoPorVez: centavos(0),
  valorFixo: centavos(0)
}

const esquemaGas = z.object({
  modo: z.enum(['ingrediente', 'fixo', 'por_receita', 'nao_usar']),
  precoPorVez: dinheiro,
  valorFixo: dinheiro
})

const NOME_DO_MODO = {
  ingrediente: 'item especial no estoque',
  fixo: 'valor fixo em toda receita',
  por_receita: 'valor em cada receita',
  nao_usar: 'não contar nas receitas'
} as const

export function obterGas(db: Banco): ConfigGasEnergia {
  const linha = db.prepare(`SELECT valor FROM config WHERE chave = 'gas_energia'`).get() as
    { valor: string } | undefined
  if (!linha) return GAS_PADRAO
  const r = esquemaGas.safeParse({ ...GAS_PADRAO, ...JSON.parse(linha.valor) })
  return r.success ? (r.data as ConfigGasEnergia) : GAS_PADRAO
}

export function salvarGas(db: Banco, relogio: Relogio, entrada: unknown): ConfigGasEnergia {
  const depois = esquemaGas.parse(entrada) as ConfigGasEnergia
  return emTransacao(db, () => {
    const antes = obterGas(db)
    db.prepare(
      `INSERT INTO config (chave, valor, alterado_em) VALUES ('gas_energia', ?, ?)
       ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, alterado_em = excluded.alterado_em`
    ).run(JSON.stringify(depois), relogio.agora())
    const frases: string[] = []
    if (antes.modo !== depois.modo) {
      frases.push(
        `Mudou o jeito de contar o gás e energia da produção: ${NOME_DO_MODO[antes.modo]} → ${NOME_DO_MODO[depois.modo]}`
      )
    }
    if (antes.precoPorVez !== depois.precoPorVez) {
      frases.push(
        `Mudou o custo do gás e energia da produção: ${formatarReais(antes.precoPorVez)} → ${formatarReais(depois.precoPorVez)} por vez`
      )
    }
    if (antes.valorFixo !== depois.valorFixo) {
      frases.push(
        `Mudou o valor fixo de gás e energia em cada receita: ${formatarReais(antes.valorFixo)} → ${formatarReais(depois.valorFixo)}`
      )
    }
    for (const descricao of frases) {
      auditar(db, relogio, { modulo: 'producao', acao: 'alterar', descricao, antes, depois })
    }
    return depois
  })
}

function gasDaReceita(
  cfg: ConfigGasEnergia,
  vezes: number | null,
  valor: number | null
): GasEnergia {
  return {
    modo: cfg.modo,
    vezes,
    precoPorVez: cfg.precoPorVez,
    valorFixo: cfg.valorFixo,
    valorDaReceita: valor === null ? null : centavos(valor)
  }
}

// ---------- Categorias ----------

interface LinhaCategoria {
  id: number
  nome: string
  nome_unidade: string
  preco_balcao_centavos: number
  preco_atacado_centavos: number
}

/** Receitas + produtos da categoria ("em uso · N"). */
function usoDaCategoria(db: Banco, id: number): number {
  const contar = (tabela: 'receita' | 'produto') =>
    (
      db
        .prepare(
          `SELECT count(*) AS n FROM ${tabela} WHERE categoria_id = ? AND excluido_em IS NULL`
        )
        .get(id) as { n: number }
    ).n
  return contar('receita') + contar('produto')
}

/** Por que a receita não pode ser excluída (D-045), ou null. */
export function receitaEmUso(db: Banco, id: number): string | null {
  const n = (
    db
      .prepare('SELECT count(*) AS n FROM produto WHERE receita_id = ? AND excluido_em IS NULL')
      .get(id) as { n: number }
  ).n
  if (n === 0) return null
  return n === 1 ? 'é usada em 1 produto à venda' : `é usada em ${n} produtos à venda`
}

/** Receitas que usam o item, como ingrediente ou embalagem (pergunta 11, D-047). */
export function receitasQueUsam(db: Banco, itemId: number): { id: number; nome: string }[] {
  return db
    .prepare(
      `SELECT DISTINCT r.id, r.nome FROM receita r
       LEFT JOIN receita_ingrediente i ON i.receita_id = r.id AND i.item_id = ?
       LEFT JOIN receita_embalagem e ON e.receita_id = r.id AND e.item_id = ?
       WHERE r.excluido_em IS NULL AND (i.id IS NOT NULL OR e.id IS NOT NULL)
       ORDER BY r.nome COLLATE NOCASE`
    )
    .all(itemId, itemId) as { id: number; nome: string }[]
}

function deLinhaCategoria(db: Banco, c: LinhaCategoria): Categoria {
  return {
    id: c.id,
    nome: c.nome,
    nomeUnidade: c.nome_unidade,
    precoBalcao: centavos(c.preco_balcao_centavos),
    precoAtacado: centavos(c.preco_atacado_centavos),
    emUso: usoDaCategoria(db, c.id)
  }
}

export function listarCategorias(db: Banco): Categoria[] {
  return (
    db
      .prepare(
        `SELECT id, nome, nome_unidade, preco_balcao_centavos, preco_atacado_centavos FROM categoria
         WHERE excluido_em IS NULL ORDER BY id`
      )
      .all() as unknown as LinhaCategoria[]
  ).map((c) => deLinhaCategoria(db, c))
}

function obterCategoria(db: Banco, id: number): Categoria | null {
  const c = db
    .prepare(
      `SELECT id, nome, nome_unidade, preco_balcao_centavos, preco_atacado_centavos FROM categoria
       WHERE id = ? AND excluido_em IS NULL`
    )
    .get(id) as LinhaCategoria | undefined
  return c ? deLinhaCategoria(db, c) : null
}

export function criarCategoria(db: Banco, relogio: Relogio, nomeBruto: unknown): Categoria {
  const nome = z.string().trim().min(1, 'Digite o nome.').max(60).parse(nomeBruto)
  return emTransacao(db, () => {
    if (listarCategorias(db).some((c) => normalizar(c.nome) === normalizar(nome))) {
      throw new Error('Já existe uma categoria com esse nome.')
    }
    const agora = relogio.agora()
    const r = db
      .prepare(
        `INSERT INTO categoria (nome, nome_unidade, criado_em, alterado_em) VALUES (?, ?, ?, ?)`
      )
      .run(nome, nome.toLowerCase(), agora, agora)
    const id = Number(r.lastInsertRowid)
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'criar',
      entidade: 'categoria',
      entidadeId: id,
      descricao: `Criou a categoria ${nome}`
    })
    return obterCategoria(db, id)!
  })
}

export function removerCategoria(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const c = obterCategoria(db, id)
    if (!c) throw new Error('Categoria não encontrada.')
    if (c.emUso > 0)
      throw new Error('Só dá para remover uma categoria que não tem receitas nem produtos.')
    db.prepare('UPDATE categoria SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'excluir',
      entidade: 'categoria',
      entidadeId: id,
      descricao: `Removeu a categoria ${c.nome}`
    })
  })
}

/** Preços e nome da unidade valem para a categoria inteira (R1, D-043). */
function atualizarCategoria(
  db: Banco,
  relogio: Relogio,
  c: Categoria,
  novo: { precoBalcao: number; precoAtacado: number; nomeUnidade: string }
): void {
  const agora = relogio.agora()
  const precoMudou = c.precoBalcao !== novo.precoBalcao || c.precoAtacado !== novo.precoAtacado
  if (precoMudou) {
    db.prepare(
      `INSERT INTO historico_preco_categoria (categoria_id, data_hora, balcao_antes_centavos,
         balcao_depois_centavos, atacado_antes_centavos, atacado_depois_centavos)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(c.id, agora, c.precoBalcao, novo.precoBalcao, c.precoAtacado, novo.precoAtacado)
  }
  const frases: string[] = []
  if (c.precoBalcao !== novo.precoBalcao) {
    frases.push(
      `Mudou o preço da categoria ${c.nome} no balcão: ${formatarReais(c.precoBalcao)} → ${formatarReais(centavos(novo.precoBalcao))}`
    )
  }
  if (c.precoAtacado !== novo.precoAtacado) {
    frases.push(
      `Mudou o preço da categoria ${c.nome} no atacado: ${formatarReais(c.precoAtacado)} → ${formatarReais(centavos(novo.precoAtacado))}`
    )
  }
  if (c.nomeUnidade !== novo.nomeUnidade) {
    frases.push(
      `Mudou o nome de cada unidade da categoria ${c.nome}: ${c.nomeUnidade} → ${novo.nomeUnidade}`
    )
  }
  if (frases.length === 0) return
  db.prepare(
    `UPDATE categoria SET preco_balcao_centavos = ?, preco_atacado_centavos = ?, nome_unidade = ?,
       alterado_em = ? WHERE id = ?`
  ).run(novo.precoBalcao, novo.precoAtacado, novo.nomeUnidade, agora, c.id)
  for (const descricao of frases) {
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'alterar',
      entidade: 'categoria',
      entidadeId: c.id,
      descricao
    })
  }
}

// ---------- Receitas ----------

const quantidade = z.number().int().positive()

export const esquemaReceita = z.object({
  nome: z.string().trim().min(1, 'Digite o nome da receita.').max(100),
  categoriaId: z.number().int().positive({ message: 'Escolha a categoria do produto.' }),
  rendimento: z
    .number()
    .int()
    .positive({ message: 'Diga quantas unidades a receita rende.' })
    .max(100_000),
  ingredientes: z
    .array(z.object({ itemId: z.number().int().positive(), quantidade }))
    .refine(
      (l) => new Set(l.map((i) => i.itemId)).size === l.length,
      'Ingrediente repetido na receita.'
    ),
  embalagens: z.array(z.number().int().positive()),
  gasVezes: quantidade.nullable(),
  gasValor: dinheiro.nullable(),
  precoBalcao: dinheiro,
  precoAtacado: dinheiro,
  nomeUnidade: z.string().trim().min(1, 'Diga como se chama cada unidade.').max(40)
})

interface LinhaReceita {
  id: number
  nome: string
  categoria_id: number
  rendimento: number
  gas_vezes_x1000: number | null
  gas_valor_centavos: number | null
}

interface InfoItem {
  nome: string
  custo: number
  rotulo: string
  tipo: string
}

function itensAtivos(db: Banco): Map<number, InfoItem> {
  const linhas = db
    .prepare(
      `SELECT id, nome, custo_unitario_x10000 AS custo, unidade, nome_unidade, tipo FROM item_estoque
       WHERE excluido_em IS NULL`
    )
    .all() as {
    id: number
    nome: string
    custo: number
    unidade: Unidade
    nome_unidade: string | null
    tipo: string
  }[]
  return new Map(
    linhas.map((l) => [
      l.id,
      {
        nome: l.nome,
        custo: l.custo,
        rotulo: rotuloUnidade(l.unidade, l.nome_unidade),
        tipo: l.tipo
      }
    ])
  )
}

function linhasDa(db: Banco, receitaId: number) {
  const ingredientes = db
    .prepare(
      'SELECT item_id AS itemId, quantidade_x1000 AS quantidade FROM receita_ingrediente WHERE receita_id = ? ORDER BY id'
    )
    .all(receitaId) as { itemId: number; quantidade: number }[]
  const embalagens = (
    db
      .prepare('SELECT item_id AS itemId FROM receita_embalagem WHERE receita_id = ? ORDER BY id')
      .all(receitaId) as { itemId: number }[]
  ).map((e) => e.itemId)
  return { ingredientes, embalagens }
}

export function obterReceita(db: Banco, id: number): Receita | null {
  const r = db
    .prepare(
      `SELECT id, nome, categoria_id, rendimento, gas_vezes_x1000, gas_valor_centavos FROM receita
       WHERE id = ? AND excluido_em IS NULL`
    )
    .get(id) as LinhaReceita | undefined
  if (!r) return null
  const cat = obterCategoria(db, r.categoria_id)
  const ativos = itensAtivos(db)
  const { ingredientes, embalagens } = linhasDa(db, id)
  return {
    id: r.id,
    nome: r.nome,
    categoriaId: r.categoria_id,
    rendimento: r.rendimento,
    ingredientes: ingredientes.filter((i) => ativos.has(i.itemId)),
    embalagens: embalagens.filter((e) => ativos.has(e)),
    gasVezes: r.gas_vezes_x1000,
    gasValor: r.gas_valor_centavos === null ? null : centavos(r.gas_valor_centavos),
    precoBalcao: cat?.precoBalcao ?? centavos(0),
    precoAtacado: cat?.precoAtacado ?? centavos(0),
    nomeUnidade: cat?.nomeUnidade ?? ''
  }
}

/** Todas as receitas com custo e lucro de agora, do maior para o menor lucro no balcão. */
/**
 * Todas as receitas com custo e lucro de agora, do maior para o menor lucro no balcão.
 * `trocarCusto` responde "e se este insumo custasse X?" (aviso "O custo subiu", D-046).
 */
export function listarReceitas(
  db: Banco,
  trocarCusto?: { itemId: number; custo: number }
): ResumoReceita[] {
  const gas = obterGas(db)
  const ativos = itensAtivos(db)
  const custoDo = (itemId: number) =>
    trocarCusto?.itemId === itemId ? trocarCusto.custo : ativos.get(itemId)!.custo
  const categorias = new Map(listarCategorias(db).map((c) => [c.id, c]))
  const linhas = db
    .prepare(
      `SELECT id, nome, categoria_id, rendimento, gas_vezes_x1000, gas_valor_centavos FROM receita
       WHERE excluido_em IS NULL`
    )
    .all() as unknown as LinhaReceita[]
  return linhas
    .map((r) => {
      const cat = categorias.get(r.categoria_id)
      const { ingredientes, embalagens } = linhasDa(db, r.id)
      const custo = calcularReceita({
        ingredientes: ingredientes
          .filter((i) => ativos.has(i.itemId))
          .map((i) => ({ quantidade: i.quantidade, custo: custoDo(i.itemId) })),
        embalagens: embalagens.filter((e) => ativos.has(e)).map(custoDo),
        rendimento: r.rendimento,
        gas: gasDaReceita(gas, r.gas_vezes_x1000, r.gas_valor_centavos)
      })
      return {
        id: r.id,
        nome: r.nome,
        categoriaId: r.categoria_id,
        categoriaNome: cat?.nome ?? '',
        nomeUnidade: cat?.nomeUnidade ?? '',
        rendimento: r.rendimento,
        custoDeCada: custo.custoDeCada,
        balcao: lucroNaVenda(cat?.precoBalcao ?? centavos(0), custo.custoDeCada, r.rendimento),
        atacado: lucroNaVenda(cat?.precoAtacado ?? centavos(0), custo.custoDeCada, r.rendimento)
      }
    })
    .sort((a, b) => b.balcao.lucroDeCada - a.balcao.lucroDeCada)
}

function mudancasNaReceita(
  antes: Receita,
  depois: z.infer<typeof esquemaReceita>,
  itens: Map<number, InfoItem>,
  categorias: Map<number, Categoria>
): string[] {
  const m: string[] = []
  if (antes.nome !== depois.nome) m.push(`nome ${antes.nome} → ${depois.nome}`)
  if (antes.categoriaId !== depois.categoriaId) {
    m.push(
      `categoria ${categorias.get(antes.categoriaId)?.nome ?? ''} → ${categorias.get(depois.categoriaId)?.nome ?? ''}`
    )
  }
  const unidades = pluralizar(depois.nomeUnidade)
  if (antes.rendimento !== depois.rendimento) {
    m.push(`rende ${antes.rendimento} → ${depois.rendimento} ${unidades}`)
  }
  const qtd = (itemId: number, q: number) =>
    `${formatarQuantidade(q)} ${itens.get(itemId)?.rotulo ?? ''}`.trim()
  const nome = (itemId: number) => itens.get(itemId)?.nome ?? 'item'
  const antesMap = new Map(antes.ingredientes.map((i) => [i.itemId, i.quantidade]))
  const depoisMap = new Map(depois.ingredientes.map((i) => [i.itemId, i.quantidade]))
  for (const [id, q] of depoisMap) {
    const a = antesMap.get(id)
    if (a === undefined) m.push(`colocou ${nome(id)} ${qtd(id, q)}`)
    else if (a !== q) m.push(`${nome(id)} ${qtd(id, a)} → ${qtd(id, q)}`)
  }
  for (const id of antesMap.keys()) if (!depoisMap.has(id)) m.push(`tirou ${nome(id)}`)
  const embAntes = new Set(antes.embalagens)
  const embDepois = new Set(depois.embalagens)
  for (const id of embDepois) if (!embAntes.has(id)) m.push(`colocou na embalagem ${nome(id)}`)
  for (const id of embAntes) if (!embDepois.has(id)) m.push(`tirou da embalagem ${nome(id)}`)
  if (antes.gasVezes !== depois.gasVezes) {
    const v = (x: number | null) => (x === null ? 'não usa' : `${formatarQuantidade(x)} vez`)
    m.push(`gás e energia ${v(antes.gasVezes)} → ${v(depois.gasVezes)}`)
  }
  if (antes.gasValor !== depois.gasValor) {
    const v = (x: number | null) => (x === null ? '(vazio)' : formatarReais(centavos(x)))
    m.push(`gás e energia ${v(antes.gasValor)} → ${v(depois.gasValor)}`)
  }
  return m
}

/** Cadastra (id null) ou corrige uma receita. Preços e nome da unidade vão para a categoria. */
export function salvarReceita(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosReceita
): number {
  const d = esquemaReceita.parse(entrada)
  return emTransacao(db, () => {
    const categorias = new Map(listarCategorias(db).map((c) => [c.id, c]))
    const cat = categorias.get(d.categoriaId)
    if (!cat) throw new Error('Escolha a categoria do produto.')
    const itens = itensAtivos(db)
    for (const i of d.ingredientes) {
      if (!itens.has(i.itemId)) throw new Error('Um dos ingredientes não está mais no estoque.')
    }
    for (const e of d.embalagens) {
      if (itens.get(e)?.tipo !== 'insumo')
        throw new Error('Um item de embalagem não está mais no estoque.')
    }
    // Preços e unidade da categoria primeiro: no Histórico, a receita aparece por cima.
    atualizarCategoria(db, relogio, cat, d)
    const agora = relogio.agora()
    let receitaId: number
    if (id === null) {
      const r = db
        .prepare(
          `INSERT INTO receita (nome, categoria_id, rendimento, gas_vezes_x1000, gas_valor_centavos, criado_em, alterado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(d.nome, d.categoriaId, d.rendimento, d.gasVezes, d.gasValor, agora, agora)
      receitaId = Number(r.lastInsertRowid)
      auditar(db, relogio, {
        modulo: 'producao',
        acao: 'criar',
        entidade: 'receita',
        entidadeId: receitaId,
        descricao: `Cadastrou a receita ${d.nome} (rende ${d.rendimento} ${pluralizar(d.nomeUnidade)})`,
        depois: d
      })
    } else {
      const antes = obterReceita(db, id)
      if (!antes) throw new Error('Receita não encontrada.')
      receitaId = id
      const mudancas = mudancasNaReceita(antes, d, itens, categorias)
      if (mudancas.length > 0) {
        db.prepare(
          `UPDATE receita SET nome = ?, categoria_id = ?, rendimento = ?, gas_vezes_x1000 = ?,
             gas_valor_centavos = ?, alterado_em = ? WHERE id = ?`
        ).run(d.nome, d.categoriaId, d.rendimento, d.gasVezes, d.gasValor, agora, id)
        auditar(db, relogio, {
          modulo: 'producao',
          acao: 'alterar',
          entidade: 'receita',
          entidadeId: id,
          descricao: `Mudou a receita ${antes.nome}: ${mudancas.join('; ')}`,
          antes,
          depois: d
        })
      }
    }
    db.prepare('DELETE FROM receita_ingrediente WHERE receita_id = ?').run(receitaId)
    for (const i of d.ingredientes) {
      db.prepare(
        'INSERT INTO receita_ingrediente (receita_id, item_id, quantidade_x1000) VALUES (?, ?, ?)'
      ).run(receitaId, i.itemId, i.quantidade)
    }
    db.prepare('DELETE FROM receita_embalagem WHERE receita_id = ?').run(receitaId)
    for (const e of d.embalagens) {
      db.prepare('INSERT INTO receita_embalagem (receita_id, item_id) VALUES (?, ?)').run(
        receitaId,
        e
      )
    }
    return receitaId
  })
}

export function excluirReceita(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const r = obterReceita(db, id)
    if (!r) throw new Error('Receita não encontrada.')
    const motivo = receitaEmUso(db, id)
    if (motivo) throw new Error(`Não dá para excluir: ${motivo}.`)
    db.prepare('UPDATE receita SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'excluir',
      entidade: 'receita',
      entidadeId: id,
      descricao: `Excluiu a receita ${r.nome}`
    })
  })
}

export function desfazerExclusaoReceita(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const linha = db
      .prepare('SELECT nome, categoria_id FROM receita WHERE id = ? AND excluido_em IS NOT NULL')
      .get(id) as { nome: string; categoria_id: number } | undefined
    if (!linha) throw new Error('Não há exclusão para desfazer.')
    if (!obterCategoria(db, linha.categoria_id)) {
      throw new Error('A categoria desta receita foi removida. Crie a categoria de novo antes.')
    }
    db.prepare('UPDATE receita SET excluido_em = NULL, alterado_em = ? WHERE id = ?').run(
      relogio.agora(),
      id
    )
    auditar(db, relogio, {
      modulo: 'producao',
      acao: 'desfazer',
      entidade: 'receita',
      entidadeId: id,
      descricao: `Desfez a exclusão da receita ${linha.nome}`
    })
  })
}
