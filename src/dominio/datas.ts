// Datas do calendário como texto "AAAA-MM-DD", sem fuso e sem o objeto Date:
// uma venda de 16/10 nunca "anda" para 15/10 por causa de horário.
// "Hoje" sempre chega como parâmetro (vem do Relogio no processo principal).

export type DataISO = string
/** "AAAA-MM-DDTHH:MM:SS", com ou sem fuso no fim (hora local da loja). */
export type DataHoraISO = string

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
]
const DIAS_DA_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
]

function bissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  if (mes === 2) return bissexto(ano) ? 29 : 28
  return [4, 6, 9, 11].includes(mes) ? 30 : 31
}

function montar(ano: number, mes: number, dia: number): DataISO {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function partes(data: DataISO): { ano: number; mes: number; dia: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data)
  if (!m) throw new RangeError(`Data inválida: ${data}`)
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) }
}

// Dias desde 1970-01-01 (algoritmo "days from civil", calendário gregoriano).
function paraDias(data: DataISO): number {
  const { ano, mes, dia } = partes(data)
  const a = mes <= 2 ? ano - 1 : ano
  const era = Math.floor(a / 400)
  const anoDaEra = a - era * 400
  const diaDoAno = Math.floor((153 * (mes + (mes > 2 ? -3 : 9)) + 2) / 5) + dia - 1
  const diaDaEra = anoDaEra * 365 + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100) + diaDoAno
  return era * 146097 + diaDaEra - 719468
}

function deDias(dias: number): DataISO {
  const z = dias + 719468
  const era = Math.floor(z / 146097)
  const diaDaEra = z - era * 146097
  const anoDaEra = Math.floor(
    (diaDaEra -
      Math.floor(diaDaEra / 1460) +
      Math.floor(diaDaEra / 36524) -
      Math.floor(diaDaEra / 146096)) /
      365
  )
  const diaDoAno =
    diaDaEra - (365 * anoDaEra + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100))
  const mp = Math.floor((5 * diaDoAno + 2) / 153)
  const dia = diaDoAno - Math.floor((153 * mp + 2) / 5) + 1
  const mes = mp < 10 ? mp + 3 : mp - 9
  const ano = anoDaEra + era * 400 + (mes <= 2 ? 1 : 0)
  return montar(ano, mes, dia)
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return deDias(paraDias(data) + dias)
}

/** Quantos dias de `de` até `ate` (negativo se `ate` vem antes). */
export function diferencaEmDias(de: DataISO, ate: DataISO): number {
  return paraDias(ate) - paraDias(de)
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(data: DataISO): number {
  return (((paraDias(data) + 4) % 7) + 7) % 7
}

/**
 * Mesmo dia no mês seguinte; se não existir, o último dia do mês.
 * `diaOriginal` mantém o dia 31 depois de passar por um mês curto.
 */
export function mesmoDiaNoMesSeguinte(data: DataISO, diaOriginal?: number): DataISO {
  const { ano, mes, dia } = partes(data)
  const novoAno = mes === 12 ? ano + 1 : ano
  const novoMes = mes === 12 ? 1 : mes + 1
  return montar(novoAno, novoMes, Math.min(diaOriginal ?? dia, ultimoDiaDoMes(novoAno, novoMes)))
}

/** "16/10/2026" → "2026-10-16"; null se a data não existe. */
export function lerData(texto: string): DataISO | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim())
  if (!m) return null
  const dia = Number(m[1])
  const mes = Number(m[2])
  const ano = Number(m[3])
  if (mes < 1 || mes > 12 || dia < 1 || dia > ultimoDiaDoMes(ano, mes)) return null
  return montar(ano, mes, dia)
}

export function formatarData(data: DataISO): string {
  const { ano, mes, dia } = partes(data)
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
}

export function nomeDoMes(mes: number): string {
  return MESES[mes - 1] ?? ''
}

/** "Sexta-feira, 16 de outubro de 2026" */
export function dataPorExtenso(data: DataISO): string {
  const { ano, mes, dia } = partes(data)
  const semana = DIAS_DA_SEMANA[diaDaSemana(data)] ?? ''
  return `${semana}, ${dia === 1 ? '1º' : dia} de ${nomeDoMes(mes)} de ${ano}`
}

/** Parte da data de um "AAAA-MM-DDTHH:MM:SS…". */
export function dataDe(dataHora: DataHoraISO): DataISO {
  return dataHora.slice(0, 10)
}

/** "Hoje, 08:02" · "Ontem, 22:15" · "14/10, 22:08" · "31/12/2025, 09:00" */
export function descreverQuando(dataHora: DataHoraISO, hoje: DataISO): string {
  const data = dataDe(dataHora)
  const hora = dataHora.slice(11, 16)
  const dias = diferencaEmDias(data, hoje)
  if (dias === 0) return `Hoje, ${hora}`
  if (dias === 1) return `Ontem, ${hora}`
  const [diaMes, ano] = [formatarData(data).slice(0, 5), partes(data).ano]
  return ano === partes(hoje).ano ? `${diaMes}, ${hora}` : `${formatarData(data)}, ${hora}`
}
