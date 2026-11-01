import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Cliente, DadosCliente } from '../../../compartilhado/contrato'
import { combinaBusca } from '../../../dominio/cadastros'
import { CampoTexto } from '../../componentes/Campos'
import { CHAVES, useClientes } from '../../consultas'
import { useExclusaoDeCadastro } from './ExcluirCadastro'
import { ModalCadastro } from './FormularioCadastro'

const VAZIO: DadosCliente = {
  nome: '',
  telefone: '',
  documento: '',
  rua: '',
  numero: '',
  bairro: '',
  cidade: ''
}

export function AbaClientes({
  cadastrando,
  aoFecharCadastro
}: {
  cadastrando: boolean
  aoFecharCadastro(): void
}) {
  const { data: lista } = useClientes()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const visiveis = (lista ?? []).filter((c) => combinaBusca(c, busca))
  const modalAberto = cadastrando || editando !== null
  const exclusao = useExclusaoDeCadastro(
    window.api.clientes,
    CHAVES.clientes,
    'Excluir este cliente?'
  )

  function fechar() {
    setEditando(null)
    aoFecharCadastro()
  }

  return (
    <section className="card" aria-labelledby="titulo-clientes">
      <div className="lista-cabecalho">
        <h2 id="titulo-clientes">Clientes cadastrados</h2>
        <input
          className="inp busca"
          type="search"
          placeholder="Procurar cliente por nome ou telefone…"
          aria-label="Procurar cliente por nome ou telefone"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {mensagem && (
        <div className="faixa ok" role="status">
          <span>✓ {mensagem}</span>
        </div>
      )}
      {exclusao.faixas}
      {lista && lista.length === 0 && (
        <p className="muted">Nenhum cliente cadastrado ainda. Toque em “+ Cadastrar cliente”.</p>
      )}
      {lista && lista.length > 0 && visiveis.length === 0 && (
        <p className="muted">Nenhum cliente encontrado com “{busca}”.</p>
      )}
      {visiveis.length > 0 && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Endereço de entrega</th>
              <th className="num">Pedidos</th>
              <th className="num">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((c) => (
              <tr key={c.id} className={exclusao.confirmando === c.id ? 'confirmando' : undefined}>
                <td>
                  <strong>{c.nome}</strong>
                  {c.telefone && <span className="sub">{c.telefone}</span>}
                  {c.documento && <span className="sub">{c.documento}</span>}
                </td>
                <td>
                  {[c.rua, c.numero].filter(Boolean).join(', ') || <span className="muted">—</span>}
                  {(c.bairro || c.cidade) && (
                    <span className="sub">{[c.bairro, c.cidade].filter(Boolean).join(' · ')}</span>
                  )}
                </td>
                <td className="num">
                  {/* Os pedidos chegam na Fatia 4. */}
                  <span className="sub">nenhum pedido</span>
                </td>
                <td className="acoes">
                  {exclusao.acoes(
                    c.id,
                    c.nome,
                    <>
                      <button
                        type="button"
                        className="sm"
                        onClick={() => navegar(`/vendas?aba=pedidos&cliente=${c.id}`)}
                      >
                        Novo pedido
                      </button>
                      <button
                        type="button"
                        className="sm"
                        aria-label={`Editar ${c.nome}`}
                        onClick={() => {
                          setMensagem(null)
                          exclusao.limpar()
                          setEditando(c)
                        }}
                      >
                        Editar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modalAberto && (
        <ModalCadastro<DadosCliente>
          tituloNovo="Cadastrar novo cliente"
          tituloEditar="Editar cliente"
          botaoNovo="Salvar cliente"
          inicial={editando ?? VAZIO}
          editandoId={editando?.id ?? null}
          salvar={(id, dados) => window.api.clientes.salvar(id, dados)}
          chave={CHAVES.clientes}
          aoFechar={fechar}
          aoSalvar={(dados, novo) => {
            setMensagem(
              novo
                ? `Cliente ${dados.nome.trim()} cadastrado.`
                : `Cadastro de ${dados.nome.trim()} corrigido.`
            )
            fechar()
          }}
          campos={(d, mudar, erroNome) => (
            <>
              <div className="campos linha-3">
                <CampoTexto rotulo="Nome" valor={d.nome} aoMudar={mudar('nome')} erro={erroNome} />
                <CampoTexto
                  rotulo="Telefone / WhatsApp"
                  valor={d.telefone}
                  aoMudar={mudar('telefone')}
                />
                <CampoTexto rotulo="CPF ou CNPJ" valor={d.documento} aoMudar={mudar('documento')} />
              </div>
              <h3 className="subtitulo-modal">Endereço de entrega</h3>
              <div className="campos linha-rua">
                <CampoTexto rotulo="Rua" valor={d.rua} aoMudar={mudar('rua')} />
                <CampoTexto rotulo="Número" valor={d.numero} aoMudar={mudar('numero')} />
              </div>
              <div className="campos linha-2">
                <CampoTexto rotulo="Bairro" valor={d.bairro} aoMudar={mudar('bairro')} />
                <CampoTexto rotulo="Cidade" valor={d.cidade} aoMudar={mudar('cidade')} />
              </div>
            </>
          )}
        />
      )}
    </section>
  )
}
