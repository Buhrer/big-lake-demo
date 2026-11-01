// O corpo de cada relatório: prototipo/telas/13-Relatorios*.png (docs/02 §10; D-073).
// O mesmo componente aparece na tela e na página de impressão/PDF.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type {
  RelComparar,
  RelFormas,
  RelLucroProduto,
  RelMaisVendidos,
  RelPerdas,
  RelResultado,
  Relatorio
} from '../../../compartilhado/contrato'
import { centavos, type Centavos } from '../../../dominio/dinheiro'
import { nomeDoMes, type DataISO } from '../../../dominio/datas'
import { formatarCusto, formatarPercentual, formatarReais } from '../../../dominio/formatar'
import { textoDiferenca } from '../../../dominio/relatorios'
import { Ajuda } from '../../componentes/Ajuda'
import { AJUDA, type TextoAjuda } from '../../textos/ajuda'
import { ConteudoGordurinha } from './Gordurinha'

const MESES_CURTOS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
]

function partesDoMes(anoMes: string) {
  const [ano, mes] = anoMes.split('-').map(Number) as [number, number]
  return { ano, mes, nome: nomeDoMes(mes) }
}

const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** "1.234" sem casas; "−" no negativo */
const inteiro = (n: number) =>
  (n < 0 ? '−' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

function Quadro({
  titulo,
  ajuda,
  children
}: {
  titulo: string
  ajuda?: TextoAjuda
  children: ReactNode
}) {
  return (
    <section className="card relatorio" aria-label={titulo}>
      <div className="hrow">
        <h2>{titulo}</h2>
        {ajuda && <Ajuda texto={ajuda} />}
      </div>
      {children}
    </section>
  )
}

function Linha({
  rotulo,
  valor,
  classe
}: {
  rotulo: ReactNode
  valor: ReactNode
  classe?: string
}) {
  return (
    <div className={classe ? `rel-linha ${classe}` : 'rel-linha'}>
      <span>{rotulo}</span>
      <strong className="valor">{valor}</strong>
    </div>
  )
}

function Conclusao({ children }: { children: ReactNode }) {
  return <p className="rel-conclusao">{children}</p>
}

function Barra({ pct, cor = 'vermelha' }: { pct: number; cor?: 'vermelha' | 'verde' }) {
  return (
    <div className={`rel-barra ${cor}`} aria-hidden="true">
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="muted" style={{ margin: 0 }}>
      {children}
    </p>
  )
}

// ---------- 1. Resultado do mês ----------

function Resultado({ d, anoMes, naTela }: { d: RelResultado; anoMes: string; naTela: boolean }) {
  const { nome } = partesDoMes(anoMes)
  const pctLucro = d.total > 0 ? Math.round((d.lucro * 100) / d.total) : null
  return (
    <Quadro titulo={`Resultado de ${nome}`} ajuda={AJUDA.relResultado}>
      <Linha rotulo="Vendas no balcão" valor={formatarReais(d.balcao)} />
      <Linha rotulo="Pedidos de clientes" valor={formatarReais(d.pedidos)} />
      <Linha rotulo="Total que entrou" valor={formatarReais(d.total)} classe="destaque" />
      {d.despesas.map((g) => (
        <Linha key={g.tipo} rotulo={`− ${g.tipo}`} valor={formatarReais(g.valor)} />
      ))}
      {d.taxas > 0 && <Linha rotulo="− Taxas da maquininha" valor={formatarReais(d.taxas)} />}
      <Linha rotulo="Lucro líquido" valor={formatarReais(d.lucro)} classe="escuro" />
      {d.total > 0 && (
        <Conclusao>
          {d.lucro >= 0 ? (
            <>
              Sobraram <strong>{formatarReais(d.lucro)}</strong> em {nome}
              {pctLucro !== null && <>: {pctLucro}% de tudo o que entrou</>}.
            </>
          ) : (
            <>
              {maiuscula(nome)} fechou com prejuízo de{' '}
              <strong>{formatarReais(centavos(-d.lucro))}</strong>: saiu mais do que entrou.
            </>
          )}
        </Conclusao>
      )}
      {naTela && (
        <div>
          <Link className="btn2" to="/socios">
            Ver divisão entre os sócios
          </Link>
        </div>
      )}
    </Quadro>
  )
}

// ---------- 2. Mais vendidos nos pedidos ----------

function MaisVendidos({ d, anoMes }: { d: RelMaisVendidos; anoMes: string }) {
  const { nome } = partesDoMes(anoMes)
  const primeiro = d.produtos[0]
  return (
    <>
      <Quadro titulo={`Sorvetes mais vendidos nos pedidos · ${nome}`} ajuda={AJUDA.relMaisVendidos}>
        {primeiro ? (
          <>
            <Conclusao>
              <strong>{primeiro.nome}</strong> é o que mais sai nas encomendas: vale ter sempre
              pronto no freezer.
            </Conclusao>
            {d.produtos.map((p, i) => (
              <div key={p.nome} className="rel-ranking">
                <div className="rel-ranking-linha">
                  <strong>
                    {i + 1}º · {p.nome}
                  </strong>
                  <span>
                    <strong>{p.quantidade}</strong>{' '}
                    <span className="muted">· {formatarReais(p.valor)}</span>
                  </span>
                </div>
                <Barra pct={p.barra} />
              </div>
            ))}
          </>
        ) : (
          <Vazio>Nenhum pedido em {nome}.</Vazio>
        )}
      </Quadro>
      {d.clientes.length > 0 && (
        <Quadro titulo="Clientes que mais compraram">
          {d.clientes.map((c) => (
            <Linha
              key={c.nome}
              rotulo={
                <>
                  <strong>{c.nome}</strong>{' '}
                  <span className="muted">
                    · {c.pedidos === 1 ? '1 pedido' : `${c.pedidos} pedidos`}
                  </span>
                </>
              }
              valor={formatarReais(c.valor)}
            />
          ))}
          <Linha
            rotulo={`Total dos pedidos em ${nome}`}
            valor={formatarReais(d.total)}
            classe="escuro"
          />
        </Quadro>
      )}
    </>
  )
}

// ---------- 3. Dinheiro, cartão e Pix ----------

function Formas({ d, anoMes }: { d: RelFormas; anoMes: string }) {
  const { nome } = partesDoMes(anoMes)
  return (
    <Quadro titulo={`Balcão por forma de pagamento · ${nome}`} ajuda={AJUDA.relFormas}>
      {d.diasAbertos === 0 ? (
        <Vazio>Nenhum dia de balcão lançado em {nome}.</Vazio>
      ) : (
        <>
          {d.formas.map((f) => (
            <Linha key={f.nome} rotulo={f.nome} valor={`${formatarReais(f.valor)} · ${f.pct}%`} />
          ))}
          <Linha rotulo="Total do balcão" valor={formatarReais(d.total)} classe="destaque" />
          <Linha
            rotulo={`Taxas da maquininha (débito ${formatarPercentual(d.taxaDebitoPct)} · crédito ${formatarPercentual(d.taxaCreditoPct)})`}
            valor={formatarReais(d.taxas)}
          />
          <Conclusao>
            {maiuscula(nome)} teve {d.diasAbertos === 1 ? '1 dia' : `${d.diasAbertos} dias`} de loja
            aberta: média de <strong>{formatarReais(d.mediaPorDia)}</strong> por dia no balcão.
          </Conclusao>
        </>
      )}
    </Quadro>
  )
}

// ---------- 4. Comparar com o ano passado ----------

/** "Prejuízo de R$ 3.371,00" · "lucro de R$ 1.120,00" */
function lucroOuPrejuizo(valor: number, comeco: boolean): string {
  const texto = valor < 0 ? 'prejuízo' : 'lucro'
  return `${comeco ? maiuscula(texto) : texto} de ${formatarReais(centavos(Math.abs(valor)))}`
}

function Comparar({ d, anoMes }: { d: RelComparar; anoMes: string }) {
  const agora = partesDoMes(anoMes)
  const antes = partesDoMes(d.anoMesAnterior)
  const curto = (p: { mes: number; ano: number }) => `${MESES_CURTOS[p.mes - 1]}/${p.ano}`
  const lucro = d.linhas.find((l) => l.nome === 'Lucro líquido')!
  const valor = (reais: boolean, n: number) => (reais ? formatarReais(centavos(n)) : inteiro(n))
  const maior = Math.max(1, ...d.meses.flatMap((m) => [m.antes, m.agora]))
  const mil = (v: Centavos) => (v / 100_000).toFixed(1).replace('.', ',')
  const semAnoPassado = d.linhas.every((l) => l.antes === 0)

  return (
    <>
      <Quadro
        titulo={`${maiuscula(agora.nome)} de ${agora.ano} × ${antes.nome} de ${antes.ano}`}
        ajuda={AJUDA.relComparar}
      >
        <table className="tbl tabela-comparar">
          <thead>
            <tr>
              <th>
                <span className="sr-only">O que</span>
              </th>
              <th className="num">{curto(antes)}</th>
              <th className="num">{curto(agora)}</th>
              <th className="num">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {d.linhas.map((l) => {
              const bom =
                l.diferenca === null
                  ? null
                  : l.diferenca === 0
                    ? null
                    : l.diferenca > 0 === l.subirEBom
              return (
                <tr key={l.nome}>
                  <td>
                    <strong>{l.nome}</strong>
                  </td>
                  <td className="num">{valor(l.reais, l.antes)}</td>
                  <td className="num">
                    <strong>{valor(l.reais, l.agora)}</strong>
                  </td>
                  <td className="num">
                    {l.diferenca === null ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className={`tag ${bom === null ? 'info' : bom ? 'ok' : 'erro'}`}>
                        {textoDiferenca(l.diferenca)}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Conclusao>
          {semAnoPassado ? (
            <>
              Ainda não há {antes.nome} de {antes.ano} no sistema para comparar. A comparação
              aparece sozinha quando o sistema completar um ano de uso.
            </>
          ) : lucro.diferenca === null ? (
            <>
              {lucroOuPrejuizo(lucro.agora, true)} em {agora.nome} de {agora.ano}; em {antes.nome}{' '}
              de {antes.ano}, {lucroOuPrejuizo(lucro.antes, false)}.
            </>
          ) : lucro.diferenca === 0 ? (
            <>O lucro de {agora.nome} foi igual ao do ano passado.</>
          ) : (
            <>
              O lucro de {agora.nome} foi{' '}
              <strong>
                {textoDiferenca(Math.abs(lucro.diferenca)).replace('+', '')}{' '}
                {lucro.diferenca > 0 ? 'maior' : 'menor'}
              </strong>{' '}
              que no ano passado.
            </>
          )}
        </Conclusao>
      </Quadro>
      <Quadro titulo="Vendas mês a mês">
        <div className="legenda-grafico">
          <span className="legenda">
            <span className="cor antes" /> {antes.ano}
          </span>
          <span className="legenda">
            <span className="cor agora" /> {agora.ano}
          </span>
        </div>
        <div
          className="grafico-meses"
          role="img"
          aria-label={`Vendas de ${antes.ano} e ${agora.ano}, mês a mês`}
        >
          {d.meses.map((m) => (
            <div key={m.mes} className="grafico-mes">
              <div className="grafico-barras">
                <div
                  className="grafico-barra antes"
                  style={{ height: `${(m.antes * 100) / maior}%` }}
                >
                  <span>{mil(m.antes)}</span>
                </div>
                <div
                  className="grafico-barra agora"
                  style={{ height: `${(m.agora * 100) / maior}%` }}
                >
                  <span>{mil(m.agora)}</span>
                </div>
              </div>
              <strong>{MESES_CURTOS[m.mes - 1]}</strong>
            </div>
          ))}
        </div>
        <span className="muted">Valores em mil reais.</span>
      </Quadro>
    </>
  )
}

// ---------- 5. Lucro por produto ----------

function LucroProduto({ d, anoMes }: { d: RelLucroProduto; anoMes: string }) {
  const { nome } = partesDoMes(anoMes)
  const primeiro = d.produtos[0]
  return (
    <Quadro titulo={`Lucro por produto em ${nome} (estimado)`} ajuda={AJUDA.relLucroProduto}>
      <Conclusao>
        Como o balcão é lançado pelo total do dia, esta conta é uma estimativa: usa o que foi
        produzido, menos as perdas. Mesmo assim mostra bem o que rende mais
        {primeiro ? (
          <>
            : aqui, <strong>{primeiro.nome}</strong>.
          </>
        ) : (
          '.'
        )}
      </Conclusao>
      {d.produtos.length === 0 ? (
        <Vazio>Nenhuma produção nem pedido em {nome}.</Vazio>
      ) : (
        d.produtos.map((p, i) => (
          <div key={p.nome} className="rel-ranking">
            <div className="rel-ranking-linha">
              <strong>
                {i + 1}º · {p.nome}
              </strong>
              <span>
                <span className="muted">
                  {inteiro(p.sairam)} {p.sairam === 1 ? 'saiu' : 'saíram'} ×{' '}
                  {formatarCusto(p.lucroDeCada)} ={' '}
                </span>
                <strong>{formatarReais(p.lucro)}</strong>
              </span>
            </div>
            <Barra pct={p.barra} cor="verde" />
          </div>
        ))
      )}
    </Quadro>
  )
}

// ---------- 6. Perdas ----------

function Perdas({
  d,
  anoMes,
  mesAtual,
  naTela
}: {
  d: RelPerdas
  anoMes: string
  mesAtual: boolean
  naTela: boolean
}) {
  const { nome } = partesDoMes(anoMes)
  return (
    <Quadro titulo={`Perdas de ${nome}${mesAtual ? ' (até hoje)' : ''}`} ajuda={AJUDA.relPerdas}>
      <Linha
        rotulo="Produtos prontos (paletas, potes, picolés)"
        valor={formatarReais(d.produtos)}
      />
      <Linha rotulo="Matéria-prima e insumos" valor={formatarReais(d.materiaPrima)} />
      <Linha rotulo="Trocas em clientes" valor={formatarReais(d.trocas)} />
      <Linha rotulo="Total perdido" valor={formatarReais(d.total)} classe="escuro" />
      {d.total > 0 && (
        <Conclusao>
          {d.quemMaisTrocou && (
            <>
              Quem mais trocou: {d.quemMaisTrocou.nome} ({formatarReais(d.quemMaisTrocou.valor)}
              ).{' '}
            </>
          )}
          {d.maiorMotivo && <>O maior motivo foi “{d.maiorMotivo}”.</>}
        </Conclusao>
      )}
      {naTela && (
        <div>
          <Link className="btn2" to="/perdas">
            Ver detalhes em Perdas
          </Link>
        </div>
      )}
    </Quadro>
  )
}

export function ConteudoRelatorio({
  relatorio,
  hoje,
  naTela
}: {
  relatorio: Relatorio
  hoje: DataISO
  /** botões que levam a outras telas só aparecem na tela, não no papel */
  naTela: boolean
}) {
  const { anoMes } = relatorio
  const mesAtual = anoMes === hoje.slice(0, 7)
  switch (relatorio.id) {
    case 'gordurinha':
      return <ConteudoGordurinha g={relatorio.dados} hoje={hoje} naTela={naTela} />
    case 'resultado':
      return <Resultado d={relatorio.dados} anoMes={anoMes} naTela={naTela} />
    case 'mais_vendidos':
      return <MaisVendidos d={relatorio.dados} anoMes={anoMes} />
    case 'formas':
      return <Formas d={relatorio.dados} anoMes={anoMes} />
    case 'comparar':
      return <Comparar d={relatorio.dados} anoMes={anoMes} />
    case 'lucro_produto':
      return <LucroProduto d={relatorio.dados} anoMes={anoMes} />
    case 'perdas':
      return <Perdas d={relatorio.dados} anoMes={anoMes} mesAtual={mesAtual} naTela={naTela} />
  }
}
