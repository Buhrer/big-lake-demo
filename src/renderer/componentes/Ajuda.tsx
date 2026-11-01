import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole
} from '@floating-ui/react'
import { useState } from 'react'
import { usePreferencias } from '../contexto/Preferencias'
import type { TextoAjuda } from '../textos/ajuda'

/** Botão "?" vermelho com explicação curta. Some quando a ajuda está desligada. */
export function Ajuda({ texto }: { texto: TextoAjuda }) {
  const { ajudaLigada } = usePreferencias()
  const [aberto, setAberto] = useState(false)
  const {
    refs: { setReference, setFloating },
    floatingStyles,
    context
  } = useFloating({
    open: aberto,
    onOpenChange: setAberto,
    placement: 'bottom',
    middleware: [offset(10), flip(), shift({ padding: 16 })],
    whileElementsMounted: autoUpdate
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, { move: false }),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' })
  ])

  if (!ajudaLigada) return null

  return (
    <>
      <button
        ref={setReference}
        type="button"
        className="help"
        aria-label={`Ajuda: ${texto.titulo}`}
        data-aberto={aberto}
        {...getReferenceProps()}
      >
        ?
      </button>
      {aberto && (
        <FloatingPortal>
          <div ref={setFloating} className="tip" style={floatingStyles} {...getFloatingProps()}>
            <b>{texto.titulo}</b>
            {texto.texto}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
