// Modal de cadastro/correção compartilhado por clientes e fornecedores.
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { Resposta } from '../../../compartilhado/contrato'
import { Modal } from '../../componentes/Modal'
import { CHAVES } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

export function ModalCadastro<T extends { nome: string }>({
  tituloNovo,
  tituloEditar,
  botaoNovo,
  inicial,
  editandoId,
  salvar,
  chave,
  aoSalvar,
  aoFechar,
  campos
}: {
  tituloNovo: string
  tituloEditar: string
  /** "Salvar cliente" */
  botaoNovo: string
  inicial: T
  /** null = cadastro novo */
  editandoId: number | null
  salvar(id: number | null, dados: T): Promise<Resposta<number>>
  chave: readonly string[]
  aoSalvar(dados: T, novo: boolean): void
  aoFechar(): void
  campos(
    dados: T,
    mudar: (campo: keyof T) => (valor: string) => void,
    erroNome: string | undefined
  ): ReactNode
}) {
  const cliente = useQueryClient()
  const [dados, setDados] = useState(inicial)
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const novo = editandoId === null

  const mudar = (campo: keyof T) => (valor: string) => {
    setDados((d) => ({ ...d, [campo]: valor }))
    setErro(null)
  }

  const confirmarUmaVez = useUmaVezPorVez(confirmar)
  async function confirmar() {
    setTentou(true)
    if (!dados.nome.trim()) return
    setSalvando(true)
    const r = await salvar(editandoId, dados)
    setSalvando(false)
    if (!r.ok) {
      setErro(r.mensagem)
      return
    }
    await cliente.invalidateQueries({ queryKey: chave })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
    aoSalvar(dados, novo)
  }

  return (
    <Modal
      titulo={novo ? tituloNovo : tituloEditar}
      editando={novo ? undefined : 'Editando um cadastro'}
      ajuda={AJUDA.cadastrarOuCorrigir}
      aoFechar={aoFechar}
      rodape={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => void confirmarUmaVez()}
            disabled={salvando}
          >
            {novo ? botaoNovo : 'Salvar alterações'}
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      {campos(dados, mudar, tentou && !dados.nome.trim() ? 'Digite o nome.' : undefined)}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
