import { useSearchParams } from 'react-router-dom'
import { CabecalhoTela } from '../../layout/CabecalhoTela'
import { AJUDA } from '../../textos/ajuda'
import { AbaBalcao } from './AbaBalcao'
import { AbaPedidos } from './AbaPedidos'
import { AbaResumo } from './AbaResumo'

type Aba = 'balcao' | 'pedidos' | 'resumo'

const ABAS: [Aba, string][] = [
  ['balcao', 'Vendas do balcão (fim do dia)'],
  ['pedidos', 'Pedidos de clientes'],
  ['resumo', 'Resumo das vendas']
]

/** #/vendas?aba=pedidos&cliente=3 abre o pedido já com o cliente (botão "Novo pedido" em Cadastros). */
export function TelaVendas() {
  const [parametros, setParametros] = useSearchParams()
  const aba = (parametros.get('aba') as Aba | null) ?? 'balcao'
  const cliente = parametros.get('cliente')

  return (
    <>
      <CabecalhoTela
        subtitulo="Todo o dinheiro que entra: balcão e encomendas"
        titulo="Vendas e Pedidos"
        ajuda={AJUDA.vendas}
      />
      <div className="seg" role="tablist" aria-label="Vendas e Pedidos">
        {ABAS.map(([a, rotulo]) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            className={aba === a ? 'sg on' : 'sg'}
            onClick={() => setParametros({ aba: a }, { replace: true })}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {aba === 'balcao' && <AbaBalcao />}
      {aba === 'pedidos' && <AbaPedidos clienteInicial={cliente ? Number(cliente) : null} />}
      {aba === 'resumo' && <AbaResumo />}
    </>
  )
}
