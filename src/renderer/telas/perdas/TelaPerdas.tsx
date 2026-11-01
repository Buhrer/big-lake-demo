// Perdas: prototipo/telas/09-Perdas.png (docs/02 §6, R10; D-069).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Perda } from '../../../compartilhado/contrato'
import { mesAnterior, mesSeguinte } from '../../../dominio/contas'
import { formatarData, nomeDoMes, type DataISO } from '../../../dominio/datas'
import { formatarReais } from '../../../dominio/formatar'
import { resumirPerdas, textoDosItens, TIPOS_PERDA, type TipoPerda } from '../../../dominio/perdas'
import { Ajuda } from '../../componentes/Ajuda'
import { ConfirmarNaLinha, FaixaDesfazer } from '../../componentes/Excluir'
import { CHAVES, usePerdas } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { ModalPerda } from './ModalPerda'

type Filtro = 'todas' | TipoPerda

const NOME_FILTRO: Record<Filtro, string> = {
  todas: 'Todas',
  produto: 'Produtos',
  materia_prima: 'Matéria-prima',
  troca: 'Trocas'
}

const SUB_DO_TIPO: Record<TipoPerda, string> = {
  produto: 'Produtos prontos',
  materia_prima: 'Matéria-prima',
  troca: 'Troca'
}

const registros = (n: number) => (n === 1 ? '1 registro' : `${n} registros`)
const trocas = (n: number) => (n === 1 ? '1 troca' : `${n} trocas`)
const clientes = (n: number) => (n === 1 ? '1 cliente' : `${n} clientes`)
const diaMes = (d: DataISO) => formatarData(d).slice(0, 5)

