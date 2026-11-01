// Produtos à venda (D-045): preço da categoria, custo da receita.
import { z } from 'zod'
import type { DadosProduto, Produto } from '../../compartilhado/contrato'
import { descreverMudancas, normalizar } from '../../dominio/cadastros'
import { centavos } from '../../dominio/dinheiro'
import { formatarQuantidade } from '../../dominio/formatar'
import {
  custoDoProduto,
  precosDoProduto,
  VENDIDO_COMO,
  type UnidadeMedida,
  type VendidoComo
} from '../../dominio/produto'
import { lucroNaVenda } from '../../dominio/receita'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'
import { listarCategorias, listarReceitas } from './receitas'

export const esquemaProduto = z
  .object({
    categoriaId: z.number().int().positive({ message: 'Escolha a categoria.' }),
    nome: z.string().trim().min(1, 'Digite o nome ou sabor.').max(100),
    vendidoComo: z.enum(['unidade', 'pote', 'copo', 'caixa']),
    medida: z.number().int().positive().nullable(),
    medidaUnidade: z.enum(['g', 'kg', 'ml', 'L']).nullable(),
    unidadesPorCaixa: z.number().int().positive().max(10_000).nullable(),
    receitaId: z.number().int().positive().nullable()
  })
  .refine((p) => p.vendidoComo !== 'caixa' || p.unidadesPorCaixa !== null, {
    message: 'Diga quantas unidades vêm na caixa.'
  })

interface LinhaProduto {
  id: number
  categoria_id: number
  receita_id: number | null
  nome: string
  vendido_como: VendidoComo
  medida_x1000: number | null
  medida_unidade: UnidadeMedida | null
  unidades_por_caixa: number | null
}

const SELECT = `SELECT id, categoria_id, receita_id, nome, vendido_como, medida_x1000, medida_unidade,
  unidades_por_caixa FROM produto`

export function listarProdutos(db: Banco): Produto[] {
  const categorias = new Map(listarCategorias(db).map((c) => [c.id, c]))
  const receitas = new Map(listarReceitas(db).map((r) => [r.id, r]))
  const linhas = db
    .prepare(`${SELECT} WHERE excluido_em IS NULL ORDER BY categoria_id, nome COLLATE NOCASE`)
    .all() as unknown as LinhaProduto[]
  return linhas.map((p) => {
    const cat = categorias.get(p.categoria_id)
    const receita = p.receita_id === null ? undefined : receitas.get(p.receita_id)
    const precos = precosDoProduto(
      { balcao: cat?.precoBalcao ?? centavos(0), atacado: cat?.precoAtacado ?? centavos(0) },
      p.vendido_como,
      p.unidades_por_caixa
    )
    const custo = custoDoProduto(receita?.custoDeCada ?? null, p.vendido_como, p.unidades_por_caixa)
    return {
      id: p.id,
      categoriaId: p.categoria_id,
      categoriaNome: cat?.nome ?? '',
      nome: p.nome,
      vendidoComo: p.vendido_como,
      medida: p.medida_x1000,
      medidaUnidade: p.medida_unidade,
      unidadesPorCaixa: p.unidades_por_caixa,
      receitaId: receita ? p.receita_id : null,
      receitaNome: receita?.nome ?? null,
      precoBalcao: precos.balcao,
      precoAtacado: precos.atacado,
      custo,
      lucroBalcao: custo === null ? null : lucroNaVenda(precos.balcao, custo, 1).lucroDeCada,
      lucroAtacado: custo === null ? null : lucroNaVenda(precos.atacado, custo, 1).lucroDeCada
    }
  })
}

function obterLinha(db: Banco, id: number): LinhaProduto | null {
  return (
    (db.prepare(`${SELECT} WHERE id = ? AND excluido_em IS NULL`).get(id) as
      LinhaProduto | undefined) ?? null
  )
}

function textoDoProduto(db: Banco, p: z.infer<typeof esquemaProduto>) {
  const cat = listarCategorias(db).find((c) => c.id === p.categoriaId)
  const receita = p.receitaId === null ? null : listarReceitas(db).find((r) => r.id === p.receitaId)
  return {
    categoria: cat?.nome ?? '',
    nome: p.nome,
    vendidoComo: VENDIDO_COMO[p.vendidoComo],
    tamanho:
      p.medida && p.medidaUnidade ? `${formatarQuantidade(p.medida)} ${p.medidaUnidade}` : '',
    porCaixa: p.unidadesPorCaixa === null ? '' : String(p.unidadesPorCaixa),
    receita: receita?.nome ?? ''
  }
}

const ROTULOS = {
  categoria: 'categoria',
  nome: 'nome',
  vendidoComo: 'vendido como',
  tamanho: 'peso ou volume',
  porCaixa: 'unidades na caixa',
  receita: 'receita usada'
}

