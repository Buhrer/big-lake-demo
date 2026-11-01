// Contas a pagar: prototipo/telas/10-Contas-a-pagar.png (docs/02 §7, R11).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Conta } from '../../../compartilhado/contrato'
import { etiquetaDaConta, resumoDasContas, textoDoPagamento } from '../../../dominio/contas'
import { formatarData, nomeDoMes, partes } from '../../../dominio/datas'
import { formatarReais } from '../../../dominio/formatar'
import { Ajuda } from '../../componentes/Ajuda'
import { FaixaDesfazer } from '../../componentes/Excluir'
import { CHAVES, useContas } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { ModalConta } from './ModalConta'
import { ModalPagamento } from './Pagamento'

type Filtro = 'a_pagar' | 'pagas' | 'todas'

const FILTROS: [Filtro, string][] = [
  ['a_pagar', 'A pagar'],
  ['pagas', 'Pagas'],
  ['todas', 'Todas']
]

const contas = (n: number) => (n === 1 ? '1 conta' : `${n} contas`)

/** A pagar: do vencimento mais perto; pagas: da paga mais recente. */
function ordenar(lista: Conta[]): Conta[] {
  const abertas = lista.filter((c) => !c.pagamento)
  const pagas = lista
    .filter((c) => c.pagamento)
    .sort((a, b) => b.pagamento!.pagoEm.localeCompare(a.pagamento!.pagoEm) || b.id - a.id)
  return [...abertas, ...pagas]
}

