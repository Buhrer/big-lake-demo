// Comprovante do pedido (docs/02 §2.2): na tela e na impressão (D-057).
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { Pedido } from '../../../compartilhado/contrato'
import type { Empresa } from '../../../dominio/sistema'
import { formatarData } from '../../../dominio/datas'
import { formatarReais } from '../../../dominio/formatar'
import { centavos } from '../../../dominio/dinheiro'
import { NOME_DA_FORMA } from '../../../dominio/vendas'

const LINHA = '--------------------------------'

export function TextoDoComprovante({
  pedido,
  empresa
}: {
  pedido: Pedido
  empresa: Empresa | null
}) {
  return (
    <div className="rc" aria-label={`Comprovante do pedido nº ${pedido.numero}`}>
      <div className="rc-centro">
        <strong>{(empresa?.nome || 'BIG LAKE SORVETERIA').toUpperCase()}</strong>
        {empresa?.endereco && <div>{empresa.endereco}</div>}
        {empresa?.telefone && <div>Tel.: {empresa.telefone}</div>}
        {empresa?.cnpj && <div>CNPJ: {empresa.cnpj}</div>}
      </div>
      <div>
        Pedido nº {pedido.numero} · {formatarData(pedido.data)}
      </div>
      <div>{LINHA}</div>
      <div>Cliente: {pedido.clienteNome}</div>
      <div>{LINHA}</div>
      {pedido.itens.map((i) => (
        <div key={i.produtoId} className="l">
          <span>
            {i.quantidade} x {i.nome}
          </span>
          <span>{formatarReais(centavos(i.quantidade * i.precoUnitario))}</span>
        </div>
      ))}
      <div>{LINHA}</div>
      <div className="l">
        <strong>TOTAL</strong>
        <strong>{formatarReais(pedido.total)}</strong>
      </div>
      <div>Pagamento: {NOME_DA_FORMA[pedido.forma]}</div>
      {pedido.cancelado && <div>*** PEDIDO CANCELADO ***</div>}
      <div className="rc-assinatura">Recebido por: ________________</div>
    </div>
  )
}

/** Página só para imprimir: #/imprimir/pedido/:id (abre numa janela escondida). */
export function ImpressaoPedido() {
  const { id } = useParams()
  const { data: pedido } = useQuery({
    queryKey: ['impressao-pedido', id],
    queryFn: () => window.api.pedidos.obter(Number(id))
  })
  const { data: empresa } = useQuery({
    queryKey: ['impressao-empresa'],
    queryFn: () => window.api.empresa.obter()
  })
  const pronta = Boolean(pedido && empresa)
  useEffect(() => {
    document.body.classList.add('pagina-impressao')
    if (pronta) document.body.dataset.pronta = '1'
  }, [pronta])
  if (!pedido || !empresa) return null
  return (
    <main className="impressao">
      <TextoDoComprovante pedido={pedido} empresa={empresa} />
    </main>
  )
}
