// Aviso "O custo do morango subiu" (prototipo/telas/06-Producao-Planejar.png; D-046).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AvisoCusto } from '../../../compartilhado/contrato'
import { custoParaCentavos } from '../../../dominio/dinheiro'
import { formatarData } from '../../../dominio/datas'
import { NOME_DA_MEDIDA } from '../../../dominio/estoque'
import { formatarCusto, formatarReais } from '../../../dominio/formatar'
import { Ajuda } from '../../componentes/Ajuda'
import { Icone } from '../../componentes/Icones'
import { CHAVES } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'

export function useAvisosDeCusto() {
  return useQuery({ queryKey: CHAVES.avisosCusto, queryFn: () => window.api.avisosCusto.listar() })
}

function CardAviso({ aviso, aoVerReceita }: { aviso: AvisoCusto; aoVerReceita(id: number): void }) {
  const cliente = useQueryClient()
  async function entendi() {
    await window.api.avisosCusto.entendi(aviso.itemId)
    await cliente.invalidateQueries({ queryKey: CHAVES.avisosCusto })
  }
  return (
    <section className="card aviso-custo" aria-labelledby={`aviso-${aviso.itemId}`}>
      <div className="hrow">
        <Icone nome="alerta" />
        <h2 id={`aviso-${aviso.itemId}`}>O custo subiu: {aviso.nome}</h2>
        <Ajuda texto={AJUDA.custoSubiu} />
      </div>
      <p style={{ margin: 0 }}>
        Em {formatarData(aviso.quando).slice(0, 5)}, {aviso.nome} passou de{' '}
        <strong>{formatarCusto(aviso.custoAntes)}</strong> para{' '}
        <strong>{formatarCusto(aviso.custoAgora)}</strong> por{' '}
        {aviso.unidade === 'un' ? aviso.rotulo : NOME_DA_MEDIDA[aviso.unidade]} (+{aviso.aumento}%).
        {aviso.receitas.length > 0
          ? ' Estas receitas ficaram mais caras:'
          : ' Nenhuma receita usa este item.'}
      </p>
      {aviso.receitas.map((r) => (
        <div key={r.id} className="aviso-linha">
          <div>
            <strong>{r.nome}</strong>
            <span className="sub">
              Preço no balcão: {formatarReais(custoParaCentavos(r.custoAgora + r.lucroAgora))}
            </span>
          </div>
          <div>
            <span className="sub">Custo de cada</span>
            <span className="valor">
              {formatarCusto(r.custoAntes)} → <strong>{formatarCusto(r.custoAgora)}</strong>
            </span>
          </div>
          <div>
            <span className="sub">Lucro de cada</span>
            <span className="valor">
              <strong>{formatarCusto(r.lucroAntes)}</strong> →{' '}
              <strong className="texto-erro">{formatarCusto(r.lucroAgora)}</strong>
            </span>
          </div>
          <button type="button" className="btn2" onClick={() => aoVerReceita(r.id)}>
            Ver receita
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="btn2" onClick={() => void entendi()}>
          Entendi
        </button>
      </div>
    </section>
  )
}

export function AvisosDeCusto({ aoVerReceita }: { aoVerReceita(id: number): void }) {
  const { data: avisos = [] } = useAvisosDeCusto()
  return (
    <>
      {avisos.map((a) => (
        <CardAviso key={a.itemId} aviso={a} aoVerReceita={aoVerReceita} />
      ))}
    </>
  )
}
