// "Como esta conta foi paga?": prototipo/telas/10-Contas-a-pagar__modal-pagamento.png.
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { DadosPagamento } from '../../../compartilhado/contrato'
import {
  formaUsaCartao,
  FORMAS_DE_PAGAR_CONTA,
  NOME_DA_FORMA_CONTA,
  type FormaPagamentoConta
} from '../../../dominio/contas'
import type { Centavos } from '../../../dominio/dinheiro'
import type { DataISO } from '../../../dominio/datas'
import { formatarReais } from '../../../dominio/formatar'
import { Ajuda } from '../../componentes/Ajuda'
import { CampoData, numeroErradoNaTela } from '../../componentes/Campos'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { CHAVES, useCartoes, useSocios } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

/** Escolha de quem é o cartão novo: null = empresa. */
type Dono = number | null

/**
 * Os campos do pagamento. Usado no modal "Marcar como paga" e no passo
 * "Salvar e dizer como paguei" da conta nova.
 */
export function useFormularioPagamento(hoje: DataISO) {
  const [forma, setForma] = useState<FormaPagamentoConta | null>(null)
  const [cartaoId, setCartaoId] = useState<number | null>(null)
  const [pagoEm, setPagoEm] = useState<DataISO | null>(hoje)
  const [tentou, setTentou] = useState(false)
  const erros = {
    forma: forma === null ? 'Escolha como a conta foi paga.' : undefined,
    cartao:
      forma && formaUsaCartao(forma) && cartaoId === null ? 'Escolha qual cartão.' : undefined,
    pagoEm:
      pagoEm === null ? 'Digite a data.' : pagoEm > hoje ? 'Essa data ainda não chegou.' : undefined
  }
  function validar(): DadosPagamento | null {
    setTentou(true)
    if (Object.values(erros).some(Boolean) || !forma || !pagoEm) return null
    return { forma, cartaoId: formaUsaCartao(forma) ? cartaoId : null, pagoEm }
  }
  return { forma, setForma, cartaoId, setCartaoId, pagoEm, setPagoEm, erros, tentou, validar }
}

export function CamposPagamento({ f }: { f: ReturnType<typeof useFormularioPagamento> }) {
  const cliente = useQueryClient()
  const { data: cartoes = [] } = useCartoes()
  const { data: socios = [] } = useSocios()
  const [donoNovo, setDonoNovo] = useState<Dono>(null)
  const [erroCartao, setErroCartao] = useState<string | null>(null)
  const mostrar = (e: string | undefined) => (f.tentou ? e : undefined)
  const escolhido = cartoes.find((k) => k.id === f.cartaoId)

  async function criar(nome: string) {
    setErroCartao(null)
    const r = await window.api.cartoes.criar(nome, donoNovo)
    if (!r.ok) return setErroCartao(r.mensagem)
    await cliente.invalidateQueries({ queryKey: CHAVES.cartoes })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
    f.setCartaoId(r.valor.id)
  }

  async function remover(id: number) {
    setErroCartao(null)
    const r = await window.api.cartoes.remover(id)
    if (!r.ok) return setErroCartao(r.mensagem)
    if (f.cartaoId === id) f.setCartaoId(null)
    await cliente.invalidateQueries({ queryKey: CHAVES.cartoes })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }

  return (
    <>
      <div>
        <span className="lb" id="rotulo-forma-conta">
          Forma de pagamento <Ajuda texto={AJUDA.formaPagamentoConta} />
        </span>
        <div className="opcoes opcoes-3" role="radiogroup" aria-labelledby="rotulo-forma-conta">
          {FORMAS_DE_PAGAR_CONTA.map((forma) => (
            <button
              key={forma}
              type="button"
              role="radio"
              aria-checked={f.forma === forma}
              className={f.forma === forma ? 'opt on' : 'opt'}
              onClick={() => f.setForma(forma)}
            >
              {NOME_DA_FORMA_CONTA[forma]}
            </button>
          ))}
        </div>
        {mostrar(f.erros.forma) && <span className="erro-campo">{f.erros.forma}</span>}
      </div>
      {f.forma && formaUsaCartao(f.forma) && (
        <>
          <div className="campo-cartao">
            <ListaSuspensa<number>
              rotulo="Qual cartão?"
              extra={<Ajuda texto={AJUDA.qualCartao} />}
              opcoes={cartoes.map((k) => ({
                valor: k.id,
                rotulo: `${k.nome} · ${k.donoNome ? `pessoal do ${k.donoNome}` : 'da empresa'}`,
                emUso: k.emUso
              }))}
              valor={f.cartaoId}
              aoEscolher={f.setCartaoId}
              textoVazio="Escolha o cartão"
              aoCriar={(nome) => void criar(nome)}
              fecharAoCriar
              aoRemover={(id) => void remover(id)}
              textoEmUso={(n) => `em uso · ${n} ${n === 1 ? 'conta' : 'contas'}`}
              rotuloNovo="Nome do cartão novo"
              nota="Só dá para remover um cartão que nenhuma conta usa."
              antesDeCriar={
                <div className="dono-cartao">
                  <span className="lb" id="rotulo-dono-cartao">
                    Cartão novo é de quem?
                  </span>
                  <div className="abas" role="radiogroup" aria-labelledby="rotulo-dono-cartao">
                    {[{ id: null, nome: 'Empresa' }, ...socios].map((d) => (
                      <button
                        key={d.id ?? 'empresa'}
                        type="button"
                        role="radio"
                        aria-checked={donoNovo === d.id}
                        className={donoNovo === d.id ? 'tab on' : 'tab'}
                        onClick={() => setDonoNovo(d.id)}
                      >
                        {d.nome}
                      </button>
                    ))}
                  </div>
                </div>
              }
              erro={mostrar(f.erros.cartao)}
            />
          </div>
          {erroCartao && (
            <div className="faixa erro" role="alert">
              {erroCartao}
            </div>
          )}
          {escolhido?.donoNome && (
            <div className="faixa atencao" role="status">
              Este cartão é pessoal do {escolhido.donoNome}. O valor vai entrar como reembolso para
              ele em Sócios.
            </div>
          )}
        </>
      )}
      <div className="campo-curto">
        <CampoData
          rotulo="Pago em"
          valor={f.pagoEm}
          aoMudar={f.setPagoEm}
          erro={mostrar(f.erros.pagoEm)}
        />
      </div>
    </>
  )
}

/** Título do modal com o nome e o valor da conta embaixo. */
export function SubtituloConta({ nome, valor }: { nome: string; valor: Centavos }) {
  return (
    <p className="subtitulo-modal">
      <strong>{nome}</strong> · {formatarReais(valor)}
    </p>
  )
}

export function ModalPagamento({
  conta,
  hoje,
  aoFechar,
  aoPagar
}: {
  conta: { id: number; nome: string; valor: Centavos }
  hoje: DataISO
  aoFechar(): void
  aoPagar(): Promise<void>
}) {
  const f = useFormularioPagamento(hoje)
  const [erro, setErro] = useState<string | null>(null)

  const confirmarUmaVez = useUmaVezPorVez(confirmar)
  async function confirmar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    const p = f.validar()
    if (!p) return
    const r = await window.api.contas.pagar(conta.id, p)
    if (!r.ok) return setErro(r.mensagem)
    await aoPagar()
  }

  return (
    <Modal
      titulo="Como esta conta foi paga?"
      largura={760}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="btn" onClick={() => void confirmarUmaVez()}>
            Confirmar pagamento
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <SubtituloConta nome={conta.nome} valor={conta.valor} />
      <CamposPagamento f={f} />
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
