// Dinheiro sem ponto flutuante (docs/09 §1.2).
//   Centavos        → inteiro (R$ 10,00 = 1000)
//   custo ×10.000   → inteiro com 4 casas (R$ 2,8264 = 28264)
//   quantidade ×1.000, percentual ×100 (1,5% = 150)
// Contas intermediárias em BigInt; arredondamento sempre "meio para cima"
// (negativos: meio para longe do zero).

declare const marcaCentavos: unique symbol
export type Centavos = number & { readonly [marcaCentavos]: true }

/** Custo unitário com 4 casas (×10.000). */
export type CustoX10000 = number
/** Quantidade com 3 casas (×1.000). */
export type QuantidadeX1000 = number
/** Percentual com 2 casas (×100): 1,5% = 150; 100% = 10000. */
export type PercentualX100 = number

function exigirInteiro(valor: number, nome: string): void {
  if (!Number.isSafeInteger(valor)) {
    throw new RangeError(`${nome} precisa ser um inteiro seguro (recebido: ${valor})`)
  }
}

export function centavos(valor: number): Centavos {
  exigirInteiro(valor, 'Centavos')
  return valor as Centavos
}

function paraNumero(valor: bigint): number {
  const n = Number(valor)
  exigirInteiro(n, 'Resultado')
  return n
}

/** Divide arredondando meio para cima (negativos: meio para longe do zero). */
export function dividirArredondando(numerador: bigint, divisor: bigint): bigint {
  if (divisor === 0n) throw new RangeError('Divisão por zero')
  const negativo = numerador < 0n !== divisor < 0n
  const n = numerador < 0n ? -numerador : numerador
  const d = divisor < 0n ? -divisor : divisor
  const resultado = (n * 2n + d) / (d * 2n)
  return negativo ? -resultado : resultado
}

export function somarCentavos(valores: readonly Centavos[]): Centavos {
  let total = 0n
  for (const v of valores) total += BigInt(v)
  return centavos(paraNumero(total))
}

/** valor × percentual, arredondado ao centavo (taxas, divisão dos sócios). */
export function aplicarPercentual(valor: Centavos, percentual: PercentualX100): Centavos {
  exigirInteiro(percentual, 'Percentual')
  return centavos(paraNumero(dividirArredondando(BigInt(valor) * BigInt(percentual), 10000n)))
}

/** Converte custo com 4 casas para centavos (para exibir ou somar em dinheiro). */
export function custoParaCentavos(custo: CustoX10000): Centavos {
  exigirInteiro(custo, 'Custo')
  return centavos(paraNumero(dividirArredondando(BigInt(custo), 100n)))
}

/** Parte ÷ todo em % inteiro ("72% do preço"). Todo zero → 0. Mesma escala nos dois. */
export function percentualInteiro(parte: bigint, todo: bigint): number {
  if (todo === 0n) return 0
  return paraNumero(dividirArredondando(parte * 100n, todo))
}

/** Arredonda para cima ao múltiplo (ex.: 50 centavos no reajuste da Gordurinha). */
export function arredondarParaCimaMultiplo(valor: Centavos, multiplo: number): Centavos {
  exigirInteiro(multiplo, 'Múltiplo')
  const resto = valor % multiplo
  if (resto === 0) return valor
  return centavos(valor + (valor > 0 ? multiplo - resto : -resto))
}
