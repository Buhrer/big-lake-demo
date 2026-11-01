// Pedidos de clientes: prototipo/telas/02-Vendas-e-Pedidos__2-pedidos-de-clientes.png; D-050, D-056, D-057.
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Pedido, Produto } from '../../../compartilhado/contrato'
import { centavos } from '../../../dominio/dinheiro'
import { formatarData, type DataISO } from '../../../dominio/datas'
import { formatarPercentual, formatarReais } from '../../../dominio/formatar'
import { nomeDoMesDoFiltro } from '../../../dominio/historico'
import {
  NOME_DA_FORMA,
  taxaDoPedido,
  totalDoPedido,
  type FormaPagamento
} from '../../../dominio/vendas'
import { Ajuda } from '../../componentes/Ajuda'
import { CampoData, EntradaNumero, numeroErradoNaTela } from '../../componentes/Campos'
import { ConfirmarNaLinha } from '../../componentes/Excluir'
import {
  ErroAoCarregar,
  EscolherMesDoHistorico,
  useFiltroHistorico,
  VerMais
} from '../../componentes/Historico'
import { ModalImpressao } from '../../componentes/Impressao'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import {
  CHAVES,
  useCategorias,
  useClientes,
  useEmpresa,
  useHistoricoPedidos,
  usePedidos,
  useTaxas
} from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { AJUDA } from '../../textos/ajuda'
import { useProdutos } from '../cadastros/Produtos'
import { TextoDoComprovante } from './Comprovante'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

const FORMAS: FormaPagamento[] = ['dinheiro', 'pix', 'debito', 'credito']

interface Item {
  produtoId: number
  nome: string
  quantidade: number | null
  precoUnitario: number
}

/** "4 Pote 2 L · Morango, 1 Caixa…" curto para a lista. */
function resumoDosItens(p: Pedido): string {
  const partesDoTexto = p.itens.map((i) => `${i.quantidade} ${i.nome}`)
  return partesDoTexto.length <= 2
    ? partesDoTexto.join(' + ')
    : `${partesDoTexto.slice(0, 2).join(' + ')} + mais ${partesDoTexto.length - 2}`
}

