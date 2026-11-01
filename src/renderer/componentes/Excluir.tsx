import type { ReactNode } from 'react'

/** Botões da linha em confirmação: "Excluir este …? Sim / Não" (linha fica vermelho-clara). */
export function ConfirmarNaLinha({
  pergunta,
  aoConfirmar,
  aoCancelar
}: {
  pergunta: string
  aoConfirmar(): void
  aoCancelar(): void
}) {
  return (
    <div className="confirmar" role="group" aria-label={pergunta}>
      <span>{pergunta}</span>
      <button type="button" className="btn-sim" onClick={aoConfirmar}>
        Sim
      </button>
      <button type="button" className="sm" onClick={aoCancelar}>
        Não
      </button>
    </div>
  )
}

/** Faixa verde depois de excluir: "✓ "X" foi excluído da lista." + Desfazer. */
export function FaixaDesfazer({
  children,
  aoDesfazer
}: {
  children: ReactNode
  aoDesfazer(): void
}) {
  return (
    <div className="faixa ok" role="status">
      <span>✓ {children}</span>
      <button type="button" className="sm" onClick={aoDesfazer}>
        Desfazer
      </button>
    </div>
  )
}
