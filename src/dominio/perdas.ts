// Perdas: produtos prontos, matéria-prima e trocas em clientes (docs/03 R10; D-032 p.6 e p.25; D-069).
import {
  centavos,
  custoParaCentavos,
  dividirArredondando,
  somarCentavos,
  type Centavos,
  type CustoX10000,
  type QuantidadeX1000
} from './dinheiro'
import { formatarQuantidade } from './formatar'
import { pluralizar } from './receita'

export type TipoPerda = 'produto' | 'materia_prima' | 'troca'

export const TIPOS_PERDA: readonly TipoPerda[] = ['produto', 'materia_prima', 'troca']

export const NOME_TIPO_PERDA: Record<TipoPerda, string> = {
  produto: 'Produtos prontos',
  materia_prima: 'Matéria-prima',
  troca: 'Troca'
}

/** Motivos de cada tipo (R10); o primeiro já vem escolhido. */
export const MOTIVOS_PERDA: Record<TipoPerda, readonly string[]> = {
  produto: ['Venceu', 'Derreteu', 'Quebrou ou amassou', 'Outro'],
  materia_prima: ['Venceu', 'Estragou', 'Quebrou', 'Outro'],
  troca: ['Venceu no cliente', 'Derreteu no cliente', 'Embalagem com defeito', 'Outro']
}

/**
 * Valor de um item perdido: quantidade (×1.000) × custo de cada (×10.000).
 * Produto pronto e troca: custo de fazer da receita; matéria-prima: preço pago (R10).
 */
export function valorDoItem(quantidade: QuantidadeX1000, custo: CustoX10000): Centavos {
  return custoParaCentavos(Number(dividirArredondando(BigInt(quantidade) * BigInt(custo), 1000n)))
}

export function valorDaPerda(
  itens: readonly { quantidade: QuantidadeX1000; custo: CustoX10000 }[]
): Centavos {
  return somarCentavos(itens.map((i) => valorDoItem(i.quantidade, i.custo)))
}

/**
 * Como a quantidade aparece: "4 kg", "1 L", "10 un", "2 potes".
 * Produto cujo nome já diz o que é ("Paleta de Morango", categoria "paleta") fica em "un".
 */
export function rotuloDoProduto(nomeReceita: string, nomeUnidade: string, qtd: number): string {
  const u = nomeUnidade.trim()
  if (!u || nomeReceita.trim().toLowerCase().startsWith(u.toLowerCase())) return 'un'
  return qtd === 1 ? u : pluralizar(u)
}

/** "4 kg Morango · 2 kg Manga" */
export function textoDosItens(
  itens: readonly { nome: string; quantidade: QuantidadeX1000; rotulo: string }[]
): string {
  return itens.map((i) => `${formatarQuantidade(i.quantidade)} ${i.rotulo} ${i.nome}`).join(' · ')
}

export interface PerdaParaResumo {
  tipo: TipoPerda
  clienteId: number | null
  clienteNome: string | null
  valor: Centavos
}

export interface TrocasDoCliente {
  clienteId: number
  clienteNome: string
  trocas: number
  valor: Centavos
  /** Tamanho da barra: % do cliente que mais perdeu (0 a 100). */
  barra: number
}

export interface ResumoDasPerdas {
  total: Centavos
  registros: number
  porTipo: Record<TipoPerda, { valor: Centavos; registros: number }>
  porCliente: TrocasDoCliente[]
}

/** Resumo do mês: total, por tipo e trocas por cliente (do que mais perdeu para o que menos). */
export function resumirPerdas(perdas: readonly PerdaParaResumo[]): ResumoDasPerdas {
  const porTipo = {} as ResumoDasPerdas['porTipo']
  for (const t of TIPOS_PERDA) {
    const doTipo = perdas.filter((p) => p.tipo === t)
    porTipo[t] = { valor: somarCentavos(doTipo.map((p) => p.valor)), registros: doTipo.length }
  }
  const clientes = new Map<number, { nome: string; trocas: number; valor: number }>()
  for (const p of perdas) {
    if (p.tipo !== 'troca' || p.clienteId === null) continue
    const c = clientes.get(p.clienteId) ?? { nome: p.clienteNome ?? '', trocas: 0, valor: 0 }
    c.trocas += 1
    c.valor += p.valor
    clientes.set(p.clienteId, c)
  }
  const maior = Math.max(0, ...[...clientes.values()].map((c) => c.valor))
  const porCliente = [...clientes.entries()]
    .map(([clienteId, c]) => ({
      clienteId,
      clienteNome: c.nome,
      trocas: c.trocas,
      valor: centavos(c.valor),
      barra: maior > 0 ? Math.round((c.valor * 100) / maior) : 0
    }))
    .sort((a, b) => b.valor - a.valor || a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'))
  return {
    total: somarCentavos(perdas.map((p) => p.valor)),
    registros: perdas.length,
    porTipo,
    porCliente
  }
}

/**
 * Matéria-prima que vai ficar negativa (D-068 item 3, D-069): o que o registro tira
 * contra o que tem, somando o que o próprio registro já tinha tirado (na edição).
 */
export function faltaParaAPerda(
  pedidos: readonly { itemId: number; quantidade: QuantidadeX1000 }[],
  tem: ReadonlyMap<number, QuantidadeX1000>,
  jaTirado: ReadonlyMap<number, QuantidadeX1000> = new Map()
): number[] {
  const porItem = new Map<number, number>()
  for (const p of pedidos) porItem.set(p.itemId, (porItem.get(p.itemId) ?? 0) + p.quantidade)
  return [...porItem.entries()]
    .filter(([id, q]) => q > (tem.get(id) ?? 0) + (jaTirado.get(id) ?? 0))
    .map(([id]) => id)
}
