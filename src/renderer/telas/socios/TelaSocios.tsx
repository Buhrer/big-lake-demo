// Sócios e Divisão do Lucro: prototipo/telas/11-Socios*.png (docs/02 §8, R12; D-058).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MesDosSocios, Retirada } from '../../../compartilhado/contrato'
import { mesAnterior, mesSeguinte } from '../../../dominio/contas'
import { formatarData, nomeDoMes } from '../../../dominio/datas'
import { formatarPercentual, formatarReais } from '../../../dominio/formatar'
import { ajustarParticipacao, NOME_COMO_RETIROU } from '../../../dominio/socios'
import { Ajuda } from '../../componentes/Ajuda'
import { FaixaDesfazer } from '../../componentes/Excluir'
import { CHAVES, useMesDosSocios } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { ModalRetirada } from './ModalRetirada'

function tituloDoMes(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  const nome = nomeDoMes(mes)
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`
}

const diaMes = (d: string) => formatarData(d).slice(0, 5)

export function TelaSocios() {
  const { ambiente } = usePreferencias()
  const cliente = useQueryClient()
  const mesAtual = ambiente.hoje.slice(0, 7)
  const [anoMes, setAnoMes] = useState(mesAtual)
  const { data: m } = useMesDosSocios(anoMes)
  const [aba, setAba] = useState<'reembolsos' | 'retiradas'>('reembolsos')
  // undefined = fechado; null = nova
  const [retirada, setRetirada] = useState<Retirada | null | undefined>(undefined)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [excluida, setExcluida] = useState<Retirada | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function atualizar() {
    await cliente.invalidateQueries({ queryKey: CHAVES.mesSocios })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }

  function limparFaixas() {
    setMensagem(null)
    setExcluida(null)
    setErro(null)
  }

  async function mudarParticipacao(passo: number) {
    if (!m) return
    limparFaixas()
    const [novo] = ajustarParticipacao(m.socios[0]!.pct, passo)
    const r = await window.api.socios.mudarParticipacao(anoMes, novo)
    if (!r.ok) return setErro(r.mensagem)
    await atualizar()
  }

  async function excluir(r: Retirada) {
    const resp = await window.api.retiradas.excluir(r.id)
    if (!resp.ok) return setErro(resp.mensagem)
    setRetirada(undefined)
    limparFaixas()
    setExcluida(r)
    await atualizar()
  }

  async function desfazer() {
    if (!excluida) return
    const resp = await window.api.retiradas.desfazerExclusao(excluida.id)
    if (!resp.ok) setErro(resp.mensagem)
    setExcluida(null)
    await atualizar()
  }

  return (
    <>
      <CabecalhoTela
        subtitulo="Fechamento do mês"
        titulo="Sócios e Divisão do Lucro"
        ajuda={AJUDA.socios}
        acao={
          <button
            type="button"
            className="btn"
            onClick={() => {
              limparFaixas()
              setRetirada(null)
            }}
          >
            + Registrar retirada
          </button>
        }
      />
      <div className="navegar-mes">
        <button
          type="button"
          className="btn2 seta-mes"
          aria-label="Mês anterior"
          onClick={() => setAnoMes(mesAnterior(anoMes))}
        >
          ‹
        </button>
        <strong aria-live="polite">{tituloDoMes(anoMes)}</strong>
        <button
          type="button"
          className="btn2 seta-mes"
          aria-label="Mês seguinte"
          disabled={anoMes >= mesAtual}
          onClick={() => setAnoMes(mesSeguinte(anoMes))}
        >
          ›
        </button>
      </div>

      {mensagem && (
        <div className="faixa ok" role="status">
          <span>✓ {mensagem}</span>
        </div>
      )}
      {excluida && (
        <FaixaDesfazer aoDesfazer={() => void desfazer()}>A retirada foi excluída.</FaixaDesfazer>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}

      {m && (
        <>
          <Resultado m={m} />
          <section className="card" aria-labelledby="titulo-participacao">
            <div className="lista-cabecalho">
              <div className="hrow">
                <h2 id="titulo-participacao">Participação de cada sócio</h2>
                <Ajuda texto={AJUDA.participacao} />
              </div>
              <div className="hrow nowrap">
                <strong className="muted">{m.socios[0]?.nome}:</strong>
                <button
                  type="button"
                  className="qb"
                  aria-label={`Diminuir a parte do ${m.socios[0]?.nome}`}
                  disabled={(m.socios[0]?.pct ?? 0) <= 0}
                  onClick={() => void mudarParticipacao(-100)}
                >
                  −
                </button>
                <strong className="pct-socio">{formatarPercentual(m.socios[0]?.pct ?? 0)}</strong>
                <button
                  type="button"
                  className="qb"
                  aria-label={`Aumentar a parte do ${m.socios[0]?.nome}`}
                  disabled={(m.socios[0]?.pct ?? 0) >= 10_000}
                  onClick={() => void mudarParticipacao(100)}
                >
                  +
                </button>
              </div>
            </div>
            <div
              className="barra-dupla barra-socios"
              role="img"
              aria-label={m.socios.map((s) => `${s.nome} ${formatarPercentual(s.pct)}`).join(', ')}
            >
              {m.socios.map((s, i) => (
                <span
                  key={s.id}
                  className={i === 0 ? 'balcao' : 'pedidos'}
                  style={{ width: `${s.pct / 100}%` }}
                >
                  {s.pct >= 1500 && `${s.nome} · ${formatarPercentual(s.pct)}`}
                </span>
              ))}
            </div>
            <p className="muted" style={{ margin: '10px 0 0' }}>
              Vale para {tituloDoMes(anoMes).toLowerCase()} e os meses seguintes.
            </p>
          </section>

          <div className="hrow">
            <h2 className="titulo-secao">Quanto cada um recebe</h2>
            <Ajuda texto={AJUDA.comoCadaUmRecebe} />
          </div>
          <div className="grade grade-socios">
            {m.socios.map((s, i) => (
              <section
                key={s.id}
                className="card card-socio"
                aria-label={`Quanto o ${s.nome} recebe`}
              >
                <div className="hrow">
                  <span
                    className={i === 0 ? 'avatar amarelo' : 'avatar vermelho'}
                    aria-hidden="true"
                  >
                    {s.nome.charAt(0)}
                  </span>
                  <div>
                    <h3>{s.nome}</h3>
                    <span className="muted">
                      <strong>{formatarPercentual(s.pct)}</strong> da empresa
                    </span>
                  </div>
                </div>
                <div className="kl">
                  <span>
                    Parte do lucro (<strong>{formatarPercentual(s.pct)}</strong>)
                  </span>
                  <strong className="num">{formatarReais(s.parte)}</strong>
                </div>
                <div className="kl">
                  <span>+ Reembolso (contas pagas no cartão pessoal)</span>
                  <strong className="num texto-ok">+ {formatarReais(s.reembolso)}</strong>
                </div>
                <div className="kl">
                  <span>− Retiradas durante o mês</span>
                  <strong className="num texto-erro">− {formatarReais(s.retiradas)}</strong>
                </div>
                <div className="kl total-socio">
                  <strong>Total a receber</strong>
                  <strong className="num">{formatarReais(s.totalAReceber)}</strong>
                </div>
              </section>
            ))}
          </div>

          <section className="card" aria-labelledby="titulo-reembolsos">
            <div className="hrow" style={{ marginBottom: 14 }}>
              <h2 id="titulo-reembolsos">Reembolsos e retiradas</h2>
              <Ajuda texto={AJUDA.reembolsosRetiradas} />
            </div>
            <div className="abas" role="tablist" aria-label="Reembolsos e retiradas">
              {(
                [
                  ['reembolsos', 'Reembolsos do mês'],
                  ['retiradas', 'Retiradas do mês']
                ] as const
              ).map(([a, rotulo]) => (
                <button
                  key={a}
                  type="button"
                  role="tab"
                  aria-selected={aba === a}
                  className={aba === a ? 'tab on' : 'tab'}
                  onClick={() => setAba(a)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {aba === 'reembolsos' ? (
              <>
                {m.reembolsos.length === 0 ? (
                  <p className="muted">
                    Nenhuma conta paga no cartão pessoal de um sócio neste mês.
                  </p>
                ) : (
                  <table className="tbl" style={{ marginTop: 14 }}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Conta paga</th>
                        <th>Cartão</th>
                        <th className="num">Volta para</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.reembolsos.map((r) => (
                        <tr key={r.contaId}>
                          <td>{diaMes(r.data)}</td>
                          <td>
                            <strong>{r.conta}</strong>
                          </td>
                          <td>
                            {r.cartao} (pessoal do {r.socioNome})
                          </td>
                          <td className="num">
                            <strong className="valor">{formatarReais(r.valor)}</strong>
                            <span className="sub">{r.socioNome}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="lista-cabecalho rodape-reembolsos">
                  <span className="muted">
                    Vem sozinho de Contas a pagar. Para corrigir, mude a forma de pagamento lá.
                  </span>
                  <Link to="/contas?filtro=pagas" className="btn2">
                    Ver em Contas a pagar
                  </Link>
                </div>
              </>
            ) : m.retiradas.length === 0 ? (
              <p className="muted">Nenhuma retirada neste mês.</p>
            ) : (
              <table className="tbl" style={{ marginTop: 14 }}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Sócio</th>
                    <th>Motivo</th>
                    <th>Como pegou</th>
                    <th className="num">Valor</th>
                    <th className="num">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {m.retiradas.map((r) => (
                    <tr key={r.id}>
                      <td>{diaMes(r.data)}</td>
                      <td>
                        <strong>{r.socioNome}</strong>
                      </td>
                      <td>{r.motivo || '—'}</td>
                      <td>{NOME_COMO_RETIROU[r.como]}</td>
                      <td className="num">
                        <strong className="valor">{formatarReais(r.valor)}</strong>
                      </td>
                      <td className="acoes">
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Editar a retirada de ${diaMes(r.data)} do ${r.socioNome}`}
                          onClick={() => {
                            limparFaixas()
                            setRetirada(r)
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {retirada !== undefined && (
        <ModalRetirada
          retirada={retirada}
          hoje={ambiente.hoje}
          aoFechar={() => setRetirada(undefined)}
          aoSalvar={async (texto) => {
            setRetirada(undefined)
            limparFaixas()
            setMensagem(texto)
            setAba('retiradas')
            await atualizar()
          }}
          aoExcluir={excluir}
        />
      )}
    </>
  )
}

