// Contas a pagar (docs/03 R11; D-032 p.18 e p.24, D-061).
import { somarCentavos, type Centavos, type QuantidadeX1000 } from './dinheiro'
import { diferencaEmDias, ultimoDiaDoMes, type DataISO } from './datas'
import { formatarQuantidade } from './formatar'

export type FormaPagamentoConta =
  'dinheiro' | 'pix' | 'boleto' | 'transferencia' | 'debito' | 'credito'

export const FORMAS_DE_PAGAR_CONTA: FormaPagamentoConta[] = [
  'dinheiro',
  'pix',
  'boleto',
  'transferencia',
  'debito',
  'credito'
]

export const NOME_DA_FORMA_CONTA: Record<FormaPagamentoConta, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  debito: 'Cartão de débito',
  credito: 'Cartão de crédito'
}

export function formaUsaCartao(forma: FormaPagamentoConta): boolean {
  return forma === 'debito' || forma === 'credito'
}

/** "Avisar quantos dias antes?" */
export const DIAS_DE_AVISO = [1, 3, 5, 7] as const
export type DiasDeAviso = (typeof DIAS_DE_AVISO)[number]

/** Tipos que já vêm no sistema (docs/02 §7); "Fatura do cartão da empresa" é especial (D-061). */
export const TIPOS_DE_CONTA_PADRAO = [
  'Fornecedor',
  'Energia',
  'Contas fixas',
  'Aluguel',
  'Funcionários',
  'Serviços',
  'Manutenção',
  'Outros'
]
export const NOME_TIPO_FATURA = 'Fatura do cartão da empresa'

export interface Etiqueta {
  texto: string
  nivel: 'ok' | 'erro' | 'atencao' | 'info'
}

/** Etiqueta embaixo da data: Paga, Atrasada, Hoje, Amanhã, Em N dias. */
export function etiquetaDaConta(
  vencimento: DataISO,
  pagoEm: DataISO | null,
  hoje: DataISO
): Etiqueta {
  if (pagoEm) return { texto: 'Paga', nivel: 'ok' }
  const dias = diferencaEmDias(hoje, vencimento)
  if (dias < 0) return { texto: 'Atrasada', nivel: 'erro' }
  if (dias === 0) return { texto: 'Hoje', nivel: 'erro' }
  if (dias === 1) return { texto: 'Amanhã', nivel: 'erro' }
  return { texto: `Em ${dias} dias`, nivel: dias <= 3 ? 'erro' : dias <= 7 ? 'atencao' : 'info' }
}

/** R11: aparece no Início e na bolinha do menu quando hoje ≥ vencimento − dias de aviso. */
export function deveAvisar(
  c: { vencimento: DataISO; avisarDias: number; pagoEm: DataISO | null },
  hoje: DataISO
): boolean {
  return c.pagoEm === null && diferencaEmDias(hoje, c.vencimento) <= c.avisarDias
}

interface Soma {
  valor: Centavos
  quantidade: number
}

function somar(lista: readonly { valor: Centavos }[]): Soma {
  return { valor: somarCentavos(lista.map((c) => c.valor)), quantidade: lista.length }
}

/** Os três cards do alto de Contas a pagar. */
export function resumoDasContas(
  contas: readonly { vencimento: DataISO; valor: Centavos; pagoEm: DataISO | null }[],
  hoje: DataISO
): { proximos7: Soma; atrasadas: Soma; pagasNoMes: Soma } {
  const abertas = contas.filter((c) => c.pagoEm === null)
  const dias = (c: { vencimento: DataISO }) => diferencaEmDias(hoje, c.vencimento)
  return {
    proximos7: somar(abertas.filter((c) => dias(c) >= 0 && dias(c) <= 7)),
    atrasadas: somar(abertas.filter((c) => dias(c) < 0)),
    pagasNoMes: somar(contas.filter((c) => c.pagoEm?.slice(0, 7) === hoje.slice(0, 7)))
  }
}

/** Vencimento da conta que repete no mês "AAAA-MM": dia 31 num mês de 30 dias vira 30. */
export function vencimentoNoMes(diaOriginal: number, anoMes: string): DataISO {
  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  const dia = Math.min(diaOriginal, ultimoDiaDoMes(ano, mes))
  return `${anoMes}-${String(dia).padStart(2, '0')}`
}

export function mesSeguinte(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, '0')}`
}

export function mesAnterior(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  return mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, '0')}`
}

/**
 * Meses em que a conta que repete precisa ser criada, do mês seguinte ao da
 * última conta até o mês de hoje (a conta do mês nasce no dia 1º, D-032 p.18).
 */
export function mesesParaGerar(ultimoVencimento: DataISO, hoje: DataISO): string[] {
  const meses: string[] = []
  let m = mesSeguinte(ultimoVencimento.slice(0, 7))
  while (m <= hoje.slice(0, 7)) {
    meses.push(m)
    m = mesSeguinte(m)
  }
  return meses
}

/** "pago com Pix" · "pago com cartão de crédito (Final 4421 · pessoal do Carlos · reembolso)" */
export function textoDoPagamento(
  forma: FormaPagamentoConta,
  cartao: { nome: string; dono: string | null } | null
): string {
  const nome = forma === 'pix' ? 'Pix' : NOME_DA_FORMA_CONTA[forma].toLowerCase()
  if (!cartao) return `pago com ${nome}`
  const dono = cartao.dono ? `pessoal do ${cartao.dono} · reembolso` : 'da empresa'
  return `pago com ${nome} (${cartao.nome} · ${dono})`
}

/** Nome da conta que nasce da compra no "Chegou mercadoria" (D-092): "Morango 10 kg · Hortifruti". */
export function nomeDaContaDaCompra(
  item: string,
  quantidade: QuantidadeX1000,
  rotulo: string,
  fornecedor: string | null
): string {
  const nome = `${item} ${formatarQuantidade(quantidade)} ${rotulo}${fornecedor ? ` · ${fornecedor.trim()}` : ''}`
  return nome.length <= 120 ? nome : nome.slice(0, 119).trimEnd() + '…'
}