export function AbaPedidos({ clienteInicial }: { clienteInicial: number | null }) {
  const { ambiente } = usePreferencias()
  const [corrigindo, setCorrigindo] = useState<Pedido | null>(null)
  const [salvo, setSalvo] = useState<Pedido | null>(null)
  // muda a cada pedido salvo ou corrigido, para o quadro "Novo pedido" começar limpo
  const [versao, setVersao] = useState(0)

  return (
    <>
      <FormularioPedido
        key={`${versao}-${corrigindo?.id ?? 'novo'}`}
        pedido={corrigindo}
        clienteInicial={clienteInicial}
        hoje={ambiente.hoje}
        salvo={salvo}
        aoSalvar={(p) => {
          setSalvo(p)
          setCorrigindo(null)
          setVersao((v) => v + 1)
        }}
        aoCancelarCorrecao={() => {
          setCorrigindo(null)
          setVersao((v) => v + 1)
        }}
        aoFazerOutro={() => {
          setSalvo(null)
          setVersao((v) => v + 1)
        }}
      />
      <HistoricoDePedidos
        hoje={ambiente.hoje}
        aoCorrigir={(p) => {
          setSalvo(null)
          setCorrigindo(p)
          setVersao((v) => v + 1)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    </>
  )
}

function FormularioPedido({
  pedido,
  clienteInicial,
  hoje,
  salvo,
  aoSalvar,
  aoCancelarCorrecao,
  aoFazerOutro
}: {
  pedido: Pedido | null
  clienteInicial: number | null
  hoje: DataISO
  salvo: Pedido | null
  aoSalvar(p: Pedido): void
  aoCancelarCorrecao(): void
  aoFazerOutro(): void
}) {
  const cliente = useQueryClient()
  const { data: clientes = [] } = useClientes()
  const { data: produtos = [] } = useProdutos()
  const { data: categorias = [] } = useCategorias()
  const { data: taxas } = useTaxas()
  const { data: empresa } = useEmpresa()
  const [clienteId, setClienteId] = useState<number | null>(pedido?.clienteId ?? clienteInicial)
  const [data, setData] = useState<DataISO | null>(pedido?.data ?? hoje)
  const [forma, setForma] = useState<FormaPagamento | null>(pedido?.forma ?? null)
  const [itens, setItens] = useState<Item[]>(pedido?.itens ?? [])
  const [categoria, setCategoria] = useState<number | null>(null)
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // prévia da impressão do comprovante (D-088)
  const [previa, setPrevia] = useState(false)
  const [impresso, setImpresso] = useState<string | null>(null)

  const total = totalDoPedido(
    itens.map((i) => ({ quantidade: i.quantidade ?? 0, precoUnitario: centavos(i.precoUnitario) }))
  )
  const taxa = forma && taxas ? taxaDoPedido(total, forma, taxas) : null
  const visiveis = produtos.filter((p) => categoria === null || p.categoriaId === categoria)
  const categoriasComProduto = categorias.filter((c) =>
    produtos.some((p) => p.categoriaId === c.id)
  )

  const erros = {
    cliente: clienteId === null ? 'Escolha o cliente.' : undefined,
    data: data === null ? 'Digite a data.' : undefined,
    itens: itens.length === 0 ? 'Toque nos produtos para colocar no pedido.' : undefined,
    quantidade: itens.some((i) => !i.quantidade)
      ? 'Digite a quantidade de cada produto.'
      : undefined,
    forma: forma === null ? 'Escolha como o cliente pagou.' : undefined
  }

  function adicionar(p: Produto) {
    setErro(null)
    setItens((atual) =>
      atual.some((i) => i.produtoId === p.id)
        ? atual.map((i) =>
            i.produtoId === p.id ? { ...i, quantidade: (i.quantidade ?? 0) + 1 } : i
          )
        : [
            ...atual,
            { produtoId: p.id, nome: p.nome, quantidade: 1, precoUnitario: p.precoAtacado }
          ]
    )
  }

  function mudarQuantidade(produtoId: number, quantidade: number | null) {
    setItens((atual) => atual.map((i) => (i.produtoId === produtoId ? { ...i, quantidade } : i)))
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (Object.values(erros).some(Boolean) || !clienteId || !data || !forma) return
    const r = await window.api.pedidos.salvar(pedido?.id ?? null, {
      clienteId,
      data,
      forma,
      itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade! }))
    })
    if (!r.ok) return setErro(r.mensagem)
    for (const chave of [CHAVES.pedidos, CHAVES.resumoVendas, CHAVES.historico, CHAVES.clientes]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
    aoSalvar(r.valor)
  }

  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  if (salvo && !pedido) {
    return (
      <section className="card destaque-borda" aria-labelledby="titulo-pedido-salvo">
        <h2 id="titulo-pedido-salvo" className="sr-only">
          Pedido salvo
        </h2>
        <div className="faixa ok" role="status">
          <span>
            ✓ Pedido nº {salvo.numero} salvo! Total de {formatarReais(salvo.total)} em{' '}
            {NOME_DA_FORMA[salvo.forma]}. Já aparece no histórico abaixo.
          </span>
        </div>
        <div className="hrow">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setImpresso(null)
              setPrevia(true)
            }}
          >
            Imprimir comprovante
          </button>
          <button type="button" className="btn2" onClick={aoFazerOutro}>
            Fazer outro pedido
          </button>
        </div>
        <div className="hrow">
          <strong>Comprovante</strong>
          <Ajuda texto={AJUDA.comprovante} />
        </div>
        <TextoDoComprovante pedido={salvo} empresa={empresa ?? null} />
        {impresso && (
          <div className="faixa ok" role="status">
            <span>✓ {impresso}</span>
          </div>
        )}
        {previa && (
          <ModalImpressao
            alvo={{ tipo: 'pedido', id: salvo.id }}
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
      </section>
    )
  }

  return (
    <section className="card destaque-borda" aria-labelledby="titulo-novo-pedido">
      <div className="lista-cabecalho">
        <div className="hrow">
          <h2 id="titulo-novo-pedido">
            {pedido ? `Corrigindo o pedido nº ${pedido.numero}` : 'Novo pedido'}
          </h2>
          <Ajuda texto={AJUDA.novoPedido} />
          {pedido && <span className="tag editando">Editando um pedido</span>}
        </div>
      </div>
      <div className="pedido-grade">
        <div className="pedido-esquerda">
          <div className="campos linha-2">
            <ListaSuspensa<number>
              rotulo="Cliente"
              opcoes={clientes.map((c) => ({ valor: c.id, rotulo: c.nome }))}
              valor={clienteId}
              aoEscolher={setClienteId}
              textoVazio={
                clientes.length ? 'Escolha o cliente…' : 'Cadastre o cliente em Cadastros'
              }
              erro={mostrar(erros.cliente)}
            />
            <CampoData rotulo="Data" valor={data} aoMudar={setData} erro={mostrar(erros.data)} />
          </div>

          <div className="hrow">
            <strong>1. Toque no produto para adicionar</strong>
            <Ajuda texto={AJUDA.adicionarProdutos} />
          </div>
          {produtos.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nenhum produto à venda ainda. Cadastre em Cadastros › Produtos à venda.
            </p>
          ) : (
            <>
              <div className="abas" role="group" aria-label="Categoria do produto">
                <button
                  type="button"
                  className={categoria === null ? 'tab on' : 'tab'}
                  aria-pressed={categoria === null}
                  onClick={() => setCategoria(null)}
                >
                  Todos
                </button>
                {categoriasComProduto.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={categoria === c.id ? 'tab on' : 'tab'}
                    aria-pressed={categoria === c.id}
                    onClick={() => setCategoria(c.id)}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
              <div className="seletor-itens">
                {visiveis.map((p) => (
                  <button key={p.id} type="button" className="prod" onClick={() => adicionar(p)}>
                    <span>{p.nome}</span>
                    <span>{formatarReais(p.precoAtacado)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="hrow">
            <strong>2. Itens do pedido</strong>
            <span className="muted"> · digite a quantidade no campo</span>
          </div>
          {itens.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nenhum produto ainda. Toque nos produtos acima.
            </p>
          ) : (
            <div className="itens-pedido">
              {itens.map((i) => (
                <div key={i.produtoId} className="item-pedido">
                  <div>
                    <strong>{i.nome}</strong>
                    <span className="sub">
                      {formatarReais(centavos(i.precoUnitario))} cada ·{' '}
                      {formatarReais(centavos((i.quantidade ?? 0) * i.precoUnitario))}
                    </span>
                  </div>
                  <div className="hrow nowrap">
                    <button
                      type="button"
                      className="qb"
                      aria-label={`Diminuir ${i.nome}`}
                      onClick={() =>
                        mudarQuantidade(i.produtoId, Math.max(1, (i.quantidade ?? 1) - 1))
                      }
                    >
                      −
                    </button>
                    <EntradaNumero
                      key={i.produtoId}
                      rotuloAcessivel={`Quantidade de ${i.nome}`}
                      valor={i.quantidade}
                      aoMudar={(q) => mudarQuantidade(i.produtoId, q)}
                      ler={(t) => (/^\d{1,5}$/.test(t.trim()) && Number(t) > 0 ? Number(t) : null)}
                      formatar={String}
                      invalido={tentou && !i.quantidade}
                    />
                    <button
                      type="button"
                      className="qb"
                      aria-label={`Aumentar ${i.nome}`}
                      onClick={() => mudarQuantidade(i.produtoId, (i.quantidade ?? 0) + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="rm"
                      aria-label={`Remover ${i.nome}`}
                      onClick={() =>
                        setItens((atual) => atual.filter((x) => x.produtoId !== i.produtoId))
                      }
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {mostrar(erros.itens ?? erros.quantidade) && (
            <span className="erro-campo">{erros.itens ?? erros.quantidade}</span>
          )}
        </div>

        <div className="pedido-direita">
          <span className="lb" id="rotulo-forma">
            Como o cliente pagou
          </span>
          <div className="opcoes opcoes-2" role="radiogroup" aria-labelledby="rotulo-forma">
            {FORMAS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={forma === f}
                className={forma === f ? 'opt on' : 'opt'}
                onClick={() => setForma(f)}
              >
                {NOME_DA_FORMA[f]}
              </button>
            ))}
          </div>
          {mostrar(erros.forma) && <span className="erro-campo">{erros.forma}</span>}
          <div className="ins total-pedido">
            <span>Total do pedido</span>
            <strong className="num">{formatarReais(total)}</strong>
            {taxa && taxa.pct > 0 && (
              <>
                <div className="kl">
                  <span>Taxa da maquininha ({formatarPercentual(taxa.pct)})</span>
                  <span className="num">− {formatarReais(taxa.valor)}</span>
                </div>
                <div className="kl">
                  <span>Fica para a sorveteria</span>
                  <span className="num">{formatarReais(centavos(total - taxa.valor))}</span>
                </div>
              </>
            )}
          </div>
          <button type="button" className="btn btn-grande" onClick={() => void salvarUmaVez()}>
            {pedido ? 'Salvar alterações' : 'Salvar pedido'}
          </button>
          {pedido && (
            <button type="button" className="btn2" onClick={aoCancelarCorrecao}>
              Cancelar correção
            </button>
          )}
          {erro && (
            <div className="faixa erro" role="alert">
              {erro}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function HistoricoDePedidos({ hoje, aoCorrigir }: { hoje: DataISO; aoCorrigir(p: Pedido): void }) {
  const cliente = useQueryClient()
  const { filtro, escolherMes, verMais } = useFiltroHistorico()
  const { data: pagina, isError } = useHistoricoPedidos(filtro)
  const pedidos = pagina?.itens ?? []
  // o resumo é do mês escolhido; em "Últimos", do mês de hoje
  const mesDoResumo = filtro.anoMes ?? hoje.slice(0, 7)
  const { data: doMes = [] } = usePedidos(mesDoResumo)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // prévia da impressão do comprovante (D-088)
  const [previaDe, setPreviaDe] = useState<Pedido | null>(null)
  const [impresso, setImpresso] = useState<string | null>(null)
  const validos = doMes.filter((p) => !p.cancelado)
  const totalMes = centavos(validos.reduce((s, p) => s + p.total, 0))

  async function atualizar() {
    for (const chave of [CHAVES.pedidos, CHAVES.resumoVendas, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  async function cancelar(p: Pedido) {
    setConfirmando(null)
    const r = await window.api.pedidos.cancelar(p.id, null)
    if (!r.ok) return setErro(r.mensagem)
    await atualizar()
  }

  async function desfazer(p: Pedido) {
    const r = await window.api.pedidos.desfazerCancelamento(p.id)
    if (!r.ok) return setErro(r.mensagem)
    await atualizar()
  }

  return (
    <section className="card" aria-labelledby="titulo-historico-pedidos">
      <div className="lista-cabecalho">
        <div className="hrow">
          <h2 id="titulo-historico-pedidos">Histórico de pedidos</h2>
          <Ajuda texto={AJUDA.historicoPedidos} />
        </div>
        <span>
          {nomeDoMesDoFiltro(mesDoResumo)}:{' '}
          <strong>
            {validos.length} {validos.length === 1 ? 'pedido' : 'pedidos'} ·{' '}
            {formatarReais(totalMes)}
          </strong>
        </span>
        {pagina && pagina.meses.length > 0 && (
          <EscolherMesDoHistorico
            rotulo="Mês do histórico de pedidos"
            meses={pagina.meses}
            anoMes={filtro.anoMes}
            aoEscolher={escolherMes}
          />
        )}
      </div>
      {erro && (
        <div className="faixa erro" role="alert" style={{ marginBottom: 14 }}>
          {erro}
        </div>
      )}
      {impresso && (
        <div className="faixa ok" role="status" style={{ marginBottom: 14 }}>
          <span>✓ {impresso}</span>
        </div>
      )}
      {previaDe && (
        <ModalImpressao
          alvo={{ tipo: 'pedido', id: previaDe.id }}
          aoFechar={() => setPreviaDe(null)}
          aoImprimir={(texto) => {
            setPreviaDe(null)
            setImpresso(texto)
          }}
        />
      )}
      {isError ? (
        <ErroAoCarregar />
      ) : pedidos.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {filtro.anoMes ? 'Nenhum pedido neste mês.' : 'Nenhum pedido ainda.'}
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Pagamento</th>
              <th className="num">Total</th>
              <th className="num">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr
                key={p.id}
                className={
                  confirmando === p.id ? 'confirmando' : p.cancelado ? 'linha-cancelada' : undefined
                }
              >
                <td>
                  <strong>#{p.numero}</strong>
                </td>
                <td>{formatarData(p.data).slice(0, 5)}</td>
                <td>
                  <strong>{p.clienteNome}</strong>
                  <span className="sub">{resumoDosItens(p)}</span>
                  {p.cancelado && <span className="tag erro tag-abaixo">Cancelado</span>}
                </td>
                <td>{NOME_DA_FORMA[p.forma]}</td>
                <td className="num">
                  <strong className="valor">{formatarReais(p.total)}</strong>
                </td>
                <td className="acoes">
                  {confirmando === p.id ? (
                    <ConfirmarNaLinha
                      pergunta="Cancelar este pedido?"
                      aoConfirmar={() => void cancelar(p)}
                      aoCancelar={() => setConfirmando(null)}
                    />
                  ) : p.cancelado ? (
                    <button type="button" className="sm" onClick={() => void desfazer(p)}>
                      Desfazer cancelamento
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="sm"
                        aria-label={`Comprovante do pedido ${p.numero}`}
                        onClick={() => {
                          setImpresso(null)
                          setPreviaDe(p)
                        }}
                      >
                        Comprovante
                      </button>
                      <button
                        type="button"
                        className="sm"
                        aria-label={`Corrigir o pedido ${p.numero}`}
                        onClick={() => aoCorrigir(p)}
                      >
                        Corrigir
                      </button>
                      <button
                        type="button"
                        className="sm"
                        aria-label={`Cancelar o pedido ${p.numero}`}
                        onClick={() => setConfirmando(p.id)}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pagina && <VerMais mostrando={pedidos.length} total={pagina.total} aoVerMais={verMais} />}
    </section>
  )
}
