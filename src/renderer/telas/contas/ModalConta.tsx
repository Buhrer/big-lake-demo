// Nova conta / Editar conta: prototipo/telas/10-Contas-a-pagar__modal-nova-conta.png.
// "Sim, já paguei" troca o conteúdo do modal pelo pagamento ("Salvar e dizer como paguei").
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { Conta, DadosConta } from '../../../compartilhado/contrato'
import { DIAS_DE_AVISO } from '../../../dominio/contas'
import type { Centavos } from '../../../dominio/dinheiro'
import type { DataISO } from '../../../dominio/datas'
import { Ajuda } from '../../componentes/Ajuda'
import { CampoData, CampoDinheiro, CampoTexto, numeroErradoNaTela } from '../../componentes/Campos'
import { ConfirmarNaLinha } from '../../componentes/Excluir'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { CHAVES, useTiposConta } from '../../consultas'
import { AJUDA, type TextoAjuda } from '../../textos/ajuda'
import { CamposPagamento, SubtituloConta, useFormularioPagamento } from './Pagamento'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

/** Grupo de botões Sim/Não (ou 1, 3, 5, 7 dias) com rótulo e "?". */
export function Escolha<V extends string | number | boolean>({
  rotulo,
  ajuda,
  opcoes,
  valor,
  aoEscolher,
  erro
}: {
  rotulo: string
  ajuda?: TextoAjuda
  opcoes: [V, ReactNode][]
  /** null = nada escolhido ainda (o Carlos precisa escolher; D-092) */
  valor: V | null
  aoEscolher(v: V): void
  erro?: string
}) {
  const id = `rotulo-${rotulo.replace(/\W+/g, '-')}`
  return (
    <div className="escolha">
      <span className="lb">
        <span id={id}>{rotulo}</span>
        {ajuda && <Ajuda texto={ajuda} />}
      </span>
      <div className="escolha-botoes" role="radiogroup" aria-labelledby={id}>
        {opcoes.map(([v, texto]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={valor === v}
            className={valor === v ? 'opt on' : 'opt'}
            onClick={() => aoEscolher(v)}
          >
            {texto}
          </button>
        ))}
      </div>
      {erro && <span className="erro-campo">{erro}</span>}
    </div>
  )
}

