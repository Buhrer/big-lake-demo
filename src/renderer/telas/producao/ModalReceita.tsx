// Modal "Nova receita" / "Editar receita" em 3 partes (prototipo/telas/07-Producao-Receitas__modal-editar-receita.png).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Categoria, ItemEstoque, Receita } from '../../../compartilhado/contrato'
import { centavos, type Centavos, type QuantidadeX1000 } from '../../../dominio/dinheiro'
import {
  formatarCusto,
  formatarQuantidade,
  formatarReais,
  lerQuantidade
} from '../../../dominio/formatar'
import { calcularReceita, lucroNaVenda, pluralizar } from '../../../dominio/receita'
import { Ajuda } from '../../componentes/Ajuda'
import {
  CampoDinheiro,
  CampoTexto,
  EntradaNumero,
  numeroErradoNaTela
} from '../../componentes/Campos'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { CHAVES, useCategorias, useGasEnergia, useItensEstoque } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

const NOME_GAS = 'Gás e energia da produção'

interface Linha {
  itemId: number
  quantidade: QuantidadeX1000 | null
}

export function ModalReceita({
  receita,
  aoFechar,
  aoSalvar
}: {
  /** null = nova receita */
  receita: Receita | null
  aoFechar(): void
  aoSalvar(nome: string, nova: boolean): void
}) {
  const cliente = useQueryClient()
  const { data: itens = [] } = useItensEstoque()
  const { data: categorias = [] } = useCategorias()
  const { data: gasCfg } = useGasEnergia()
  const modoGas = gasCfg?.modo ?? 'ingrediente'

  const [nome, setNome] = useState(receita?.nome ?? '')
  const [categoriaId, setCategoriaId] = useState<number | null>(receita?.categoriaId ?? null)
  const [linhas, setLinhas] = useState<Linha[]>(receita?.ingredientes ?? [])
  const [embalagens, setEmbalagens] = useState<number[]>(receita?.embalagens ?? [])
  const [rendimento, setRendimento] = useState<number | null>(receita?.rendimento ?? null)
  // A: uma vez por receita, de começo (toda produção usa o fogão e o freezer)
  const [gasVezes, setGasVezes] = useState<QuantidadeX1000 | null>(
    receita ? receita.gasVezes : 1000
  )
  const [gasValor, setGasValor] = useState<Centavos | null>(receita?.gasValor ?? null)
  const [precoBalcao, setPrecoBalcao] = useState<Centavos | null>(receita?.precoBalcao ?? null)
  const [precoAtacado, setPrecoAtacado] = useState<Centavos | null>(receita?.precoAtacado ?? null)
  const [nomeUnidade, setNomeUnidade] = useState(receita?.nomeUnidade ?? '')
  const [escolhendo, setEscolhendo] = useState(false)
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const porId = new Map(itens.map((i) => [i.id, i]))
  const categoria = categorias.find((c) => c.id === categoriaId) ?? null
  const materiasPrimas = itens.filter((i) => i.tipo === 'materia_prima')
  const insumos = itens.filter((i) => i.tipo === 'insumo')
  const usaGasComoIngrediente = modoGas === 'ingrediente' && gasVezes !== null
  const unidade = nomeUnidade.trim() || 'unidade'
  const unidades = pluralizar(unidade)

  function escolherCategoria(c: Categoria) {
    setCategoriaId(c.id)
    setPrecoBalcao(c.precoBalcao)
    setPrecoAtacado(c.precoAtacado)
    setNomeUnidade(c.nomeUnidade)
  }

  const conta = (() => {
    try {
      return calcularReceita({
        ingredientes: linhas
          .filter((l) => l.quantidade !== null && porId.has(l.itemId))
          .map((l) => ({ quantidade: l.quantidade!, custo: porId.get(l.itemId)!.custo })),
        embalagens: embalagens.filter((e) => porId.has(e)).map((e) => porId.get(e)!.custo),
        rendimento: rendimento && rendimento > 0 ? rendimento : 1,
        gas: {
          modo: modoGas,
          vezes: gasVezes,
          precoPorVez: gasCfg?.precoPorVez ?? centavos(0),
          valorFixo: gasCfg?.valorFixo ?? centavos(0),
          valorDaReceita: gasValor
        }
      })
    } catch {
      return null
    }
  })()
  const rendeu = rendimento !== null && rendimento > 0
  const balcao =
    conta && rendeu && precoBalcao !== null
      ? lucroNaVenda(precoBalcao, conta.custoDeCada, rendimento)
      : null
  const atacado =
    conta && rendeu && precoAtacado !== null
      ? lucroNaVenda(precoAtacado, conta.custoDeCada, rendimento)
      : null

  const erros = {
    nome: !nome.trim() ? 'Digite o nome da receita.' : undefined,
    categoria: !categoria ? 'Escolha a categoria do produto.' : undefined,
    quantidades: linhas.some((l) => l.quantidade === null || l.quantidade <= 0)
      ? 'Digite a quantidade de cada ingrediente.'
      : undefined,
    rendimento: !rendeu ? `Diga quantas ${unidades} a receita rende.` : undefined,
    precos: precoBalcao === null || precoAtacado === null ? 'Digite os dois preços.' : undefined,
    unidade: !nomeUnidade.trim() ? 'Diga como se chama cada unidade.' : undefined
  }

  async function criarCategoria(nomeNovo: string): Promise<string | void> {
    const r = await window.api.categorias.criar(nomeNovo)
    if (!r.ok) return r.mensagem
    await cliente.invalidateQueries({ queryKey: CHAVES.categorias })
    escolherCategoria(r.valor)
  }

  async function removerCategoria(id: number) {
    const r = await window.api.categorias.remover(id)
    if (!r.ok) return setErro(r.mensagem)
    if (categoriaId === id) setCategoriaId(null)
    await cliente.invalidateQueries({ queryKey: CHAVES.categorias })
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (Object.values(erros).some(Boolean) || !categoria || !rendimento) return
    setSalvando(true)
    const r = await window.api.receitas.salvar(receita?.id ?? null, {
      nome,
      categoriaId: categoria.id,
      rendimento,
      ingredientes: linhas.map((l) => ({ itemId: l.itemId, quantidade: l.quantidade! })),
      embalagens,
      gasVezes,
      gasValor,
      precoBalcao: precoBalcao!,
      precoAtacado: precoAtacado!,
      nomeUnidade: nomeUnidade.trim()
    })
    setSalvando(false)
    if (!r.ok) return setErro(r.mensagem)
    for (const chave of [CHAVES.receitas, CHAVES.categorias, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
    aoSalvar(nome.trim(), receita === null)
  }

  const mostrar = (e: string | undefined) => (tentou ? e : undefined)
  const disponiveis = materiasPrimas.filter((m) => !linhas.some((l) => l.itemId === m.id))

  return (
    <Modal
      titulo={receita ? 'Editar receita' : 'Nova receita'}
      editando={receita ? 'Editando uma receita' : undefined}
      aoFechar={aoFechar}
      rodape={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => void salvarUmaVez()}
            disabled={salvando}
          >
            Salvar receita
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Fechar sem salvar
          </button>
        </>
      }
    >
      {/* ---------- 1 · Nome e ingredientes ---------- */}
      <section className="parte">
        <div className="hrow">
          <span className="stp">1</span>
          <h3 className="parte-titulo">Nome e ingredientes</h3>
          <Ajuda texto={AJUDA.ingredientesReceita} />
        </div>
        <div className="campos linha-nome-categoria">
          <CampoTexto
            rotulo="Nome da receita"
            valor={nome}
            aoMudar={setNome}
            erro={mostrar(erros.nome)}
          />
          <ListaSuspensa<number>
            rotulo="Categoria do produto"
            opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome, emUso: c.emUso }))}
            valor={categoriaId}
            aoEscolher={(id) => {
              const c = categorias.find((x) => x.id === id)
              if (c) escolherCategoria(c)
            }}
            textoVazio="Escolha…"
            aoCriar={(n) => void criarCategoria(n).then((m) => m && setErro(m))}
            aoRemover={(id) => void removerCategoria(id)}
            textoEmUso={(n) => `em uso · ${n}`}
            nota="Só dá para remover uma categoria que não tem receitas nem produtos."
            erro={mostrar(erros.categoria)}
          />
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Quantidade na receita</th>
              <th className="num">Preço pago</th>
              <th className="num">Custo</th>
              <th className="num">
                <span className="sr-only">Ação</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const item = porId.get(l.itemId)
              if (!item) return null
              const custoLinha =
                l.quantidade === null ? null : (BigInt(l.quantidade) * BigInt(item.custo)) / 1000n
              return (
                <tr key={l.itemId}>
                  <td>
                    <strong>{item.nome}</strong>
                  </td>
                  <td>
                    <span className="hrow nowrap">
                      <EntradaNumero
                        rotuloAcessivel={`Quantidade de ${item.nome}`}
                        valor={l.quantidade}
                        aoMudar={(q) =>
                          setLinhas((ls) =>
                            ls.map((x) => (x.itemId === l.itemId ? { ...x, quantidade: q } : x))
                          )
                        }
                        ler={lerQuantidade}
                        formatar={formatarQuantidade}
                        invalido={tentou && (l.quantidade === null || l.quantidade <= 0)}
                      />
                      <span>{item.rotulo}</span>
                    </span>
                  </td>
                  <td className="num muted">
                    <span className="valor">{formatarCusto(item.custo)}</span> /{item.rotulo}
                  </td>
                  <td className="num">
                    <strong className="valor">
                      {custoLinha === null ? '—' : formatarCusto(Number(custoLinha))}
                    </strong>
                  </td>
                  <td className="acoes">
                    <button
                      type="button"
                      className="sm"
                      aria-label={`Remover ${item.nome}`}
                      onClick={() => setLinhas((ls) => ls.filter((x) => x.itemId !== l.itemId))}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              )
            })}
            {usaGasComoIngrediente && (
              <tr>
                <td>
                  <strong>{NOME_GAS}</strong>
                </td>
                <td>
                  <span className="hrow nowrap">
                    <EntradaNumero
                      rotuloAcessivel={`Quantidade de ${NOME_GAS}`}
                      valor={gasVezes}
                      aoMudar={(v) => setGasVezes(v === null || v <= 0 ? null : v)}
                      ler={lerQuantidade}
                      formatar={formatarQuantidade}
                    />
                    <span>vez</span>
                  </span>
                </td>
                <td className="num muted">
                  <span className="valor">{formatarReais(gasCfg?.precoPorVez ?? centavos(0))}</span>{' '}
                  /vez
                </td>
                <td className="num">
                  <strong className="valor">{formatarCusto(conta?.gas ?? 0)}</strong>
                </td>
                <td className="acoes">
                  <button
                    type="button"
                    className="sm"
                    aria-label={`Remover ${NOME_GAS}`}
                    onClick={() => setGasVezes(null)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            )}
            {modoGas === 'fixo' && (
              <tr>
                <td>
                  <strong>{NOME_GAS}</strong>
                  <span className="sub">valor fixo, em Configurações</span>
                </td>
                <td>1 vez</td>
                <td className="num muted">{formatarReais(gasCfg?.valorFixo ?? centavos(0))}</td>
                <td className="num">
                  <strong className="valor">{formatarCusto(conta?.gas ?? 0)}</strong>
                </td>
                <td />
              </tr>
            )}
            {linhas.length === 0 && !usaGasComoIngrediente && modoGas !== 'fixo' && (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhum ingrediente ainda. Toque em “+ Adicionar ingrediente” logo abaixo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {modoGas === 'por_receita' && (
          <div className="campos linha-3-iguais">
            <CampoDinheiro
              rotulo="Gás e energia desta receita (R$)"
              valor={gasValor}
              aoMudar={setGasValor}
            />
          </div>
        )}
        {erros.quantidades && tentou && <span className="erro-campo">{erros.quantidades}</span>}
        <div className="linha-total">
          <span>
            <strong>Custo dos ingredientes</strong>
          </span>
          <strong className="num">{formatarCusto(conta?.ingredientes ?? 0)}</strong>
        </div>

        {escolhendo ? (
          <div className="seletor">
            <div className="linha-total">
              <strong>Toque no ingrediente para colocar na receita</strong>
              <button type="button" className="sm" onClick={() => setEscolhendo(false)}>
                Fechar
              </button>
            </div>
            <div className="seletor-itens">
              {modoGas === 'ingrediente' && gasVezes === null && (
                <button
                  type="button"
                  className="prod"
                  onClick={() => {
                    setGasVezes(1000)
                    setEscolhendo(false)
                  }}
                >
                  <span>{NOME_GAS}</span>
                  <span>{formatarReais(gasCfg?.precoPorVez ?? centavos(0))} /vez</span>
                </button>
              )}
              {disponiveis.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="prod"
                  onClick={() => {
                    setLinhas((ls) => [...ls, { itemId: m.id, quantidade: null }])
                    setEscolhendo(false)
                  }}
                >
                  <span>{m.nome}</span>
                  <span>
                    {formatarCusto(m.custo)} /{m.rotulo}
                  </span>
                </button>
              ))}
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Falta algum? Cadastre primeiro em Estoque e Insumos, com o preço pago.
            </p>
          </div>
        ) : (
          <div>
            <button type="button" className="btn2" onClick={() => setEscolhendo(true)}>
              + Adicionar ingrediente
            </button>
          </div>
        )}
      </section>

      {/* ---------- 2 · Embalagem de cada unidade ---------- */}
      <section className="parte">
        <div className="hrow">
          <span className="stp">2</span>
          <h3 className="parte-titulo">Embalagem de cada unidade</h3>
          <Ajuda texto={AJUDA.embalagemReceita} />
        </div>
        {insumos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nenhum insumo no estoque ainda (palito, saquinho, pote…). Cadastre em Estoque e Insumos.
          </p>
        ) : (
          <div className="seletor-itens" role="group" aria-label="Itens de embalagem">
            {insumos.map((i: ItemEstoque) => {
              const marcado = embalagens.includes(i.id)
              return (
                <button
                  key={i.id}
                  type="button"
                  className={marcado ? 'chip on' : 'chip'}
                  aria-pressed={marcado}
                  onClick={() =>
                    setEmbalagens((es) => (marcado ? es.filter((e) => e !== i.id) : [...es, i.id]))
                  }
                >
                  <span>
                    {marcado ? '✓ ' : '+ '}
                    {i.nome}
                  </span>
                  <small>{formatarCusto(i.custo)} cada</small>
                </button>
              )
            })}
          </div>
        )}
        {embalagens.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Esta receita não usa embalagem. Se usar, toque nos itens acima.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Preço de cada</th>
                <th className="num">Quantidade</th>
                <th className="num">Custo</th>
              </tr>
            </thead>
            <tbody>
              {embalagens.map((e) => {
                const item = porId.get(e)
                if (!item) return null
                const q = rendeu ? rendimento : 0
                return (
                  <tr key={e}>
                    <td>{item.nome}</td>
                    <td className="num">{formatarCusto(item.custo)}</td>
                    <td className="num">
                      {q} {item.rotulo}
                    </td>
                    <td className="num">{formatarCusto(item.custo * q)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div className="linha-total">
          <strong>Custo da embalagem</strong>
          <strong className="num">{formatarCusto(rendeu ? (conta?.embalagem ?? 0) : 0)}</strong>
        </div>
      </section>

      {/* ---------- 3 · Quanto rende e quanto sobra ---------- */}
      <section className="parte">
        <div className="hrow">
          <span className="stp">3</span>
          <h3 className="parte-titulo">Quanto rende e quanto sobra</h3>
          <Ajuda texto={AJUDA.rendimentoReceita} />
        </div>
        <div className="campos linha-2">
          <div className="campo">
            <span className="lb">Quantas {unidades} essa receita rende?</span>
            <div className="hrow nowrap">
              <button
                type="button"
                className="qb"
                aria-label="Diminuir o rendimento"
                onClick={() => setRendimento((r) => Math.max(1, (r ?? 1) - 1))}
              >
                −
              </button>
              <EntradaNumero
                rotuloAcessivel={`Quantas ${unidades} essa receita rende`}
                valor={rendimento}
                aoMudar={setRendimento}
                ler={(t) => (/^\d{1,6}$/.test(t.trim()) ? Number(t.trim()) : null)}
                formatar={String}
                invalido={tentou && !rendeu}
              />
              <button
                type="button"
                className="qb"
                aria-label="Aumentar o rendimento"
                onClick={() => setRendimento((r) => (r ?? 0) + 1)}
              >
                +
              </button>
              <span>{unidades}</span>
            </div>
            {mostrar(erros.rendimento) && <span className="erro-campo">{erros.rendimento}</span>}
          </div>
          <CampoTexto
            rotulo={`Como se chama cada unidade${categoria ? ` (${categoria.nome})` : ''}`}
            valor={nomeUnidade}
            aoMudar={setNomeUnidade}
            placeholder="ex.: paleta, pote, copo"
            erro={mostrar(erros.unidade)}
          />
        </div>
        <div className="resumo-receita">
          <div className="kl">
            <span>Ingredientes</span>
            <span className="num">{formatarCusto(conta?.ingredientes ?? 0)}</span>
          </div>
          <div className="kl">
            <span>Embalagem</span>
            <span className="num">{formatarCusto(rendeu ? (conta?.embalagem ?? 0) : 0)}</span>
          </div>
          <div className="kl">
            <span>Custo da receita inteira</span>
            <span className="num">{rendeu && conta ? formatarCusto(conta.total) : '—'}</span>
          </div>
          <div className="kl destaque">
            <span>Custo de cada {unidade}</span>
            <span className="num">{rendeu && conta ? formatarCusto(conta.custoDeCada) : '—'}</span>
          </div>
        </div>

        <div className="campos linha-2">
          {(
            [
              [
                'Vendendo no balcão',
                precoBalcao,
                setPrecoBalcao,
                balcao,
                'no balcão',
                AJUDA.vendendoBalcao
              ],
              [
                'Vendendo no atacado (pedidos de clientes)',
                precoAtacado,
                setPrecoAtacado,
                atacado,
                'nos pedidos',
                AJUDA.vendendoAtacado
              ]
            ] as const
          ).map(([titulo, preco, setPreco, lucro, onde, ajuda]) => (
            <div key={titulo} className="quadro-venda">
              <div className="hrow">
                <strong>{titulo}</strong>
                <Ajuda texto={ajuda} />
              </div>
              <CampoDinheiro
                rotulo={`Preço de cada ${unidade} (R$)`}
                valor={preco}
                aoMudar={setPreco}
              />
              <span className="muted pequeno">
                igual para toda a categoria {categoria?.nome ?? '(escolha a categoria)'}
              </span>
              <div className="kl">
                <span>Lucro em cada {unidade}</span>
                <span
                  className={`num ${lucro && lucro.lucroDeCada < 0 ? 'texto-erro' : 'texto-ok'}`}
                >
                  {lucro ? formatarCusto(lucro.lucroDeCada) : '—'}
                </span>
              </div>
              {lucro && (
                <span className="muted pequeno">{lucro.percentual}% do preço vira lucro</span>
              )}
              <div className="kl">
                <span>Lucro da receita inteira</span>
                <span className="num">{lucro ? formatarReais(lucro.lucroDaReceita) : '—'}</span>
              </div>
              {lucro && rendeu && (
                <span className="muted pequeno">
                  se vender as {rendimento} {unidades} {onde}
                </span>
              )}
            </div>
          ))}
        </div>
        {mostrar(erros.precos) && <span className="erro-campo">{erros.precos}</span>}
      </section>

      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
