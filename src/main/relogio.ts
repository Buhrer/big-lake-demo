import { lerData, type DataHoraISO, type DataISO } from '../dominio/datas'

export interface Relogio {
  hoje(): DataISO
  /** Data e hora local com fuso: "2026-10-16T08:02:15-03:00". */
  agora(): DataHoraISO
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Relógio do computador. BIGLAKE_HOJE (dd/mm/aaaa) fixa a data nos testes;
 * a hora continua a do computador.
 */
export const relogioDoComputador: Relogio = {
  hoje() {
    return this.agora().slice(0, 10)
  },
  agora() {
    const d = new Date()
    const fixa = process.env.BIGLAKE_HOJE ? lerData(process.env.BIGLAKE_HOJE) : null
    const data =
      fixa ?? `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`
    const hora = `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}:${doisDigitos(d.getSeconds())}`
    const fuso = -d.getTimezoneOffset()
    const sinal = fuso >= 0 ? '+' : '-'
    const abs = Math.abs(fuso)
    return `${data}T${hora}${sinal}${doisDigitos(Math.floor(abs / 60))}:${doisDigitos(abs % 60)}`
  }
}
