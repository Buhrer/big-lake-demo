import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Receita, ResumoReceita } from '../../../compartilhado/contrato'
import { formatarCusto } from '../../../dominio/formatar'
import { marcarMenorLucro, pluralizar } from '../../../dominio/receita'
import { Ajuda } from '../../componentes/Ajuda'
import { ConfirmarNaLinha, FaixaDesfazer } from '../../componentes/Excluir'
import { CHAVES, useReceitas } from '../../consultas'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { AbaPlanejar } from './AbaPlanejar'
import { AvisosDeCusto, useAvisosDeCusto } from './AvisoCustoSubiu'
import { ModalReceita } from './ModalReceita'

type Aba = 'planejar' | 'receitas' | 'avisos'

export function TelaProducao() {
  const [parametros, setParametros] = useSearchParams()
  const aba = (parametros.get('aba') as Aba | null) ?? 'planejar'
  const [modal, setModal] = useState<{ receita: Receita | null } | null>(null)
  const { data: avisos = [] } = useAvisosDeCusto()

  async function verReceita(id: number) {
    const receita = await window.api.receitas.obter(id)
    if (!receita) return
    setParametros({ aba: 'receitas' }, { replace: true })
    setModal({ receita })
  }

  return (
    <>
      <CabecalhoTela
        subtitulo="Planejar o que fazer e quanto custa cada receita"
        titulo="Produção e Receitas"
        ajuda={AJUDA.producao}
        acao={
          aba === 'receitas' && (
            <button type="button" className="btn" onClick={() => setModal({ receita: null })}>
              + Nova receita
            </button>
          )
        }
      />
      <div className="seg" role="tablist" aria-label="Produção e Receitas">
        {(
          [
            ['planejar', 'Planejar produção'],
            ['receitas', 'Receitas'],
            ['avisos', 'Avisos']
          ] as const
        ).map(([a, rotulo]) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            aria-label={
              a === 'avisos' && avisos.length > 0 ? `Avisos (${avisos.length})` : undefined
            }
            className={aba === a ? 'sg on' : 'sg'}
            onClick={() => setParametros({ aba: a }, { replace: true })}
          >
            {rotulo}
            {a === 'avisos' && avisos.length > 0 && (
              <span className="badge-aba" aria-hidden="true">
                {avisos.length}
              </span>
            )}
          </button>
        ))}
      </div>
      {aba === 'planejar' ? (
        <AbaPlanejar aoMudarReceita={(id) => void verReceita(id)} />
      ) : aba === 'avisos' ? (
        avisos.length > 0 ? (
          <AvisosDeCusto aoVerReceita={(id) => void verReceita(id)} />
        ) : (
          <section className="card" aria-label="Avisos">
            <p className="muted" style={{ margin: 0 }}>
              Nenhum aviso agora. Quando um ingrediente ou embalagem ficar mais caro, o aviso
              aparece aqui.
            </p>
          </section>
        )
      ) : (
        <ListaReceitas
          aoEditar={async (id) => {
            const receita = await window.api.receitas.obter(id)
            if (receita) setModal({ receita })
          }}
          modal={modal}
          aoFecharModal={() => setModal(null)}
        />
      )}
    </>
  )
}

