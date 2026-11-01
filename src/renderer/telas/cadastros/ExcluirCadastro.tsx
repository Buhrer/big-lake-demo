// Excluir cliente/fornecedor (D-038): só quando não está em uso; confirmação na linha e Desfazer.
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { EmUso, Resposta } from '../../../compartilhado/contrato'
import { ConfirmarNaLinha, FaixaDesfazer } from '../../componentes/Excluir'
import { CHAVES } from '../../consultas'

interface ApiExclusao {
  emUso(id: number): Promise<EmUso>
  excluir(id: number): Promise<Resposta<null>>
  desfazerExclusao(id: number): Promise<Resposta<null>>
}

export function useExclusaoDeCadastro(
  api: ApiExclusao,
  chave: readonly string[],
  pergunta: string
) {
  const cliente = useQueryClient()
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [bloqueado, setBloqueado] = useState<{ id: number; motivo: string } | null>(null)
  const [excluido, setExcluido] = useState<{ id: number; nome: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function atualizar() {
    await cliente.invalidateQueries({ queryKey: chave })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }

  async function pedir(id: number) {
    setErro(null)
    const motivo = await api.emUso(id)
    if (motivo) {
      setConfirmando(null)
      setBloqueado({ id, motivo })
    } else {
      setBloqueado(null)
      setConfirmando(id)
    }
  }

  async function confirmar(id: number, nome: string) {
    setConfirmando(null)
    const r = await api.excluir(id)
    if (!r.ok) return setErro(r.mensagem)
    setExcluido({ id, nome })
    await atualizar()
  }

  async function desfazer() {
    if (!excluido) return
    const r = await api.desfazerExclusao(excluido.id)
    if (!r.ok) setErro(r.mensagem)
    setExcluido(null)
    await atualizar()
  }

  /** As ações da linha: Editar + Excluir, ou a confirmação, ou o motivo de não poder excluir. */
  function acoes(id: number, nome: string, outrasAcoes: ReactNode) {
    if (confirmando === id) {
      return (
        <ConfirmarNaLinha
          pergunta={pergunta}
          aoConfirmar={() => void confirmar(id, nome)}
          aoCancelar={() => setConfirmando(null)}
        />
      )
    }
    if (bloqueado?.id === id) {
      return (
        <div className="confirmar">
          <span>Não dá para excluir: {bloqueado.motivo}.</span>
          <button type="button" className="sm" onClick={() => setBloqueado(null)}>
            Entendi
          </button>
        </div>
      )
    }
    return (
      <>
        {outrasAcoes}
        <button
          type="button"
          className="sm"
          aria-label={`Excluir ${nome}`}
          onClick={() => void pedir(id)}
        >
          Excluir
        </button>
      </>
    )
  }

  const faixas = (
    <>
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
    </>
  )

  return { acoes, faixas, confirmando, limpar: () => setExcluido(null) }
}