export function TelaContas() {
  const { ambiente } = usePreferencias()
  const hoje = ambiente.hoje
  const cliente = useQueryClient()
  const { data: todas = [] } = useContas()
  const [parametros, setParametros] = useSearchParams()
  const filtro = (parametros.get('filtro') as Filtro | null) ?? 'a_pagar'
  // undefined = fechado; null = nova conta
  const [editando, setEditando] = useState<Conta | null | undefined>(undefined)
  const [pagando, setPagando] = useState<Conta | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [excluida, setExcluida] = useState<Conta | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // conta que veio de uma manutenção: corrige-se em Patrimônio (D-070)
  const [daManutencao, setDaManutencao] = useState<Conta | null>(null)

  const r = resumoDasContas(
    todas.map((c) => ({ ...c, pagoEm: c.pagamento?.pagoEm ?? null })),
    hoje
  )
  const mes = nomeDoMes(partes(hoje).mes)
  const visiveis = ordenar(
    todas.filter((c) =>
      filtro === 'a_pagar' ? !c.pagamento : filtro === 'pagas' ? c.pagamento : true
    )
  )

  async function atualizar() {
    for (const chave of [
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

  function limparFaixas() {
    setMensagem(null)
    setExcluida(null)
    setErro(null)
    setDaManutencao(null)
  }

  async function desfazerPagamento(c: Conta) {
    limparFaixas()
    const resp = await window.api.contas.desfazerPagamento(c.id)
    if (!resp.ok) return setErro(resp.mensagem)
    setMensagem(`A conta ${c.nome} voltou para “A pagar”.`)
    await atualizar()
  }

  async function excluir(c: Conta) {
    const resp = await window.api.contas.excluir(c.id)
    if (!resp.ok) return setErro(resp.mensagem)
    setEditando(undefined)
    limparFaixas()
    setExcluida(c)
    await atualizar()
  }

  async function desfazerExclusao() {
    if (!excluida) return
    const resp = await window.api.contas.desfazerExclusao(excluida.id)
    if (!resp.ok) setErro(resp.mensagem)
    setExcluida(null)
    await atualizar()
  }

  return (
    <>
      <CabecalhoTela
        subtitulo="Boletos, aluguel, luz, salários e fornecedores"
        titulo="Contas a pagar"
        ajuda={AJUDA.contas}
        acao={
          <button
            type="button"
            className="btn"
            onClick={() => {
              limparFaixas()
              setEditando(null)
            }}
          >
            + Nova conta
          </button>
        }
      />
      <div className="grade">
        <div className="card kpi-card borda-vermelha">
          <span className="kpi-rotulo">Vencem nos próximos 7 dias</span>
          <strong className="kpi texto-erro">{formatarReais(r.proximos7.valor)}</strong>
          <span className="muted">{contas(r.proximos7.quantidade)}</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Atrasadas</span>
          <strong className={r.atrasadas.quantidade ? 'kpi texto-erro' : 'kpi texto-ok'}>
            {formatarReais(r.atrasadas.valor)}
          </strong>
          <span className="muted">
            {r.atrasadas.quantidade ? contas(r.atrasadas.quantidade) : 'nenhuma conta atrasada'}
          </span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Pagas em {mes}</span>
          <strong className="kpi">{formatarReais(r.pagasNoMes.valor)}</strong>
          <span className="muted">{contas(r.pagasNoMes.quantidade)}</span>
        </div>
      </div>

      <div className="lista-cabecalho">
        <div className="abas" role="group" aria-label="Filtrar as contas">
          {FILTROS.map(([f, rotulo]) => (
            <button
              key={f}
              type="button"
              className={filtro === f ? 'tab on' : 'tab'}
              aria-pressed={filtro === f}
              onClick={() => setParametros(f === 'a_pagar' ? {} : { filtro: f }, { replace: true })}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <span className="hrow muted">
          Pagou uma conta? <Ajuda texto={AJUDA.marcarComoPaga} />
        </span>
      </div>

      {mensagem && (
        <div className="faixa ok" role="status">
          <span>✓ {mensagem}</span>
        </div>
      )}
      {excluida && (
        <FaixaDesfazer aoDesfazer={() => void desfazerExclusao()}>
          A conta “{excluida.nome}” foi excluída.
        </FaixaDesfazer>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
      {daManutencao && (
        <div className="faixa atencao" role="status">
          <span>
            A conta “{daManutencao.nome}” vem de uma manutenção. Corrija em Patrimônio: lá a
            manutenção e a conta mudam juntas.
          </span>
          <Link className="sm" to="/patrimonio?aba=manutencoes">
            Ir para Patrimônio
          </Link>
        </div>
      )}

      <section className="card card-tabela">
        {visiveis.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {todas.length === 0
              ? 'Nenhuma conta ainda. Toque em “+ Nova conta” para anotar a primeira.'
              : filtro === 'a_pagar'
                ? 'Nenhuma conta a pagar. Tudo em dia!'
                : 'Nenhuma conta neste filtro.'}
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Conta</th>
                <th>Repete</th>
                <th className="num">Valor</th>
                <th className="num">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((c) => {
                const etiqueta = etiquetaDaConta(c.vencimento, c.pagamento?.pagoEm ?? null, hoje)
                const p = c.pagamento
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{formatarData(c.vencimento).slice(0, 5)}</strong>
                      <span className={`tag ${etiqueta.nivel} tag-abaixo`}>{etiqueta.texto}</span>
                    </td>
                    <td>
                      <strong>{c.nome}</strong>
                      <span className="sub">
                        {c.tipoNome}
                        {p &&
                          ` · ${textoDoPagamento(
                            p.forma,
                            p.cartaoNome ? { nome: p.cartaoNome, dono: p.donoNome } : null
                          )} em ${formatarData(p.pagoEm).slice(0, 5)}`}
                      </span>
                    </td>
                    <td>{c.repete ? 'Todo mês' : 'Uma vez'}</td>
                    <td className="num">
                      <strong className="valor">{formatarReais(c.valor)}</strong>
                    </td>
                    <td className="acoes">
                      <button
                        type="button"
                        className="sm"
                        aria-label={`Editar ${c.nome}`}
                        onClick={() => {
                          limparFaixas()
                          if (c.manutencaoId !== null) setDaManutencao(c)
                          else setEditando(c)
                        }}
                      >
                        Editar
                      </button>
                      {p ? (
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Desfazer o pagamento de ${c.nome}`}
                          onClick={() => void desfazerPagamento(c)}
                        >
                          Desfazer
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sm verde"
                          aria-label={`Marcar ${c.nome} como paga`}
                          onClick={() => {
                            limparFaixas()
                            setPagando(c)
                          }}
                        >
                          Marcar como paga
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {editando !== undefined && (
        <ModalConta
          conta={editando}
          hoje={hoje}
          aoFechar={() => setEditando(undefined)}
          aoSalvar={async (texto) => {
            setEditando(undefined)
            limparFaixas()
            setMensagem(texto)
            await atualizar()
          }}
          aoExcluir={excluir}
        />
      )}
      {pagando && (
        <ModalPagamento
          conta={pagando}
          hoje={hoje}
          aoFechar={() => setPagando(null)}
          aoPagar={async () => {
            setMensagem(`Conta ${pagando.nome} marcada como paga.`)
            setPagando(null)
            await atualizar()
          }}
        />
      )}
    </>
  )
}
