// Regras do estoque de matéria-prima e insumos (docs/03 R2, R6; D-036, D-040).
import {
  dividirArredondando,
  percentualInteiro,
  type Centavos,
  type CustoX10000,
  type QuantidadeX1000
} from './dinheiro'
import { diferencaEmDias, formatarData, type DataISO } from './datas'
import { formatarQuantidade, formatarReais } from './formatar'

export type TipoInsumo = 'materia_prima' | 'insumo'
export type Unidade = 'un' | 'L' | 'kg'

export const NOME_DA_MEDIDA: Record<Unidade, string> = {
  un: 'unidade',
  L: 'litro',
  kg: 'quilo'
}

/** Uma compra com saldo e validade. `id` null = compra nova, ainda não gravada. */
export interface Lote {
  id: number | null
  validade: DataISO | null
  quantidade: QuantidadeX1000
}

export interface EstadoEstoque {
  /** Pode ficar negativo (produção sem estoque, pergunta 31). */
  quantidade: QuantidadeX1000
  lotes: Lote[]
}

/** valor pago ÷ quantidade, com 4 casas. */
export function custoPorUnidade(valorPago: Centavos, quantidade: QuantidadeX1000): CustoX10000 {
  if (quantidade <= 0) throw new RangeError('Digite a quantidade.')
  // centavos × 100 = reais×10.000; ÷ (quantidade/1.000)
  return Number(dividirArredondando(BigInt(valorPago) * 100_000n, BigInt(quantidade)))
}

/** Custo digitado em reais (2 casas) → 4 casas. */
export function custoDeReais(valor: Centavos): CustoX10000 {
  return valor * 100
}

export function rotuloUnidade(unidade: Unidade, nomeDaUnidade: string | null): string {
  return (unidade === 'un' && nomeDaUnidade?.trim()) || unidade
}

export function situacao(quantidade: QuantidadeX1000, minimo: QuantidadeX1000): 'ok' | 'comprar' {
  return quantidade < minimo ? 'comprar' : 'ok'
}

/** Ordem de saída: vence antes, sai antes; sem validade, por último. */
function ordemDeSaida(a: Lote, b: Lote): number {
  if (a.validade === b.validade) return (a.id ?? Infinity) - (b.id ?? Infinity)
  if (a.validade === null) return 1
  if (b.validade === null) return -1
  return a.validade.localeCompare(b.validade)
}

/** Tira `quantidade` do estoque, das compras que vencem antes. Devolve as compras na ordem original. */
export function baixar(estado: EstadoEstoque, quantidade: QuantidadeX1000): EstadoEstoque {
  let falta = quantidade
  const novos = new Map<Lote, number>()
  for (const lote of [...estado.lotes].sort(ordemDeSaida)) {
    const tirar = Math.min(falta, lote.quantidade)
    novos.set(lote, lote.quantidade - tirar)
    falta -= tirar
  }
  return {
    quantidade: estado.quantidade - quantidade,
    lotes: estado.lotes.map((l) => ({ ...l, quantidade: novos.get(l) ?? l.quantidade }))
  }
}

/** Soma uma compra. Se o estoque estava negativo, a compra só fica com o que sobrar. */
export function entrar(
  estado: EstadoEstoque,
  quantidade: QuantidadeX1000,
  validade: DataISO | null
): EstadoEstoque {
  const nova = estado.quantidade + quantidade
  const saldoDaCompra = Math.max(nova, 0) - Math.max(estado.quantidade, 0)
  return {
    quantidade: nova,
    lotes:
      saldoDaCompra > 0
        ? [...estado.lotes, { id: null, validade, quantidade: saldoDaCompra }]
        : estado.lotes
  }
}

/** "Quantidade em estoque" corrigida no Editar (D-036). */
export function ajustar(estado: EstadoEstoque, novaQuantidade: QuantidadeX1000): EstadoEstoque {
  const diferenca = novaQuantidade - estado.quantidade
  if (diferenca === 0) return estado
  return diferenca > 0 ? entrar(estado, diferenca, null) : baixar(estado, -diferenca)
}

