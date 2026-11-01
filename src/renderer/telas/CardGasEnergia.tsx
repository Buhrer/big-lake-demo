// "Gás e energia da produção" (D-041): o card de Configurações e o modal do item especial do Estoque.
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { ConfigGasEnergia } from '../../compartilhado/contrato'
import { centavos, type Centavos } from '../../dominio/dinheiro'
import type { ModoGasEnergia } from '../../dominio/receita'
import { Ajuda } from '../componentes/Ajuda'
import { CampoDinheiro } from '../componentes/Campos'
import { Modal } from '../componentes/Modal'
import { CHAVES, useGasEnergia } from '../consultas'
import { AJUDA } from '../textos/ajuda'

const MODOS: [ModoGasEnergia, string, string][] = [
  ['ingrediente', 'Item no estoque', 'entra na receita como ingrediente, por vez'],
  ['fixo', 'Valor fixo', 'o mesmo valor somado em toda receita'],
  ['por_receita', 'Em cada receita', 'cada receita tem o seu valor'],
  ['nao_usar', 'Não contar', 'fica só como conta a pagar, fora das receitas']
]

function useSalvarGas() {
  const cliente = useQueryClient()
  return async (c: ConfigGasEnergia): Promise<string | null> => {
    const r = await window.api.gasEnergia.salvar(c)
    if (!r.ok) return r.mensagem
    for (const chave of [CHAVES.gas, CHAVES.receitas, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
    return null
  }
}

export function CardGasEnergia() {
  const { data: cfg } = useGasEnergia()
  const salvar = useSalvarGas()
  const [valorFixo, setValorFixo] = useState<Centavos | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  if (!cfg) return null
  const fixoExibido = valorFixo ?? cfg.valorFixo

  async function escolher(modo: ModoGasEnergia) {
    if (!cfg) return
    const erro = await salvar({ ...cfg, modo })
    setMensagem(erro ? { tipo: 'erro', texto: erro } : null)
  }

  async function salvarFixo() {
    if (!cfg) return
    if (valorFixo === null) return setMensagem({ tipo: 'erro', texto: 'Digite o valor.' })
    const erro = await salvar({ ...cfg, valorFixo })
    setMensagem(erro ? { tipo: 'erro', texto: erro } : { tipo: 'ok', texto: 'Valor salvo.' })
  }

  return (
    <section className="card config-card" aria-labelledby="titulo-gas">
      <div className="hrow">
        <h2 id="titulo-gas">Gás e energia da produção</h2>
        <Ajuda texto={AJUDA.gasEnergia} />
      </div>
      <div className="opcoes opcoes-2" role="radiogroup" aria-labelledby="titulo-gas">
        {MODOS.map(([modo, rotulo, sub]) => (
          <button
            key={modo}
            type="button"
            role="radio"
            aria-checked={cfg.modo === modo}
            className={cfg.modo === modo ? 'opt on' : 'opt'}
            onClick={() => void escolher(modo)}
          >
            {rotulo}
            <small>{sub}</small>
          </button>
        ))}
      </div>
      {cfg.modo === 'ingrediente' && (
        <p className="muted" style={{ margin: 0 }}>
          O custo de cada vez fica em Estoque e Insumos, no item “Gás e energia da produção”.
        </p>
      )}
      {cfg.modo === 'fixo' && (
        <div className="hrow" style={{ alignItems: 'flex-end' }}>
          <CampoDinheiro
            rotulo="Valor em cada receita (R$)"
            valor={fixoExibido}
            aoMudar={(v) => {
              setValorFixo(v)
              setMensagem(null)
            }}
          />
          <button type="button" className="btn" onClick={() => void salvarFixo()}>
            Salvar valor
          </button>
        </div>
      )}
      {cfg.modo === 'nao_usar' && (
        <p className="muted" style={{ margin: 0 }}>
          As receitas não somam gás e energia. Lance as contas de gás e de luz em Contas a pagar:
          elas entram nas despesas do mês, mas não no custo de cada sabor.
        </p>
      )}
      {cfg.modo === 'por_receita' && (
        <p className="muted" style={{ margin: 0 }}>
          Cada receita tem o campo “Gás e energia desta receita”, na parte 1.
        </p>
      )}
      {mensagem && (
        <div className={`faixa ${mensagem.tipo}`} role="status">
          {mensagem.tipo === 'ok' ? '✓ ' : ''}
          {mensagem.texto}
        </div>
      )}
    </section>
  )
}

/** Editar o custo por vez do item especial do Estoque (modo A). */
export function ModalGasNoEstoque({ aoFechar }: { aoFechar(): void }) {
  const { data: cfg } = useGasEnergia()
  const salvar = useSalvarGas()
  const [valor, setValor] = useState<Centavos | null>(cfg?.precoPorVez ?? centavos(0))
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar() {
    if (!cfg) return
    if (valor === null) return setErro('Digite o custo.')
    const e = await salvar({ ...cfg, precoPorVez: valor })
    if (e) return setErro(e)
    aoFechar()
  }

  return (
    <Modal
      titulo="Gás e energia da produção"
      editando="Editando um cadastro"
      largura={640}
      ajuda={AJUDA.gasEnergia}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="btn" onClick={() => void confirmar()}>
            Salvar alterações
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        Quanto custa o gás e a energia de cada vez que uma receita é feita. Não tem estoque nem
        validade: entra na receita como ingrediente (“1 vez”).
      </p>
      <CampoDinheiro rotulo="Custo por vez (R$)" valor={valor} aoMudar={setValor} />
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