export function ModalConta({
  conta,
  hoje,
  aoFechar,
  aoSalvar,
  aoExcluir
}: {
  /** null = nova conta */
  conta: Conta | null
  hoje: DataISO
  aoFechar(): void
  aoSalvar(texto: string): Promise<void>
  aoExcluir(c: Conta): Promise<void>
}) {
  const cliente = useQueryClient()
  const { data: tipos = [] } = useTiposConta()
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [valor, setValor] = useState<Centavos | null>(conta?.valor ?? null)
  const [vencimento, setVencimento] = useState<DataISO | null>(conta?.vencimento ?? hoje)
  const [tipoId, setTipoId] = useState<number | null>(conta?.tipoId ?? null)
  const [jaPaga, setJaPaga] = useState(false)
  const [repete, setRepete] = useState(conta?.repete ?? false)
  const [avisarDias, setAvisarDias] = useState(conta?.avisarDias ?? 3)
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroTipo, setErroTipo] = useState<string | null>(null)
  const [pagando, setPagando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const pagamento = useFormularioPagamento(hoje)

  const erros = {
    nome: !nome.trim() ? 'Digite o que é a conta.' : undefined,
    valor: !valor ? 'Digite o valor.' : undefined,
    vencimento: vencimento === null ? 'Digite a data.' : undefined,
    tipo: tipoId === null ? 'Escolha o tipo de conta.' : undefined
  }
  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  function dados(): DadosConta | null {
    setTentou(true)
    if (Object.values(erros).some(Boolean) || !valor || !vencimento || !tipoId) return null
    return { nome: nome.trim(), valor, vencimento, tipoId, repete, avisarDias }
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setErro(null)
    const d = dados()
    if (!d) return
    if (!conta && jaPaga && !pagando) return setPagando(true)
    let p = null
    if (pagando) {
      p = pagamento.validar()
      if (!p) return
    }
    const r = await window.api.contas.salvar(conta?.id ?? null, d, p)
    if (!r.ok) return setErro(r.mensagem)
    await aoSalvar(
      conta
        ? `Conta ${d.nome} corrigida.`
        : p
          ? `Conta ${d.nome} salva como paga.`
          : `Conta ${d.nome} salva.`
    )
  }

  async function atualizarTipos() {
    await cliente.invalidateQueries({ queryKey: CHAVES.tiposConta })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }

  async function criarTipo(n: string) {
    setErroTipo(null)
    const r = await window.api.tiposConta.criar(n)
    if (!r.ok) return setErroTipo(r.mensagem)
    await atualizarTipos()
    setTipoId(r.valor.id)
  }

  async function removerTipo(id: number) {
    setErroTipo(null)
    const r = await window.api.tiposConta.remover(id)
    if (!r.ok) return setErroTipo(r.mensagem)
    if (tipoId === id) setTipoId(null)
    await atualizarTipos()
  }

  if (pagando) {
    return (
      <Modal
        titulo="Como esta conta foi paga?"
        largura={760}
        aoFechar={aoFechar}
        rodape={
          <>
            <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
              Confirmar pagamento
            </button>
            <button type="button" className="btn2" onClick={() => setPagando(false)}>
              Voltar
            </button>
          </>
        }
      >
        <SubtituloConta nome={nome.trim()} valor={valor!} />
        <CamposPagamento f={pagamento} />
        {erro && (
          <div className="faixa erro" role="alert">
            {erro}
          </div>
        )}
      </Modal>
    )
  }

  return (
    <Modal
      titulo={conta ? 'Editar conta' : 'Nova conta'}
      editando={conta ? 'Editando uma conta' : undefined}
      aoFechar={aoFechar}
      rodape={
        confirmandoExclusao && conta ? (
          <ConfirmarNaLinha
            pergunta="Excluir esta conta?"
            aoConfirmar={() => void aoExcluir(conta)}
            aoCancelar={() => setConfirmandoExclusao(false)}
          />
        ) : (
          <>
            <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
              {conta ? 'Salvar alterações' : jaPaga ? 'Salvar e dizer como paguei' : 'Salvar conta'}
            </button>
            <button type="button" className="btn2" onClick={aoFechar}>
              Cancelar
            </button>
            {conta && (
              <button
                type="button"
                className="sm rodape-direita"
                onClick={() => setConfirmandoExclusao(true)}
              >
                Excluir conta
              </button>
            )}
          </>
        )
      }
    >
      <div className="campos linha-conta">
        <CampoTexto rotulo="O que é" valor={nome} aoMudar={setNome} erro={mostrar(erros.nome)} />
        <CampoDinheiro
          rotulo="Valor (R$)"
          valor={valor}
          aoMudar={setValor}
          erro={mostrar(erros.valor)}
        />
        <CampoData
          rotulo="Vencimento"
          valor={vencimento}
          aoMudar={setVencimento}
          erro={mostrar(erros.vencimento)}
        />
        <ListaSuspensa<number>
          rotulo="Tipo de conta"
          extra={<Ajuda texto={AJUDA.tipoConta} />}
          opcoes={tipos.map((t) => ({
            valor: t.id,
            rotulo: t.nome,
            emUso: t.emUso,
            fixa: t.fatura
          }))}
          valor={tipoId}
          aoEscolher={setTipoId}
          textoVazio="Escolha…"
          aoCriar={(n) => void criarTipo(n)}
          fecharAoCriar
          aoRemover={(id) => void removerTipo(id)}
          nota="Só dá para remover um tipo que nenhuma conta usa. A “Fatura do cartão da empresa” não entra nas despesas: cada compra no cartão já entrou no dia em que foi feita."
          erro={mostrar(erros.tipo) ?? erroTipo ?? undefined}
        />
      </div>
      <div className="escolhas-conta">
        {!conta && (
          <Escolha<boolean>
            rotulo="Já está paga?"
            ajuda={AJUDA.jaPaga}
            opcoes={[
              [true, 'Sim, já paguei'],
              [false, 'Não, vou pagar']
            ]}
            valor={jaPaga}
            aoEscolher={setJaPaga}
          />
        )}
        <Escolha<boolean>
          rotulo="Repete todo mês?"
          ajuda={AJUDA.contaRepete}
          opcoes={[
            [true, 'Sim, todo mês'],
            [false, 'Não, só uma vez']
          ]}
          valor={repete}
          aoEscolher={setRepete}
        />
        <Escolha<number>
          rotulo="Avisar quantos dias antes?"
          ajuda={AJUDA.avisoAntes}
          opcoes={DIAS_DE_AVISO.map((n): [number, string] => [n, n === 1 ? '1 dia' : `${n} dias`])}
          valor={avisarDias}
          aoEscolher={setAvisarDias}
        />
      </div>
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
