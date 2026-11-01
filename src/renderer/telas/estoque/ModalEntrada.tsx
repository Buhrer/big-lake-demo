// "Cadastrar insumo / entrada de mercadoria" (D-035): item já cadastrado ou item novo.
import { useState } from 'react'
import type { ContaDaCompra, ItemEstoque } from '../../../compartilhado/contrato'
import { centavos, type Centavos, type QuantidadeX1000 } from '../../../dominio/dinheiro'
import { formatarData, type DataISO } from '../../../dominio/datas'
import {
  aumentoPercentual,
  custoPorUnidade,
  NOME_DA_MEDIDA,
  rotuloUnidade,
  type TipoInsumo,
  type Unidade
} from '../../../dominio/estoque'
import { formatarCusto, formatarQuantidade } from '../../../dominio/formatar'
import { Ajuda } from '../../componentes/Ajuda'
import {
  CampoData,
  CampoDinheiro,
  CampoQuantidade,
  CampoTexto,
  numeroErradoNaTela
} from '../../componentes/Campos'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { usePreferencias } from '../../contexto/Preferencias'
import { AJUDA } from '../../textos/ajuda'
import { Escolha } from '../contas/ModalConta'
import { CamposPagamento, useFormularioPagamento } from '../contas/Pagamento'
import { EscolhaTipoEMedida, ListaFornecedor } from './camposInsumo'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

export interface Aviso {
  tipo: 'ok' | 'atencao'
  texto: string
}

type Modo = 'existente' | 'novo'
/** Lançar a compra em Contas a pagar? (D-092) Começa sem nada marcado. */
type Lancar = 'paga' | 'depois' | 'nao'

function custoOuNulo(valor: Centavos | null, quantidade: QuantidadeX1000 | null) {
  return valor !== null && quantidade !== null && quantidade > 0
    ? custoPorUnidade(valor, quantidade)
    : null
}

