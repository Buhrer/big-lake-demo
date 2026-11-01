import { z } from 'zod'
import {
  EMPRESA_PADRAO,
  PREFERENCIAS_PADRAO,
  textosEmpresa,
  textosPreferencias,
  type Empresa,
  type Preferencias
} from '../../dominio/sistema'
import { emTransacao, type Banco } from '../banco/conexao'
import type { Relogio } from '../relogio'
import { auditar } from './auditoria'

export const esquemaPreferencias = z.object({
  tamanhoPadrao: z.enum(['pequena', 'normal', 'grande', 'muito_grande']),
  ajudaLigada: z.boolean(),
  backupAoFechar: z.boolean()
})

const texto = z.string().trim().max(200)
export const esquemaEmpresa = z.object({
  nome: texto.min(1, 'Digite o nome da empresa.'),
  cnpj: texto,
  telefone: texto,
  endereco: texto
})

function ler<T>(db: Banco, chave: string, esquema: z.ZodType<T>, padrao: T): T {
  const linha = db.prepare('SELECT valor FROM config WHERE chave = ?').get(chave) as
    { valor: string } | undefined
  if (!linha) return padrao
  const r = esquema.safeParse({ ...padrao, ...JSON.parse(linha.valor) })
  return r.success ? r.data : padrao
}

function gravar(db: Banco, relogio: Relogio, chave: string, valor: unknown): void {
  db.prepare(
    `INSERT INTO config (chave, valor, alterado_em) VALUES (?, ?, ?)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor, alterado_em = excluded.alterado_em`
  ).run(chave, JSON.stringify(valor), relogio.agora())
}

export function obterPreferencias(db: Banco): Preferencias {
  return ler(db, 'preferencias', esquemaPreferencias, PREFERENCIAS_PADRAO)
}

/** Grava as preferências sem histórico (ao apagar todos os dados, elas continuam; D-076). */
export function manterPreferencias(db: Banco, relogio: Relogio, p: Preferencias): void {
  gravar(db, relogio, 'preferencias', esquemaPreferencias.parse(p))
}

export function salvarPreferencias(db: Banco, relogio: Relogio, novas: Preferencias): Preferencias {
  const depois = esquemaPreferencias.parse(novas)
  return emTransacao(db, () => {
    const antes = obterPreferencias(db)
    gravar(db, relogio, 'preferencias', depois)
    for (const descricao of textosPreferencias(antes, depois)) {
      auditar(db, relogio, { modulo: 'configuracoes', acao: 'alterar', descricao, antes, depois })
    }
    return depois
  })
}

export function obterEmpresa(db: Banco): Empresa {
  return ler(db, 'empresa', esquemaEmpresa, EMPRESA_PADRAO)
}

export function salvarEmpresa(db: Banco, relogio: Relogio, nova: Empresa): Empresa {
  const depois = esquemaEmpresa.parse(nova)
  return emTransacao(db, () => {
    const antes = obterEmpresa(db)
    const descricao = textosEmpresa(antes, depois)
    if (!descricao) return antes
    gravar(db, relogio, 'empresa', depois)
    auditar(db, relogio, { modulo: 'configuracoes', acao: 'alterar', descricao, antes, depois })
    return depois
  })
}
