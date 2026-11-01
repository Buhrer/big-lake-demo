// Registrar perda: prototipo/telas/09-Perdas__modal-registrar.png (docs/02 §6, R10; D-069).
import { useState } from 'react'
import type { Perda } from '../../../compartilhado/contrato'
import type { TipoInsumo } from '../../../dominio/estoque'
import type { CustoX10000, QuantidadeX1000 } from '../../../dominio/dinheiro'
import { formatarData, type DataISO } from '../../../dominio/datas'
import {
  formatarCusto,
  formatarQuantidade,
  formatarReais,
  lerQuantidade
} from '../../../dominio/formatar'
import {
  faltaParaAPerda,
  MOTIVOS_PERDA,
  rotuloDoProduto,
  TIPOS_PERDA,
  valorDaPerda,
  valorDoItem,
  type TipoPerda
} from '../../../dominio/perdas'
import { CampoData, CampoTexto, EntradaNumero, numeroErradoNaTela } from '../../componentes/Campos'
import { ConfirmarNaLinha } from '../../componentes/Excluir'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { useCategorias, useClientes, useItensEstoque, useReceitas } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

const TIPO: Record<TipoPerda, { rotulo: string; sub: string; toque: string; valor: string }> = {
  produto: {
    rotulo: 'Produtos prontos',
    sub: 'paletas, potes, picolés que estragaram aqui',
    toque: 'Toque nos produtos que se perderam',
    valor: 'pelo custo de fazer'
  },
  materia_prima: {
    rotulo: 'Matéria-prima ou insumo',
    sub: 'leite, fruta, pote vazio, casquinha',
    toque: 'Toque no que se perdeu',
    valor: 'pelo preço pago'
  },
  troca: {
    rotulo: 'Troca em cliente',
    sub: 'venceu no cliente e foi trocado',
    toque: 'Toque nos produtos que foram trocados',
    valor: 'pelo custo de fazer'
  }
}

interface Linha {
  id: number
  nome: string
  custo: CustoX10000
  /** null = caixa vazia ou inválida */
  quantidade: QuantidadeX1000 | null
  /** Matéria-prima: "kg", "L"…; produto: o nome da unidade da categoria (null = guardado no registro). */
  rotulo: string
  nomeUnidade: string | null
}

/** Abas dos itens do estoque, com os nomes do filtro do Estoque. */
const TIPOS_DE_ITEM: [TipoInsumo, string][] = [
  ['materia_prima', 'Matéria-prima'],
  ['insumo', 'Insumos']
]

const lerUnidades = (t: string) =>
  /^\d{1,6}$/.test(t.trim()) && Number(t) > 0 ? Number(t.trim()) * 1000 : null