/** Faturamento · Despesas · Lucro líquido para dividir. */
function Resultado({ m }: { m: MesDosSocios }) {
  const { resultado: r, regras } = m
  const prejuizo = r.lucro < 0
  const subDespesas = [
    'inclui contas pagas nos cartões dos sócios',
    r.taxas > 0 ? `e ${formatarReais(r.taxas)} de taxas da maquininha` : null
  ]
    .filter(Boolean)
    .join(' ')
  let subLucro = 'faturamento − despesas'
  if (prejuizo && regras.prejuizo === 'nao_dividir') subLucro = 'mês com prejuízo: não é dividido'
  if (prejuizo && regras.prejuizo === 'dividir')
    subLucro = 'mês com prejuízo: dividido entre os sócios'
  if (regras.prejuizo === 'levar' && (prejuizo || m.prejuizoAnterior < 0)) {
    subLucro =
      m.prejuizoAnterior < 0
        ? `desconta ${formatarReais(m.prejuizoAnterior)} de prejuízo dos meses anteriores`
        : 'mês com prejuízo: vai para o mês seguinte'
  }
  return (
    <div className="grade">
      <div className="card kpi-card">
        <span className="kpi-rotulo">Faturamento</span>
        <strong className="kpi">{formatarReais(r.faturamento)}</strong>
        <span className="muted">
          balcão + pedidos{regras.taxas === 'descontar' ? ', já sem as taxas' : ''}
        </span>
      </div>
      <div className="card kpi-card">
        <span className="kpi-rotulo">Despesas</span>
        <strong className="kpi">− {formatarReais(r.despesas)}</strong>
        <span className="muted">{subDespesas}</span>
      </div>
      <div className="card kpi-card escuro">
        <span className="kpi-rotulo">
          {prejuizo ? 'Prejuízo do mês' : 'Lucro líquido para dividir'}
        </span>
        <strong className="kpi">{formatarReais(prejuizo ? r.lucro : m.paraDividir)}</strong>
        <span>{subLucro}</span>
      </div>
    </div>
  )
}
