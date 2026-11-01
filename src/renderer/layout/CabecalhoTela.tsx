import type { ReactNode } from 'react'
import { Ajuda } from '../componentes/Ajuda'
import type { TextoAjuda } from '../textos/ajuda'

/** Subtítulo, título 44px com "?" e, à direita, o botão vermelho de criar. */
export function CabecalhoTela({
  subtitulo,
  titulo,
  ajuda,
  acao,
  quebra = false
}: {
  subtitulo: string
  titulo: string
  ajuda: TextoAjuda
  acao?: ReactNode
  /** muitos controles à direita: descem para a linha de baixo quando falta espaço */
  quebra?: boolean
}) {
  return (
    <header className={quebra ? 'cabecalho quebra' : 'cabecalho'}>
      <div className="cabecalho-texto">
        <p className="cabecalho-sub muted">{subtitulo}</p>
        <div className="hrow">
          <h1>{titulo}</h1>
          <Ajuda texto={ajuda} />
        </div>
      </div>
      {acao && <div className="cabecalho-acao">{acao}</div>}
    </header>
  )
}
