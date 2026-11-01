// Registrar retirada: prototipo/telas/11-Socios__modal-retirada.png.
import { useState } from 'react'
import type { Retirada } from '../../../compartilhado/contrato'
import type { Centavos } from '../../../dominio/dinheiro'
import type { DataISO } from '../../../dominio/datas'
import { NOME_COMO_RETIROU, type ComoRetirou } from '../../../dominio/socios'
import { CampoData, CampoDinheiro, CampoTexto, numeroErradoNaTela } from '../../componentes/Campos'
import { ConfirmarNaLinha } from '../../componentes/Excluir'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { useSocios } from '../../consultas'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

export function ModalRetirada({
  retirada,
  hoje,
  aoFechar,
  aoSalvar,
  aoExcluir
}: {
  /** null = nova retirada */
  retirada: Retirada | null
  hoje: DataISO
  aoFechar(): void
  aoSalvar(texto: string): Promise<void>
  aoExcluir(r: Retirada): Promise<void>
}) {
  const { data: socios = [] } = useSocios()
  const [socioId, setSocioId] = useState<number | null>(retirada?.socioId ?? socios[0]?.id ?? 1)
  const [valor, setValor] = useState<Centavos | null>(retirada?.valor ?? null)
  const [como, setComo] = useState<ComoRetirou | null>(retirada?.como ?? 'pix_empresa')
  const [data, setData] = useState<DataISO | null>(retirada?.data ?? hoje)
  const [motivo, setMotivo] = useState(retirada?.motivo ?? 'Adiantamento')
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const erros = {
    valor: !valor ? 'Digite o valor.' : undefined,
    como: como === null ? 'Escolha como pegou.' : undefined,
    data: data === null ? 'Digite a data.' : data > hoje ? 'Essa data ainda não chegou.' : undefined
  }
  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (Object.values(erros).some(Boolean) || !socioId || !valor || !como || !data) return
    const r = await window.api.retiradas.salvar(retirada?.id ?? null, {
      socioId,
      valor,
      data,
      como,
      motivo: motivo.trim()
    })
    if (!r.ok) return setErro(r.mensagem)
    await aoSalvar(retirada ? 'Retirada corrigida.' : 'Retirada registrada.')
  }

  return (
    <Modal
      titulo={retirada ? 'Editar retirada' : 'Registrar retirada'}
      editando={retirada ? 'Editando uma retirada' : undefined}
      aoFechar={aoFechar}
      rodape={
        confirmando && retirada ? (
          <ConfirmarNaLinha
            pergunta="Excluir esta retirada?"
            aoConfirmar={() => void aoExcluir(retirada)}
            aoCancelar={() => setConfirmando(false)}
          />
        ) : (
          <>
            <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
              {retirada ? 'Salvar alterações' : 'Salvar retirada'}
            </button>
            <button type="button" className="btn2" onClick={aoFechar}>
              Cancelar
            </button>
            {retirada && (
              <button
                type="button"
                className="sm rodape-direita"
                onClick={() => setConfirmando(true)}
              >
                Excluir retirada
              </button>
            )}
          </>
        )
      }
    >
      <div className="campos linha-retirada">
        <div className="campo">
          <span className="lb" id="rotulo-quem-retirou">
            Quem retirou?
          </span>
          <div className="opcoes opcoes-2" role="radiogroup" aria-labelledby="rotulo-quem-retirou">
            {socios.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={socioId === s.id}
                className={socioId === s.id ? 'opt on' : 'opt'}
                onClick={() => setSocioId(s.id)}
              >
                {s.nome}
              </button>
            ))}
          </div>
        </div>
        <CampoDinheiro
          rotulo="Valor (R$)"
          valor={valor}
          aoMudar={setValor}
          erro={mostrar(erros.valor)}
        />
        <ListaSuspensa<ComoRetirou>
          rotulo="Como pegou"
          opcoes={(Object.keys(NOME_COMO_RETIROU) as ComoRetirou[]).map((c) => ({
            valor: c,
            rotulo: NOME_COMO_RETIROU[c]
          }))}
          valor={como}
          aoEscolher={setComo}
          erro={mostrar(erros.como)}
        />
        <CampoData rotulo="Data" valor={data} aoMudar={setData} erro={mostrar(erros.data)} />
      </div>
      <CampoTexto rotulo="Motivo" valor={motivo} aoMudar={setMotivo} />
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
