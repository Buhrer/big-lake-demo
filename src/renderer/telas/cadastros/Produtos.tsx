// Cadastros › Produtos à venda (prototipo/telas/05-Cadastros-Produtos-a-venda*.png; D-045).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DadosProduto, Produto } from '../../../compartilhado/contrato'
import type { QuantidadeX1000 } from '../../../dominio/dinheiro'
import {
  formatarCusto,
  formatarQuantidade,
  formatarReais,
  lerQuantidade
} from '../../../dominio/formatar'
import {
  custoDoProduto,
  descreverTamanho,
  precosDoProduto,
  VENDIDO_COMO,
  type UnidadeMedida,
  type VendidoComo
} from '../../../dominio/produto'
import { lucroNaVenda } from '../../../dominio/receita'
import { Ajuda } from '../../componentes/Ajuda'
import {
  CampoQuantidade,
  CampoTexto,
  EntradaNumero,
  numeroErradoNaTela
} from '../../componentes/Campos'
import { ConfirmarNaLinha, FaixaDesfazer } from '../../componentes/Excluir'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { CHAVES, useCategorias, useReceitas } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

export function useProdutos() {
  return useQuery({ queryKey: CHAVES.produtos, queryFn: () => window.api.produtos.listar() })
}

const VAZIO: DadosProduto = {
  categoriaId: 0,
  nome: '',
  vendidoComo: 'unidade',
  medida: null,
  medidaUnidade: 'g',
  unidadesPorCaixa: null,
  receitaId: null
}

