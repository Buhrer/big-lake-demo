// Início: prototipo/telas/01-Inicio.png (docs/02 §1, R13, T8; D-014, D-072).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AvisoCusto, Pedido } from '../../compartilhado/contrato'
import { deveAvisar } from '../../dominio/contas'
import { centavos } from '../../dominio/dinheiro'
import { dataPorExtenso, formatarData, nomeDoMes, partes, somarDias } from '../../dominio/datas'
import { NOME_DA_MEDIDA } from '../../dominio/estoque'
import { formatarCusto, formatarQuantidade, formatarReais } from '../../dominio/formatar'
import {
  contasDoMes,
  estoqueBaixo,
  metaDoMes,
  textoDaConta,
  textoDoVencimento,
  vencendoEmBreve
} from '../../dominio/inicio'
import { Ajuda } from '../componentes/Ajuda'
import { Icone, type NomeIcone } from '../componentes/Icones'
import {
  useContas,
  useFechamentoDoDia,
  useItensEstoque,
  useMesDosSocios,
  useGordurinha,
  usePedidos,
  useResumoVendas
} from '../consultas'
import { usePreferencias } from '../contexto/Preferencias'
import { CabecalhoTela } from '../layout/CabecalhoTela'
import { AJUDA, type TextoAjuda } from '../textos/ajuda'
import { useAvisosDeCusto } from './producao/AvisoCustoSubiu'
import { TAG_STATUS, textoPrevisao } from './relatorios/Gordurinha'
import { NOME_STATUS } from '../../dominio/gordurinha'
import type { Gordurinha } from '../../compartilhado/contrato'

const ATALHOS: { para: string; texto: string; icone: NomeIcone; cor: string }[] = [
  { para: '/vendas', texto: 'Lançar vendas do dia', icone: 'vendas', cor: 'atalho vermelho' },
  {
    para: '/vendas?aba=pedidos',
    texto: 'Novo pedido de cliente',
    icone: 'pedido',
    cor: 'atalho amarelo'
  },
  { para: '/producao', texto: 'Planejar produção', icone: 'picole', cor: 'atalho' },
  { para: '/estoque?entrada=1', texto: 'Chegou mercadoria', icone: 'estoque', cor: 'atalho' }
]

/** Quantos aparecem em cada aviso; o resto fica em "e mais N". */
const MAXIMO = 5

const itens = (n: number) => (n === 1 ? '1 item' : `${n} itens`)