// ---------- Validade ----------

/** "25/10" se faltam até 31 dias (ou já venceu); senão "03/2027". */
export function validadeCurta(validade: DataISO, hoje: DataISO): string {
  const completa = formatarData(validade)
  return diferencaEmDias(hoje, validade) <= 31 ? completa.slice(0, 5) : completa.slice(3)
}

export interface EtiquetaValidade {
  nivel: 'erro' | 'atencao'
  texto: string
}

export function etiquetaValidade(validade: DataISO, hoje: DataISO): EtiquetaValidade | null {
  const dias = diferencaEmDias(hoje, validade)
  if (dias < 0) return { nivel: 'erro', texto: 'venceu' }
  if (dias === 0) return { nivel: 'erro', texto: 'vence hoje' }
  if (dias === 1) return { nivel: 'erro', texto: 'vence amanhã' }
  if (dias <= 3) return { nivel: 'erro', texto: `vence em ${dias} dias` }
  if (dias <= 7) return { nivel: 'atencao', texto: `vence em ${dias} dias` }
  return null
}

function primeiraAVencer(estado: EstadoEstoque): Lote | null {
  return (
    estado.lotes.filter((l) => l.quantidade > 0 && l.validade !== null).sort(ordemDeSaida)[0] ??
    null
  )
}

/** O que aparece na coluna Validade: "20/10 (6 L)" + etiqueta. */
export function resumoValidade(
  estado: EstadoEstoque,
  hoje: DataISO,
  rotulo: string
): { texto: string; etiqueta: EtiquetaValidade | null } | null {
  const lote = primeiraAVencer(estado)
  if (!lote?.validade) return null
  // espaço que não quebra: "6 L" nunca fica "6" numa linha e "L" na outra
  const parte =
    lote.quantidade < estado.quantidade
      ? ` (${formatarQuantidade(lote.quantidade)}\u00a0${rotulo})`
      : ''
  return {
    texto: validadeCurta(lote.validade, hoje) + parte,
    etiqueta: etiquetaValidade(lote.validade, hoje)
  }
}

export function estaVencendo(estado: EstadoEstoque, hoje: DataISO): boolean {
  const lote = primeiraAVencer(estado)
  return !!lote?.validade && diferencaEmDias(hoje, lote.validade) <= 7
}

// ---------- Custo ----------

/** Quanto o custo subiu, em % inteiro (+29%). null sem custo anterior. */
export function aumentoPercentual(antes: CustoX10000, depois: CustoX10000): number | null {
  if (antes <= 0) return null
  return percentualInteiro(BigInt(depois - antes), BigInt(antes))
}

export function textoEntrada(
  nome: string,
  quantidade: QuantidadeX1000,
  rotulo: string,
  valorPago: Centavos
): string {
  return `Registrou entrada de mercadoria: ${nome} ${formatarQuantidade(quantidade)} ${rotulo} (${formatarReais(valorPago)})`
}

/**
 * Baixa como `baixar`, dizendo quanto saiu de cada compra (para o Desfazer devolver
 * exatamente). O que passar do saldo das compras (estoque negativo) vem com `loteId` null.
 */
export function baixarComDetalhe(
  estado: EstadoEstoque,
  quantidade: QuantidadeX1000
): { estado: EstadoEstoque; saidas: { loteId: number | null; quantidade: QuantidadeX1000 }[] } {
  const novo = baixar(estado, quantidade)
  const saidas: { loteId: number | null; quantidade: QuantidadeX1000 }[] = []
  let dosLotes = 0
  estado.lotes.forEach((l, i) => {
    const saiu = l.quantidade - novo.lotes[i]!.quantidade
    if (saiu > 0) {
      saidas.push({ loteId: l.id, quantidade: saiu })
      dosLotes += saiu
    }
  })
  if (quantidade > dosLotes) saidas.push({ loteId: null, quantidade: quantidade - dosLotes })
  return { estado: novo, saidas }
}
