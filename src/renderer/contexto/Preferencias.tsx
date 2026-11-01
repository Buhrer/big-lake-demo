import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Ambiente } from '../../compartilhado/contrato'
import { TAMANHOS_LETRA, type Preferencias } from '../../dominio/sistema'

export const ESCALA_MIN = 80
export const ESCALA_MAX = 130
const PASSO = 10

interface ContextoPreferencias {
  ambiente: Ambiente
  preferencias: Preferencias
  /** Grava no banco; devolve uma mensagem de erro ou null. */
  salvarPreferencias(novas: Preferencias): Promise<string | null>
  /** Tamanho da letra agora, em % (80 a 130). A−/A+ valem até fechar o sistema. */
  escala: number
  aumentarLetra(): void
  diminuirLetra(): void
  ajudaLigada: boolean
  alternarAjuda(): void
}

const Contexto = createContext<ContextoPreferencias | null>(null)

export function ProvedorPreferencias({
  ambiente,
  preferenciasIniciais,
  children
}: {
  ambiente: Ambiente
  preferenciasIniciais: Preferencias
  children: ReactNode
}) {
  const [preferencias, setPreferencias] = useState(preferenciasIniciais)
  const [escala, setEscala] = useState(TAMANHOS_LETRA[preferenciasIniciais.tamanhoPadrao].escala)

  useEffect(() => {
    document.documentElement.style.setProperty('--escala', String(escala / 100))
  }, [escala])

  useEffect(() => {
    document.body.classList.toggle('sem-ajuda', !preferencias.ajudaLigada)
  }, [preferencias.ajudaLigada])

  const valor = useMemo<ContextoPreferencias>(() => {
    async function salvarPreferencias(novas: Preferencias): Promise<string | null> {
      const resposta = await window.api.preferencias.salvar(novas)
      if (!resposta.ok) return resposta.mensagem
      if (resposta.valor.tamanhoPadrao !== preferencias.tamanhoPadrao) {
        setEscala(TAMANHOS_LETRA[resposta.valor.tamanhoPadrao].escala)
      }
      setPreferencias(resposta.valor)
      return null
    }
    return {
      ambiente,
      preferencias,
      salvarPreferencias,
      escala,
      aumentarLetra: () => setEscala((e) => Math.min(ESCALA_MAX, e + PASSO)),
      diminuirLetra: () => setEscala((e) => Math.max(ESCALA_MIN, e - PASSO)),
      ajudaLigada: preferencias.ajudaLigada,
      alternarAjuda: () =>
        void salvarPreferencias({ ...preferencias, ajudaLigada: !preferencias.ajudaLigada })
    }
  }, [ambiente, preferencias, escala])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usePreferencias(): ContextoPreferencias {
  const p = useContext(Contexto)
  if (!p) throw new Error('usePreferencias fora do ProvedorPreferencias')
  return p
}
