// Relatórios: prototipo/telas/13-Relatorios*.png (docs/02 §10; D-071, D-073).
// A Gordurinha chega na Fatia 7C.
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { RELATORIOS, type IdRelatorio } from '../../../compartilhado/contrato'
import { nomeDoMes } from '../../../dominio/datas'
import { ModalImpressao } from '../../componentes/Impressao'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { useEmpresa } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { ConteudoRelatorio } from './ConteudoRelatorio'

function nomeDoPeriodo(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  return `${nomeDoMes(mes)} de ${ano}`
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

const ehRelatorio = (v: string | null): v is IdRelatorio => RELATORIOS.some((r) => r.id === v)

export function TelaRelatorios() {
  const { ambiente } = usePreferencias()
  const mesAtual = ambiente.hoje.slice(0, 7)
  const [parametros, setParametros] = useSearchParams()
  const id: IdRelatorio = ehRelatorio(parametros.get('r'))
    ? (parametros.get('r') as IdRelatorio)
    : 'resultado'
  const { data: meses = [mesAtual] } = useQuery({
    queryKey: ['relatorios-meses'],
    queryFn: () => window.api.relatorios.meses()
  })
  const [anoMes, setAnoMes] = useState(mesAtual)
  const { data: relatorio } = useQuery({
    queryKey: ['relatorio', id, anoMes],
    queryFn: () => window.api.relatorios.obter(id, anoMes)
  })
  const [ocupado, setOcupado] = useState(false)
  const [salvoEm, setSalvoEm] = useState<string | null>(null)
  const [previa, setPrevia] = useState(false)
  const [impresso, setImpresso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  /** Abre a prévia da impressão (D-088). */
  function imprimir() {
    setErro(null)
    setSalvoEm(null)
    setImpresso(null)
    setPrevia(true)
  }

  async function salvarPdf() {
    setErro(null)
    setSalvoEm(null)
    setOcupado(true)
    const r = await window.api.relatorios.salvarPdf(id, anoMes)
    setOcupado(false)
    if (!r.ok) return setErro(r.mensagem)
    if (r.valor) setSalvoEm(r.valor)
  }

  return (
    <>
      <CabecalhoTela
        subtitulo={
          id === 'gordurinha'
            ? 'A Gordurinha é sempre a de hoje'
            : `Período: ${nomeDoPeriodo(anoMes)}`
        }
        titulo="Relatórios"
        ajuda={AJUDA.relatorios}
        quebra
        acao={
          <div className="acoes-relatorio">
            <div className="campo-periodo" hidden={id === 'gordurinha'}>
              <ListaSuspensa<string>
                rotulo="Período"
                rotuloOculto
                opcoes={meses.map((m) => ({ valor: m, rotulo: maiuscula(nomeDoPeriodo(m)) }))}
                valor={anoMes}
                aoEscolher={(m) => {
                  setAnoMes(m)
                  setSalvoEm(null)
                }}
              />
            </div>
            <button type="button" className="btn2" disabled={ocupado} onClick={imprimir}>
              Imprimir
            </button>
            <button
              type="button"
              className="btn"
              disabled={ocupado}
              onClick={() => void salvarPdf()}
            >
              Salvar em PDF
            </button>
          </div>
        }
      />
      {salvoEm && (
        <div className="faixa ok" role="status">
          <span>✓ Salvo em {salvoEm}</span>
          <button
            type="button"
            className="sm"
            onClick={() => void window.api.relatorios.abrirPasta(salvoEm)}
          >
            Abrir pasta
          </button>
        </div>
      )}
      {impresso && (
        <div className="faixa ok" role="status">
          <span>✓ {impresso}</span>
        </div>
      )}
      {previa && (
        <ModalImpressao
          alvo={{ tipo: 'relatorio', id, anoMes }}
          aoFechar={() => setPrevia(false)}
          aoImprimir={(texto) => {
            setPrevia(false)
            setImpresso(texto)
          }}
        />
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
      <div className="quadro-relatorios">
        <div className="relatorios">
          <nav className="lista-relatorios" aria-label="Relatórios">
            {RELATORIOS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={r.id === id ? 'item-relatorio on' : 'item-relatorio'}
                aria-pressed={r.id === id}
                onClick={() => {
                  setSalvoEm(null)
                  setParametros(r.id === 'resultado' ? {} : { r: r.id }, { replace: true })
                }}
              >
                {r.nome}
              </button>
            ))}
          </nav>
          <div className="corpo-relatorio">
            {relatorio && relatorio.id === id && relatorio.anoMes === anoMes && (
              <ConteudoRelatorio relatorio={relatorio} hoje={ambiente.hoje} naTela />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/** Página que vai para o papel ou para o PDF: #/imprimir/relatorio/:id/:anoMes */
export function ImpressaoRelatorio() {
  const { id, anoMes } = useParams()
  const { ambiente } = usePreferencias()
  const { data: relatorio } = useQuery({
    queryKey: ['impressao-relatorio', id, anoMes],
    queryFn: () => window.api.relatorios.obter(id as IdRelatorio, anoMes!)
  })
  const { data: empresa } = useEmpresa()
  const pronta = Boolean(relatorio && empresa)
  useEffect(() => {
    document.body.classList.add('pagina-impressao')
    if (pronta) document.body.dataset.pronta = '1'
  }, [pronta])
  if (!relatorio || !empresa) return null
  const nome = RELATORIOS.find((r) => r.id === relatorio.id)!.nome
  return (
    <main className="impressao impressao-relatorio">
      <header className="cabecalho-impressao">
        <strong>{empresa.nome || 'BIG LAKE Sorveteria'}</strong>
        <span>
          {nome} · {maiuscula(nomeDoPeriodo(relatorio.anoMes))}
        </span>
      </header>
      <ConteudoRelatorio relatorio={relatorio} hoje={ambiente.hoje} naTela={false} />
    </main>
  )
}