export function TelaInicio() {
  const { ambiente } = usePreferencias()
  const hoje = ambiente.hoje
  const anoMes = hoje.slice(0, 7)
  const mes = nomeDoMes(partes(hoje).mes)

  return (
    <>
      {/* D-014: "Bem-vindo!" no lugar de "Bom dia, Carlos!" */}
      <CabecalhoTela subtitulo={dataPorExtenso(hoje)} titulo="Bem-vindo!" ajuda={AJUDA.inicio} />

      <section aria-labelledby="titulo-atalhos">
        <div className="hrow" style={{ marginBottom: 12 }}>
          <h2 id="titulo-atalhos" className="titulo-pequeno">
            O que você quer fazer?
          </h2>
          <Ajuda texto={AJUDA.atalhos} />
        </div>
        <div className="quadro-4">
          <div className="grade-4">
            {ATALHOS.map((a) => (
              <Link key={a.para} to={a.para} className={a.cor}>
                <Icone nome={a.icone} />
                <span>{a.texto}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CardsDoMes hoje={hoje} anoMes={anoMes} mes={mes} />
      <Meta anoMes={anoMes} mes={mes} />
      <Avisos hoje={hoje} anoMes={anoMes} mes={mes} />
    </>
  )
}

function CardsDoMes({ hoje, anoMes, mes }: { hoje: string; anoMes: string; mes: string }) {
  const ontem = somarDias(hoje, -1)
  const { data: fechamentoOntem, isSuccess: ontemPronto } = useFechamentoDoDia(ontem)
  const { data: pedidosDoMesDeOntem = [] } = usePedidos(ontem.slice(0, 7))
  const { data: resumo } = useResumoVendas()
  const { data: m } = useMesDosSocios(anoMes)

  const pedidosOntem = pedidosDoMesDeOntem.filter((p) => p.data === ontem && !p.cancelado)
  const vendasOntem = centavos(
    (fechamentoOntem?.calculado.total ?? 0) + pedidosOntem.reduce((t, p) => t + p.total, 0)
  )
  const subOntem = fechamentoOntem?.lojaFechada
    ? 'loja fechada'
    : ontemPronto && !fechamentoOntem
      ? pedidosOntem.length
        ? 'só pedidos (balcão não lançado)'
        : 'balcão não lançado'
      : 'dinheiro, cartão e Pix'

  return (
    <div className="quadro-4">
      <div className="grade-4 grade-inicio">
        <div className="card kpi-card">
          <span className="kpi-rotulo">Vendas de ontem</span>
          <strong className="kpi">{formatarReais(vendasOntem)}</strong>
          <span className="muted">{subOntem}</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Vendas de {mes}</span>
          <strong className="kpi">{formatarReais(resumo?.total ?? centavos(0))}</strong>
          <span className="muted">balcão + pedidos</span>
        </div>
        <div className="card kpi-card">
          <span className="kpi-rotulo">Despesas de {mes}</span>
          <strong className="kpi">{formatarReais(m?.resultado.despesas ?? centavos(0))}</strong>
          <span className="muted">
            {m && m.resultado.taxas > 0 ? 'contas pagas e taxas' : 'contas pagas'}
          </span>
        </div>
        <div className="card kpi-card escuro">
          <span className="kpi-rotulo hrow">
            Lucro até hoje <Ajuda texto={AJUDA.lucroAteHoje} />
          </span>
          <strong className="kpi">{formatarReais(m?.resultado.lucro ?? centavos(0))}</strong>
          <span>dividido no fim do mês</span>
        </div>
      </div>
    </div>
  )
}

function Meta({ anoMes, mes }: { anoMes: string; mes: string }) {
  const { data: resumo } = useResumoVendas()
  const { data: contas = [] } = useContas()
  if (!resumo) return null
  const meta = metaDoMes(contasDoMes(contas, anoMes), resumo.total, resumo.diasComVenda)
  const diasTexto = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

  return (
    <section className="card meta-mes" aria-labelledby="titulo-meta">
      <div className="meta-topo">
        <div className="hrow">
          <h2 id="titulo-meta">Meta para pagar as contas de {mes}</h2>
          <Ajuda texto={AJUDA.metaDoMes} />
        </div>
        {meta.meta > 0 &&
          (meta.batida ? (
            <span className="tag ok">Meta batida!</span>
          ) : (
            meta.diasFaltam !== null && (
              <span className="tag atencao">Faltam uns {diasTexto(meta.diasFaltam)} de vendas</span>
            )
          ))}
      </div>
      {meta.meta === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nenhuma conta lançada para {mes}. Lance as contas do mês em Contas a pagar para ver a
          meta.
        </p>
      ) : (
        <>
          <div className="meta-linha">
            <span>
              Já vendeu <strong>{formatarReais(meta.vendido)}</strong>
            </span>
            <span>
              Meta <strong>{formatarReais(meta.meta)}</strong>
            </span>
          </div>
          <div
            className="barra-meta"
            role="progressbar"
            aria-label="Quanto da meta já foi vendido"
            aria-valuenow={meta.percentual}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${meta.percentual}%` }}>
              <strong>{meta.percentual}%</strong>
            </span>
          </div>
          <p style={{ margin: 0 }}>
            {meta.batida ? (
              <>
                Todas as contas do mês já estão cobertas. Daqui para a frente, o que entrar é lucro.
              </>
            ) : (
              <>
                Faltam <strong>{formatarReais(meta.falta)}</strong>
                {meta.diasFaltam !== null &&
                  `, cerca de ${diasTexto(meta.diasFaltam)} de vendas no ritmo atual`}
                . Depois disso, o que entrar é lucro.
              </>
            )}
          </p>
          <span className="muted nota">
            Considera todas as contas previstas do mês, inclusive as que ainda vão vencer.
          </span>
        </>
      )}
    </section>
  )
}

function CardAviso({
  titulo,
  ajuda,
  etiqueta,
  nivel,
  destaque,
  children
}: {
  titulo: string
  ajuda?: TextoAjuda
  etiqueta: string
  nivel: 'ok' | 'erro' | 'atencao' | 'info'
  /** borda vermelha (custo subiu) ou amarela (Gordurinha) */
  destaque?: 'vermelha' | 'amarela'
  children: ReactNode
}) {
  const id = `aviso-${titulo.replace(/\W+/g, '-')}`
  return (
    <section
      className={destaque ? `card aviso-inicio borda-${destaque}` : 'card aviso-inicio'}
      aria-labelledby={id}
    >
      <div className="aviso-topo">
        <div className="hrow">
          <h3 id={id}>{titulo}</h3>
          {ajuda && <Ajuda texto={ajuda} />}
        </div>
        <span className={`tag ${nivel}`}>{etiqueta}</span>
      </div>
      {children}
    </section>
  )
}

function EMais({ n }: { n: number }) {
  return n > 0 ? <span className="muted">e mais {n === 1 ? '1 item' : `${n} itens`}</span> : null
}

function Avisos({ hoje, anoMes, mes }: { hoje: string; anoMes: string; mes: string }) {
  const { data: estoque = [], isSuccess: estoquePronto } = useItensEstoque()
  const { data: contas = [] } = useContas()
  const { data: avisosCusto = [] } = useAvisosDeCusto()
  const { data: pedidos = [] } = usePedidos(anoMes)
  const { data: gordurinha } = useGordurinha()

  const baixo = estoqueBaixo(estoque)
  const vencendo = vencendoEmBreve(estoque, hoje)
  const contasNoAviso = contas
    .filter((c) => deveAvisar({ ...c, pagoEm: c.pagamento?.pagoEm ?? null }, hoje))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const pedidosDoMes = pedidos.filter((p) => !p.cancelado)
  const nada =
    estoquePronto &&
    !gordurinha?.ligada &&
    !baixo.length &&
    !vencendo.length &&
    !contasNoAviso.length &&
    !avisosCusto.length &&
    !pedidosDoMes.length

  return (
    <section aria-labelledby="titulo-avisos">
      <div className="hrow" style={{ marginBottom: 12 }}>
        <h2 id="titulo-avisos" className="titulo-secao">
          Avisos de hoje
        </h2>
        <Ajuda texto={AJUDA.avisosDeHoje} />
      </div>
      {nada ? (
        <div className="faixa ok" role="status">
          <span>✓ Nada precisa de atenção hoje.</span>
        </div>
      ) : (
        <div className="grade-avisos">
          {gordurinha?.ligada && <CardGordurinha g={gordurinha} />}
          {baixo.length > 0 && (
            <CardAviso titulo="Estoque baixo" etiqueta={itens(baixo.length)} nivel="erro">
              <ul className="lista-aviso">
                {baixo.slice(0, MAXIMO).map((i) => (
                  <li key={i.id}>
                    <span>
                      <strong>{i.nome}</strong>
                      <span className="sub">
                        mínimo {formatarQuantidade(i.minimo)} {i.rotulo}
                      </span>
                    </span>
                    <strong className="texto-erro valor">
                      {formatarQuantidade(i.quantidade)} {i.rotulo}
                    </strong>
                  </li>
                ))}
              </ul>
              <EMais n={baixo.length - MAXIMO} />
              <div>
                <Link className="btn2" to="/estoque">
                  Ver estoque
                </Link>
              </div>
            </CardAviso>
          )}

          {vencendo.length > 0 && (
            <CardAviso
              titulo="Vencendo em breve"
              ajuda={AJUDA.vencendoEmBreve}
              etiqueta={itens(vencendo.length)}
              nivel="atencao"
            >
              <ul className="lista-aviso">
                {vencendo.slice(0, MAXIMO).map((v) => (
                  <li key={`${v.itemId}-${v.validade}`}>
                    <span>
                      <strong>
                        {v.nome} · {formatarQuantidade(v.quantidade)} {v.rotulo}
                      </strong>
                      <span className="sub">
                        {v.dias < 0 ? 'venceu' : 'vence'} {formatarData(v.validade).slice(0, 5)}
                      </span>
                    </span>
                    <span className={`tag ${v.dias <= 3 ? 'erro' : 'atencao'}`}>
                      {textoDoVencimento(v.dias)}
                    </span>
                  </li>
                ))}
              </ul>
              <EMais n={vencendo.length - MAXIMO} />
              <span className="muted">Dica: use primeiro na produção ou faça uma promoção.</span>
            </CardAviso>
          )}

          {contasNoAviso.length > 0 && (
            <CardAviso
              titulo="Contas para pagar"
              ajuda={AJUDA.contasParaPagar}
              etiqueta={
                contasNoAviso.length === 1 ? '1 vence logo' : `${contasNoAviso.length} vencem logo`
              }
              nivel="atencao"
            >
              <ul className="lista-aviso">
                {contasNoAviso.slice(0, MAXIMO).map((c) => (
                  <li key={c.id}>
                    <span>
                      <strong>{c.nome}</strong>
                      <span className={c.vencimento < hoje ? 'sub texto-erro' : 'sub'}>
                        {textoDaConta(c.vencimento, hoje)}
                      </span>
                    </span>
                    <strong className="valor">{formatarReais(c.valor)}</strong>
                  </li>
                ))}
              </ul>
              <EMais n={contasNoAviso.length - MAXIMO} />
              <div>
                <Link className="btn2" to="/contas">
                  Ver contas a pagar
                </Link>
              </div>
            </CardAviso>
          )}

          {avisosCusto.length > 0 && <CustoSubiu avisos={avisosCusto} />}

          {pedidosDoMes.length > 0 && (
            <CardAviso
              titulo="Últimos pedidos"
              etiqueta={`${pedidosDoMes.length} em ${mes}`}
              nivel="info"
            >
              <ul className="lista-aviso">
                {pedidosDoMes.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <span>
                      <strong>{p.clienteNome}</strong>
                      <span className="sub">
                        {formatarData(p.data).slice(0, 5)} · {resumoDoPedido(p)}
                      </span>
                    </span>
                    <strong className="valor">{formatarReais(p.total)}</strong>
                  </li>
                ))}
              </ul>
              <div>
                <Link className="btn2" to="/vendas?aba=pedidos">
                  Ver todos os pedidos
                </Link>
              </div>
            </CardAviso>
          )}
        </div>
      )}
    </section>
  )
}

/** "12 Pote 2 L de morango + 200 Casquinha" (até 2 itens; o resto vira "…"). */
function resumoDoPedido(p: Pedido): string {
  const partes = p.itens.slice(0, 2).map((i) => `${i.quantidade} ${i.nome}`)
  return partes.join(' + ') + (p.itens.length > 2 ? ' + …' : '')
}

function porUnidade(a: AvisoCusto): string {
  return a.unidade === 'un'
    ? `cada ${a.rotulo === 'un' ? 'unidade' : a.rotulo}`
    : `o ${NOME_DA_MEDIDA[a.unidade]}`
}

function CustoSubiu({ avisos }: { avisos: AvisoCusto[] }) {
  const receitas = avisos.flatMap((a) => a.receitas)
  const nomes = new Set(receitas.map((r) => r.id))
  return (
    <CardAviso
      titulo="O custo subiu"
      ajuda={AJUDA.custoSubiuInicio}
      etiqueta={nomes.size === 1 ? '1 produto' : `${nomes.size} produtos`}
      nivel="erro"
      destaque="vermelha"
    >
      <div className="custo-subiu-grade">
        {avisos.slice(0, 2).map((a) => (
          <div key={a.itemId} className="custo-subiu">
            <p style={{ margin: 0 }}>
              O <strong>{a.nome.toLowerCase()}</strong> passou de {formatarCusto(a.custoAntes)} para{' '}
              <strong>{formatarCusto(a.custoAgora)}</strong> {porUnidade(a)} (+{a.aumento}%).
            </p>
            <ul className="lista-aviso">
              {a.receitas.slice(0, 3).map((r) => (
                <li key={r.id} className="coluna">
                  <strong>{r.nome}</strong>
                  <span>
                    lucro de cada <strong>{formatarCusto(r.lucroAntes)}</strong> →{' '}
                    <strong className="texto-erro">{formatarCusto(r.lucroAgora)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <EMais n={avisos.length - 2} />
      <div>
        <Link className="btn" to="/producao?aba=avisos">
          Ver detalhes
        </Link>
      </div>
    </CardAviso>
  )
}

function CardGordurinha({ g }: { g: Gordurinha }) {
  const s = g.situacao
  return (
    <CardAviso
      titulo="Gordurinha"
      ajuda={AJUDA.gordurinhaInicio}
      etiqueta={NOME_STATUS[s.status]}
      nivel={TAG_STATUS[s.status]}
      destaque="amarela"
    >
      <p style={{ margin: 0 }}>
        Restam <strong>{formatarReais(s.resta)}</strong> de {formatarReais(s.total)} por mês (
        {s.percentual}%).
      </p>
      <div className={`barra-gordurinha pequena ${s.status}`} aria-hidden="true">
        <span style={{ width: `${s.percentual}%` }} />
      </div>
      {(g.maisComeram || g.previsao) && (
        <span className="muted">
          {g.maisComeram}
          {g.previsao &&
            (s.resta > 0
              ? ` No ritmo de agora, acaba por volta de ${textoPrevisao(g.previsao)}.`
              : ' Acabou: é hora de reajustar os preços.')}
        </span>
      )}
      <div>
        <Link className="btn2" to="/relatorios?r=gordurinha">
          Ver em Relatórios › Gordurinha
        </Link>
      </div>
    </CardAviso>
  )
}
