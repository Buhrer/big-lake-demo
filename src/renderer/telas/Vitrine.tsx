// Vitrine dos componentes padrão. Só aparece em desenvolvimento e nos testes
// (rota #/vitrine); não existe no programa instalado.
import { useState } from 'react'
import { centavos, type Centavos, type QuantidadeX1000 } from '../../dominio/dinheiro'
import type { DataISO } from '../../dominio/datas'
import { formatarReais } from '../../dominio/formatar'
import { Ajuda } from '../componentes/Ajuda'
import { CampoData, CampoDinheiro, CampoQuantidade, CampoTexto } from '../componentes/Campos'
import { ConfirmarNaLinha, FaixaDesfazer } from '../componentes/Excluir'
import { ListaSuspensa, type OpcaoLista } from '../componentes/ListaSuspensa'
import { Modal } from '../componentes/Modal'
import { CabecalhoTela } from '../layout/CabecalhoTela'

interface Categoria {
  id: number
  nome: string
  produtos: number
}

const CATEGORIAS_INICIAIS: Categoria[] = [
  { id: 1, nome: 'Paleta', produtos: 8 },
  { id: 2, nome: 'Picolé', produtos: 6 },
  { id: 3, nome: 'Sorvete de pote', produtos: 5 },
  { id: 4, nome: 'Açaí', produtos: 0 }
]

interface Linha {
  id: number
  nome: string
  sub: string
  custo: Centavos
}

const LINHAS_INICIAIS: Linha[] = [
  { id: 1, nome: 'Paleta de Maracujá', sub: 'Paleta · 80 g', custo: centavos(283) },
  { id: 2, nome: 'Paleta de Morango recheada', sub: 'Paleta · 90 g', custo: centavos(335) },
  { id: 3, nome: 'Sorvete de Morango', sub: 'Sorvete de pote · 2 L', custo: centavos(2792) }
]

const FORMAS = [
  ['dinheiro', 'Dinheiro'],
  ['pix', 'Pix'],
  ['debito', 'Cartão débito'],
  ['credito', 'Cartão crédito']
] as const

