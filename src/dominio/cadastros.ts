// Regras dos cadastros (clientes e fornecedores): formatos, conferência e busca.

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

/** "(11) 3456-7788" ou "(41) 99876-5432"; se não for um número comum, fica como digitado. */
export function formatarTelefone(texto: string): string {
  const d = soDigitos(texto)
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return texto.trim()
}

/** "529.982.247-25" (CPF) ou "12.345.678/0001-95" (CNPJ); senão, como digitado. */
export function formatarDocumento(texto: string): string {
  const d = soDigitos(texto)
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  }
  return texto.trim()
}

function digitoVerificador(numeros: string, pesos: number[]): number {
  const soma = pesos.reduce((s, p, i) => s + Number(numeros[i]) * p, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

/** Confere os dígitos do CPF ou CNPJ. Vazio é válido (o campo não é obrigatório). */
export function documentoValido(texto: string): boolean {
  const d = soDigitos(texto)
  if (d.length === 0) return true
  if (/^(\d)\1+$/.test(d)) return false
  if (d.length === 11) {
    const p1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
    const p2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
    return digitoVerificador(d, p1) === Number(d[9]) && digitoVerificador(d, p2) === Number(d[10])
  }
  if (d.length === 14) {
    const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    return digitoVerificador(d, p1) === Number(d[12]) && digitoVerificador(d, p2) === Number(d[13])
  }
  return false
}

/** Texto sem acento e em minúsculas, para comparar. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** A busca da lista: pelo nome (sem acento) ou pelo telefone (só os números). */
export function combinaBusca(item: { nome: string; telefone: string }, busca: string): boolean {
  const b = normalizar(busca)
  if (!b) return true
  if (normalizar(item.nome).includes(b)) return true
  const digitos = soDigitos(busca)
  return digitos.length >= 3 && soDigitos(item.telefone).includes(digitos)
}

/** "telefone (vazio) → (11) 3456-7788; cidade São Paulo → Campinas" — ou null se nada mudou. */
export function descreverMudancas<T extends Record<string, unknown>>(
  rotulos: Partial<Record<keyof T, string>>,
  antes: T,
  depois: T
): string | null {
  const partes: string[] = []
  for (const chave of Object.keys(rotulos) as (keyof T)[]) {
    const a = String(antes[chave] ?? '')
    const d = String(depois[chave] ?? '')
    if (a !== d) partes.push(`${rotulos[chave]} ${a || '(vazio)'} → ${d || '(vazio)'}`)
  }
  return partes.length ? partes.join('; ') : null
}
