import { useState } from 'react'
import type { DadosFornecedor, Fornecedor } from '../../../compartilhado/contrato'
import { combinaBusca } from '../../../dominio/cadastros'
import { nomeDoMes, partes } from '../../../dominio/datas'
import { formatarReais } from '../../../dominio/formatar'
import { CampoTexto } from '../../componentes/Campos'
import { CHAVES, useFornecedores } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { useExclusaoDeCadastro } from './ExcluirCadastro'
import { ModalCadastro } from './FormularioCadastro'

const VAZIO: DadosFornecedor = {
  nome: '',
  telefone: '',
  documento: '',
  contato: '',
  oQueFornece: ''
}

export function AbaFornecedores({
  cadastrando,
  aoFecharCadastro
}: {
  cadastrando: boolean
  aoFecharCadastro(): void
}) {
  const { ambiente } = usePreferencias()
  const { data: lista } = useFornecedores()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<Fornecedor | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const mes = nomeDoMes(partes(ambiente.hoje).mes)

  const visiveis = (lista ?? []).filter((f) => combinaBusca(f, busca))
  const modalAberto = cadastrando || editando !== null
  const exclusao = useExclusaoDeCadastro(
    window.api.fornecedores,
    CHAVES.fornecedores,
    'Excluir este fornecedor?'
  )

  function fechar() {
    setEditando(null)
    aoFecharCadastro()
  }

  return (
    <section className="card" aria-labelledby="titulo-fornecedores">
      <div className="lista-cabecalho">
        <h2 id="titulo-fornecedores">Fornecedores cadastrados</h2>
        <input
          className="inp busca"
          type="search"
          placeholder="Procurar fornecedor por nome ou telefone…"
          aria-label="Procurar fornecedor por nome ou telefone"
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
        <p className="muted">
          Nenhum fornecedor cadastrado ainda. Toque em “+ Cadastrar fornecedor”.
        </p>
      )}
      {lista && lista.length > 0 && visiveis.length === 0 && (
        <p className="muted">Nenhum fornecedor encontrado com “{busca}”.</p>
      )}
      {visiveis.length > 0 && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Fornecedor</th>
              <th>Contato</th>
              <th className="num">Comprado em {mes}</th>
              <th className="num">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((f) => (
              <tr key={f.id} className={exclusao.confirmando === f.id ? 'confirmando' : undefined}>
                <td>
                  <strong>{f.nome}</strong>
                  {f.oQueFornece && <span className="sub">{f.oQueFornece}</span>}
                </td>
                <td>
                  {f.contato || <span className="muted">—</span>}
                  {f.telefone && <span className="sub">{f.telefone}</span>}
                </td>
                <td className="num">{formatarReais(f.compradoNoMes)}</td>
                <td className="acoes">
                  {exclusao.acoes(
                    f.id,
                    f.nome,
                    <button
                      type="button"
                      className="sm"
                      aria-label={`Editar ${f.nome}`}
                      onClick={() => {
                        setMensagem(null)
                        exclusao.limpar()
                        setEditando(f)
                      }}
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modalAberto && (
        <ModalCadastro<DadosFornecedor>
          tituloNovo="Cadastrar novo fornecedor"
          tituloEditar="Editar fornecedor"
          botaoNovo="Salvar fornecedor"
          inicial={editando ?? VAZIO}
          editandoId={editando?.id ?? null}
          salvar={(id, dados) => window.api.fornecedores.salvar(id, dados)}
          chave={CHAVES.fornecedores}
          aoFechar={fechar}
          aoSalvar={(dados, novo) => {
            setMensagem(
              novo
                ? `Fornecedor ${dados.nome.trim()} cadastrado.`
                : `Cadastro de ${dados.nome.trim()} corrigido.`
            )
            fechar()
          }}
          campos={(d, mudar, erroNome) => (
            <>
              <div className="campos linha-3">
                <CampoTexto
                  rotulo="Nome / Razão social"
                  valor={d.nome}
                  aoMudar={mudar('nome')}
                  erro={erroNome}
                />
                <CampoTexto
                  rotulo="Telefone / WhatsApp"
                  valor={d.telefone}
                  aoMudar={mudar('telefone')}
                />
                <CampoTexto rotulo="CNPJ ou CPF" valor={d.documento} aoMudar={mudar('documento')} />
              </div>
              <div className="campos linha-2">
                <CampoTexto
                  rotulo="Pessoa de contato"
                  valor={d.contato}
                  aoMudar={mudar('contato')}
                />
                <CampoTexto
                  rotulo="O que fornece"
                  valor={d.oQueFornece}
                  aoMudar={mudar('oQueFornece')}
                  placeholder="ex.: leite, creme de leite"
                />
              </div>
            </>
          )}
        />
      )}
    </section>
  )
}