export function AbaProdutos({
  cadastrando,
  aoFecharCadastro
}: {
  cadastrando: boolean
  aoFecharCadastro(): void
}) {
  const cliente = useQueryClient()
  const { data: produtos = [] } = useProdutos()
  const { data: categorias = [] } = useCategorias()
  const [filtro, setFiltro] = useState<number | null>(null)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [excluido, setExcluido] = useState<Produto | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const visiveis = produtos.filter((p) => filtro === null || p.categoriaId === filtro)

  async function atualizar() {
    for (const chave of [CHAVES.produtos, CHAVES.categorias, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  async function excluir(p: Produto) {
    setConfirmando(null)
    const r = await window.api.produtos.excluir(p.id)
    if (!r.ok) return setErro(r.mensagem)
    setMensagem(null)
    setExcluido(p)
    await atualizar()
  }

  async function desfazer() {
    if (!excluido) return
    const r = await window.api.produtos.desfazerExclusao(excluido.id)
    if (!r.ok) setErro(r.mensagem)
    setExcluido(null)
    await atualizar()
  }

  function fechar() {
    setEditando(null)
    aoFecharCadastro()
  }

  return (
    <>
      <div className="abas" role="group" aria-label="Filtrar por categoria">
        <button
          type="button"
          className={filtro === null ? 'tab on' : 'tab'}
          aria-pressed={filtro === null}
          onClick={() => setFiltro(null)}
        >
          Todos
        </button>
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            className={filtro === c.id ? 'tab on' : 'tab'}
            aria-pressed={filtro === c.id}
            onClick={() => setFiltro(c.id)}
          >
            {c.nome}
          </button>
        ))}
      </div>
      {mensagem && (
        <div className="faixa ok" role="status">
          <span>✓ {mensagem}</span>
        </div>
      )}
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
      <section className="card">
        {visiveis.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {produtos.length === 0
              ? 'Nenhum produto à venda ainda. Toque em “+ Cadastrar produto”.'
              : 'Nenhum produto nesta categoria.'}
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Produto</th>
                <th className="num">Custo</th>
                <th className="num">Balcão</th>
                <th className="num">Atacado</th>
                <th className="num">Lucro no balcão</th>
                <th className="num">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((p) => (
                <tr key={p.id} className={confirmando === p.id ? 'confirmando' : undefined}>
                  <td>
                    <strong>{p.nome}</strong>
                    <span className="sub">
                      {p.categoriaNome} ·{' '}
                      {descreverTamanho(
                        p.vendidoComo,
                        p.medida,
                        p.medidaUnidade,
                        p.unidadesPorCaixa
                      )}
                    </span>
                  </td>
                  <td className="num">{p.custo === null ? '—' : formatarCusto(p.custo)}</td>
                  <td className="num">
                    <strong className="valor">{formatarReais(p.precoBalcao)}</strong>
                  </td>
                  <td className="num">{formatarReais(p.precoAtacado)}</td>
                  <td className="num">
                    {p.lucroBalcao === null ? (
                      <span className="muted">sem receita</span>
                    ) : (
                      <strong className={p.lucroBalcao < 0 ? 'valor texto-erro' : 'valor texto-ok'}>
                        {formatarCusto(p.lucroBalcao)}
                      </strong>
                    )}
                  </td>
                  <td className="acoes">
                    {confirmando === p.id ? (
                      <ConfirmarNaLinha
                        pergunta="Excluir este produto?"
                        aoConfirmar={() => void excluir(p)}
                        aoCancelar={() => setConfirmando(null)}
                      />
                    ) : (
                      <>
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Editar ${p.nome}`}
                          onClick={() => {
                            setMensagem(null)
                            setExcluido(null)
                            setEditando(p)
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="sm"
                          aria-label={`Excluir ${p.nome}`}
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
      {(cadastrando || editando) && (
        <ModalProduto
          produto={editando}
          aoFechar={fechar}
          aoSalvar={(nome, novo) => {
            setExcluido(null)
            setMensagem(novo ? `Produto ${nome} cadastrado.` : `Produto ${nome} salvo.`)
            fechar()
          }}
        />
      )}
    </>
  )
}

function ModalProduto({
  produto,
  aoFechar,
  aoSalvar
}: {
  produto: Produto | null
  aoFechar(): void
  aoSalvar(nome: string, novo: boolean): void
}) {
  const cliente = useQueryClient()
  const navegar = useNavigate()
  const { data: categorias = [] } = useCategorias()
  const { data: receitas = [] } = useReceitas()
  const [d, setD] = useState<DadosProduto>(produto ?? VAZIO)
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const mudar = <K extends keyof DadosProduto>(campo: K, valor: DadosProduto[K]) => {
    setD((x) => ({ ...x, [campo]: valor }))
    setErro(null)
  }

  const categoria = categorias.find((c) => c.id === d.categoriaId) ?? null
  const daCategoria = receitas.filter((r) => r.categoriaId === d.categoriaId)
  const receita = daCategoria.find((r) => r.id === d.receitaId) ?? null
  const precos = categoria
    ? precosDoProduto(
        { balcao: categoria.precoBalcao, atacado: categoria.precoAtacado },
        d.vendidoComo,
        d.unidadesPorCaixa
      )
    : null
  const custo = custoDoProduto(receita?.custoDeCada ?? null, d.vendidoComo, d.unidadesPorCaixa)
  const lucroB = custo !== null && precos ? lucroNaVenda(precos.balcao, custo, 1).lucroDeCada : null
  const lucroA =
    custo !== null && precos ? lucroNaVenda(precos.atacado, custo, 1).lucroDeCada : null

  const erros = {
    categoria: !categoria ? 'Escolha a categoria.' : undefined,
    nome: !d.nome.trim() ? 'Digite o nome ou sabor.' : undefined,
    caixa:
      d.vendidoComo === 'caixa' && !d.unidadesPorCaixa
        ? 'Diga quantas unidades vêm na caixa.'
        : undefined
  }

  async function criarCategoria(nome: string) {
    const r = await window.api.categorias.criar(nome)
    if (!r.ok) return setErro(r.mensagem)
    await cliente.invalidateQueries({ queryKey: CHAVES.categorias })
    mudar('categoriaId', r.valor.id)
  }

  async function removerCategoria(id: number) {
    const r = await window.api.categorias.remover(id)
    if (!r.ok) return setErro(r.mensagem)
    if (d.categoriaId === id) mudar('categoriaId', 0)
    await cliente.invalidateQueries({ queryKey: CHAVES.categorias })
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    if (Object.values(erros).some(Boolean)) return
    const r = await window.api.produtos.salvar(produto?.id ?? null, {
      ...d,
      medidaUnidade: d.medida === null ? null : d.medidaUnidade
    })
    if (!r.ok) return setErro(r.mensagem)
    for (const chave of [CHAVES.produtos, CHAVES.categorias, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
    aoSalvar(d.nome.trim(), produto === null)
  }

  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  return (
    <Modal
      titulo={produto ? 'Editar produto' : 'Cadastrar produto à venda'}
      editando={produto ? 'Editando um produto' : undefined}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
            {produto ? 'Salvar alterações' : 'Salvar produto'}
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="campos linha-3-iguais">
        <ListaSuspensa<number>
          rotulo="Categoria"
          opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome, emUso: c.emUso }))}
          valor={categoria ? categoria.id : null}
          aoEscolher={(id) => {
            mudar('categoriaId', id)
            mudar('receitaId', null)
          }}
          aoCriar={(n) => void criarCategoria(n)}
          aoRemover={(id) => void removerCategoria(id)}
          textoEmUso={(n) => `em uso · ${n}`}
          nota="Só dá para remover uma categoria que não tem receitas nem produtos."
          erro={mostrar(erros.categoria)}
        />
        <CampoTexto
          rotulo="Nome / sabor"
          valor={d.nome}
          aoMudar={(v) => mudar('nome', v)}
          erro={mostrar(erros.nome)}
        />
        <ListaSuspensa<VendidoComo>
          rotulo="Vendido como"
          opcoes={(Object.keys(VENDIDO_COMO) as VendidoComo[]).map((v) => ({
            valor: v,
            rotulo: VENDIDO_COMO[v]
          }))}
          valor={d.vendidoComo}
          aoEscolher={(v) => mudar('vendidoComo', v)}
        />
      </div>
      <div className="campos linha-3-iguais">
        {/* Um rótulo só, com o número e a medida lado a lado (como no protótipo) */}
        <div className="campo">
          <span className="lb">
            Peso ou volume <Ajuda texto={AJUDA.pesoOuVolume} />
          </span>
          <div className="linha-medida">
            <EntradaNumero
              rotuloAcessivel="Peso ou volume"
              valor={d.medida}
              aoMudar={(v: QuantidadeX1000 | null) => mudar('medida', v)}
              ler={lerQuantidade}
              formatar={formatarQuantidade}
            />
            <ListaSuspensa<UnidadeMedida>
              rotulo="Medida"
              rotuloOculto
              opcoes={(['g', 'kg', 'ml', 'L'] as const).map((u) => ({ valor: u, rotulo: u }))}
              valor={d.medidaUnidade ?? 'g'}
              aoEscolher={(u) => mudar('medidaUnidade', u)}
            />
          </div>
        </div>
        <ListaSuspensa<number>
          rotulo="Receita usada"
          opcoes={[
            { valor: 0, rotulo: 'Nenhuma' },
            ...daCategoria.map((r) => ({ valor: r.id, rotulo: r.nome }))
          ]}
          valor={d.receitaId ?? 0}
          aoEscolher={(id) => mudar('receitaId', id === 0 ? null : id)}
        />
        {d.vendidoComo === 'caixa' ? (
          <CampoQuantidade
            rotulo="Quantas unidades na caixa?"
            valor={d.unidadesPorCaixa === null ? null : d.unidadesPorCaixa * 1000}
            aoMudar={(v) => mudar('unidadesPorCaixa', v === null ? null : Math.round(v / 1000))}
            erro={mostrar(erros.caixa)}
          />
        ) : (
          <span />
        )}
      </div>

      <div className="quadro-venda">
        <strong>
          Preço de venda · fixo da categoria {categoria?.nome ?? '(escolha a categoria)'}
        </strong>
        <span className="muted">
          O mesmo para todos os produtos desta categoria. Para mudar, vá em Produção e Receitas ›
          Receitas.
        </span>
        <div className="hrow" style={{ alignItems: 'flex-end', gap: 24 }}>
          <div className="kv">
            <span>Balcão</span>
            <strong className="kpi-valor">{precos ? formatarReais(precos.balcao) : '—'}</strong>
          </div>
          <div className="kv">
            <span>Atacado</span>
            <strong className="kpi-valor">{precos ? formatarReais(precos.atacado) : '—'}</strong>
          </div>
          <button type="button" className="btn2" onClick={() => navegar('/producao?aba=receitas')}>
            Mudar em Receitas
          </button>
        </div>
      </div>
      <div className="grade-3">
        <div className="caixa-valor atencao">
          <span>Custo de cada um</span>
          <strong>{custo === null ? '—' : formatarCusto(custo)}</strong>
          <small>{receita ? 'vem de Produção e Receitas' : 'escolha a receita usada'}</small>
        </div>
        <div className={`caixa-valor ${lucroB !== null && lucroB < 0 ? 'erro' : 'ok'}`}>
          <span>Lucro no balcão</span>
          <strong>{lucroB === null ? '—' : formatarCusto(lucroB)}</strong>
          <small>por unidade vendida</small>
        </div>
        <div className={`caixa-valor ${lucroA !== null && lucroA < 0 ? 'erro' : 'ok'}`}>
          <span>Lucro no atacado</span>
          <strong>{lucroA === null ? '—' : formatarCusto(lucroA)}</strong>
          <small>por unidade no atacado</small>
        </div>
      </div>
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
