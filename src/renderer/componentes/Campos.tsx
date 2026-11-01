import { useId, useState, type ReactNode } from 'react'
import { centavos, type Centavos, type QuantidadeX1000 } from '../../dominio/dinheiro'
import { formatarData, lerData, type DataISO } from '../../dominio/datas'
import {
  formatarQuantidade,
  formatarReais,
  lerQuantidade,
  lerReais,
  motivoNumeroErrado
} from '../../dominio/formatar'

interface BaseCampo {
  rotulo: string
  /** Botão "?" ou outro complemento ao lado do rótulo. */
  extra?: ReactNode
  erro?: string
}

function Rotulo({ id, rotulo, extra }: { id: string; rotulo: string; extra?: ReactNode }) {
  return (
    <span className="lb">
      <label htmlFor={id}>{rotulo}</label>
      {extra}
    </span>
  )
}

function Erro({ id, erro }: { id: string; erro?: string }) {
  return erro ? (
    <span className="erro-campo" id={id}>
      {erro}
    </span>
  ) : null
}

export function CampoTexto({
  rotulo,
  extra,
  erro,
  valor,
  aoMudar,
  placeholder
}: BaseCampo & { valor: string; aoMudar(v: string): void; placeholder?: string }) {
  const id = useId()
  return (
    <div className="campo">
      <Rotulo id={id} rotulo={rotulo} extra={extra} />
      <input
        id={id}
        className="inp"
        value={valor}
        placeholder={placeholder}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        onChange={(e) => aoMudar(e.target.value)}
      />
      <Erro id={`${id}-erro`} erro={erro} />
    </div>
  )
}

/**
 * Campo de texto que lê/formata um número. Enquanto digita, guarda o texto;
 * ao sair do campo, mostra o valor formatado. Texto inválido → valor null.
 */
export function CampoNumerico<T>({
  rotulo,
  extra,
  erro,
  valor,
  aoMudar,
  ler,
  formatar,
  sufixo,
  grande = false
}: BaseCampo & {
  valor: T | null
  aoMudar(v: T | null): void
  ler(texto: string): T | null
  formatar(v: T): string
  sufixo?: string
  /** Caixa grande, para valores em dinheiro do fechamento do dia. */
  grande?: boolean
}) {
  const id = useId()
  const [texto, setTexto] = useState(valor === null ? '' : formatar(valor))
  const [editando, setEditando] = useState(false)
  const exibido = editando ? texto : valor === null ? texto : formatar(valor)
  const errado = numeroErrado(texto, valor)
  const mensagem = (!editando && errado) || erro
  return (
    <div className="campo">
      <Rotulo id={id} rotulo={rotulo} extra={extra} />
      <div className="hrow" style={{ flexWrap: 'nowrap' }}>
        <input
          id={id}
          className={grande ? 'inp num money' : 'inp num'}
          inputMode="decimal"
          value={exibido}
          data-numero-errado={errado ? true : undefined}
          aria-invalid={mensagem ? true : undefined}
          aria-describedby={mensagem ? `${id}-erro` : undefined}
          onFocus={() => {
            setEditando(true)
            setTexto(valor === null ? texto : formatar(valor))
          }}
          onBlur={() => setEditando(false)}
          onChange={(e) => {
            setTexto(e.target.value)
            aoMudar(ler(e.target.value))
          }}
        />
        {sufixo && <span className="muted">{sufixo}</span>}
      </div>
      <Erro id={`${id}-erro`} erro={mensagem || undefined} />
    </div>
  )
}

/**
 * Só a caixa do número, sem rótulo visível (para tabelas, como a quantidade de cada
 * ingrediente). O nome para o leitor de tela vem de `rotuloAcessivel`.
 */
export function EntradaNumero<T>({
  rotuloAcessivel,
  valor,
  aoMudar,
  ler,
  formatar,
  invalido
}: {
  rotuloAcessivel: string
  valor: T | null
  aoMudar(v: T | null): void
  ler(texto: string): T | null
  formatar(v: T): string
  invalido?: boolean
}) {
  const [texto, setTexto] = useState(valor === null ? '' : formatar(valor))
  const [editando, setEditando] = useState(false)
  const exibido = editando ? texto : valor === null ? texto : formatar(valor)
  const errado = numeroErrado(texto, valor)
  return (
    <input
      className="inp num entrada-curta"
      inputMode="decimal"
      aria-label={rotuloAcessivel}
      data-numero-errado={errado ? true : undefined}
      title={errado ?? undefined}
      aria-invalid={invalido || (!editando && errado) ? true : undefined}
      value={exibido}
      onFocus={() => {
        setEditando(true)
        setTexto(valor === null ? texto : formatar(valor))
      }}
      onBlur={() => setEditando(false)}
      onChange={(e) => {
        setTexto(e.target.value)
        aoMudar(ler(e.target.value))
      }}
    />
  )
}

/** Texto digitado que não virou número (D-089): o motivo, ou null. */
function numeroErrado<T>(texto: string, valor: T | null): string | null {
  return valor === null && texto.trim() ? motivoNumeroErrado(texto) : null
}

/**
 * Algum número digitado errado na tela (ou no modal aberto)? As telas chamam antes de
 * salvar: sem isso, o texto errado viraria "vazio" e seria gravado como zero (D-089).
 */
export function numeroErradoNaTela(): string | null {
  const raiz = document.querySelector('.mdl') ?? document
  return raiz.querySelector('[data-numero-errado]')
    ? 'Há um número digitado errado (marcado em vermelho). Corrija antes de salvar.'
    : null
}

/** Valor em R$. Mostra "1.234,56" (o "R$" fica no rótulo, como no protótipo). */
export function CampoDinheiro(
  props: BaseCampo & {
    valor: Centavos | null
    aoMudar(v: Centavos | null): void
    grande?: boolean
  }
) {
  return (
    <CampoNumerico
      {...props}
      ler={lerReais}
      formatar={(v) => formatarReais(centavos(v)).replace('R$ ', '')}
    />
  )
}

export function CampoQuantidade(
  props: BaseCampo & {
    valor: QuantidadeX1000 | null
    aoMudar(v: QuantidadeX1000 | null): void
    unidade?: string
  }
) {
  return (
    <CampoNumerico
      {...props}
      sufixo={props.unidade}
      ler={lerQuantidade}
      formatar={formatarQuantidade}
    />
  )
}

/** Coloca as barras sozinho: "16102026" → "16/10/2026". */
export function mascararData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export function CampoData(
  props: BaseCampo & { valor: DataISO | null; aoMudar(v: DataISO | null): void }
) {
  const id = useId()
  const [texto, setTexto] = useState(props.valor ? formatarData(props.valor) : '')
  return (
    <div className="campo">
      <Rotulo id={id} rotulo={props.rotulo} extra={props.extra} />
      <input
        id={id}
        className="inp"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={texto}
        aria-invalid={props.erro ? true : undefined}
        aria-describedby={props.erro ? `${id}-erro` : undefined}
        onChange={(e) => {
          const t = mascararData(e.target.value)
          setTexto(t)
          props.aoMudar(lerData(t))
        }}
      />
      <Erro id={`${id}-erro`} erro={props.erro} />
    </div>
  )
}
