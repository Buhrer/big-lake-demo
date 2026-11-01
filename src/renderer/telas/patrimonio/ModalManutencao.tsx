// Registrar manutenção: prototipo/telas/12-Patrimonio__modal-manutencao.png
// (docs/02 §9.2, T12; D-032 p.19; D-066, D-070).
import { useState } from 'react'
import type { DadosPagamento, Manutencao } from '../../../compartilhado/contrato'
import { textoDoPagamento } from '../../../dominio/contas'
import type { Centavos } from '../../../dominio/dinheiro'
import { formatarData, type DataISO } from '../../../dominio/datas'
import { formatarReais } from '../../../dominio/formatar'
import { garantiaAte, type TipoManutencao } from '../../../dominio/patrimonio'
import {
  CampoData,
  CampoDinheiro,
  CampoNumerico,
  CampoTexto,
  numeroErradoNaTela
} from '../../componentes/Campos'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { useBens, useManutencoes } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { Escolha } from '../contas/ModalConta'
import { CamposPagamento, useFormularioPagamento } from '../contas/Pagamento'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

const lerDias = (t: string) => (/^\d{1,4}$/.test(t.trim()) ? Number(t.trim()) : null)

export function ModalManutencao({
  manutencao,
  bemInicial,
  hoje,
  aoFechar,
  aoSalvar
}: {
  /** null = registrar */
  manutencao: Manutencao | null
  /** Bem já escolhido (botão "Manutenção" na linha do bem). */
  bemInicial: number | null
  hoje: DataISO
  aoFechar(): void
  aoSalvar(texto: string, paga: boolean | null): Promise<void>
}) {
  const { data: bens = [] } = useBens()
  const { data: todas = [] } = useManutencoes()
  const [bemId, setBemId] = useState<number | null>(manutencao?.bemId ?? bemInicial)
  const [oQue, setOQue] = useState(manutencao?.oQueFoiFeito ?? '')
  const [quem, setQuem] = useState(manutencao?.quemFez ?? '')
  const [data, setData] = useState<DataISO | null>(manutencao?.data ?? hoje)
  const [valor, setValor] = useState<Centavos | null>(manutencao?.valor ?? null)
  const [garantia, setGarantia] = useState<number | null>(manutencao?.garantiaDias ?? 90)
  const [tipo, setTipo] = useState<TipoManutencao>(manutencao?.tipo ?? 'conserto')
  const [paga, setPaga] = useState(true)
  const [vencimento, setVencimento] = useState<DataISO | null>(manutencao?.vencimento ?? null)
  const pagamento = useFormularioPagamento(hoje)
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const bem = bens.find((b) => b.id === bemId)
  const conta = manutencao?.conta ?? null
  // sem conta ainda (nova, ou era de graça) e com valor: pergunta se já está paga
  const perguntaSePaga = !conta && !!valor
  const pedeVencimento = (perguntaSePaga && !paga) || (!!conta && !conta.pagamento && !!valor)
  const feitas = todas.filter((m) => m.bemId === bemId && m.id !== manutencao?.id)
  const ate = data && garantia ? garantiaAte(data, garantia) : null

  const erros = {
    bem: bemId === null ? 'Escolha o patrimônio.' : undefined,
    oQue: oQue.trim() ? undefined : 'Digite o que foi feito.',
    data:
      data === null ? 'Digite a data.' : data > hoje ? 'Essa data ainda não chegou.' : undefined,
    valor: valor === null ? 'Digite o valor (R$ 0,00 se foi de graça).' : undefined,
    garantia: garantia === null ? 'Digite os dias de garantia (0 se não tem).' : undefined,
    vencimento: pedeVencimento && vencimento === null ? 'Digite quando a conta vence.' : undefined
  }
  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (Object.values(erros).some(Boolean) || !bemId || !data || valor === null) return
    let p: DadosPagamento | null = null
    if (perguntaSePaga && paga) {
      p = pagamento.validar()
      if (!p) return
    }
    const r = await window.api.patrimonio.salvarManutencao(
      manutencao?.id ?? null,
      {
        bemId,
        data,
        oQueFoiFeito: oQue.trim(),
        quemFez: quem.trim(),
        valor,
        garantiaDias: garantia ?? 0,
        tipo,
        vencimento: pedeVencimento ? vencimento : null
      },
      p
    )
    if (!r.ok) return setErro(r.mensagem)
    const nomeBem = bem?.nome ?? ''
    if (manutencao) return aoSalvar('Alterações da manutenção salvas.', null)
    await aoSalvar(
      `Manutenção do ${nomeBem} registrada. ` +
        (!valor
          ? 'Como saiu de graça, não vai para Contas a pagar.'
          : paga
            ? 'Ela já está em Contas a pagar como paga.'
            : 'Ela está em Contas a pagar para pagar depois.'),
      valor ? paga : null
    )
  }

  return (
    <Modal
      titulo={manutencao ? 'Corrigir manutenção' : 'Registrar manutenção'}
      editando={manutencao ? 'Editando uma manutenção' : undefined}
      largura={760}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
            {manutencao ? 'Salvar alterações' : 'Salvar manutenção'}
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <ListaSuspensa<number>
        rotulo="Qual patrimônio?"
        opcoes={bens.map((b) => ({ valor: b.id, rotulo: b.nome }))}
        valor={bemId}
        aoEscolher={setBemId}
        textoVazio={
          bens.length ? 'Escolha o patrimônio…' : 'Cadastre o bem na aba “Bens da empresa”'
        }
        erro={mostrar(erros.bem)}
      />
      {bem && (
        <div className="ja-feitas" aria-label="Já feitas neste bem">
          <div className="ja-feitas-linha">
            <strong>Já feitas neste bem</strong>
            {feitas.length > 0 && (
              <span className="muted">
                total {formatarReais(feitas.reduce((t, m) => t + m.valor, 0) as Centavos)}
              </span>
            )}
          </div>
          {feitas.length === 0 ? (
            <span className="muted">Nenhuma manutenção ainda.</span>
          ) : (
            feitas.slice(0, 3).map((m) => (
              <div key={m.id} className="ja-feitas-linha">
                <span>
                  {formatarData(m.data)} · {m.oQueFoiFeito}
                </span>
                <strong className="valor">{formatarReais(m.valor)}</strong>
              </div>
            ))
          )}
        </div>
      )}

      <div className="campos linha-2">
        <CampoTexto
          rotulo="O que foi feito"
          valor={oQue}
          aoMudar={setOQue}
          erro={mostrar(erros.oQue)}
        />
        <CampoTexto rotulo="Quem fez" valor={quem} aoMudar={setQuem} />
      </div>
      <div className="campos linha-3-iguais">
        <CampoData rotulo="Data" valor={data} aoMudar={setData} erro={mostrar(erros.data)} />
        <CampoDinheiro
          rotulo="Valor (R$)"
          valor={valor}
          aoMudar={setValor}
          erro={mostrar(erros.valor)}
        />
        <CampoNumerico<number>
          rotulo="Garantia"
          valor={garantia}
          aoMudar={setGarantia}
          ler={lerDias}
          formatar={String}
          sufixo="dias"
          erro={mostrar(erros.garantia)}
        />
      </div>
      {ate && (
        <p className="muted" style={{ margin: 0 }}>
          Garantia vale até <strong>{formatarData(ate)}</strong>.
        </p>
      )}

      <div className="escolhas-conta">
        <Escolha<TipoManutencao>
          rotulo="Tipo"
          opcoes={[
            ['revisao', 'Revisão (preventiva)'],
            ['conserto', 'Conserto']
          ]}
          valor={tipo}
          aoEscolher={setTipo}
        />
        {perguntaSePaga && (
          <Escolha<boolean>
            rotulo="Já está paga?"
            ajuda={AJUDA.manutencaoPaga}
            opcoes={[
              [true, 'Sim, já paguei'],
              [false, 'Não, vou pagar depois']
            ]}
            valor={paga}
            aoEscolher={setPaga}
          />
        )}
      </div>

      {perguntaSePaga && paga && <CamposPagamento f={pagamento} />}
      {pedeVencimento && (
        <div className="campo-curto">
          <CampoData
            rotulo="Vence em"
            valor={vencimento}
            aoMudar={setVencimento}
            erro={mostrar(erros.vencimento)}
          />
        </div>
      )}

      {valor === 0 ? (
        <div className="faixa atencao" role="status">
          Sem valor (saiu de graça): não vai para Contas a pagar.
        </div>
      ) : conta?.pagamento ? (
        <div className="faixa atencao" role="status">
          A conta já está paga (
          {textoDoPagamento(
            conta.pagamento.forma,
            conta.pagamento.cartaoNome
              ? { nome: conta.pagamento.cartaoNome, dono: conta.pagamento.donoNome }
              : null
          )}{' '}
          em {formatarData(conta.pagamento.pagoEm).slice(0, 5)}). Para mudar o pagamento, use Contas
          a pagar.
        </div>
      ) : conta ? (
        <div className="faixa atencao" role="status">
          A conta está em aberto em Contas a pagar. Quando pagar, marque lá como paga.
        </div>
      ) : (
        valor !== null && (
          <div className="faixa atencao" role="status">
            {paga
              ? 'Ao salvar, a manutenção entra em Contas a pagar já como paga.'
              : 'Ao salvar, a manutenção vai para Contas a pagar para pagar depois. Quando pagar, marque lá como paga.'}
          </div>
        )
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
