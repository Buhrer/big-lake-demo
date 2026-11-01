// Prévia da impressão (D-088): a folha A4 do jeito que vai sair, a impressora e as cópias,
// tudo no programa. "Imprimir" manda direto para a impressora, sem a janela do Windows.
import { useEffect, useState } from 'react'
import type { AlvoImpressao, PreviaImpressao } from '../../compartilhado/contrato'
import { EntradaNumero } from './Campos'
import { ListaSuspensa } from './ListaSuspensa'
import { Modal } from './Modal'

const PADRAO = ''
const MAX_COPIAS = 20

const lerCopias = (t: string) =>
  /^\d{1,2}$/.test(t.trim()) && Number(t) >= 1 && Number(t) <= MAX_COPIAS ? Number(t) : null

export function ModalImpressao({
  alvo,
  aoFechar,
  aoImprimir
}: {
  alvo: AlvoImpressao
  aoFechar(): void
  /** depois de mandar para a impressora: o texto da faixa verde */
  aoImprimir(texto: string): void
}) {
  const [previa, setPrevia] = useState<PreviaImpressao | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [impressora, setImpressora] = useState(PADRAO)
  const [copias, setCopias] = useState<number | null>(1)
  const [imprimindo, setImprimindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    let endereco: string | null = null
    void window.api.impressao.previa(alvo).then((r) => {
      if (!vivo) return
      if (!r.ok) return setErro(r.mensagem)
      endereco = URL.createObjectURL(
        new Blob([new Uint8Array(r.valor.pdf)], { type: 'application/pdf' })
      )
      setPrevia(r.valor)
      // sem a barra do visualizador: só a folha
      setUrl(`${endereco}#toolbar=0&navpanes=0`)
    })
    return () => {
      vivo = false
      if (endereco) URL.revokeObjectURL(endereco)
    }
  }, [alvo])

  const semImpressora = previa !== null && previa.impressoras.length === 0

  async function imprimir() {
    if (!copias) return setErro(`Digite quantas cópias (de 1 a ${MAX_COPIAS}).`)
    setErro(null)
    setImprimindo(true)
    const r = await window.api.impressao.imprimir(alvo, {
      impressora: impressora === PADRAO ? null : impressora,
      copias
    })
    setImprimindo(false)
    if (!r.ok) return setErro(r.mensagem)
    const onde = impressora === PADRAO ? 'a impressora' : `a impressora ${impressora}`
    aoImprimir(
      `${previa?.titulo ?? 'Folha'} enviado para ${onde}` +
        (copias > 1 ? ` (${copias} cópias).` : '.')
    )
  }

  return (
    <Modal
      titulo="Imprimir"
      aoFechar={aoFechar}
      rodape={
        <>
          <button
            type="button"
            className="btn"
            disabled={!previa || imprimindo || semImpressora}
            onClick={() => void imprimir()}
          >
            {imprimindo ? 'Imprimindo…' : 'Imprimir'}
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="quadro-impressao">
        <div className="previa-folha">
          {url ? (
            <iframe src={url} title={`Prévia: ${previa?.titulo ?? ''}`} />
          ) : (
            !erro && <p className="muted">Preparando a folha…</p>
          )}
        </div>
        <div className="opcoes-impressao">
          {previa && (
            <>
              <p style={{ margin: 0 }}>
                <strong>{previa.titulo}</strong>
                <span className="sub">
                  Vai imprimir {previa.folhas} {previa.folhas === 1 ? 'folha' : 'folhas'} por cópia
                </span>
              </p>
              {semImpressora ? (
                <div className="faixa erro" role="alert">
                  Nenhuma impressora instalada neste computador.
                </div>
              ) : (
                <ListaSuspensa<string>
                  rotulo="Impressora"
                  opcoes={[
                    { valor: PADRAO, rotulo: 'Impressora padrão' },
                    ...previa.impressoras.map((n) => ({ valor: n, rotulo: n }))
                  ]}
                  valor={impressora}
                  aoEscolher={setImpressora}
                />
              )}
              <div>
                <span className="lb" id="rotulo-copias">
                  Quantas cópias?
                </span>
                <div className="hrow nowrap" role="group" aria-labelledby="rotulo-copias">
                  <button
                    type="button"
                    className="qb"
                    aria-label="Uma cópia a menos"
                    disabled={!copias || copias <= 1}
                    onClick={() => setCopias(Math.max(1, (copias ?? 1) - 1))}
                  >
                    −
                  </button>
                  <EntradaNumero
                    rotuloAcessivel="Número de cópias"
                    valor={copias}
                    aoMudar={setCopias}
                    ler={lerCopias}
                    formatar={String}
                    invalido={!copias}
                  />
                  <button
                    type="button"
                    className="qb"
                    aria-label="Uma cópia a mais"
                    disabled={(copias ?? 0) >= MAX_COPIAS}
                    onClick={() => setCopias(Math.min(MAX_COPIAS, (copias ?? 0) + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}
          {erro && (
            <div className="faixa erro" role="alert">
              {erro}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
