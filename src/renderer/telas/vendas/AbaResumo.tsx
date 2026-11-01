// Resumo das vendas (só consulta): prototipo/telas/02-Vendas-e-Pedidos__3-resumo.png.
import { centavos } from '../../../dominio/dinheiro'
import { diaDaSemana, formatarData, nomeDoMes, partes } from '../../../dominio/datas'
import { formatarPercentual, formatarReais } from '../../../dominio/formatar'
import { Ajuda } from '../../componentes/Ajuda'
import {
  ErroAoCarregar,
  EscolherMesDoHistorico,
  useFiltroHistorico,
  VerMais
} from '../../componentes/Historico'
import { useResumoVendas, useVendasPorDia } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { AJUDA } from '../../textos/ajuda'
import { diaCurto } from './AbaBalcao'

const SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function AbaResumo() {
  const { ambiente } = usePreferencias()
  const { data: r } = useResumoVendas()
  if (!r) return null
  const mes = nomeDoMes(partes(ambiente.hoje).mes)
  const balcaoHoje = r.hoje.balcao
  const [pctBalcao, pctPedidos] = r.percentuais
  const sub = (data: string) =>
    `${SEMANA_LONGA[diaDaSemana(data)]}, ${formatarData(data).slice(0, 5)}`

  return (
    <>
      <div className="hrow">
        <h2 className="titulo-secao">Resumo das vendas · dia</h2>
        <Ajuda texto={AJUDA.resumoDia} />
      </div>
      <div className="grade">
        <div className="card kpi-card destaque-borda">
          <span className="kpi-rotulo">Vendas de hoje</span>
          <strong className="kpi">{formatarReais(r.hoje.vendas)}</strong>
          <span className="muted">
            {balcaoHoje
              ? balcaoHoje.lojaFechada
                ? 'loja fechada hoje'
                : `balcão + ${r.hoje.qtdPedidos} ${r.hoje.qtdPedidos === 1 ? 'pedido' : 'pedidos'}`
              : r.hoje.qtdPedidos
                ? 'só pedidos · balcão ainda não lançado'
                : 'balcão ainda não lançado'}
          </span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Média por dia</span>
          <strong className="kpi">{formatarReais(r.mediaPorDia)}</strong>
          <span className="muted">balcão + pedidos</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Melhor dia do mês</span>
          <strong className="kpi">{r.melhorDia ? formatarReais(r.melhorDia.total) : '—'}</strong>
          <span className="muted">{r.melhorDia ? sub(r.melhorDia.data) : 'ainda sem vendas'}</span>
        </div>
        <div className="card kpi-card">
          <span className="hrow kpi-rotulo">
            Dias lançados <Ajuda texto={AJUDA.diasLancados} />
          </span>
          <strong className="kpi">
            {r.diasLancados} de {r.diasDoMes}
          </strong>
          <span className={r.diasSemLancamento.length ? 'texto-erro' : 'muted'}>
            {r.diasSemLancamento.length === 0
              ? 'todos os dias lançados'
              : r.diasSemLancamento.length === 1 && r.diasSemLancamento[0] === ambiente.hoje
                ? 'falta lançar hoje'
                : `falta: ${r.diasSemLancamento.map((d) => formatarData(d).slice(0, 5)).join(', ')}`}
          </span>
        </div>
      </div>

      <section className="card" aria-labelledby="titulo-taxas-hoje">
        <div className="lista-cabecalho">
          <div className="hrow">
            <h2 id="titulo-taxas-hoje">Taxas da maquininha · hoje</h2>
            <Ajuda texto={AJUDA.taxasHoje} />
          </div>
          {!balcaoHoje && <span className="muted">o balcão de hoje ainda não foi lançado</span>}
        </div>
        <div className="kl">
          <span>
            Balcão · débito (
            {formatarPercentual(balcaoHoje?.taxas.debitoPct ?? r.taxasAtuais.debitoPct)} sobre{' '}
            <strong>{formatarReais(balcaoHoje?.debito ?? centavos(0))}</strong>)
          </span>
          <span className="num">
            − {formatarReais(balcaoHoje?.calculado.taxaDebito ?? centavos(0))}
          </span>
        </div>
        <div className="kl">
          <span>
            Balcão · crédito (
            {formatarPercentual(balcaoHoje?.taxas.creditoPct ?? r.taxasAtuais.creditoPct)} sobre{' '}
            <strong>{formatarReais(balcaoHoje?.credito ?? centavos(0))}</strong>)
          </span>
          <span className="num">
            − {formatarReais(balcaoHoje?.calculado.taxaCredito ?? centavos(0))}
          </span>
        </div>
        <div className="kl">
          <span>Pedidos pagos no cartão</span>
          <span className="num">− {formatarReais(r.hoje.taxaPedidos)}</span>
        </div>
        <div className="kl">
          <strong>Total de taxas hoje</strong>
          <strong className="num texto-erro">− {formatarReais(r.hoje.taxas)}</strong>
        </div>
        <div className="faixa ok" style={{ marginTop: 12 }}>
          <span>
            Fica para a sorveteria hoje:{' '}
            <strong>{formatarReais(r.hoje.ficaParaASorveteria)}</strong>
          </span>
          {balcaoHoje && balcaoHoje.credito > 0 && (
            <span>
              O crédito cai na conta em{' '}
              <strong>{formatarData(balcaoHoje.calculado.creditoCaiEm).slice(0, 5)}</strong>
            </span>
          )}
        </div>
      </section>

      <div className="hrow">
        <h2 className="titulo-secao">Resumo das vendas · mês ({mes})</h2>
        <Ajuda texto={AJUDA.resumoMes} />
      </div>
      <div className="grade">
        <div className="card kpi-card escuro">
          <span className="kpi-rotulo">Total vendido</span>
          <strong className="kpi">{formatarReais(r.total)}</strong>
          <span>balcão + pedidos</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Balcão</span>
          <strong className="kpi">{formatarReais(r.balcao)}</strong>
          <span className="muted">{pctBalcao}% do total</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Pedidos de clientes</span>
          <strong className="kpi">{formatarReais(r.pedidos)}</strong>
          <span className="muted">
            {pctPedidos}% do total · {r.qtdPedidos} {r.qtdPedidos === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Dias com venda</span>
          <strong className="kpi">
            {r.diasComVenda} {r.diasComVenda === 1 ? 'dia' : 'dias'}
          </strong>
          <span className="muted">
            de 1 a {partes(ambiente.hoje).dia} de {mes}
          </span>
        </div>
      </div>

      <section className="card" aria-label="Balcão e pedidos no mês">
        <div className="lista-cabecalho">
          <span className="legenda">
            <span className="cor balcao" /> Balcão {pctBalcao}%
          </span>
          <span className="legenda">
            <span className="cor pedidos" /> Pedidos {pctPedidos}%
          </span>
        </div>
        <div
          className="barra-dupla"
          role="img"
          aria-label={`Balcão ${pctBalcao}%, pedidos ${pctPedidos}%`}
        >
          <span className="balcao" style={{ width: `${pctBalcao}%` }} />
          <span className="pedidos" style={{ width: `${pctPedidos}%` }} />
        </div>
      </section>

      <VendasPorDia />
    </>
  )
}

/** Um dia por linha, com "Mês: Últimos ▼" e "Ver mais" (D-086). */
function VendasPorDia() {
  const { filtro, escolherMes, verMais } = useFiltroHistorico()
  const { data: pagina, isError } = useVendasPorDia(filtro)
  const dias = pagina?.itens ?? []
  return (
    <section className="card" aria-labelledby="titulo-vendas-por-dia">
      <div className="lista-cabecalho">
        <h2 id="titulo-vendas-por-dia">Vendas por dia</h2>
        {pagina && pagina.meses.length > 0 && (
          <EscolherMesDoHistorico
            rotulo="Mês das vendas por dia"
            meses={pagina.meses}
            anoMes={filtro.anoMes}
            aoEscolher={escolherMes}
          />
        )}
      </div>
      {isError ? (
        <ErroAoCarregar />
      ) : dias.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          {filtro.anoMes ? 'Nenhuma venda neste mês.' : 'Nenhuma venda ainda.'}
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Dia</th>
              <th className="num">Balcão</th>
              <th className="num">Pedidos</th>
              <th className="num">Total do dia</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((d) => (
              <tr key={d.data}>
                <td>
                  <strong>{diaCurto(d.data)}</strong>
                </td>
                <td className="num">
                  {d.balcao === null ? (
                    <span className="texto-erro">falta lançar</span>
                  ) : d.fechada ? (
                    <span className="muted">loja fechada</span>
                  ) : (
                    formatarReais(d.balcao)
                  )}
                </td>
                <td className="num">{d.pedidos ? formatarReais(d.pedidos) : '—'}</td>
                <td className="num">
                  <strong>{formatarReais(d.total)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pagina && <VerMais mostrando={dias.length} total={pagina.total} aoVerMais={verMais} />}
    </section>
  )
}
