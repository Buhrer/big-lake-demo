// Clientes e fornecedores: cadastrar, corrigir e listar (com histórico).
import { z } from 'zod'
import type { DadosCliente, DadosFornecedor } from '../../compartilhado/contrato'
import {
  descreverMudancas,
  documentoValido,
  formatarDocumento,
  formatarTelefone
} from '../../dominio/cadastros'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'

const texto = z.string().trim().max(200)
const nome = texto.min(1, 'Digite o nome.')
const telefone = texto.transform(formatarTelefone)
const documento = texto
  .refine(documentoValido, 'CPF ou CNPJ com algum número errado. Confira.')
  .transform(formatarDocumento)

export const esquemaCliente = z.object({
  nome,
  telefone,
  documento,
  rua: texto,
  numero: texto.max(20),
  bairro: texto,
  cidade: texto
})

export const esquemaFornecedor = z.object({
  nome,
  telefone,
  documento,
  contato: texto,
  oQueFornece: texto
})

interface Definicao<T extends Record<keyof T, string> & { nome: string }> {
  tabela: 'cliente' | 'fornecedor'
  /** "o cliente" / "o fornecedor" (para as frases do histórico) */
  nomeNaFrase: string
  /** "do cliente" / "do fornecedor" */
  doNaFrase: string
  /** propriedade → coluna no banco */
  colunas: Record<keyof T, string>
  rotulos: Record<keyof T, string>
  esquema: z.ZodType<T>
  /** Por que não dá para excluir ("fornece 3 itens do estoque"), ou null. */
  emUso(db: Banco, id: number): string | null
}

function servicoDeCadastro<T extends Record<keyof T, string> & { nome: string }>(
  def: Definicao<T>
) {
  const chaves = Object.keys(def.colunas) as (keyof T)[]
  const colunasSql = chaves.map((c) => def.colunas[c]).join(', ')

  function deLinha(linha: Record<string, unknown>): T & { id: number } {
    const dados = { id: Number(linha.id) } as T & { id: number }
    for (const c of chaves) (dados as Record<keyof T, unknown>)[c] = String(linha[def.colunas[c]])
    return dados
  }

  function obter(db: Banco, id: number): (T & { id: number }) | null {
    const linha = db
      .prepare(`SELECT id, ${colunasSql} FROM ${def.tabela} WHERE id = ? AND excluido_em IS NULL`)
      .get(id) as Record<string, unknown> | undefined
    return linha ? deLinha(linha) : null
  }

  return {
    listar(db: Banco): (T & { id: number })[] {
      return (
        db
          .prepare(
            `SELECT id, ${colunasSql} FROM ${def.tabela} WHERE excluido_em IS NULL
             ORDER BY nome COLLATE NOCASE`
          )
          .all() as Record<string, unknown>[]
      ).map(deLinha)
    },

    obter,

    /** Cadastra (id null) ou corrige. Devolve o id. */
    salvar(db: Banco, relogio: Relogio, id: number | null, entrada: unknown): number {
      const dados = def.esquema.parse(entrada)
      return emTransacao(db, () => {
        const agora = relogio.agora()
        const valores = chaves.map((c) => dados[c])
        if (id === null) {
          const r = db
            .prepare(
              `INSERT INTO ${def.tabela} (${colunasSql}, criado_em, alterado_em)
               VALUES (${chaves.map(() => '?').join(', ')}, ?, ?)`
            )
            .run(...valores, agora, agora)
          const novoId = Number(r.lastInsertRowid)
          auditar(db, relogio, {
            modulo: 'cadastros',
            acao: 'criar',
            entidade: def.tabela,
            entidadeId: novoId,
            descricao: `Cadastrou ${def.nomeNaFrase} ${dados.nome}`,
            depois: dados
          })
          return novoId
        }
        const antes = obter(db, id)
        if (!antes) throw new Error('Cadastro não encontrado.')
        const mudancas = descreverMudancas<Record<string, unknown>>(def.rotulos, antes, dados)
        if (!mudancas) return id
        db.prepare(
          `UPDATE ${def.tabela} SET ${chaves.map((c) => `${def.colunas[c]} = ?`).join(', ')},
           alterado_em = ? WHERE id = ?`
        ).run(...valores, agora, id)
        auditar(db, relogio, {
          modulo: 'cadastros',
          acao: 'alterar',
          entidade: def.tabela,
          entidadeId: id,
          descricao: `Mudou o cadastro ${def.doNaFrase} ${antes.nome}: ${mudancas}`,
          antes,
          depois: dados
        })
        return id
      })
    },

    /** Por que não dá para excluir, ou null (D-038). */
    emUso(db: Banco, id: number): string | null {
      return def.emUso(db, id)
    },

    excluir(db: Banco, relogio: Relogio, id: number): void {
      emTransacao(db, () => {
        const atual = obter(db, id)
        if (!atual) throw new Error('Cadastro não encontrado.')
        const motivo = def.emUso(db, id)
        if (motivo) throw new Error(`Não dá para excluir: ${motivo}.`)
        db.prepare(`UPDATE ${def.tabela} SET excluido_em = ? WHERE id = ?`).run(relogio.agora(), id)
        auditar(db, relogio, {
          modulo: 'cadastros',
          acao: 'excluir',
          entidade: def.tabela,
          entidadeId: id,
          descricao: `Excluiu ${def.nomeNaFrase} ${atual.nome}`
        })
      })
    },

    desfazerExclusao(db: Banco, relogio: Relogio, id: number): void {
      emTransacao(db, () => {
        const linha = db
          .prepare(`SELECT nome FROM ${def.tabela} WHERE id = ? AND excluido_em IS NOT NULL`)
          .get(id) as { nome: string } | undefined
        if (!linha) throw new Error('Não há exclusão para desfazer.')
        db.prepare(`UPDATE ${def.tabela} SET excluido_em = NULL, alterado_em = ? WHERE id = ?`).run(
          relogio.agora(),
          id
        )
        auditar(db, relogio, {
          modulo: 'cadastros',
          acao: 'desfazer',
          entidade: def.tabela,
          entidadeId: id,
          descricao: `Desfez a exclusão ${def.doNaFrase} ${linha.nome}`
        })
      })
    }
  }
}

