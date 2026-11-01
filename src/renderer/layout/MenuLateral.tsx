import { NavLink } from 'react-router-dom'
import { Icone, LogoBigLake, type NomeIcone } from '../componentes/Icones'

interface ItemMenu {
  rota: string
  rotulo: string
  icone: NomeIcone
}

// Ordem do protótipo (docs/02 §0).
export const ITENS_MENU: ItemMenu[] = [
  { rota: '/', rotulo: 'Início', icone: 'inicio' },
  { rota: '/vendas', rotulo: 'Vendas e Pedidos', icone: 'vendas' },
  { rota: '/cadastros', rotulo: 'Cadastros', icone: 'cadastros' },
  { rota: '/producao', rotulo: 'Produção e Receitas', icone: 'producao' },
  { rota: '/estoque', rotulo: 'Estoque e Insumos', icone: 'estoque' },
  { rota: '/perdas', rotulo: 'Perdas', icone: 'perdas' },
  { rota: '/contas', rotulo: 'Contas a pagar', icone: 'contas' },
  { rota: '/socios', rotulo: 'Sócios', icone: 'socios' },
  { rota: '/patrimonio', rotulo: 'Patrimônio', icone: 'patrimonio' },
  { rota: '/relatorios', rotulo: 'Relatórios', icone: 'relatorios' }
]

/**
 * @param contasVencendo número da bolinha vermelha em "Contas a pagar" (0 = sem bolinha).
 * @param custoSubiu avisos "O custo subiu": bolinha em "Produção e Receitas", que abre na aba Avisos (D-079).
 */
export function MenuLateral({
  contasVencendo = 0,
  custoSubiu = 0
}: {
  contasVencendo?: number
  custoSubiu?: number
}) {
  return (
    <nav className="menu" aria-label="Menu principal">
      <NavLink to="/" className="menu-logo" aria-label="BIG LAKE Sorveteria, tela inicial">
        <LogoBigLake />
        <span>
          <span className="menu-logo-nome">BIG LAKE</span>
          <span className="menu-logo-sub">Sorveteria</span>
        </span>
      </NavLink>
      {ITENS_MENU.map((item) => (
        <NavLink
          key={item.rota}
          to={item.rota === '/producao' && custoSubiu > 0 ? '/producao?aba=avisos' : item.rota}
          end={item.rota === '/'}
          className={({ isActive }) => (isActive ? 'nav on' : 'nav')}
        >
          <span className="nav-icone">
            <Icone nome={item.icone} />
            {/* no canto do ícone: ao lado do texto, "Produção e Receitas" alargaria o menu */}
            {item.rota === '/producao' && custoSubiu > 0 && (
              <span
                className="badge badge-icone"
                aria-label={custoSubiu === 1 ? '1 aviso de custo' : `${custoSubiu} avisos de custo`}
              >
                {custoSubiu}
              </span>
            )}
            {item.rota === '/contas' && contasVencendo > 0 && (
              <span className="badge badge-icone" aria-label={`${contasVencendo} vencem logo`}>
                {contasVencendo}
              </span>
            )}
          </span>
          {item.rotulo}
        </NavLink>
      ))}
    </nav>
  )
}