export function TelaVitrine() {
  const [modalAberto, setModalAberto] = useState(false)
  const [categorias, setCategorias] = useState(CATEGORIAS_INICIAIS)
  const [categoria, setCategoria] = useState<number | null>(1)
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState<Centavos | null>(null)
  const [quantidade, setQuantidade] = useState<QuantidadeX1000 | null>(null)
  const [data, setData] = useState<DataISO | null>(null)
  const [forma, setForma] = useState<string>('pix')
  const [aba, setAba] = useState('todos')
  const [segmento, setSegmento] = useState('bens')
  const [linhas, setLinhas] = useState(LINHAS_INICIAIS)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [excluida, setExcluida] = useState<{ linha: Linha; posicao: number } | null>(null)
  const [tentouSalvar, setTentouSalvar] = useState(false)

  const opcoesCategoria: OpcaoLista<number>[] = categorias.map((c) => ({
    valor: c.id,
    rotulo: c.nome,
    emUso: c.produtos
  }))

  function excluir(id: number) {
    const posicao = linhas.findIndex((l) => l.id === id)
    const linha = linhas[posicao]
    if (!linha) return
    setLinhas(linhas.filter((l) => l.id !== id))
    setExcluida({ linha, posicao })
    setConfirmando(null)
  }

  function desfazer() {
    if (!excluida) return
    const nova = [...linhas]
    nova.splice(excluida.posicao, 0, excluida.linha)
    setLinhas(nova)
    setExcluida(null)
  }

  return (
    <>
      <CabecalhoTela
        subtitulo="Só em desenvolvimento"
        titulo="Vitrine de componentes"
        ajuda={{ titulo: 'Vitrine', texto: 'Mostra todos os componentes padrão do sistema.' }}
        acao={
          <button type="button" className="btn" onClick={() => setModalAberto(true)}>
            + Cadastrar produto
          </button>
        }
      />

      <section className="card">
        <h2>Botões</h2>
        <div className="hrow" style={{ marginTop: 12 }}>
          <button type="button" className="btn">
            Salvar
          </button>
          <button type="button" className="btn2">
            Cancelar
          </button>
          <button type="button" className="sm">
            Editar
          </button>
          <span className="tag ok">OK</span>
          <span className="tag erro">Comprar</span>
          <span className="tag atencao">em 5 dias</span>
          <span className="tag info">6 em outubro</span>
        </div>
      </section>

      <section className="card">
        <div className="hrow">
          <h2>Opções, abas e segmento</h2>
          <Ajuda texto={{ titulo: 'Opções', texto: 'A opção escolhida fica amarela.' }} />
        </div>
        <div className="opcoes" style={{ marginTop: 12 }} role="radiogroup" aria-label="Forma">
          {FORMAS.map(([v, r]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={forma === v}
              className={forma === v ? 'opt on' : 'opt'}
              onClick={() => setForma(v)}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="abas" style={{ marginTop: 16 }}>
          {['todos', 'materia', 'insumos'].map((a) => (
            <button
              key={a}
              type="button"
              className={aba === a ? 'tab on' : 'tab'}
              aria-pressed={aba === a}
              onClick={() => setAba(a)}
            >
              {{ todos: 'Todos (18)', materia: 'Matéria-prima (13)', insumos: 'Insumos (5)' }[a]}
            </button>
          ))}
        </div>
        <div className="seg" style={{ marginTop: 16 }}>
          {['bens', 'manutencoes'].map((s) => (
            <button
              key={s}
              type="button"
              className={segmento === s ? 'sg on' : 'sg'}
              aria-pressed={segmento === s}
              onClick={() => setSegmento(s)}
            >
              {s === 'bens' ? 'Bens da empresa' : 'Manutenções'}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Tabela com Editar e Excluir</h2>
        {excluida && (
          <div style={{ marginTop: 12 }}>
            <FaixaDesfazer aoDesfazer={desfazer}>
              “{excluida.linha.nome}” foi excluído da lista.
            </FaixaDesfazer>
          </div>
        )}
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="num">Custo</th>
              <th className="num">Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className={confirmando === l.id ? 'confirmando' : undefined}>
                <td>
                  {l.nome}
                  <span className="sub">{l.sub}</span>
                </td>
                <td className="num">{formatarReais(l.custo)}</td>
                <td className="acoes">
                  {confirmando === l.id ? (
                    <ConfirmarNaLinha
                      pergunta="Excluir este produto?"
                      aoConfirmar={() => excluir(l.id)}
                      aoCancelar={() => setConfirmando(null)}
                    />
                  ) : (
                    <>
                      <button type="button" className="sm">
                        Editar
                      </button>
                      <button type="button" className="sm" onClick={() => setConfirmando(l.id)}>
                        Excluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modalAberto && (
        <Modal
          titulo="Cadastrar produto à venda"
          aoFechar={() => {
            setModalAberto(false)
            setTentouSalvar(false)
          }}
          rodape={
            <>
              <button type="button" className="btn" onClick={() => setTentouSalvar(true)}>
                Salvar
              </button>
              <button type="button" className="btn2" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
            </>
          }
        >
          <div className="campos">
            <CampoTexto
              rotulo="Nome / sabor"
              valor={nome}
              aoMudar={setNome}
              erro={tentouSalvar && !nome.trim() ? 'Digite o nome.' : undefined}
            />
            <CampoDinheiro rotulo="Valor pago (R$)" valor={valor} aoMudar={setValor} />
            <CampoQuantidade
              rotulo="Quantidade"
              unidade="kg"
              valor={quantidade}
              aoMudar={setQuantidade}
            />
            <CampoData
              rotulo="Validade"
              valor={data}
              aoMudar={setData}
              extra={
                <Ajuda texto={{ titulo: 'Validade', texto: 'Digite só os números: 16102026.' }} />
              }
            />
          </div>
          <div className="campos">
            <ListaSuspensa<number>
              rotulo="Categoria"
              opcoes={opcoesCategoria}
              valor={categoria}
              aoEscolher={setCategoria}
              textoEmUso={(n) => `em uso · ${n} produtos`}
              nota="Só dá para remover categoria que não tem produtos."
              aoCriar={(nomeNovo) => {
                if (categorias.some((c) => c.nome.toLowerCase() === nomeNovo.toLowerCase())) {
                  return 'Já existe uma categoria com esse nome.'
                }
                const id = Math.max(0, ...categorias.map((c) => c.id)) + 1
                setCategorias([...categorias, { id, nome: nomeNovo, produtos: 0 }])
                setCategoria(id)
              }}
              aoRemover={(id) => {
                setCategorias(categorias.filter((c) => c.id !== id))
                if (categoria === id) setCategoria(null)
              }}
            />
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Valores lidos: {valor === null ? '—' : formatarReais(valor)} ·{' '}
            {quantidade === null ? '—' : quantidade} · {data ?? '—'}
          </p>
        </Modal>
      )}
    </>
  )
}
