import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useClientes, useFornecedores } from '../../consultas'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { AbaClientes } from './Clientes'
import { AbaFornecedores } from './Fornecedores'
import { AbaProdutos } from './Produtos'

type Aba = 'clientes' | 'fornecedores' | 'produtos'

const BOTAO: Record<Aba, string> = {
  clientes: '+ Cadastrar cliente',
  fornecedores: '+ Cadastrar fornecedor',
  produtos: '+ Cadastrar produto'
}

export function TelaCadastros() {
  const [parametros, setParametros] = useSearchParams()
  const aba = (parametros.get('aba') as Aba | null) ?? 'clientes'
  const [cadastrando, setCadastrando] = useState(false)
  const { data: listaClientes } = useClientes()
  const { data: listaFornecedores } = useFornecedores()

  function trocar(nova: Aba) {
    setCadastrando(false)
    setParametros({ aba: nova }, { replace: true })
  }

  const abas: [Aba, string][] = [
    ['clientes', `Clientes (${listaClientes?.length ?? 0})`],
    ['fornecedores', `Fornecedores (${listaFornecedores?.length ?? 0})`],
    ['produtos', 'Produtos à venda']
  ]

  return (
    <>
      <CabecalhoTela
        subtitulo="Clientes, fornecedores e produtos que a Big Lake vende"
        titulo="Cadastros"
        ajuda={AJUDA.cadastros}
        acao={
          <button type="button" className="btn" onClick={() => setCadastrando(true)}>
            {BOTAO[aba]}
          </button>
        }
      />
      <div className="seg" role="tablist" aria-label="Cadastros">
        {abas.map(([a, rotulo]) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            className={aba === a ? 'sg on' : 'sg'}
            onClick={() => trocar(a)}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {aba === 'clientes' && (
        <AbaClientes cadastrando={cadastrando} aoFecharCadastro={() => setCadastrando(false)} />
      )}
      {aba === 'fornecedores' && (
        <AbaFornecedores cadastrando={cadastrando} aoFecharCadastro={() => setCadastrando(false)} />
      )}
      {aba === 'produtos' && (
        <AbaProdutos cadastrando={cadastrando} aoFecharCadastro={() => setCadastrando(false)} />
      )}
    </>
  )
}
