import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from '@floating-ui/react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Icone } from './Icones'

export interface OpcaoLista<V extends string | number> {
  valor: V
  rotulo: string
  /** Quantas vezes está em uso. > 0 mostra "em uso · N" no lugar do Remover. */
  emUso?: number
  /** Vem com o sistema e não pode ser removido (não mostra o Remover). */
  fixa?: boolean
}

/**
 * Lista suspensa padrão (nunca o select nativo do Windows).
 * Flutua por cima (não aumenta o modal), abre para cima quando falta espaço,
 * fecha ao clicar fora. Com `aoCriar`/`aoRemover` vira lista de categorias/tipos.
 */
export function ListaSuspensa<V extends string | number>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
  textoVazio = 'Escolha…',
  aoCriar,
  aoRemover,
  textoEmUso = (n) => `em uso · ${n}`,
  nota,
  erro,
  rotuloOculto = false,
  antesDeCriar,
  rotuloNovo = 'Nome novo',
  extra,
  fecharAoCriar = false
}: {
  rotulo: string
  opcoes: OpcaoLista<V>[]
  valor: V | null
  aoEscolher(valor: V): void
  textoVazio?: string
  /** Cria um item novo pelo nome. Retorna uma mensagem de erro ou nada. */
  aoCriar?(nome: string): string | void
  aoRemover?(valor: V): void
  textoEmUso?(n: number): string
  /** Ex.: "Só dá para remover categoria que não tem produtos." */
  nota?: string
  erro?: string
  /** Rótulo só para o leitor de tela (quando o campo já tem um rótulo visível ao lado). */
  rotuloOculto?: boolean
  /** Algo a escolher antes do nome do item novo (ex.: de quem é o cartão novo). */
  antesDeCriar?: ReactNode
  rotuloNovo?: string
  /** Botão "?" ao lado do rótulo. */
  extra?: ReactNode
  /** Fecha a lista depois de criar (o item novo já fica escolhido). */
  fecharAoCriar?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [confirmando, setConfirmando] = useState<V | null>(null)
  const [nomeNovo, setNomeNovo] = useState('')
  const [erroCriar, setErroCriar] = useState<string | null>(null)
  const idRotulo = useId()
  const idErro = useId()

  function mudarAberto(a: boolean) {
    setAberto(a)
    if (!a) setConfirmando(null)
  }

  const {
    refs: { setReference, setFloating },
    elements,
    floatingStyles,
    context
  } = useFloating({
    open: aberto,
    onOpenChange: mudarAberto,
    placement: 'bottom-start',
    middleware: [
      offset(6),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
      size({
        padding: 16,
        apply({ availableHeight, availableWidth, rects, elements }) {
          const largura = Math.min(Math.max(rects.reference.width, 400), availableWidth)
          Object.assign(elements.floating.style, {
            width: `${largura}px`,
            maxHeight: `${Math.max(220, Math.min(availableHeight, 420))}px`
          })
        }
      })
    ],
    whileElementsMounted: autoUpdate
  })
  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    // "Clicar fora" é tratado abaixo: dentro do modal, o useDismiss ignora o
    // fundo escurecido (o modal marca o que está fora dele como inativo).
    useDismiss(context, { outsidePress: false }),
    useRole(context, { role: 'listbox' })
  ])

  useEffect(() => {
    if (!aberto) return
    function clique(e: PointerEvent) {
      const alvo = e.target as Node
      if (elements.floating?.contains(alvo) || elements.domReference?.contains(alvo)) return
      setAberto(false)
      setConfirmando(null)
    }
    document.addEventListener('pointerdown', clique, true)
    return () => document.removeEventListener('pointerdown', clique, true)
  }, [aberto, elements.floating, elements.domReference])

  const escolhida = opcoes.find((o) => o.valor === valor)

  function escolher(v: V) {
    aoEscolher(v)
    setAberto(false)
  }

  function criar() {
    if (!aoCriar) return
    const nome = nomeNovo.trim()
    if (!nome) {
      setErroCriar('Digite o nome.')
      return
    }
    const problema = aoCriar(nome)
    if (problema) {
      setErroCriar(problema)
      return
    }
    setNomeNovo('')
    setErroCriar(null)
    if (fecharAoCriar) setAberto(false)
  }

  return (
    <div className="campo">
      {extra && !rotuloOculto ? (
        <span className="lb">
          <span id={idRotulo}>{rotulo}</span>
          {extra}
        </span>
      ) : (
        <span className={rotuloOculto ? 'sr-only' : 'lb'} id={idRotulo}>
          {rotulo}
        </span>
      )}
      <button
        ref={setReference}
        type="button"
        className={escolhida ? 'inp dd' : 'inp dd vazio'}
        aria-labelledby={idRotulo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        {...getReferenceProps()}
      >
        <span>{escolhida ? escolhida.rotulo : textoVazio}</span>
        <span aria-hidden="true">{aberto ? '▲' : '▼'}</span>
      </button>
      {erro && (
        <span className="erro-campo" id={idErro}>
          {erro}
        </span>
      )}
      {aberto && (
        <FloatingPortal>
          <div ref={setFloating} className="ddpanel" style={floatingStyles} {...getFloatingProps()}>
            <div className="ddlist" role="presentation">
              {opcoes.map((o) => {
                const selecionada = o.valor === valor
                const emUso = o.emUso ?? 0
                return (
                  <div key={String(o.valor)} className="ddrow">
                    {confirmando === o.valor ? (
                      <div className="confirmar" style={{ flex: 1 }}>
                        <span>Remover “{o.rotulo}”?</span>
                        <button
                          type="button"
                          className="rmv sim"
                          onClick={() => {
                            aoRemover?.(o.valor)
                            setConfirmando(null)
                          }}
                        >
                          Sim
                        </button>
                        <button type="button" className="sm" onClick={() => setConfirmando(null)}>
                          Não
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selecionada}
                          className="ddopt"
                          onClick={() => escolher(o.valor)}
                        >
                          <span className="marca" aria-hidden="true">
                            {selecionada ? '✓' : ''}
                          </span>
                          {o.rotulo}
                        </button>
                        {aoRemover &&
                          !o.fixa &&
                          (emUso > 0 ? (
                            <span className="dduso">{textoEmUso(emUso)}</span>
                          ) : (
                            <button
                              type="button"
                              className="rmv"
                              aria-label={`Remover ${o.rotulo}`}
                              onClick={() => setConfirmando(o.valor)}
                            >
                              <Icone nome="lixeira" className="" />
                              Remover
                            </button>
                          ))}
                      </>
                    )}
                  </div>
                )
              })}
              {opcoes.length === 0 && <p className="ddnota">Nenhum item ainda.</p>}
            </div>
            {aoCriar && (
              <div className="ddcriar">
                {antesDeCriar}
                <div className="ddcriar-linha">
                  <input
                    className="inp"
                    placeholder={rotuloNovo}
                    aria-label={rotuloNovo}
                    value={nomeNovo}
                    onChange={(e) => {
                      setNomeNovo(e.target.value)
                      setErroCriar(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        criar()
                      }
                    }}
                  />
                  <button type="button" className="btn" onClick={criar}>
                    + Criar
                  </button>
                </div>
                {erroCriar && <span className="erro-campo">{erroCriar}</span>}
                {nota && <span className="ddnota">{nota}</span>}
              </div>
            )}
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}
