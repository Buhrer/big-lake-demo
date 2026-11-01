import { NavLink } from 'react-router-dom'
import { Ajuda } from '../componentes/Ajuda'
import { Icone } from '../componentes/Icones'
import { useEstadoBackup } from '../consultas'
import { ESCALA_MAX, ESCALA_MIN, usePreferencias } from '../contexto/Preferencias'
import { AJUDA } from '../textos/ajuda'

function EstadoCopia() {
  const { data } = useEstadoBackup()
  if (!data) return <span className="bk">Conferindo a cópia de segurança…</span>
  const { nivel, texto } = data.aviso
  return (
    <span className={`bk ${nivel}`} role="status">
      <Icone nome={nivel === 'ok' ? 'certo' : 'alerta'} />
      {texto}
    </span>
  )
}

export function BarraTopo() {
  const { escala, aumentarLetra, diminuirLetra, ajudaLigada, alternarAjuda } = usePreferencias()
  return (
    <div className="top">
      <div className="hrow">
        <EstadoCopia />
        <Ajuda texto={AJUDA.backup} />
      </div>
      <div className="hrow top-acoes">
        <Ajuda texto={AJUDA.letra} />
        <button
          type="button"
          className="tb"
          aria-label="Diminuir a letra"
          onClick={diminuirLetra}
          disabled={escala <= ESCALA_MIN}
        >
          A−
        </button>
        <button
          type="button"
          className="tb"
          aria-label="Aumentar a letra"
          onClick={aumentarLetra}
          disabled={escala >= ESCALA_MAX}
        >
          A+
        </button>
        <button
          type="button"
          className={ajudaLigada ? 'tb on' : 'tb'}
          aria-pressed={ajudaLigada}
          onClick={alternarAjuda}
        >
          {ajudaLigada ? '? Ajuda ligada' : '? Ajuda desligada'}
        </button>
        <NavLink to="/configuracoes" className={({ isActive }) => (isActive ? 'tb on' : 'tb')}>
          Configurações
        </NavLink>
      </div>
    </div>
  )
}