export const clientes = servicoDeCadastro<DadosCliente>({
  tabela: 'cliente',
  nomeNaFrase: 'o cliente',
  doNaFrase: 'do cliente',
  colunas: {
    nome: 'nome',
    telefone: 'telefone',
    documento: 'documento',
    rua: 'rua',
    numero: 'numero',
    bairro: 'bairro',
    cidade: 'cidade'
  },
  rotulos: {
    nome: 'nome',
    telefone: 'telefone',
    documento: 'CPF/CNPJ',
    rua: 'rua',
    numero: 'número',
    bairro: 'bairro',
    cidade: 'cidade'
  },
  esquema: esquemaCliente,
  emUso(db, id) {
    const n = (
      db.prepare('SELECT count(*) AS n FROM pedido WHERE cliente_id = ?').get(id) as { n: number }
    ).n
    if (n > 0) return n === 1 ? 'tem 1 pedido' : 'tem ' + n + ' pedidos'
    // D-069: troca em Perdas também prende o cliente, como o pedido (D-038)
    const t = (
      db
        .prepare('SELECT count(*) AS n FROM perda WHERE cliente_id = ? AND excluido_em IS NULL')
        .get(id) as { n: number }
    ).n
    if (t === 0) return null
    return t === 1 ? 'tem 1 troca em Perdas' : 'tem ' + t + ' trocas em Perdas'
  }
})

export const fornecedores = servicoDeCadastro<DadosFornecedor>({
  tabela: 'fornecedor',
  nomeNaFrase: 'o fornecedor',
  doNaFrase: 'do fornecedor',
  colunas: {
    nome: 'nome',
    telefone: 'telefone',
    documento: 'documento',
    contato: 'contato',
    oQueFornece: 'o_que_fornece'
  },
  rotulos: {
    nome: 'nome',
    telefone: 'telefone',
    documento: 'CNPJ/CPF',
    contato: 'pessoa de contato',
    oQueFornece: 'o que fornece'
  },
  esquema: esquemaFornecedor,
  emUso(db, id) {
    const itens = (
      db
        .prepare(
          'SELECT count(*) AS n FROM item_estoque WHERE fornecedor_id = ? AND excluido_em IS NULL'
        )
        .get(id) as { n: number }
    ).n
    if (itens > 0)
      return itens === 1 ? 'fornece 1 item do estoque' : `fornece ${itens} itens do estoque`
    const compras = (
      db
        .prepare('SELECT count(*) AS n FROM entrada_mercadoria WHERE fornecedor_id = ?')
        .get(id) as {
        n: number
      }
    ).n
    if (compras > 0)
      return compras === 1 ? 'tem 1 compra registrada' : `tem ${compras} compras registradas`
    return null
  }
})
