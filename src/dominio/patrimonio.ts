// Patrimônio: bens da empresa e manutenções (docs/02 §9; D-032 p.19; D-066, D-067, D-070).
import { centavos, somarCentavos, type Centavos } from './dinheiro'
import { somarDias, type DataISO } from './datas'

export type TipoManutencao = 'revisao' | 'conserto'

export const NOME_TIPO_MANUTENCAO: Record<TipoManutencao, string> = {
  revisao: 'Revisão',
  conserto: 'Conserto'
}

/** Até quando vale a garantia (dias corridos a partir do dia do serviço); null = sem garantia. */
export function garantiaAte(data: DataISO, dias: number): DataISO | null {
  return dias > 0 ? somarDias(data, dias) : null
}

/** Nome da conta em Contas a pagar: "Troca de óleo e filtros · Furgão de entrega 2019". */
export function nomeDaConta(oQueFoiFeito: string, bem: string): string {
  return `${oQueFoiFeito.trim()} · ${bem.trim()}`
}

/** "03/2022" ↔ "2022-03" (data da compra, só mês e ano). */
export function formatarMesAno(anoMes: string): string {
  const [ano, mes] = anoMes.split('-')
  return `${mes}/${ano}`
}

export function lerMesAno(texto: string): string | null {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(texto.trim())
  if (!m) return null
  const mes = Number(m[1])
  const ano = Number(m[2])
  if (mes < 1 || mes > 12 || ano < 1950 || ano > 2100) return null
  return `${ano}-${String(mes).padStart(2, '0')}`
}

const FILTROS_DO_SISTEMA: Record<string, string> = {
  Veículo: 'Veículos',
  Equipamento: 'Equipamentos',
  Móvel: 'Móveis',
  Informática: 'Informática'
}

/** Filtro da lista de bens, como no protótipo ("Veículos", "Móveis"); tipo criado fica como foi escrito. */
export function nomeDoFiltro(tipo: string): string {
  return FILTROS_DO_SISTEMA[tipo.trim()] ?? tipo.trim()
}

export interface ManutencaoParaResumo {
  bemId: number
  bemNome: string
  data: DataISO
  tipo: TipoManutencao
  valor: Centavos
}

export interface ResumoDasManutencoes {
  gasto: Centavos
  servicos: number
  revisoes: number
  consertos: number
  /** null quando não houve gasto no ano. */
  bemQueMaisGastou: { nome: string; valor: Centavos } | null
}

/** Resumo do ano (cards da aba Manutenções). */
export function resumirManutencoes(
  manutencoes: readonly ManutencaoParaResumo[],
  ano: number
): ResumoDasManutencoes {
  const doAno = manutencoes.filter((m) => m.data.startsWith(`${ano}-`))
  const porBem = new Map<number, { nome: string; valor: number }>()
  for (const m of doAno) {
    const b = porBem.get(m.bemId) ?? { nome: m.bemNome, valor: 0 }
    b.valor += m.valor
    porBem.set(m.bemId, b)
  }
  let maior: { nome: string; valor: number } | null = null
  for (const b of porBem.values()) {
    if (b.valor > 0 && (!maior || b.valor > maior.valor)) maior = b
  }
  return {
    gasto: somarCentavos(doAno.map((m) => m.valor)),
    servicos: doAno.length,
    revisoes: doAno.filter((m) => m.tipo === 'revisao').length,
    consertos: doAno.filter((m) => m.tipo === 'conserto').length,
    bemQueMaisGastou: maior ? { nome: maior.nome, valor: centavos(maior.valor) } : null
  }
}

/** "5 revisões e 3 consertos" · "1 revisão" · "nenhum serviço" */
export function textoDosServicos(revisoes: number, consertos: number): string {
  const r = revisoes === 1 ? '1 revisão' : `${revisoes} revisões`
  const c = consertos === 1 ? '1 conserto' : `${consertos} consertos`
  if (revisoes && consertos) return `${r} e ${c}`
  if (revisoes) return r
  if (consertos) return c
  return 'nenhum serviço'
}
