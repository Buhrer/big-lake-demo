// Peças comuns dos históricos (balcão, pedidos e o que foi feito; D-085):
// "Mês: Últimos ▼" no alto e "Ver mais 10" no fim da lista.
import { useState } from 'react'
import type { FiltroHistorico } from '../../compartilhado/contrato'
import { A_CADA_VER_MAIS, nomeDoMesDoFiltro, PRIMEIROS, quantosMais } from '../../dominio/historico'
import { ListaSuspensa } from './ListaSuspensa'

/** Começa em "Últimos" com 10; trocar de mês volta para 10. */
export function useFiltroHistorico() {
  const [filtro, setFiltro] = useState<FiltroHistorico>({ anoMes: null, limite: PRIMEIROS })
  return {
    filtro,
    escolherMes: (anoMes: string | null) => setFiltro({ anoMes, limite: PRIMEIROS }),
    verMais: () => setFiltro((f) => ({ ...f, limite: f.limite + A_CADA_VER_MAIS }))
  }
}

const ULTIMOS = 'ultimos'

/** "Mês: [Últimos ▼]" — só os meses que têm lançamento. */
export function EscolherMesDoHistorico({
  rotulo,
  meses,
  anoMes,
  aoEscolher
}: {
  /** nome para o leitor de tela, ex.: "Mês do histórico do balcão" */
  rotulo: string
  meses: string[]
  anoMes: string | null
  aoEscolher(anoMes: string | null): void
}) {
  return (
    <div className="hrow filtro-historico">
      <strong aria-hidden="true">Mês:</strong>
      <ListaSuspensa<string>
        rotulo={rotulo}
        rotuloOculto
        opcoes={[
          { valor: ULTIMOS, rotulo: 'Últimos' },
          ...meses.map((m) => ({ valor: m, rotulo: nomeDoMesDoFiltro(m) }))
        ]}
        valor={anoMes ?? ULTIMOS}
        aoEscolher={(v) => aoEscolher(v === ULTIMOS ? null : v)}
      />
    </div>
  )
}

/** Quando a leitura falha: avisa em vez de dizer que a lista está vazia. */
export function ErroAoCarregar() {
  return (
    <div className="faixa erro" role="alert">
      Não deu para carregar esta lista. Feche e abra o programa de novo; se continuar, fale com o
      Lucas.
    </div>
  )
}

/** "[Ver mais 10] Mostrando 10 de 150"; some quando já mostra tudo. */
export function VerMais({
  mostrando,
  total,
  aoVerMais
}: {
  mostrando: number
  total: number
  aoVerMais(): void
}) {
  const mais = quantosMais(mostrando, total)
  if (mais === 0) return null
  return (
    <div className="ver-mais">
      <button type="button" className="btn2" onClick={aoVerMais}>
        Ver mais {mais}
      </button>
      <span className="muted">
        Mostrando {mostrando} de {total}
      </span>
    </div>
  )
}