function ListaReceitas({
  aoEditar,
  modal,
  aoFecharModal
}: {
  aoEditar(id: number): void
  modal: { receita: Receita | null } | null
  aoFecharModal(): void
}) {
  const cliente = useQueryClient()
  const { data: receitas = [] } = useReceitas()
  const [categoria, setCategoria] = useState<number | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [bloqueada, setBloqueada] = useState<{ id: number; motivo: string } | null>(null)
  const [excluida, setExcluida] = useState<ResumoReceita | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // abas: só as categorias que têm receita, na ordem em que aparecem
  const categorias = [...new Map(receitas.map((r) => [r.categoriaId, r.categoriaNome])).entries()]
  const atual = categorias.some(([id]) => id === categoria)
    ? categoria
    : (categorias[0]?.[0] ?? null)
  const daCategoria = receitas.filter((r) => r.categoriaId === atual)
  const menor = marcarMenorLucro(daCategoria.map((r) => ({ lucro: r.balcao.lucroDeCada })))

  async function atualizar() {
    for (const chave of [CHAVES.receitas, CHAVES.categorias, CHAVES.historico, CHAVES.produtos]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  async function excluir(r: ResumoReceita) {
    setConfirmando(null)
    const resp = await window.api.receitas.excluir(r.id)
    if (!resp.ok) return setErro(resp.mensagem)
    setMensagem(null)
    setExcluida(r)
    await atualizar()
  }

  async function desfazer() {
    if (!excluida) return
    const resp = await window.api.receitas.desfazerExclusao(excluida.id)
    if (!resp.ok) setErro(resp.mensagem)
    setExcluida(null)
    await atualizar()
  }

  return (
    <section className="card" aria-labelledby="titulo-receitas">
      <div className="hrow" style={{ marginBottom: 14 }}>
        <h2 id="titulo-receitas">Receitas cadastradas</h2>
        <Ajuda texto={AJUDA.receitasCadastradas} />
      </div>
      {mensagem && (
        <div className="faixa ok" role="status" style={{ marginBottom: 14 }}>
          <span>✓ {mensagem}</span>
        </div>
      )}
      {excluida && (
        <div style={{ marginBottom: 14 }}>
          <FaixaDesfazer aoDesfazer={() => void desfazer()}>
            A receita “{excluida.nome}” foi excluída.
          </FaixaDesfazer>
        </div>
      )}
      {erro && (
        <div className="faixa erro" role="alert" style={{ marginBottom: 14 }}>
          {erro}
        </div>
      )}
      {receitas.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nenhuma receita ainda. Toque em “+ Nova receita”.
        </p>
      ) : (
        <>
          <div className="abas" role="group" aria-label="Categoria" style={{ marginBottom: 14 }}>
            {categorias.map(([id, nome]) => (
              <button
                key={id}
                type="button"
                className={atual === id ? 'tab on' : 'tab'}
                aria-pressed={atual === id}
                onClick={() => setCategoria(id)}
              >
                {nome}
              </button>
            ))}
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Receita</th>
                <th className="num">Custo de cada</th>
                <th className="num">Lucro no balcão</th>
                <th className="num">Lucro no atacado</th>
                <th className="num">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {daCategoria.map((r, i) => {
                const cor = (lucro: number) => (menor[i] || lucro < 0 ? 'texto-erro' : 'texto-ok')
                return (
                  <tr key={r.id} className={confirmando === r.id ? 'confirmando' : undefined}>
                    <td>
                      <strong>{r.nome}</strong>
                      <span className="sub">
                        rende {r.rendimento} {pluralizar(r.nomeUnidade)}
                      </span>
                      {menor[i] && <span className="tag erro tag-abaixo">menor lucro</span>}
                    </td>
                    <td className="num">{formatarCusto(r.custoDeCada)}</td>
                    <td className="num">
                      <strong className={`valor ${cor(r.balcao.lucroDeCada)}`}>
                        {formatarCusto(r.balcao.lucroDeCada)}
                      </strong>
                      <span className="sub">{r.balcao.percentual}% do preço</span>
                    </td>
                    <td className="num">
                      <strong className={`valor ${cor(r.atacado.lucroDeCada)}`}>
                        {formatarCusto(r.atacado.lucroDeCada)}
                      </strong>
                      <span className="sub">{r.atacado.percentual}% do preço</span>
                    </td>
                    <td className="acoes">
                      {bloqueada?.id === r.id ? (
                        <div className="confirmar">
                          <span>Não dá para excluir: {bloqueada.motivo}.</span>
                          <button type="button" className="sm" onClick={() => setBloqueada(null)}>
                            Entendi
                          </button>
                        </div>
                      ) : confirmando === r.id ? (
                        <ConfirmarNaLinha
                          pergunta="Excluir esta receita?"
                          aoConfirmar={() => void excluir(r)}
                          aoCancelar={() => setConfirmando(null)}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            className="sm"
                            aria-label={`Editar ${r.nome}`}
                            onClick={() => {
                              setMensagem(null)
                              aoEditar(r.id)
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="sm"
                            aria-label={`Excluir ${r.nome}`}
                            onClick={async () => {
                              const motivo = await window.api.receitas.emUso(r.id)
                              if (motivo) setBloqueada({ id: r.id, motivo })
                              else setConfirmando(r.id)
                            }}
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="muted" style={{ marginBottom: 0 }}>
            “% do preço” é a parte do preço que vira lucro.
          </p>
        </>
      )}
      {modal && (
        <ModalReceita
          receita={modal.receita}
          aoFechar={aoFecharModal}
          aoSalvar={(nome, nova) => {
            setExcluida(null)
            setMensagem(nova ? `Receita ${nome} cadastrada.` : `Receita ${nome} salva.`)
            aoFecharModal()
          }}
        />
      )}
    </section>
  )
}