export function ModalEntrada({
  itens,
  aoFechar,
  aoSalvar
}: {
  itens: ItemEstoque[]
  aoFechar(): void
  aoSalvar(avisos: Aviso[]): void | Promise<void>
}) {
  const [modo, setModo] = useState<Modo>(itens.length > 0 ? 'existente' : 'novo')
  // comuns
  const [quantidade, setQuantidade] = useState<QuantidadeX1000 | null>(null)
  const [valorPago, setValorPago] = useState<Centavos | null>(null)
  const [fornecedorId, setFornecedorId] = useState<number | null>(null)
  const [validade, setValidade] = useState<DataISO | null>(null)
  // existente
  const [itemId, setItemId] = useState<number | null>(null)
  // novo
  const [tipo, setTipo] = useState<TipoInsumo>('materia_prima')
  const [unidade, setUnidade] = useState<Unidade>('kg')
  const [nomeUnidade, setNomeUnidade] = useState('')
  const [nome, setNome] = useState('')
  const [minimo, setMinimo] = useState<QuantidadeX1000 | null>(0)

  // conta da compra (D-092)
  const { ambiente } = usePreferencias()
  const [lancar, setLancar] = useState<Lancar | null>(null)
  const [vence, setVence] = useState<DataISO | null>(null)
  const pagamento = useFormularioPagamento(ambiente.hoje)

  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const item = itens.find((i) => i.id === itemId) ?? null
  const unidadeAtual = modo === 'existente' ? (item?.unidade ?? 'un') : unidade
  const rotulo =
    modo === 'existente' ? (item?.rotulo ?? '') : rotuloUnidade(unidade, nomeUnidade || null)
  const custo = custoOuNulo(valorPago, quantidade)
  const aumento =
    modo === 'existente' && item && custo !== null && custo > item.custo
      ? aumentoPercentual(item.custo, custo)
      : null

  // compra de R$ 0,00 não vira conta: nem pergunta
  const pedeConta = valorPago !== null && valorPago > 0
  const erros = {
    item: modo === 'existente' && !item ? 'Escolha o item que chegou.' : undefined,
    nome: modo === 'novo' && !nome.trim() ? 'Digite o nome.' : undefined,
    quantidade: quantidade === null || quantidade <= 0 ? 'Digite a quantidade.' : undefined,
    valor: valorPago === null ? 'Digite o valor pago.' : undefined,
    minimo:
      modo === 'novo' && minimo === null ? 'Digite o estoque mínimo (pode ser 0).' : undefined,
    lancar:
      pedeConta && lancar === null
        ? 'Diga se vai lançar esta compra em Contas a pagar.'
        : undefined,
    vence:
      pedeConta && lancar === 'depois' && vence === null
        ? 'Digite quando a conta vence.'
        : undefined
  }
  const temErro = Object.values(erros).some(Boolean)

  function escolherItem(id: number) {
    setItemId(id)
    const escolhido = itens.find((i) => i.id === id)
    if (escolhido && fornecedorId === null) setFornecedorId(escolhido.fornecedorId)
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (temErro || quantidade === null || valorPago === null) return
    let conta: ContaDaCompra | null = null
    if (pedeConta && lancar === 'paga') {
      const p = pagamento.validar()
      if (!p) return
      conta = { vencimento: p.pagoEm, pagamento: p }
    }
    if (pedeConta && lancar === 'depois' && vence) conta = { vencimento: vence, pagamento: null }
    const avisoConta: Aviso[] = conta
      ? [
          {
            tipo: 'ok',
            texto: conta.pagamento
              ? 'A compra também foi para Contas a pagar, já paga.'
              : `A compra também foi para Contas a pagar, para pagar até ${formatarData(conta.vencimento)}.`
          }
        ]
      : []
    setSalvando(true)
    if (modo === 'existente' && item) {
      const r = await window.api.estoque.registrarEntrada(
        { itemId: item.id, quantidade, valorPago, fornecedorId, validade },
        conta
      )
      setSalvando(false)
      if (!r.ok) return setErro(r.mensagem)
      const avisos: Aviso[] = [
        {
          tipo: 'ok',
          texto: `Entrada registrada: ${item.nome} ${formatarQuantidade(quantidade)} ${item.rotulo}.`
        }
      ]
      if (r.valor.aumento !== null) {
        avisos.push({
          tipo: 'atencao',
          texto: `O custo subiu: ${item.nome} passou de ${formatarCusto(r.valor.custoAntes)} para ${formatarCusto(r.valor.custoDepois)} o ${NOME_DA_MEDIDA[item.unidade]} (+${r.valor.aumento}%).`
        })
      }
      await aoSalvar([...avisos, ...avisoConta])
      return
    }
    const r = await window.api.estoque.cadastrar(
      {
        tipo,
        unidade,
        nomeUnidade: unidade === 'un' ? nomeUnidade.trim() || null : null,
        nome,
        quantidade,
        valorPago,
        fornecedorId,
        minimo: minimo ?? 0,
        validade
      },
      conta
    )
    setSalvando(false)
    if (!r.ok) return setErro(r.mensagem)
    await aoSalvar([{ tipo: 'ok', texto: `${nome.trim()} cadastrado no estoque.` }, ...avisoConta])
  }

  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  return (
    <Modal
      titulo="Cadastrar insumo / entrada de mercadoria"
      aoFechar={aoFechar}
      rodape={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => void salvarUmaVez()}
            disabled={salvando}
          >
            Salvar
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <div className="opcoes opcoes-2" role="radiogroup" aria-label="O que chegou?">
        <button
          type="button"
          role="radio"
          aria-checked={modo === 'existente'}
          className={modo === 'existente' ? 'opt on' : 'opt'}
          onClick={() => setModo('existente')}
          disabled={itens.length === 0}
        >
          Já está cadastrado
          <small>chegou mais de um item da lista</small>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={modo === 'novo'}
          className={modo === 'novo' ? 'opt on' : 'opt'}
          onClick={() => setModo('novo')}
        >
          Item novo
          <small>primeira vez que compra</small>
        </button>
      </div>

      {modo === 'existente' ? (
        <div className="campos linha-2">
          <ListaSuspensa<number>
            rotulo="Qual item chegou?"
            opcoes={itens.map((i) => ({ valor: i.id, rotulo: `${i.nome} · ${i.rotulo}` }))}
            valor={itemId}
            aoEscolher={escolherItem}
            textoVazio="Escolha o item…"
            erro={mostrar(erros.item)}
          />
          <ListaFornecedor valor={fornecedorId} aoEscolher={setFornecedorId} />
        </div>
      ) : (
        <>
          <EscolhaTipoEMedida
            tipo={tipo}
            unidade={unidade}
            aoMudarTipo={setTipo}
            aoMudarUnidade={setUnidade}
          />
          <div className="campos linha-2">
            <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} erro={mostrar(erros.nome)} />
            {unidade === 'un' ? (
              <CampoTexto
                rotulo="Nome da unidade (opcional)"
                valor={nomeUnidade}
                aoMudar={setNomeUnidade}
                placeholder="ex.: lata, pacote"
              />
            ) : (
              <ListaFornecedor valor={fornecedorId} aoEscolher={setFornecedorId} />
            )}
          </div>
          {unidade === 'un' && (
            <div className="campos linha-2">
              <ListaFornecedor valor={fornecedorId} aoEscolher={setFornecedorId} />
              <span />
            </div>
          )}
        </>
      )}

      <div className="campos linha-3-iguais">
        <CampoQuantidade
          rotulo={rotulo ? `Quantidade (${rotulo})` : 'Quantidade'}
          valor={quantidade}
          aoMudar={setQuantidade}
          erro={mostrar(erros.quantidade)}
        />
        <CampoDinheiro
          rotulo="Valor pago (R$)"
          valor={valorPago === null ? null : centavos(valorPago)}
          aoMudar={setValorPago}
          erro={mostrar(erros.valor)}
        />
        <CampoData
          rotulo="Validade"
          valor={validade}
          aoMudar={setValidade}
          extra={<Ajuda texto={AJUDA.alertaValidade} />}
        />
      </div>
      {modo === 'novo' && (
        <div className="campos linha-3-iguais">
          <CampoQuantidade
            rotulo={`Estoque mínimo (${rotulo})`}
            valor={minimo}
            aoMudar={setMinimo}
            erro={mostrar(erros.minimo)}
          />
        </div>
      )}

      <div className="ins linha-total">
        <span>Custo por {NOME_DA_MEDIDA[unidadeAtual]}</span>
        <strong className="num">{custo === null ? '—' : formatarCusto(custo)}</strong>
      </div>
      {aumento !== null && item && (
        <div className="faixa atencao" role="status">
          O custo subiu: era {formatarCusto(item.custo)}, agora fica {formatarCusto(custo!)} o{' '}
          {NOME_DA_MEDIDA[item.unidade]} (+{aumento}%).
        </div>
      )}
      {pedeConta && (
        <div className="escolhas-conta">
          <Escolha<Lancar>
            rotulo="Lançar esta compra em Contas a pagar?"
            ajuda={AJUDA.compraNaConta}
            opcoes={[
              ['paga', 'Sim, já paguei'],
              ['depois', 'Sim, vou pagar depois'],
              ['nao', 'Não']
            ]}
            valor={lancar}
            aoEscolher={setLancar}
            erro={mostrar(erros.lancar)}
          />
        </div>
      )}
      {pedeConta && lancar === 'paga' && <CamposPagamento f={pagamento} />}
      {pedeConta && lancar === 'depois' && (
        <div className="campo-curto">
          <CampoData
            rotulo="Vence em"
            valor={vence}
            aoMudar={setVence}
            erro={mostrar(erros.vence)}
          />
        </div>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
