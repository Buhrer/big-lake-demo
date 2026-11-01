// Históricos (balcão, pedidos, vendas por dia e o que foi feito): mostram os últimos 10
// e cada "Ver mais" traz mais 10 (D-085, D-086).
import { nomeDoMes } from './datas'

export const PRIMEIROS = 10
export const A_CADA_VER_MAIS = 10

/** Quantos o "Ver mais" ainda traz (0 = já mostra tudo). */
export function quantosMais(mostrando: number, total: number): number {
  return Math.max(0, Math.min(A_CADA_VER_MAIS, total - mostrando))
}

/** "2026-10" → "Outubro de 2026" */
export function nomeDoMesDoFiltro(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  const nome = nomeDoMes(mes)
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`
}
