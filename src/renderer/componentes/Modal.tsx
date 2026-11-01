import { FloatingFocusManager, FloatingPortal, useFloating } from '@floating-ui/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { TextoAjuda } from '../textos/ajuda'
import { Ajuda } from './Ajuda'

/**
 * Modal padrão (docs/05 §5): quadro branco com borda escura, título à esquerda e
 * "✕ Fechar" à direita na mesma linha; botões no rodapé.
 * Clicar fora NÃO fecha (para não perder o que foi digitado). Esc fecha; depois de digitar
 * ou escolher alguma coisa, Esc pergunta antes (D-091). "✕ Fechar" e Cancelar fecham direto.
 */
export function Modal({
  titulo,
  editando,
  ajuda,
  largura = 980,
  aoFechar,
  rodape,
  children
}: {
  titulo: string
  /** Texto da etiqueta amarela no modo edição (ex.: "Editando um cadastro"). */
  editando?: string
  /** Botão "?" ao lado do título. */
  ajuda?: TextoAjuda
  largura?: 640 | 760 | 980
  aoFechar(): void
  rodape: ReactNode
  children: ReactNode
}) {
  const idTitulo = useId()
  // mexeu no modal? (ref: muda sem redesenhar)
  const mexeu = useRef(false)
  const [perguntando, setPerguntando] = useState(false)
  const pergunta = useRef<HTMLDivElement>(null)
  const {
    refs: { setFloating },
    context
  } = useFloating({ open: true, onOpenChange: (aberto) => !aberto && aoFechar() })

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      // Esc com uma lista suspensa aberta fecha só a lista.
      if (e.key !== 'Escape' || document.querySelector('.ddpanel')) return
      if (!mexeu.current) return aoFechar()
      // Esc de novo com a pergunta aberta = continuar (nunca perde por acidente)
      setPerguntando((p) => !p)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aoFechar])

  useEffect(() => {
    if (perguntando) pergunta.current?.scrollIntoView({ block: 'nearest' })
  }, [perguntando])

  /** Digitou ou tocou em algo do conteúdo (não conta o cabeçalho nem o rodapé). */
  function marcar(alvo: EventTarget) {
    if (alvo instanceof Element && alvo.closest('.mdl-h, .mdl-rodape')) return
    mexeu.current = true
  }

  return (
    <FloatingPortal>
      <div className="mdl-bg">
        <FloatingFocusManager context={context} initialFocus={-1} returnFocus>
          <div
            ref={setFloating}
            className="mdl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            tabIndex={-1}
            onInputCapture={(e) => marcar(e.target)}
            onClickCapture={(e) => marcar(e.target)}
            // em rem para acompanhar o A+/A− (1rem = 18px na letra normal)
            style={{ width: `min(${largura / 18}rem, 100%)` }}
          >
            <div className="mdl-h">
              <div className="hrow">
                <h2 id={idTitulo}>{titulo}</h2>
                {ajuda && <Ajuda texto={ajuda} />}
                {editando && <span className="tag editando">{editando}</span>}
              </div>
              <button type="button" className="btn2 mdl-x" onClick={aoFechar}>
                ✕ Fechar
              </button>
            </div>
            {children}
            {perguntando && (
              <div ref={pergunta} className="faixa atencao" role="alert">
                <span>Fechar sem salvar? O que você digitou vai se perder.</span>
                <span className="hrow">
                  <button type="button" className="btn2" onClick={aoFechar}>
                    Sim, fechar
                  </button>
                  <button
                    type="button"
                    className="btn2"
                    onClick={() => setPerguntando(false)}
                    autoFocus
                  >
                    Não, continuar
                  </button>
                </span>
              </div>
            )}
            <div className="mdl-rodape">{rodape}</div>
          </div>
        </FloatingFocusManager>
      </div>
    </FloatingPortal>
  )
}
