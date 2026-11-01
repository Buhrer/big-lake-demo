// Início: meta do mês (ponto de equilíbrio) e avisos de hoje (docs/02 §1, docs/03 R13; D-072).
import { centavos, somarCentavos, type Centavos, type QuantidadeX1000 } from './dinheiro'
import { diferencaEmDias, type DataISO } from './datas'

export interface MetaDoMes {
  meta: Centavos
  vendido: Centavos
  /** 0 a 100 (inteiro, para baixo; 100 quando bateu a meta) */
  percentual: number
  falta: Centavos
  /** null quando ainda não há venda no mês (sem ritmo) ou a meta já foi batida */
  diasFaltam: number | null
  batida: boolean
}

/**
 * R13: meta = contas do mês; falta = meta − vendido;
 * dias que faltam = falta ÷ média por dia com venda, arredondado para cima.
 */
export function metaDoMes(meta: Centavos, vendido: Centavos, diasComVenda: number): MetaDoMes {
  const batida = vendido >= meta
  const falta = centavos(Math.max(0, meta - vendido))
  const percentual = meta <= 0 || batida ? 100 : Math.floor((vendido * 100) / meta)
  let diasFaltam: number | null = null
  if (!batida && vendido > 0 && diasComVenda > 0) {
    // falta ÷ (vendido ÷ dias) = falta × dias ÷ vendido, para cima
    diasFaltam = Math.ceil((falta * diasComVenda) / vendido)
  }
  return { meta, vendido, percentual, falta, diasFaltam, batida }
}

/** Contas do mês para a meta: vencem no mês (pagas ou não), sem a fatura do cartão da empresa (D-061). */
export function contasDoMes(
  contas: readonly { vencimento: DataISO; valor: Centavos; fatura: boolean }[],
  anoMes: string
): Centavos {
  return somarCentavos(
    contas.filter((c) => !c.fatura && c.vencimento.slice(0, 7) === anoMes).map((c) => c.valor)
  )
}

export interface ItemParaAviso {
  id: number
  nome: string
  rotulo: string
  quantidade: QuantidadeX1000
  minimo: QuantidadeX1000
  lotes: readonly { validade: DataISO | null; quantidade: QuantidadeX1000 }[]
}

/** Abaixo do mínimo (só quem tem mínimo), do que mais falta (em proporção) para o que menos. */
export function estoqueBaixo<T extends ItemParaAviso>(itens: readonly T[]): T[] {
  return itens
    .filter((i) => i.minimo > 0 && i.quantidade < i.minimo)
    .sort(
      (a, b) =>
        a.quantidade / a.minimo - b.quantidade / b.minimo || a.nome.localeCompare(b.nome, 'pt-BR')
    )
}

export interface Vencendo {
  itemId: number
  nome: string
  rotulo: string
  quantidade: QuantidadeX1000
  validade: DataISO
  /** dias até vencer (negativo = já venceu) */
  dias: number
}

/** Compras com saldo que vencem em até 7 dias (D-032 p.5), ou já venceram; a que vence antes primeiro. */
export function vencendoEmBreve(
  itens: readonly ItemParaAviso[],
  hoje: DataISO,
  antes = 7
): Vencendo[] {
  const lista: Vencendo[] = []
  for (const i of itens) {
    for (const l of i.lotes) {
      if (l.validade === null || l.quantidade <= 0) continue
      const dias = diferencaEmDias(hoje, l.validade)
      if (dias > antes) continue
      lista.push({
        itemId: i.id,
        nome: i.nome,
        rotulo: i.rotulo,
        quantidade: l.quantidade,
        validade: l.validade,
        dias
      })
    }
  }
  return lista.sort(
    (a, b) => a.validade.localeCompare(b.validade) || a.nome.localeCompare(b.nome, 'pt-BR')
  )
}

/** "em 2 dias" · "amanhã" · "hoje" · "venceu" */
export function textoDoVencimento(dias: number): string {
  if (dias < 0) return 'venceu'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  return `em ${dias} dias`
}

/** "vence amanhã, 17/10" · "vence em 3 dias, 19/10" · "atrasada, venceu 14/10" */
export function textoDaConta(vencimento: DataISO, hoje: DataISO): string {
  const dias = diferencaEmDias(hoje, vencimento)
  const dm = `${vencimento.slice(8, 10)}/${vencimento.slice(5, 7)}`
  if (dias < 0) return `atrasada, venceu ${dm}`
  if (dias === 0) return `vence hoje, ${dm}`
  if (dias === 1) return `vence amanhã, ${dm}`
  return `vence em ${dias} dias, ${dm}`
}
