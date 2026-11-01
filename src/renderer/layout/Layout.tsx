import { Outlet } from 'react-router-dom'
import { useAvisosContas, useEstadoBackup } from '../consultas'
import { useAvisosDeCusto } from '../telas/producao/AvisoCustoSubiu'
import { BarraTopo } from './BarraTopo'
import { MenuLateral } from './MenuLateral'

export function Layout() {
  const { data: contasVencendo = 0 } = useAvisosContas()
  const { data: avisosCusto = [] } = useAvisosDeCusto()
  const { data: backup } = useEstadoBackup()
  return (
    <div className="app">
      <MenuLateral contasVencendo={contasVencendo} custoSubiu={avisosCusto.length} />
      <main className="principal">
        <div className="conteudo">
          <BarraTopo />
          {/* relógio do computador atrasado (D-093) */}
          {backup?.avisoData && (
            <div className="faixa erro" role="alert">
              {backup.avisoData}
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  )
}
