// Formatação e leitura no padrão brasileiro. Implementação própria (sem Intl)
// para o resultado ser sempre o mesmo, sem espaço especial entre "R$" e o número.
import {
  centavos,
  custoParaCentavos,
  type Centavos,
  type CustoX10000,
  type PercentualX100,
  type QuantidadeX1000
} from './dinheiro'

const MENOS = '−'

function agruparMilhar(inteiro: string): string {
  return inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Inteiro em escala 10^casas → "1.234,5" (casas fixas ou sem zeros à direita). */
function formatarEscalado(valor: number, casas: number, fixas: boolean): string {
  const negativo = valor < 0
  const texto = String(Math.abs(valor)).padStart(casas + 1, '0')
  const inteiro = agruparMilhar(texto.slice(0, texto.length - casas))
  let decimal = texto.slice(texto.length - casas)
  if (!fixas) decimal = decimal.replace(/0+$/, '')
  return (negativo ? MENOS : '') + inteiro + (decimal ? ',' + decimal : '')
}

export function formatarReais(valor: Centavos): string {
  const texto = formatarEscalado(Math.abs(valor), 2, true)
  return (valor < 0 ? MENOS : '') + 'R$ ' + texto
}

/** Custo com 4 casas exibido com 2 (R$ 2,8264 → "R$ 2,83"). */
export function formatarCusto(custo: CustoX10000): string {
  return formatarReais(custoParaCentavos(custo))
}

export function formatarQuantidade(quantidade: QuantidadeX1000): string {
  return formatarEscalado(quantidade, 3, false)
}

export function formatarPercentual(percentual: PercentualX100): string {
  return formatarEscalado(percentual, 2, false) + '%'
}

/**
 * Lê um número digitado ("1.234,56", "412.50", "R$ 7,5") numa escala de 10^casas.
 * Vírgula é decimal. Sem vírgula, um ponto seguido de 1 ou 2 dígitos no fim é decimal;
 * senão é separador de milhar. Retorna null quando não é um número válido.
 */
function lerEscalado(texto: string, casas: number): number | null {
  let t = texto.replace(/R\$/g, '').replace(/\s/g, '')
  if (!t) return null
  if (!t.includes(',')) {
    const decimalComPonto = /^\d+\.\d{1,2}$/.test(t) && casas >= 2
    t = decimalComPonto ? t.replace('.', ',') : t
  }
  const partes = t.split(',')
  if (partes.length > 2) return null
  const [inteiroBruto = '', decimal = ''] = partes
  const inteiroOk = /^\d{1,3}(\.\d{3})*$/.test(inteiroBruto) || /^\d+$/.test(inteiroBruto)
  if (!inteiroOk) return null
  if (partes.length === 2 && !/^\d+$/.test(decimal)) return null
  if (decimal.length > casas) return null
  const digitos = inteiroBruto.replace(/\./g, '') + decimal.padEnd(casas, '0')
  const valor = Number(digitos)
  return Number.isSafeInteger(valor) ? valor : null
}

/** R$ 100 milhões: o maior valor que o banco aceita (o mesmo limite dos serviços). */
const MAIOR_VALOR = 100_000_000_00

export function lerReais(texto: string): Centavos | null {
  const v = lerEscalado(texto, 2)
  return v === null || v > MAIOR_VALOR ? null : centavos(v)
}

/**
 * Por que o texto não virou número, em palavras simples (D-089). Só faz sentido quando
 * o campo não está vazio e a leitura deu null.
 */
export function motivoNumeroErrado(texto: string): string {
  if (texto.includes('-')) return 'Não use o sinal de menos.'
  const inteiro = texto.replace(/R\$|\s/g, '').split(',')[0] ?? ''
  if (/^[\d.]+$/.test(inteiro) && inteiro.replace(/\./g, '').length > 9)
    return 'Número grande demais. Confira.'
  return 'Número com erro. Use só algarismos e vírgula, como 1.234,56.'
}

export function lerQuantidade(texto: string): QuantidadeX1000 | null {
  return lerEscalado(texto, 3)
}
