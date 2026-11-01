import { useRef } from 'react'

/**
 * Envolve o "Salvar" para rodar uma vez por vez (D-090): o clique duplo (comum com o
 * mouse) não grava duas vezes. O segundo clique, enquanto a gravação ainda corre, é
 * ignorado. As telas só terminam a ação depois de fechar o modal ou trocar o quadro.
 */
export function useUmaVezPorVez<A extends unknown[]>(
  acao: (...args: A) => Promise<unknown> | unknown
): (...args: A) => Promise<void> {
  const rodando = useRef(false)
  return async (...args: A) => {
    if (rodando.current) return
    rodando.current = true
    try {
      await acao(...args)
    } finally {
      rodando.current = false
    }
  }
}
