// Planejar produção: prototipo/telas/06-Producao-Planejar.png (docs/02 §4.1, R7; D-032 p.31 a 33; D-065).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Producao } from '../../../compartilhado/contrato'
import { formatarData } from '../../../dominio/datas'
import { formatarQuantidade, formatarReais, lerQuantidade } from '../../../dominio/formatar'
import {
  planejarProducao,
  textoDasReceitas,
  unidadesPrevistas,
  type ItemParaPlanejar
} from '../../../dominio/producao'
import { pluralizar } from '../../../dominio/receita'
import { Ajuda } from '../../componentes/Ajuda'
import { EntradaNumero, numeroErradoNaTela } from '../../componentes/Campos'
import { ConfirmarNaLinha, FaixaDesfazer } from '../../componentes/Excluir'
import { CHAVES, useItensEstoque, useProducoes, useReceitas } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

const unidadesTexto = (n: number, nomeUnidade: string) =>
  `${n} ${n === 1 ? nomeUnidade : pluralizar(nomeUnidade)}`

const lerInteiro = (t: string) => (/^\d{1,6}$/.test(t.trim()) ? Number(t.trim()) : null)

export function AbaPlanejar({ aoMudarReceita }: { aoMudarReceita(id: number): void }) {
  const cliente = useQueryClient()
  const { ambiente } = usePreferencias()
  const { data: receitas = [], isSuccess: receitasProntas } = useReceitas()
  const { data: itensEstoque = [] } = useItensEstoque()
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [vezes, setVezes] = useState<number | null>(1000)
  // undefined = o que a receita prevê; null = caixa vazia ou inválida
  const [feitas, setFeitas] = useState<number | null | undefined>(undefined)
  // muda só nos botões − e +, para a caixa não perder o que está sendo digitado
  const [versaoVezes, setVersaoVezes] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [registrada, setRegistrada] = useState<Producao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const registrarUmaVez = useUmaVezPorVez(registrar)

  const receitaId = escolhida ?? receitas[0]?.id ?? null
  const resumo = receitas.find((r) => r.id === receitaId)
  const { data: receita } = useQuery({
    queryKey: ['receita', receitaId],
    queryFn: () => window.api.receitas.obter(receitaId!),
    enabled: receitaId !== null
  })

  if (receitasProntas && receitas.length === 0) {
    return (
      <section className="card">
        <p className="muted" style={{ margin: 0 }}>
          Nenhuma receita cadastrada ainda. Cadastre na aba “Receitas” para planejar a produção.
        </p>
      </section>
    )
  }

  const itens = new Map<number, ItemParaPlanejar>(
    itensEstoque.map((i) => [
      i.id,
      { nome: i.nome, rotulo: i.rotulo, quantidade: i.quantidade, custo: i.custo }
    ])
  )
  const plano = receita && vezes ? planejarProducao(receita, vezes, itens) : null
  const nomeUnidade = resumo?.nomeUnidade || 'unidade'
  const previstas = resumo && vezes ? unidadesPrevistas(resumo.rendimento, vezes) : 0
  const saiu = feitas === undefined ? previstas : feitas

  function escolher(id: number) {
    setEscolhida(id)
    setFeitas(undefined)
    setConfirmando(false)
    setRegistrada(null)
    setErro(null)
  }

  function mudarVezes(v: number | null) {
    setVezes(v)
    setFeitas(undefined)
    setConfirmando(false)
  }

  async function registrar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setErro(null)
    if (!receitaId || !vezes) return setErro('Digite quantas receitas fez.')
    if (saiu === null) return setErro('Digite quantas saíram.')
    if (plano?.faltas.length && !confirmando) return setConfirmando(true)
    setConfirmando(false)
    const r = await window.api.producao.registrar({ receitaId, vezes, unidadesFeitas: saiu })
    if (!r.ok) return setErro(r.mensagem)
    setRegistrada(r.valor)
    setFeitas(undefined)
    for (const chave of [CHAVES.estoque, CHAVES.producoes, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  return (
    <>
      <section className="card destaque-borda" aria-labelledby="titulo-qual-receita">
        <strong id="titulo-qual-receita">Qual receita vai fazer?</strong>
        <div
          className="opcoes opcoes-receitas"
          role="radiogroup"
          aria-labelledby="titulo-qual-receita"
        >
          {receitas.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={r.id === receitaId}
              className={r.id === receitaId ? 'opt on' : 'opt'}
              onClick={() => escolher(r.id)}
            >
              {r.nome}
            </button>
          ))}
        </div>
        {resumo && (
          <div className="faixa-produz">
            <span className="hrow">
              Esta receita produz
              <strong className="produz-qtd">
                {unidadesTexto(resumo.rendimento, nomeUnidade)}
              </strong>
              <Ajuda texto={AJUDA.quantoProduz} />
            </span>
            <button type="button" className="btn2" onClick={() => aoMudarReceita(resumo.id)}>
              Mudar na receita
            </button>
          </div>
        )}
        <div className="hrow nowrap">
          <span className="lb" id="rotulo-quantas-receitas" style={{ margin: 0 }}>
            Quantas receitas vai fazer?
          </span>
          <button
            type="button"
            className="qb"
            aria-label="Meia receita a menos"
            disabled={!vezes || vezes <= 500}
            onClick={() => {
              mudarVezes(Math.max(500, (vezes ?? 1000) - 500))
              setVersaoVezes((v) => v + 1)
            }}
          >
            −
          </button>
          <EntradaNumero
            key={versaoVezes}
            rotuloAcessivel="Quantas receitas vai fazer?"
            valor={vezes}
            aoMudar={(v) => mudarVezes(v && v > 0 ? v : null)}
            ler={lerQuantidade}
            formatar={(v) => (v === 500 ? '½' : formatarQuantidade(v))}
            invalido={!vezes}
          />
          <button
            type="button"
            className="qb"
            aria-label="Meia receita a mais"
            onClick={() => {
              mudarVezes((vezes ?? 0) + 500)
              setVersaoVezes((v) => v + 1)
            }}
          >
            +
          </button>
          {vezes !== null && vezes !== 1000 && resumo && (
            <span className="muted">= {unidadesTexto(previstas, nomeUnidade)}</span>
          )}
        </div>
      </section>

      {plano && (
        <section className="card card-tabela" aria-label="Ingredientes e embalagens">
          {plano.linhas.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Esta receita não usa nada do estoque.
            </p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ingrediente e embalagem</th>
                  <th className="num">A receita usa</th>
                  <th className="num">Tem no estoque</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {plano.linhas.map((l) => (
                  <tr key={l.itemId}>
                    <td>
                      <strong>{l.nome}</strong>
                    </td>
                    <td className="num">
                      {formatarQuantidade(l.usa)} {l.rotulo}
                    </td>
                    <td className={l.tem < 0 ? 'num texto-erro' : 'num'}>
                      {formatarQuantidade(l.tem)} {l.rotulo}
                    </td>
                    <td>
                      {l.falta > 0 ? (
                        <span className="tag erro">
                          Falta {formatarQuantidade(l.falta)} {l.rotulo}
                        </span>
                      ) : (
                        <span className="tag ok">Tem</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {plano &&
        (plano.faltas.length > 0 ? (
          <div className="card caixa-falta" role="status">
            <strong>
              Falta comprar:{' '}
              {plano.faltas
                .map((f) => `${f.nome} ${formatarQuantidade(f.falta)} ${f.rotulo}`)
                .join(' · ')}
            </strong>
            <span>
              Custo estimado: <strong>{formatarReais(plano.custoDaFalta)}</strong>
            </span>
          </div>
        ) : (
          <div className="faixa ok" role="status">
            <span>✓ Tem tudo no estoque. Pode produzir!</span>
          </div>
        ))}

      {registrada ? (
        <div className="card destaque-borda" role="status">
          <div className="faixa ok">
            <span>
              ✓ Produção registrada! {unidadesTexto(registrada.unidadesFeitas, nomeUnidade)} de{' '}
              {registrada.nomeReceita} anotadas. Os ingredientes e as embalagens foram baixados do
              estoque.
            </span>
          </div>
          <div>
            <button type="button" className="btn2" onClick={() => setRegistrada(null)}>
              Planejar outra produção
            </button>
          </div>
        </div>
      ) : (
        plano && (
          <div className="registrar-producao">
            <div className="hrow nowrap">
              <span className="lb" aria-hidden="true" style={{ margin: 0 }}>
                Quantas {pluralizar(nomeUnidade)} saíram?
              </span>
              <EntradaNumero
                key={`${receitaId}-${vezes}`}
                rotuloAcessivel={`Quantas ${pluralizar(nomeUnidade)} saíram?`}
                valor={saiu}
                aoMudar={setFeitas}
                ler={lerInteiro}
                formatar={String}
                invalido={saiu === null}
              />
            </div>
            {confirmando ? (
              <ConfirmarNaLinha
                pergunta="Falta estoque. Registrar mesmo assim? O estoque vai ficar negativo."
                aoConfirmar={() => void registrarUmaVez()}
                aoCancelar={() => setConfirmando(false)}
              />
            ) : (
              <span className="hrow">
                <button type="button" className="btn" onClick={() => void registrarUmaVez()}>
                  Registrar produção
                </button>
                <Ajuda texto={AJUDA.registrarProducao} />
              </span>
            )}
          </div>
        )
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}

      <ProducoesDoMes anoMes={ambiente.hoje.slice(0, 7)} />
    </>
  )
}

function ProducoesDoMes({ anoMes }: { anoMes: string }) {
  const cliente = useQueryClient()
  const { data: producoes = [] } = useProducoes(anoMes)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [excluida, setExcluida] = useState<Producao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function atualizar() {
    for (const chave of [CHAVES.estoque, CHAVES.producoes, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  async function excluir(p: Producao) {
    setConfirmando(null)
    setErro(null)
    const r = await window.api.producao.excluir(p.id)
    if (!r.ok) return setErro(r.mensagem)
    setExcluida(p)
    await atualizar()
  }

  async function desfazer() {
    if (!excluida) return
    const r = await window.api.producao.desfazerExclusao(excluida.id)
    if (!r.ok) setErro(r.mensagem)
    setExcluida(null)
    await atualizar()
  }

  return (
    <section className="card" aria-labelledby="titulo-producoes-mes">
      <div className="hrow" style={{ marginBottom: 14 }}>
        <h2 id="titulo-producoes-mes">Produções do mês</h2>
        <Ajuda texto={AJUDA.producoesDoMes} />
      </div>
      {excluida && (
        <FaixaDesfazer aoDesfazer={() => void desfazer()}>
          A produção de {excluida.nomeReceita} foi excluída e o estoque voltou.
        </FaixaDesfazer>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
      {producoes.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nenhuma produção registrada neste mês.
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Receita</th>
              <th className="num">Saíram</th>
              <th className="num">Custo</th>
              <th className="num">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {producoes.map((p) => (
              <tr key={p.id} className={confirmando === p.id ? 'confirmando' : undefined}>
                <td>{formatarData(p.data).slice(0, 5)}</td>
                <td>
                  <strong>{p.nomeReceita}</strong>
                  <span className="sub">{textoDasReceitas(p.vezes)}</span>
                </td>
                <td className="num">
                  {unidadesTexto(p.unidadesFeitas, p.nomeUnidade || 'unidade')}
                </td>
                <td className="num">
                  <span className="valor">{formatarReais(p.custoTotal)}</span>
                </td>
                <td className="acoes">
                  {confirmando === p.id ? (
                    <ConfirmarNaLinha
                      pergunta="Excluir esta produção? O estoque volta."
                      aoConfirmar={() => void excluir(p)}
                      aoCancelar={() => setConfirmando(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="sm"
                      aria-label={`Excluir a produção de ${p.nomeReceita}`}
                      onClick={() => setConfirmando(p.id)}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
