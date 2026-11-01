import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ItemEstoque } from '../../../compartilhado/contrato'
import {
  estaVencendo,
  resumoValidade,
  situacao,
  type EstadoEstoque
} from '../../../dominio/estoque'
import { formatarCusto, formatarQuantidade, formatarReais } from '../../../dominio/formatar'
import { ConfirmarNaLinha, FaixaDesfazer } from '../../componentes/Excluir'
import { Modal } from '../../componentes/Modal'
import { CHAVES, useGasEnergia, useItensEstoque } from '../../consultas'
import { ModalGasNoEstoque } from '../CardGasEnergia'
import { usePreferencias } from '../../contexto/Preferencias'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { ModalEditarInsumo } from './ModalEditarInsumo'
import { ModalEntrada, type Aviso } from './ModalEntrada'

type Filtro = 'todos' | 'materia_prima' | 'insumo' | 'baixo' | 'vencendo'

function estado(item: ItemEstoque): EstadoEstoque {
  return { quantidade: item.quantidade, lotes: item.lotes }
}

export function TelaEstoque() {
  const { ambiente } = usePreferencias()
  const hoje = ambiente.hoje
  const cliente = useQueryClient()
  // espera a leitura feita ao abrir a tela: o Início pode ter deixado uma lista antiga em cache
  const { data: itens = [], isFetchedAfterMount: itensCarregados } = useItensEstoque()
  const { data: gas } = useGasEnergia()
  const [editandoGas, setEditandoGas] = useState(false)
  const [apagandoUsado, setApagandoUsado] = useState<{
    item: ItemEstoque
    receitas: string[]
  } | null>(null)
  const [parametros, setParametros] = useSearchParams()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  // D-041 A: item especial, sem quantidade nem validade; só aparece em "Todos"
  const mostrarGas = gas?.modo === 'ingrediente' && filtro === 'todos'
  const [editando, setEditando] = useState<ItemEstoque | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [excluido, setExcluido] = useState<ItemEstoque | null>(null)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [clicouCadastrar, setCadastrando] = useState(false)
  // "Chegou mercadoria" (atalho do Início) abre o modal direto: #/estoque?entrada=1
  const cadastrando = clicouCadastrar || parametros.get('entrada') === '1'

  const contar = (f: Filtro) => itens.filter((i) => passa(i, f)).length
  function passa(i: ItemEstoque, f: Filtro): boolean {
    switch (f) {
      case 'todos':
        return true
      case 'materia_prima':
      case 'insumo':
        return i.tipo === f
      case 'baixo':
        return situacao(i.quantidade, i.minimo) === 'comprar'
      case 'vencendo':
        return estaVencendo(estado(i), hoje)
    }
  }

  const FILTROS: [Filtro, string][] = [
    ['todos', 'Todos'],
    ['materia_prima', 'Matéria-prima'],
    ['insumo', 'Insumos'],
    ['baixo', 'Estoque baixo'],
    ['vencendo', 'Vencendo']
  ]

  async function atualizar() {
    // custo e estoque mexem nas receitas, nos produtos e no aviso "O custo subiu"
    for (const chave of [
      CHAVES.estoque,
      CHAVES.fornecedores,
      CHAVES.historico,
      CHAVES.receitas,
      CHAVES.produtos,
      CHAVES.avisosCusto
    ]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  /** Pergunta 11 (D-047): se o item está em receitas, mostra quais antes de apagar. */
  async function pedirExclusao(item: ItemEstoque) {
    setErro(null)
    const usadas = await window.api.estoque.receitasQueUsam(item.id)
    if (usadas.length > 0) setApagandoUsado({ item, receitas: usadas.map((r) => r.nome) })
    else setConfirmando(item.id)
  }

  async function excluir(item: ItemEstoque) {
    setConfirmando(null)
    setApagandoUsado(null)
    const r = await window.api.estoque.excluir(item.id)
    if (!r.ok) {
      setErro(r.mensagem)
      return
    }
    setAvisos([])
    setExcluido(item)
    await atualizar()
  }

  async function desfazer() {
    if (!excluido) return
    const r = await window.api.estoque.desfazerExclusao(excluido.id)
    if (!r.ok) setErro(r.mensagem)
    setExcluido(null)
    await atualizar()
  }

  function fecharCadastro() {
    setCadastrando(false)
    if (parametros.has('entrada')) setParametros({}, { replace: true })
  }

  const visiveis = itens.filter((i) => passa(i, filtro))

  return (
    <>
      <CabecalhoTela
        subtitulo="Matéria-prima e insumos que chegam na sorveteria"
        titulo="Estoque e Insumos"
        ajuda={AJUDA.estoque}
        acao={
          <button
            type="button"
            className="btn"
            onClick={() => {
              setErro(null)
              setCadastrando(true)
            }}
          >
            + Cadastrar insumo
          </button>
        }
      />
      <div className="abas" role="group" aria-label="Filtrar o estoque">
        {FILTROS.map(([f, rotulo]) => (
          <button
            key={f}
            type="button"
            className={filtro === f ? 'tab on' : 'tab'}
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
          >
            {rotulo} ({contar(f)})
          </button>
        ))}
      </div>

      {avisos.map((a, i) => (
        <div key={i} className={`faixa ${a.tipo}`} role="status">
          <span>
            {a.tipo === 'ok' ? '✓ ' : ''}
            {a.texto}
          </span>
        </div>
      ))}
      {excluido && (
        <FaixaDesfazer aoDesfazer={() => void desfazer()}>
          “{excluido.nome}” foi excluído da lista.
        </FaixaDesfazer>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}

      <section className="card card-tabela">
        {itens.length === 0 && !mostrarGas ? (
          <p className="muted" style={{ margin: 0 }}>
            Nada no estoque ainda. Toque em “+ Cadastrar insumo” quando chegar mercadoria.
          </p>
        ) : visiveis.length === 0 && !mostrarGas ? (
          <p className="muted" style={{ margin: 0 }}>
            Nenhum item neste filtro.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Produto</th>
                <th className="num">Em estoque</th>
                <th className="num">Custo</th>
                <th>Validade</th>
                <th>Situação</th>
                <th className="num">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {mostrarGas && gas && (
                <tr>
                  <td>
                    <strong>Gás e energia da produção</strong>
                    <span className="sub">custo da produção, por vez</span>
                  </td>
                  <td className="num muted">—</td>
                  <td className="num">
                    <span className="valor">{formatarReais(gas.precoPorVez)}</span> /vez
                  </td>
                  <td className="muted">—</td>
                  <td className="muted">—</td>
                  <td className="acoes">
                    <button
                      type="button"
                      className="sm"
                      aria-label="Editar Gás e energia da produção"
                      onClick={() => setEditandoGas(true)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              )}
              {visiveis.map((i) => {
                const validade = resumoValidade(estado(i), hoje, i.rotulo)
                const comprar = situacao(i.quantidade, i.minimo) === 'comprar'
                return (
                  <tr key={i.id} className={confirmando === i.id ? 'confirmando' : undefined}>
                    <td>
                      <strong>{i.nome}</strong>
                      {i.fornecedorNome && <span className="sub">{i.fornecedorNome}</span>}
                    </td>
                    <td className="num">
                      <strong className={i.quantidade < 0 ? 'texto-erro valor' : 'valor'}>
                        {formatarQuantidade(i.quantidade)} {i.rotulo}
                      </strong>
                      <span className="sub">
                        mín. {formatarQuantidade(i.minimo)} {i.rotulo}
                      </span>
                    </td>
                    <td className="num">
                      <span className="valor">{formatarCusto(i.custo)}</span> /{i.rotulo}
                    </td>
                    <td>
                      {validade ? validade.texto : <span className="muted">—</span>}
                      {validade?.etiqueta && (
                        <span className={`tag ${validade.etiqueta.nivel} tag-abaixo`}>
                          {validade.etiqueta.texto}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={comprar ? 'tag erro' : 'tag ok'}>
                        {comprar ? 'Comprar' : 'OK'}
                      </span>
                    </td>
                    <td className="acoes">
                      {confirmando === i.id ? (
                        <ConfirmarNaLinha
                          pergunta="Excluir este item?"
                          aoConfirmar={() => void excluir(i)}
                          aoCancelar={() => setConfirmando(null)}
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            className="sm"
                            aria-label={`Editar ${i.nome}`}
                            onClick={() => {
                              setAvisos([])
                              setEditando(i)
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="sm"
                            aria-label={`Excluir ${i.nome}`}
                            onClick={() => void pedirExclusao(i)}
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
        )}
      </section>

      {cadastrando && itensCarregados && (
        <ModalEntrada
          itens={itens}
          aoFechar={fecharCadastro}
          aoSalvar={async (novosAvisos) => {
            setAvisos(novosAvisos)
            setExcluido(null)
            fecharCadastro()
            await atualizar()
          }}
        />
      )}
      {editandoGas && <ModalGasNoEstoque aoFechar={() => setEditandoGas(false)} />}
      {apagandoUsado && (
        <Modal
          titulo={'Apagar ' + apagandoUsado.item.nome + '?'}
          largura={640}
          aoFechar={() => setApagandoUsado(null)}
          rodape={
            <>
              <button
                type="button"
                className="btn"
                onClick={() => void excluir(apagandoUsado.item)}
              >
                Sim, apagar e tirar das receitas
              </button>
              <button type="button" className="btn2" onClick={() => setApagandoUsado(null)}>
                Não apagar
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            {apagandoUsado.item.nome} é usado nestas receitas. Se apagar, ele sai delas e o custo de
            cada uma muda:
          </p>
          <ul className="lista-receitas">
            {apagandoUsado.receitas.map((nome) => (
              <li key={nome}>{nome}</li>
            ))}
          </ul>
          <p className="muted" style={{ margin: 0 }}>
            Se apagar por engano, toque em “Desfazer” logo depois: o item volta para o estoque e
            para as receitas.
          </p>
        </Modal>
      )}
      {editando && (
        <ModalEditarInsumo
          item={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={async () => {
            setAvisos([{ tipo: 'ok', texto: `Cadastro de ${editando.nome} corrigido.` }])
            setEditando(null)
            await atualizar()
          }}
        />
      )}
    </>
  )
}
