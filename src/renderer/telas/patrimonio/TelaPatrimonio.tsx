// Patrimônio: prototipo/telas/12-Patrimonio*.png (docs/02 §9, T12; D-066, D-067, D-070).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Bem, Manutencao } from '../../../compartilhado/contrato'
import { centavos } from '../../../dominio/dinheiro'
import { formatarData } from '../../../dominio/datas'
import { formatarReais } from '../../../dominio/formatar'
import {
  formatarMesAno,
  NOME_TIPO_MANUTENCAO,
  nomeDoFiltro,
  resumirManutencoes,
  textoDosServicos
} from '../../../dominio/patrimonio'
import { Ajuda } from '../../componentes/Ajuda'
import { ConfirmarNaLinha, FaixaDesfazer } from '../../componentes/Excluir'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { CHAVES, useBens, useManutencoes, useTiposBem } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { ModalBem } from './ModalBem'
import { ModalManutencao } from './ModalManutencao'

type Aba = 'bens' | 'manutencoes'

const itens = (n: number) => (n === 1 ? '1 item' : `${n} itens`)

export function TelaPatrimonio() {
  const { ambiente } = usePreferencias()
  const hoje = ambiente.hoje
  const cliente = useQueryClient()
  const [parametros, setParametros] = useSearchParams()
  const aba = (parametros.get('aba') as Aba | null) ?? 'bens'
  // undefined = fechado; null = novo
  const [bemAberto, setBemAberto] = useState<Bem | null | undefined>(undefined)
  const [manutencaoAberta, setManutencaoAberta] = useState<
    { manutencao: Manutencao | null; bemId: number | null } | undefined
  >(undefined)
  const [mensagem, setMensagem] = useState<{ texto: string; contas: string | null } | null>(null)
  const [bemExcluido, setBemExcluido] = useState<Bem | null>(null)
  const [manutencaoExcluida, setManutencaoExcluida] = useState<Manutencao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function limparFaixas() {
    setMensagem(null)
    setBemExcluido(null)
    setManutencaoExcluida(null)
    setErro(null)
  }

  async function atualizar() {
    for (const chave of [
      CHAVES.bens,
      CHAVES.tiposBem,
      CHAVES.manutencoes,
      CHAVES.contas,
      CHAVES.avisosContas,
      CHAVES.tiposConta,
      CHAVES.cartoes,
      CHAVES.mesSocios,
      CHAVES.historico
    ]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  async function excluirBem(b: Bem) {
    const r = await window.api.patrimonio.excluirBem(b.id)
    if (!r.ok) return setErro(r.mensagem)
    setBemAberto(undefined)
    limparFaixas()
    setBemExcluido(b)
    await atualizar()
  }

  async function desfazerBem() {
    if (!bemExcluido) return
    const r = await window.api.patrimonio.desfazerExclusaoBem(bemExcluido.id)
    if (!r.ok) setErro(r.mensagem)
    setBemExcluido(null)
    await atualizar()
  }

  async function excluirManutencao(m: Manutencao) {
    limparFaixas()
    const r = await window.api.patrimonio.excluirManutencao(m.id)
    if (!r.ok) return setErro(r.mensagem)
    setManutencaoExcluida(m)
    await atualizar()
  }

  async function desfazerManutencao() {
    if (!manutencaoExcluida) return
    const r = await window.api.patrimonio.desfazerExclusaoManutencao(manutencaoExcluida.id)
    if (!r.ok) setErro(r.mensagem)
    setManutencaoExcluida(null)
    await atualizar()
  }

  const novaManutencao = (bemId: number | null) => {
    limparFaixas()
    setManutencaoAberta({ manutencao: null, bemId })
  }

  return (
    <>
      <CabecalhoTela
        subtitulo="Os bens da empresa e as manutenções de cada um"
        titulo="Patrimônio"
        ajuda={AJUDA.patrimonio}
        acao={
          aba === 'bens' ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                limparFaixas()
                setBemAberto(null)
              }}
            >
              + Cadastrar bem
            </button>
          ) : (
            <button type="button" className="btn" onClick={() => novaManutencao(null)}>
              + Registrar manutenção
            </button>
          )
        }
      />
      <div className="seg" role="tablist" aria-label="Patrimônio">
        {(
          [
            ['bens', 'Bens da empresa'],
            ['manutencoes', 'Manutenções']
          ] as const
        ).map(([a, rotulo]) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            className={aba === a ? 'sg on' : 'sg'}
            onClick={() => {
              limparFaixas()
              setParametros(a === 'bens' ? {} : { aba: a }, { replace: true })
            }}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {mensagem && (
        <div className="faixa ok" role="status">
          <span>✓ {mensagem.texto}</span>
          {mensagem.contas && (
            <Link className="sm" to={mensagem.contas}>
              Ver em Contas a pagar
            </Link>
          )}
        </div>
      )}
      {bemExcluido && (
        <FaixaDesfazer aoDesfazer={() => void desfazerBem()}>
          O bem “{bemExcluido.nome}” foi excluído.
        </FaixaDesfazer>
      )}
      {manutencaoExcluida && (
        <FaixaDesfazer aoDesfazer={() => void desfazerManutencao()}>
          A manutenção “{manutencaoExcluida.oQueFoiFeito}” foi excluída
          {manutencaoExcluida.conta ? ' e a conta saiu de Contas a pagar' : ''}.
        </FaixaDesfazer>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}

      {aba === 'bens' ? (
        <AbaBens
          aoEditar={(b) => {
            limparFaixas()
            setBemAberto(b)
          }}
          aoManutencao={(b) => novaManutencao(b.id)}
        />
      ) : (
        <AbaManutencoes
          ano={Number(hoje.slice(0, 4))}
          aoEditar={(m) => {
            limparFaixas()
            setManutencaoAberta({ manutencao: m, bemId: m.bemId })
          }}
          aoExcluir={(m) => void excluirManutencao(m)}
        />
      )}

      {bemAberto !== undefined && (
        <ModalBem
          bem={bemAberto}
          aoFechar={() => setBemAberto(undefined)}
          aoSalvar={async (texto) => {
            setBemAberto(undefined)
            limparFaixas()
            setMensagem({ texto, contas: null })
            await atualizar()
          }}
          aoExcluir={excluirBem}
        />
      )}
      {manutencaoAberta && (
        <ModalManutencao
          manutencao={manutencaoAberta.manutencao}
          bemInicial={manutencaoAberta.bemId}
          hoje={hoje}
          aoFechar={() => setManutencaoAberta(undefined)}
          aoSalvar={async (texto, paga) => {
            setManutencaoAberta(undefined)
            limparFaixas()
            setMensagem({
              texto,
              contas: paga === null ? null : paga ? '/contas?filtro=pagas' : '/contas'
            })
            await atualizar()
          }}
        />
      )}
    </>
  )
}

function AbaBens({
  aoEditar,
  aoManutencao
}: {
  aoEditar(b: Bem): void
  aoManutencao(b: Bem): void
}) {
  const { data: bens = [] } = useBens()
  const { data: tipos = [] } = useTiposBem()
  const [filtro, setFiltro] = useState<number | null>(null)
  const filtroValido = tipos.some((t) => t.id === filtro) ? filtro : null
  const visiveis = bens.filter((b) => filtroValido === null || b.tipoId === filtroValido)
  const soma = (lista: Bem[]) => centavos(lista.reduce((t, b) => t + b.valor, 0))

  return (
    <>
      <div className="grade">
        <div className="card kpi-card">
          <span className="kpi-rotulo">Bens cadastrados</span>
          <strong className="kpi">{itens(bens.length)}</strong>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Valor pago</span>
          <strong className="kpi">{formatarReais(soma(bens))}</strong>
        </div>
      </div>

      <div className="abas" role="group" aria-label="Filtrar os bens">
        <button
          type="button"
          className={filtroValido === null ? 'tab on' : 'tab'}
          aria-pressed={filtroValido === null}
          onClick={() => setFiltro(null)}
        >
          Todos
        </button>
        {tipos.map((t) => (
          <button
            key={t.id}
            type="button"
            className={filtroValido === t.id ? 'tab on' : 'tab'}
            aria-pressed={filtroValido === t.id}
            onClick={() => setFiltro(t.id)}
          >
            {nomeDoFiltro(t.nome)}
          </button>
        ))}
      </div>

      <section className="card card-tabela lista-acoes" aria-label="Bens da empresa">
        {visiveis.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {bens.length === 0
              ? 'Nenhum bem cadastrado ainda. Toque em “+ Cadastrar bem” para colocar o primeiro.'
              : 'Nenhum bem deste tipo.'}
          </p>
        ) : (
          <table className="tbl tabela-acoes">
            <thead>
              <tr>
                <th>Bem</th>
                <th>Data da compra</th>
                <th className="num">Valor pago</th>
                <th className="num">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.nome}</strong>
                    <span className="sub">
                      {b.tipoNome}
                      {b.identificacao && ` · ${b.identificacao}`}
                    </span>
                  </td>
                  <td>{b.dataCompra ? formatarMesAno(b.dataCompra) : '—'}</td>
                  <td className="num">
                    <span className="valor">{formatarReais(b.valor)}</span>
                  </td>
                  <td className="acoes">
                    <button
                      type="button"
                      className="sm"
                      aria-label={`Editar ${b.nome}`}
                      onClick={() => aoEditar(b)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="sm"
                      aria-label={`Manutenção de ${b.nome}`}
                      onClick={() => aoManutencao(b)}
                    >
                      Manutenção
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>Total</strong>
                </td>
                <td className="num">
                  <strong className="valor">{formatarReais(soma(visiveis))}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </>
  )
}

function AbaManutencoes({
  ano,
  aoEditar,
  aoExcluir
}: {
  ano: number
  aoEditar(m: Manutencao): void
  aoExcluir(m: Manutencao): void
}) {
  const { data: manutencoes = [] } = useManutencoes()
  // 0 = todos
  const [bemId, setBemId] = useState(0)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const r = resumirManutencoes(manutencoes, ano)
  const bensComManutencao = [...new Map(manutencoes.map((m) => [m.bemId, m.bemNome])).entries()]
  const filtroValido = bensComManutencao.some(([id]) => id === bemId) ? bemId : 0
  const visiveis = manutencoes.filter((m) => filtroValido === 0 || m.bemId === filtroValido)

  return (
    <>
      <div className="hrow">
        <h2 className="titulo-secao">Manutenções</h2>
        <Ajuda texto={AJUDA.manutencoes} />
      </div>
      <div className="grade">
        <div className="card kpi-card escuro">
          <span className="kpi-rotulo">Gasto com manutenção em {ano}</span>
          <strong className="kpi">{formatarReais(r.gasto)}</strong>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Serviços feitos em {ano}</span>
          <strong className="kpi">{r.servicos}</strong>
          <span className="muted">{textoDosServicos(r.revisoes, r.consertos)}</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Bem que mais gastou</span>
          <strong className="kpi">{r.bemQueMaisGastou?.nome ?? '—'}</strong>
          {r.bemQueMaisGastou && (
            <span className="muted">
              {formatarReais(r.bemQueMaisGastou.valor)} em {ano}
            </span>
          )}
        </div>
      </div>

      <section className="card lista-acoes" aria-labelledby="titulo-historico-manutencoes">
        <div className="lista-cabecalho">
          <h2 id="titulo-historico-manutencoes">Histórico de manutenções</h2>
          <div className="hrow filtro-bem">
            <strong aria-hidden="true">Patrimônio:</strong>
            <ListaSuspensa<number>
              rotulo="Patrimônio"
              rotuloOculto
              opcoes={[
                { valor: 0, rotulo: 'Todos' },
                ...bensComManutencao.map(([id, nome]) => ({ valor: id, rotulo: nome }))
              ]}
              valor={filtroValido}
              aoEscolher={setBemId}
            />
          </div>
        </div>
        {visiveis.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nenhuma manutenção registrada ainda. Toque em “+ Registrar manutenção”.
          </p>
        ) : (
          <table className="tbl tabela-acoes">
            <thead>
              <tr>
                <th>Data</th>
                <th>Patrimônio</th>
                <th>O que foi feito</th>
                <th>Tipo</th>
                <th className="num">Valor</th>
                <th className="num">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((m) => (
                <tr key={m.id} className={confirmando === m.id ? 'confirmando' : undefined}>
                  <td>{formatarData(m.data)}</td>
                  <td>
                    <strong>{m.bemNome}</strong>
                  </td>
                  <td>
                    {m.oQueFoiFeito}
                    {m.quemFez && <span className="sub">feito por {m.quemFez}</span>}
                    {m.conta && !m.conta.pagamento && (
                      <span className="sub">
                        a pagar · vence {formatarData(m.conta.vencimento).slice(0, 5)}
                      </span>
                    )}
                  </td>
                  <td>
                    <strong className={m.tipo === 'conserto' ? 'texto-erro' : 'texto-info'}>
                      {NOME_TIPO_MANUTENCAO[m.tipo]}
                    </strong>
                  </td>
                  <td className="num">
                    <strong className="valor">{formatarReais(m.valor)}</strong>
                  </td>
                  <td className="acoes">
                    {confirmando === m.id ? (
                      <ConfirmarNaLinha
                        pergunta={
                          m.conta
                            ? 'Excluir esta manutenção? A conta sai de Contas a pagar.'
                            : 'Excluir esta manutenção?'
                        }
                        aoConfirmar={() => {
                          setConfirmando(null)
                          aoExcluir(m)
                        }}
                        aoCancelar={() => setConfirmando(null)}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Editar a manutenção ${m.oQueFoiFeito}`}
                          onClick={() => aoEditar(m)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Excluir a manutenção ${m.oQueFoiFeito}`}
                          onClick={() => setConfirmando(m.id)}
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>
                  <strong>Total</strong>
                </td>
                <td className="num">
                  <strong className="valor">
                    {formatarReais(centavos(visiveis.reduce((t, m) => t + m.valor, 0)))}
                  </strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </>
  )
}