export function salvarProduto(
  db: Banco,
  relogio: Relogio,
  id: number | null,
  entrada: DadosProduto
): number {
  const d = esquemaProduto.parse(entrada)
  const p = {
    ...d,
    unidadesPorCaixa: d.vendidoComo === 'caixa' ? d.unidadesPorCaixa : null,
    medidaUnidade: d.medida === null ? null : d.medidaUnidade
  }
  return emTransacao(db, () => {
    const cat = listarCategorias(db).find((c) => c.id === p.categoriaId)
    if (!cat) throw new Error('Escolha a categoria.')
    if (p.receitaId !== null) {
      const receita = listarReceitas(db).find((r) => r.id === p.receitaId)
      if (!receita) throw new Error('A receita escolhida não existe mais.')
      if (receita.categoriaId !== p.categoriaId) {
        throw new Error('A receita escolhida é de outra categoria.')
      }
    }
    const repetido = (
      db
        .prepare('SELECT id, nome FROM produto WHERE categoria_id = ? AND excluido_em IS NULL')
        .all(p.categoriaId) as { id: number; nome: string }[]
    ).some((o) => o.id !== id && normalizar(o.nome) === normalizar(p.nome))
    if (repetido) throw new Error(`Já existe ${p.nome} na categoria ${cat.nome}.`)

    const agora = relogio.agora()
    const valores = [
      p.categoriaId,
      p.receitaId,
      p.nome,
      p.vendidoComo,
      p.medida,
      p.medidaUnidade,
      p.unidadesPorCaixa
    ] as const
    if (id === null) {
      const r = db
        .prepare(
          `INSERT INTO produto (categoria_id, receita_id, nome, vendido_como, medida_x1000, medida_unidade,
             unidades_por_caixa, criado_em, alterado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(...valores, agora, agora)
      const novo = Number(r.lastInsertRowid)
      auditar(db, relogio, {
        modulo: 'cadastros',
        acao: 'criar',
        entidade: 'produto',
        entidadeId: novo,
        descricao: `Cadastrou o produto ${p.nome} (${cat.nome})`,
        depois: p
      })
      return novo
    }
    const antes = obterLinha(db, id)
    if (!antes) throw new Error('Produto não encontrado.')
    const mudancas = descreverMudancas(
      ROTULOS,
      textoDoProduto(db, {
        categoriaId: antes.categoria_id,
        nome: antes.nome,
        vendidoComo: antes.vendido_como,
        medida: antes.medida_x1000,
        medidaUnidade: antes.medida_unidade,
        unidadesPorCaixa: antes.unidades_por_caixa,
        receitaId: antes.receita_id
      }),
      textoDoProduto(db, p)
    )
    if (!mudancas) return id
    db.prepare(
      `UPDATE produto SET categoria_id = ?, receita_id = ?, nome = ?, vendido_como = ?, medida_x1000 = ?,
         medida_unidade = ?, unidades_por_caixa = ?, alterado_em = ? WHERE id = ?`
    ).run(...valores, agora, id)
    auditar(db, relogio, {
      modulo: 'cadastros',
      acao: 'alterar',
      entidade: 'produto',
      entidadeId: id,
      descricao: `Mudou o produto ${antes.nome}: ${mudancas}`,
      antes,
      depois: p
    })
    return id
  })
}

export function excluirProduto(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const p = obterLinha(db, id)
    if (!p) throw new Error('Produto não encontrado.')
    // Pedidos chegam na Fatia 4: lá, produto com pedido não poderá ser excluído.
    db.prepare('UPDATE produto SET excluido_em = ? WHERE id = ?').run(relogio.agora(), id)
    auditar(db, relogio, {
      modulo: 'cadastros',
      acao: 'excluir',
      entidade: 'produto',
      entidadeId: id,
      descricao: `Excluiu o produto ${p.nome}`
    })
  })
}

export function desfazerExclusaoProduto(db: Banco, relogio: Relogio, id: number): void {
  emTransacao(db, () => {
    const linha = db
      .prepare('SELECT nome FROM produto WHERE id = ? AND excluido_em IS NOT NULL')
      .get(id) as { nome: string } | undefined
    if (!linha) throw new Error('Não há exclusão para desfazer.')
    db.prepare('UPDATE produto SET excluido_em = NULL, alterado_em = ? WHERE id = ?').run(
      relogio.agora(),
      id
    )
    auditar(db, relogio, {
      modulo: 'cadastros',
      acao: 'desfazer',
      entidade: 'produto',
      entidadeId: id,
      descricao: `Desfez a exclusão do produto ${linha.nome}`
    })
  })
}