export function ModalPerda({
  perda,
  hoje,
  aoFechar,
  aoSalvar
}: {
  /** null = registrar */
  perda: Perda | null
  hoje: DataISO
  aoFechar(): void
  aoSalvar(texto: string, data: DataISO): Promise<void>
}) {
  const { data: receitas = [] } = useReceitas()
  const { data: estoque = [] } = useItensEstoque()
  const { data: clientes = [] } = useClientes()
  const { data: categorias = [] } = useCategorias()
  /** Aba de categoria dos produtos (null = Todos), como no Novo pedido (D-081). */
  const [categoria, setCategoria] = useState<number | null>(null)
  /** Aba Matéria-prima / Insumos dos itens do estoque (null = Todos) (D-082). */
  const [tipoItem, setTipoItem] = useState<TipoInsumo | null>(null)
  const [tipo, setTipo] = useState<TipoPerda>(perda?.tipo ?? 'produto')
  const [data, setData] = useState<DataISO | null>(perda?.data ?? hoje)
  const [clienteId, setClienteId] = useState<number | null>(perda?.clienteId ?? null)
  const [linhas, setLinhas] = useState<Linha[]>(
    () =>
      perda?.itens.map((i) => ({
        id: i.id,
        nome: i.nome,
        custo: i.custo,
        quantidade: i.quantidade,
        rotulo: i.rotulo,
        nomeUnidade: null
      })) ?? []
  )
  const [motivo, setMotivo] = useState(perda?.motivo ?? MOTIVOS_PERDA.produto[0]!)
  const [observacao, setObservacao] = useState(perda?.observacao ?? '')
  const [tentou, setTentou] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const deProduto = tipo !== 'materia_prima'
  const unidadeDaReceita = new Map(receitas.map((r) => [r.id, r.nomeUnidade]))
  const rotuloDe = (l: Linha) => {
    if (!deProduto) return l.rotulo
    const nomeUnidade = l.nomeUnidade ?? unidadeDaReceita.get(l.id)
    if (nomeUnidade === undefined) return l.rotulo
    return rotuloDoProduto(l.nome, nomeUnidade, (l.quantidade ?? 1000) / 1000)
  }
  const total = valorDaPerda(linhas.map((l) => ({ quantidade: l.quantidade ?? 0, custo: l.custo })))
  const categoriasComReceita = categorias.filter((c) =>
    receitas.some((r) => r.categoriaId === c.id)
  )
  const tiposComItem = TIPOS_DE_ITEM.filter(([t]) => estoque.some((i) => i.tipo === t))
  const abas: { valor: number | TipoInsumo; nome: string }[] = deProduto
    ? categoriasComReceita.map((c) => ({ valor: c.id, nome: c.nome }))
    : tiposComItem.map(([t, nome]) => ({ valor: t, nome }))
  const abaAtual = deProduto ? categoria : tipoItem
  const escolherAba = (v: number | TipoInsumo | null) =>
    deProduto ? setCategoria(v as number | null) : setTipoItem(v as TipoInsumo | null)
  const opcoes = deProduto
    ? receitas
        .filter((r) => categoria === null || r.categoriaId === categoria)
        .map((r) => ({
          id: r.id,
          nome: r.nome,
          custo: r.custoDeCada,
          rotulo: 'un',
          nomeUnidade: r.nomeUnidade,
          texto: `${formatarCusto(r.custoDeCada)} cada`
        }))
    : estoque
        .filter((i) => tipoItem === null || i.tipo === tipoItem)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((i) => ({
          id: i.id,
          nome: i.nome,
          custo: i.custo,
          rotulo: i.rotulo,
          nomeUnidade: null,
          texto: `${formatarCusto(i.custo)} /${i.rotulo}`
        }))

  const erros = {
    data:
      data === null ? 'Digite a data.' : data > hoje ? 'Essa data ainda não chegou.' : undefined,
    cliente: tipo === 'troca' && !clienteId ? 'Escolha o cliente.' : undefined,
    itens:
      linhas.length === 0
        ? 'Toque nos itens que se perderam.'
        : linhas.some((l) => !l.quantidade)
          ? 'Digite a quantidade de cada item.'
          : undefined
  }
  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  // Matéria-prima que vai ficar negativa (D-069); na edição, conta o que o registro já tinha tirado
  const negativos = deProduto
    ? []
    : faltaParaAPerda(
        linhas.map((l) => ({ itemId: l.id, quantidade: l.quantidade ?? 0 })),
        new Map(estoque.map((i) => [i.id, Math.max(i.quantidade, 0)])),
        new Map(perda?.tipo === 'materia_prima' ? perda.itens.map((i) => [i.id, i.quantidade]) : [])
      )
  const nomesNegativos = negativos
    .map((id) => linhas.find((l) => l.id === id)?.nome)
    .filter(Boolean)
    .join(', ')

  function escolherTipo(t: TipoPerda) {
    if (t === tipo) return
    const mudaItens = (t === 'materia_prima') !== (tipo === 'materia_prima')
    setTipo(t)
    if (mudaItens) setLinhas([])
    setMotivo(MOTIVOS_PERDA[t][0]!)
    setConfirmando(false)
  }

  function adicionar(o: (typeof opcoes)[number]) {
    setConfirmando(false)
    setLinhas((atual) => {
      const ja = atual.find((l) => l.id === o.id)
      if (ja)
        return atual.map((l) =>
          l.id === o.id ? { ...l, quantidade: (l.quantidade ?? 0) + 1000 } : l
        )
      return [
        ...atual,
        {
          id: o.id,
          nome: o.nome,
          custo: o.custo,
          quantidade: 1000,
          rotulo: o.rotulo,
          nomeUnidade: o.nomeUnidade
        }
      ]
    })
  }

  function mudarQuantidade(id: number, q: QuantidadeX1000 | null) {
    setConfirmando(false)
    setLinhas((atual) => atual.map((l) => (l.id === id ? { ...l, quantidade: q } : l)))
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (Object.values(erros).some(Boolean) || !data) return
    if (negativos.length && !confirmando) return setConfirmando(true)
    setConfirmando(false)
    const r = await window.api.perdas.salvar(perda?.id ?? null, {
      tipo,
      data,
      clienteId: tipo === 'troca' ? clienteId : null,
      itens: linhas.map((l) => ({ id: l.id, quantidade: l.quantidade! })),
      motivo,
      observacao: observacao.trim()
    })
    if (!r.ok) return setErro(r.mensagem)
    await aoSalvar(
      perda ? 'Alterações salvas.' : 'Perda anotada. Já aparece na lista abaixo.',
      data
    )
  }

  return (
    <Modal
      titulo={perda ? 'Corrigir perda' : 'Registrar perda'}
      editando={
        perda ? `Editando o registro de ${formatarData(perda.data).slice(0, 5)}` : undefined
      }
      ajuda={AJUDA.registrarPerda}
      aoFechar={aoFechar}
      rodape={
        confirmando ? (
          <ConfirmarNaLinha
            pergunta={`O estoque de ${nomesNegativos} vai ficar negativo. Salvar mesmo assim?`}
            aoConfirmar={() => void salvarUmaVez()}
            aoCancelar={() => setConfirmando(false)}
          />
        ) : (
          <>
            <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
              {perda ? 'Salvar alterações' : 'Salvar perda'}
            </button>
            <button type="button" className="btn2" onClick={aoFechar}>
              Cancelar
            </button>
          </>
        )
      }
    >
      <div>
        <span className="lb titulo-bloco" id="rotulo-tipo-perda">
          O que se perdeu?
        </span>
        <div
          className="opcoes opcoes-tipo-perda"
          role="radiogroup"
          aria-labelledby="rotulo-tipo-perda"
        >
          {TIPOS_PERDA.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tipo === t}
              className={tipo === t ? 'opt on' : 'opt'}
              onClick={() => escolherTipo(t)}
            >
              {TIPO[t].rotulo}
              <small>{TIPO[t].sub}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={tipo === 'troca' ? 'campos linha-perda' : 'campos linha-perda sem-cliente'}>
        <CampoData rotulo="Quando?" valor={data} aoMudar={setData} erro={mostrar(erros.data)} />
        {tipo === 'troca' && (
          <ListaSuspensa<number>
            rotulo="Qual cliente?"
            opcoes={clientes.map((c) => ({ valor: c.id, rotulo: c.nome }))}
            valor={clienteId}
            aoEscolher={setClienteId}
            textoVazio={clientes.length ? 'Escolha o cliente…' : 'Cadastre o cliente em Cadastros'}
            erro={mostrar(erros.cliente)}
          />
        )}
      </div>

      <div>
        <span className="lb titulo-bloco">{TIPO[tipo].toque}</span>
        {abas.length > 1 && (
          <div
            className="abas"
            role="group"
            aria-label={deProduto ? 'Categoria do produto' : 'Tipo do item'}
            style={{ marginBottom: 12 }}
          >
            <button
              type="button"
              className={abaAtual === null ? 'tab on' : 'tab'}
              aria-pressed={abaAtual === null}
              onClick={() => escolherAba(null)}
            >
              Todos
            </button>
            {abas.map((a) => (
              <button
                key={a.valor}
                type="button"
                className={abaAtual === a.valor ? 'tab on' : 'tab'}
                aria-pressed={abaAtual === a.valor}
                onClick={() => escolherAba(a.valor)}
              >
                {a.nome}
              </button>
            ))}
          </div>
        )}
        {opcoes.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {deProduto
              ? 'Nenhuma receita cadastrada ainda. Cadastre em Produção e Receitas.'
              : 'Nada no estoque ainda. Cadastre em Estoque e Insumos.'}
          </p>
        ) : (
          <div className="seletor-itens">
            {opcoes.map((o) => (
              <button key={o.id} type="button" className="prod" onClick={() => adicionar(o)}>
                <span>{o.nome}</span>
                <span>{o.texto}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="lb titulo-bloco">Itens deste registro</span>
        <table className="tbl tabela-perda">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Quantidade</th>
              <th className="num">Valor</th>
              <th className="num">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Nenhum item ainda. Toque nos itens acima para colocar aqui.
                </td>
              </tr>
            ) : (
              linhas.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.nome}</strong>
                  </td>
                  <td className="num">
                    <span className="hrow nowrap qtd-perda">
                      <EntradaNumero
                        key={`${tipo}-${l.id}`}
                        rotuloAcessivel={`Quantidade de ${l.nome}`}
                        valor={l.quantidade}
                        aoMudar={(q) => mudarQuantidade(l.id, q && q > 0 ? q : null)}
                        ler={deProduto ? lerUnidades : lerQuantidade}
                        formatar={(q) => (deProduto ? String(q / 1000) : formatarQuantidade(q))}
                        invalido={tentou && !l.quantidade}
                      />
                      <strong className="unidade-perda">{rotuloDe(l)}</strong>
                    </span>
                  </td>
                  <td className="num">
                    <strong>{formatarReais(valorDoItem(l.quantidade ?? 0, l.custo))}</strong>
                  </td>
                  <td className="acoes">
                    <button
                      type="button"
                      className="sm"
                      aria-label={`Remover ${l.nome}`}
                      onClick={() => setLinhas((atual) => atual.filter((x) => x.id !== l.id))}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <strong className="total-perda-rotulo">Valor da perda</strong>{' '}
                <span className="muted">({TIPO[tipo].valor})</span>
              </td>
              <td className="num">
                <strong className="total-perda" aria-label="Valor da perda">
                  {formatarReais(total)}
                </strong>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        {mostrar(erros.itens) && <span className="erro-campo">{erros.itens}</span>}
      </div>

      <div>
        <span className="lb" id="rotulo-motivo-perda">
          Por quê?
        </span>
        <div
          className="opcoes opcoes-motivo"
          role="radiogroup"
          aria-labelledby="rotulo-motivo-perda"
        >
          {MOTIVOS_PERDA[tipo].map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={motivo === m}
              className={motivo === m ? 'opt on' : 'opt'}
              onClick={() => setMotivo(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <CampoTexto
        rotulo="Observação"
        valor={observacao}
        aoMudar={setObservacao}
        placeholder="Opcional"
      />
      {tipo === 'troca' && (
        <p className="muted" style={{ margin: 0 }}>
          Os produtos novos entregues na troca saem do estoque. O cliente não paga por eles, por
          isso entram como perda.
        </p>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