export function TelaPerdas() {
  const { ambiente } = usePreferencias()
  const hoje = ambiente.hoje
  const mesAtual = hoje.slice(0, 7)
  const cliente = useQueryClient()
  const [anoMes, setAnoMes] = useState(mesAtual)
  const { data: perdas = [] } = usePerdas(anoMes)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  // undefined = fechado; null = registrar
  const [editando, setEditando] = useState<Perda | null | undefined>(undefined)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [excluida, setExcluida] = useState<Perda | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  const nomeMes = nomeDoMes(mes)
  const r = resumirPerdas(perdas)
  const visiveis = perdas.filter((p) => filtro === 'todas' || p.tipo === filtro)
  const contar = (f: Filtro) => (f === 'todas' ? perdas.length : r.porTipo[f].registros)

  async function atualizar() {
    for (const chave of [CHAVES.perdas, CHAVES.estoque, CHAVES.clientes, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  function limparFaixas() {
    setMensagem(null)
    setExcluida(null)
    setErro(null)
  }

  async function excluir(p: Perda) {
    setConfirmando(null)
    limparFaixas()
    const resp = await window.api.perdas.excluir(p.id)
    if (!resp.ok) return setErro(resp.mensagem)
    setExcluida(p)
    await atualizar()
  }

  async function desfazer() {
    if (!excluida) return
    const resp = await window.api.perdas.desfazerExclusao(excluida.id)
    if (!resp.ok) setErro(resp.mensagem)
    setExcluida(null)
    await atualizar()
  }

  return (
    <>
      <CabecalhoTela
        subtitulo="Produtos, matéria-prima e trocas feitas nos clientes"
        titulo="Perdas"
        ajuda={AJUDA.perdas}
        acao={
          <button
            type="button"
            className="btn"
            onClick={() => {
              limparFaixas()
              setConfirmando(null)
              setEditando(null)
            }}
          >
            + Registrar perda
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
        <strong aria-live="polite">
          {nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)} de {ano}
        </strong>
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

      <section className="grade grade-perdas" aria-label={`Resumo de ${nomeMes}`}>
        <div className="card kpi-card escuro">
          <span className="kpi-rotulo">Perdido em {nomeMes}</span>
          <strong className="kpi">{formatarReais(r.total)}</strong>
          <span>{registros(r.registros)}</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Produtos prontos</span>
          <strong className="kpi">{formatarReais(r.porTipo.produto.valor)}</strong>
          <span className="muted">paletas, potes, picolés</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Matéria-prima e insumos</span>
          <strong className="kpi">{formatarReais(r.porTipo.materia_prima.valor)}</strong>
          <span className="muted">leite, fruta, potes vazios</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Trocas em clientes</span>
          <strong className="kpi">{formatarReais(r.porTipo.troca.valor)}</strong>
          <span className="muted">
            {r.porTipo.troca.registros
              ? `${trocas(r.porTipo.troca.registros)} em ${clientes(r.porCliente.length)}`
              : 'nenhuma troca'}
          </span>
        </div>
      </section>

      <section className="card trocas-cliente" aria-labelledby="titulo-trocas-cliente">
        <div className="hrow">
          <h2 id="titulo-trocas-cliente">Trocas por cliente · {nomeMes}</h2>
          <Ajuda texto={AJUDA.trocasPorCliente} />
        </div>
        {r.porCliente.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nenhuma troca em clientes neste mês.
          </p>
        ) : (
          r.porCliente.map((c) => (
            <div key={c.clienteId} className="troca-cliente">
              <div className="troca-cliente-linha">
                <span>
                  <strong>{c.clienteNome}</strong>{' '}
                  <span className="muted">· {trocas(c.trocas)}</span>
                </span>
                <strong className="valor">{formatarReais(c.valor)}</strong>
              </div>
              <div className="barra-troca" aria-hidden="true">
                <span style={{ width: `${c.barra}%` }} />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="card lista-perdas" aria-labelledby="titulo-lista-perdas">
        <div className="lista-cabecalho">
          <h2 id="titulo-lista-perdas">Perdas de {nomeMes}</h2>
          <div className="abas" role="group" aria-label="Filtrar as perdas">
            {(['todas', ...TIPOS_PERDA] as Filtro[]).map((f) => (
              <button
                key={f}
                type="button"
                className={filtro === f ? 'tab on' : 'tab'}
                aria-pressed={filtro === f}
                onClick={() => setFiltro(f)}
              >
                {NOME_FILTRO[f]} ({contar(f)})
              </button>
            ))}
          </div>
        </div>

        {mensagem && (
          <div className="faixa ok" role="status">
            <span>✓ {mensagem}</span>
          </div>
        )}
        {excluida && (
          <FaixaDesfazer aoDesfazer={() => void desfazer()}>
            O registro de {diaMes(excluida.data)} foi excluído.
          </FaixaDesfazer>
        )}
        {erro && (
          <div className="faixa erro" role="alert">
            {erro}
          </div>
        )}

        {visiveis.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {perdas.length === 0
              ? 'Nenhuma perda neste mês.'
              : 'Nenhuma perda deste tipo neste mês.'}
          </p>
        ) : (
          <table className="tbl tabela-perdas">
            <thead>
              <tr>
                <th>Data</th>
                <th>O que se perdeu</th>
                <th>Motivo</th>
                <th className="num">Valor</th>
                <th className="num">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <tr key={p.id} className={confirmando === p.id ? 'confirmando' : undefined}>
                  <td>{diaMes(p.data)}</td>
                  <td>
                    <strong>{textoDosItens(p.itens)}</strong>
                    <span className="sub">
                      {p.tipo === 'troca' ? `Troca · ${p.clienteNome}` : SUB_DO_TIPO[p.tipo]}
                      {p.observacao && ` · ${p.observacao}`}
                    </span>
                  </td>
                  <td>
                    <span className={p.tipo === 'troca' ? 'tag atencao' : 'tag erro'}>
                      {p.motivo}
                    </span>
                  </td>
                  <td className="num">
                    <strong className="valor">{formatarReais(p.valor)}</strong>
                  </td>
                  <td className="acoes">
                    {confirmando === p.id ? (
                      <ConfirmarNaLinha
                        pergunta="Excluir este registro?"
                        aoConfirmar={() => void excluir(p)}
                        aoCancelar={() => setConfirmando(null)}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Editar a perda de ${diaMes(p.data)}`}
                          onClick={() => {
                            limparFaixas()
                            setEditando(p)
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Excluir a perda de ${diaMes(p.data)}`}
                          onClick={() => setConfirmando(p.id)}
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editando !== undefined && (
        <ModalPerda
          perda={editando}
          hoje={hoje}
          aoFechar={() => setEditando(undefined)}
          aoSalvar={async (texto, data) => {
            setEditando(undefined)
            limparFaixas()
            setMensagem(texto)
            setFiltro('todas')
            setAnoMes(data.slice(0, 7))
            await atualizar()
          }}
        />
      )}
    </>
  )
}
