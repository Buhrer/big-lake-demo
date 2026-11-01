// Novo bem da empresa / Editar bem: prototipo/telas/12-Patrimonio__modal-bem.png (docs/02 §9.1; D-067).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Bem } from '../../../compartilhado/contrato'
import type { Centavos } from '../../../dominio/dinheiro'
import { formatarMesAno, lerMesAno } from '../../../dominio/patrimonio'
import { Ajuda } from '../../componentes/Ajuda'
import { CampoDinheiro, CampoTexto, numeroErradoNaTela } from '../../componentes/Campos'
import { ConfirmarNaLinha } from '../../componentes/Excluir'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { Modal } from '../../componentes/Modal'
import { CHAVES, useTiposBem } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

/** Coloca a barra sozinho: "032022" → "03/2022". */
function mascararMesAno(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 6)
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`
}

export function ModalBem({
  bem,
  aoFechar,
  aoSalvar,
  aoExcluir
}: {
  /** null = cadastrar */
  bem: Bem | null
  aoFechar(): void
  aoSalvar(texto: string): Promise<void>
  aoExcluir(b: Bem): Promise<void>
}) {
  const cliente = useQueryClient()
  const { data: tipos = [] } = useTiposBem()
  const [nome, setNome] = useState(bem?.nome ?? '')
  const [tipoId, setTipoId] = useState<number | null>(
    bem?.tipoId ?? tipos.find((t) => t.nome === 'Equipamento')?.id ?? null
  )
  const [dataCompra, setDataCompra] = useState(
    bem?.dataCompra ? formatarMesAno(bem.dataCompra) : ''
  )
  const [valor, setValor] = useState<Centavos | null>(bem?.valor ?? null)
  const [identificacao, setIdentificacao] = useState(bem?.identificacao ?? '')
  const [tentou, setTentou] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroTipo, setErroTipo] = useState<string | null>(null)

  const tipoEscolhido = tipoId ?? tipos.find((t) => t.nome === 'Equipamento')?.id ?? null
  const erros = {
    nome: nome.trim() ? undefined : 'Digite o que é.',
    tipo: tipoEscolhido === null ? 'Escolha o tipo.' : undefined,
    dataCompra:
      dataCompra.trim() && !lerMesAno(dataCompra) ? 'Digite mês/ano, ex.: 03/2022.' : undefined,
    valor: valor === null ? 'Digite o valor pago.' : undefined
  }
  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  async function atualizarTipos() {
    await cliente.invalidateQueries({ queryKey: CHAVES.tiposBem })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }

  async function criarTipo(n: string) {
    setErroTipo(null)
    const r = await window.api.patrimonio.criarTipo(n)
    if (!r.ok) return setErroTipo(r.mensagem)
    await atualizarTipos()
    setTipoId(r.valor.id)
  }

  async function removerTipo(id: number) {
    setErroTipo(null)
    const r = await window.api.patrimonio.removerTipo(id)
    if (!r.ok) return setErroTipo(r.mensagem)
    if (tipoId === id) setTipoId(null)
    await atualizarTipos()
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (Object.values(erros).some(Boolean) || tipoEscolhido === null || valor === null) return
    const r = await window.api.patrimonio.salvarBem(bem?.id ?? null, {
      nome: nome.trim(),
      tipoId: tipoEscolhido,
      dataCompra: dataCompra.trim() ? lerMesAno(dataCompra) : null,
      valor,
      identificacao: identificacao.trim()
    })
    if (!r.ok) return setErro(r.mensagem)
    await aoSalvar(bem ? `Alterações de “${nome.trim()}” salvas.` : 'Bem cadastrado.')
  }

  return (
    <Modal
      titulo={bem ? 'Editar bem' : 'Novo bem da empresa'}
      editando={bem ? 'Editando um bem' : undefined}
      aoFechar={aoFechar}
      rodape={
        confirmando && bem ? (
          <ConfirmarNaLinha
            pergunta="Excluir este bem?"
            aoConfirmar={() => void aoExcluir(bem)}
            aoCancelar={() => setConfirmando(false)}
          />
        ) : (
          <>
            <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
              {bem ? 'Salvar alterações' : 'Salvar bem'}
            </button>
            <button type="button" className="btn2" onClick={aoFechar}>
              Cancelar
            </button>
            {bem &&
              (bem.manutencoes > 0 ? (
                <span className="muted rodape-direita">
                  Tem {bem.manutencoes === 1 ? '1 manutenção' : `${bem.manutencoes} manutenções`}:
                  não dá para excluir
                </span>
              ) : (
                <button
                  type="button"
                  className="sm rodape-direita"
                  onClick={() => setConfirmando(true)}
                >
                  Excluir bem
                </button>
              ))}
          </>
        )
      }
    >
      <div className="campos linha-bem">
        <CampoTexto
          rotulo="O que é"
          valor={nome}
          aoMudar={setNome}
          placeholder="Ex.: Freezer horizontal"
          erro={mostrar(erros.nome)}
        />
        <ListaSuspensa<number>
          rotulo="Tipo"
          extra={<Ajuda texto={AJUDA.tipoBem} />}
          opcoes={tipos.map((t) => ({ valor: t.id, rotulo: t.nome, emUso: t.emUso }))}
          valor={tipoEscolhido}
          aoEscolher={setTipoId}
          textoVazio="Escolha…"
          aoCriar={(n) => void criarTipo(n)}
          fecharAoCriar
          aoRemover={(id) => void removerTipo(id)}
          textoEmUso={(n) => `em uso · ${n} ${n === 1 ? 'bem' : 'bens'}`}
          nota="Só dá para remover um tipo que nenhum bem usa."
          erro={mostrar(erros.tipo) ?? erroTipo ?? undefined}
        />
        <CampoTexto
          rotulo="Data da compra"
          valor={dataCompra}
          aoMudar={(t) => setDataCompra(mascararMesAno(t))}
          placeholder="mês/ano, ex.: 03/2022"
          erro={mostrar(erros.dataCompra)}
        />
        <CampoDinheiro
          rotulo="Valor pago (R$)"
          valor={valor}
          aoMudar={setValor}
          erro={mostrar(erros.valor)}
        />
      </div>
      <div className="campos linha-bem">
        <CampoTexto rotulo="Placa / nº de série" valor={identificacao} aoMudar={setIdentificacao} />
      </div>
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
