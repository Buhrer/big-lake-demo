import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Ambiente } from '../compartilhado/contrato'
import type { Preferencias } from '../dominio/sistema'
import { ProvedorPreferencias } from './contexto/Preferencias'
import { Layout } from './layout/Layout'
import { TelaInicio } from './telas/Inicio'
import { TelaPerdas } from './telas/perdas/TelaPerdas'
import { TelaPatrimonio } from './telas/patrimonio/TelaPatrimonio'
import { ImpressaoRelatorio, TelaRelatorios } from './telas/relatorios/TelaRelatorios'
import { TelaContas } from './telas/contas/TelaContas'
import { TelaSocios } from './telas/socios/TelaSocios'
import { TelaCadastros } from './telas/cadastros/TelaCadastros'
import { TelaConfiguracoes } from './telas/Configuracoes'
import { TelaEstoque } from './telas/estoque/TelaEstoque'
import { TelaProducao } from './telas/producao/TelaProducao'
import { ImpressaoPedido } from './telas/vendas/Comprovante'
import { TelaVendas } from './telas/vendas/TelaVendas'
import { TelaVitrine } from './telas/Vitrine'

const consultas = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } }
})

export function App({
  ambiente,
  preferencias
}: {
  ambiente: Ambiente
  preferencias: Preferencias
}) {
  return (
    <QueryClientProvider client={consultas}>
      <ProvedorPreferencias ambiente={ambiente} preferenciasIniciais={preferencias}>
        <HashRouter>
          <Routes>
            <Route path="imprimir/pedido/:id" element={<ImpressaoPedido />} />
            <Route path="imprimir/relatorio/:id/:anoMes" element={<ImpressaoRelatorio />} />
            <Route element={<Layout />}>
              <Route index element={<TelaInicio />} />
              <Route path="vendas" element={<TelaVendas />} />
              <Route path="cadastros" element={<TelaCadastros />} />
              <Route path="producao" element={<TelaProducao />} />
              <Route path="estoque" element={<TelaEstoque />} />
              <Route path="perdas" element={<TelaPerdas />} />
              <Route path="contas" element={<TelaContas />} />
              <Route path="socios" element={<TelaSocios />} />
              <Route path="patrimonio" element={<TelaPatrimonio />} />
              <Route path="relatorios" element={<TelaRelatorios />} />
              <Route path="configuracoes" element={<TelaConfiguracoes />} />
              {ambiente.mostrarVitrine && <Route path="vitrine" element={<TelaVitrine />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </ProvedorPreferencias>
    </QueryClientProvider>
  )
}
