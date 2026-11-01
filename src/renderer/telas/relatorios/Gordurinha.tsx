// Gordurinha (hora de reajustar?): prototipo/fonte/13-Relatorios.dc.html (R14, T9; D-071, D-074).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Gordurinha } from '../../../compartilhado/contrato'
import type { Centavos } from '../../../dominio/dinheiro'
import { formatarData, nomeDoMes, type DataISO } from '../../../dominio/datas'
import {
  formatarCusto,
  formatarPercentual,
  formatarQuantidade,
  formatarReais
} from '../../../dominio/formatar'
import { NOME_STATUS, type StatusGordurinha } from '../../../dominio/gordurinha'
import { Ajuda } from '../../componentes/Ajuda'
import {
  CampoData,
  CampoDinheiro,
  CampoNumerico,
  numeroErradoNaTela
} from '../../componentes/Campos'
import { CHAVES } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

export const TAG_STATUS: Record<StatusGordurinha, 'ok' | 'atencao' | 'erro'> = {
  tranquilo: 'ok',
  atencao: 'atencao',
  reajustar: 'erro'
}

/** "10%" ↔ 1000; aceita "10", "12,5" */
const lerPct = (t: string) => {
  const m = /^(\d{1,3})(?:,(\d{1,2}))?$/.exec(t.trim().replace('%', ''))
  if (!m) return null
  const v = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  return v >= 1 && v <= 10000 ? v : null
}
const mostrarPct = (v: number) => formatarPercentual(v).replace('%', '')

export const textoPrevisao = (p: { mes: number; ano: number }) => `${nomeDoMes(p.mes)} de ${p.ano}`

/** Mudanças: atualiza o relatório, o card do Início e o Histórico. */
function useAtualizar() {
  const cliente = useQueryClient()
  return async () => {
    for (const chave of [['relatorio'], CHAVES.gordurinha, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }
}

function Ligar({ hoje }: { hoje: DataISO }) {
  const atualizar = useAtualizar()
  const [base, setBase] = useState<Centavos | null>(null)
  const [pct, setPct] = useState<number | null>(1000)
  const [desde, setDesde] = useState<DataISO | null>(null)
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const erros = {
    base: !base ? 'Digite o lucro líquido de um mês normal.' : undefined,
    pct: !pct ? 'Digite a porcentagem (ex.: 10).' : undefined,
    desde: !desde
      ? 'Digite a data do último reajuste.'
      : desde > hoje
        ? 'Essa data ainda não chegou.'
        : undefined
  }
  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  const ligarUmaVez = useUmaVezPorVez(ligar)
  async function ligar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    setErro(null)
    if (Object.values(erros).some(Boolean) || !base || !pct || !desde) return
    const r = await window.api.gordurinha.ligar({ base, pct, desde })
    if (!r.ok) return setErro(r.mensagem)
    await atualizar()
  }

  return (
    <section className="card relatorio" aria-label="Ligar a Gordurinha">
      <div className="hrow">
        <h2>Gordurinha</h2>
        <Ajuda texto={AJUDA.gordurinha} />
      </div>
      <p style={{ margin: 0 }}>
        Para começar, diga quanto é o lucro líquido de um mês normal, o tamanho da gordurinha e
        quando foi o último reajuste dos preços. Os preços de hoje viram o ponto de partida: daqui
        para a frente, cada aumento come um pedaço da gordurinha.
      </p>
      <div className="campos linha-3-iguais">
        <CampoDinheiro
          rotulo="Lucro líquido base por mês (R$)"
          extra={<Ajuda texto={AJUDA.gordurinhaBase} />}
          valor={base}
          aoMudar={setBase}
          erro={mostrar(erros.base)}
        />
        <CampoNumerico<number>
          rotulo="Gordurinha (%)"
          valor={pct}
          aoMudar={setPct}
          ler={lerPct}
          formatar={mostrarPct}
          sufixo="%"
          erro={mostrar(erros.pct)}
        />
        <CampoData
          rotulo="Último reajuste dos preços"
          valor={desde}
          aoMudar={setDesde}
          erro={mostrar(erros.desde)}
        />
      </div>
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
      <div>
        <button type="button" className="btn" onClick={() => void ligarUmaVez()}>
          Ligar a Gordurinha
        </button>
      </div>
    </section>
  )
}

function MudarBase({ g, aoFechar }: { g: Gordurinha; aoFechar(): void }) {
  const atualizar = useAtualizar()
  const [base, setBase] = useState<Centavos | null>(g.base)
  const [pct, setPct] = useState<number | null>(g.pct)
  const [erro, setErro] = useState<string | null>(null)
  const total = base && pct ? Math.round((base * pct) / 10000) : 0

  const prontoUmaVez = useUmaVezPorVez(pronto)
  async function pronto() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setErro(null)
    if (!base) return setErro('Digite o lucro líquido base.')
    if (!pct) return setErro('Digite a porcentagem (ex.: 10).')
    const r = await window.api.gordurinha.mudar({ base, pct })
    if (!r.ok) return setErro(r.mensagem)
    await atualizar()
    aoFechar()
  }

  return (
    <div className="caixa-gordurinha">
      <div className="campos linha-mudar-base">
        <CampoDinheiro rotulo="Lucro líquido base por mês (R$)" valor={base} aoMudar={setBase} />
        <CampoNumerico<number>
          rotulo="Gordurinha (%)"
          valor={pct}
          aoMudar={setPct}
          ler={lerPct}
          formatar={mostrarPct}
          sufixo="%"
        />
      </div>
      <p style={{ margin: 0 }}>
        = gordurinha de <strong>{formatarReais(total as Centavos)}</strong> por mês
      </p>
      <p className="muted" style={{ margin: 0 }}>
        {g.baseAutomatica
          ? 'Já há 12 meses de vendas: no próximo reajuste, a base é calculada sozinha (média dos 12 meses anteriores). Você ainda pode mudar aqui se quiser.'
          : 'Quando o sistema tiver 12 meses de vendas, a base passa a ser calculada sozinha no dia de cada reajuste (média dos 12 meses anteriores). Você ainda pode mudar aqui se quiser.'}
      </p>
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
      <div className="hrow">
        <button type="button" className="btn" onClick={() => void prontoUmaVez()}>
          Pronto
        </button>
        <button type="button" className="btn2" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function JaReajustei() {
  const atualizar = useAtualizar()
  const [confirmando, setConfirmando] = useState(false)
  const [feito, setFeito] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const simUmaVez = useUmaVezPorVez(sim)
  async function sim() {
    setErro(null)
    const r = await window.api.gordurinha.reajustei()
    if (!r.ok) return setErro(r.mensagem)
    setConfirmando(false)
    setFeito(true)
    await atualizar()
  }

  return (
    <>
      {feito && (
        <div className="faixa ok" role="status">
          <span>
            ✓ Pronto! A gordurinha voltou a ficar cheia e começa a contar de novo a partir de hoje.
          </span>
        </div>
      )}
      {confirmando ? (
        <div className="hrow">
          <strong className="texto-erro">Os preços novos já estão valendo?</strong>
          <button type="button" className="btn" onClick={() => void simUmaVez()}>
            Sim, zerar a conta
          </button>
          <button type="button" className="btn2" onClick={() => setConfirmando(false)}>
            Ainda não
          </button>
        </div>
      ) : (
        <div>
          <button type="button" className="btn" onClick={() => setConfirmando(true)}>
            Já reajustei os preços
          </button>
        </div>
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </>
  )
}

function ContasFixas({ g }: { g: Gordurinha }) {
  const atualizar = useAtualizar()
  const [erro, setErro] = useState<string | null>(null)

  async function trocar(serieId: number, entra: boolean) {
    setErro(null)
    const r = await window.api.gordurinha.marcarConta(serieId, entra)
    if (!r.ok) return setErro(r.mensagem)
    await atualizar()
  }

  return (
    <section className="card relatorio" aria-label="Contas fixas que entram na conta">
      <div className="hrow">
        <h2>Contas fixas que entram na conta</h2>
        <Ajuda texto={AJUDA.gordurinhaContas} />
      </div>
      {g.contas.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nenhuma conta que repete todo mês ainda. Em Contas a pagar, marque "Repete todo mês" nas
          contas fixas (energia, gás, internet…).
        </p>
      ) : (
        g.contas.map((c) => (
          <div key={c.serieId} className="rel-linha">
            <button
              type="button"
              role="checkbox"
              aria-checked={c.entra}
              className={c.entra ? 'marcar on' : 'marcar'}
              onClick={() => void trocar(c.serieId, !c.entra)}
            >
              <span className="caixinha" aria-hidden="true">
                {c.entra ? '✓' : ''}
              </span>
              {c.nome}
            </button>
            <span className="valor">{formatarReais(c.valor)}</span>
          </div>
        ))
      )}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </section>
  )
}

export function ConteudoGordurinha({
  g,
  hoje,
  naTela
}: {
  g: Gordurinha
  hoje: DataISO
  naTela: boolean
}) {
  const [mudando, setMudando] = useState(false)
  if (!g.ligada) {
    return naTela ? (
      <Ligar hoje={hoje} />
    ) : (
      <section className="card relatorio" aria-label="Gordurinha">
        <h2>Gordurinha</h2>
        <p style={{ margin: 0 }}>A Gordurinha ainda não foi ligada.</p>
      </section>
    )
  }
  const s = g.situacao

  return (
    <>
      <section className="card relatorio gordurinha" aria-label="Gordurinha">
        <div className="aviso-topo">
          <div className="hrow">
            <h2>Gordurinha</h2>
            <Ajuda texto={AJUDA.gordurinha} />
          </div>
          <span className={`tag ${TAG_STATUS[s.status]} tag-grande`}>{NOME_STATUS[s.status]}</span>
        </div>
        <span className="muted">Desde o último reajuste, em {formatarData(g.desde!)}</span>
        <div className="resta-linha">
          <span>Ainda restam</span>
          <strong className="resta-valor">
            {formatarReais(s.resta)} <small>por mês</small>
          </strong>
        </div>
        <div
          className={`barra-gordurinha ${s.status}`}
          role="progressbar"
          aria-label="Quanto da gordurinha ainda resta"
          aria-valuenow={s.percentual}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${s.percentual}%` }} />
        </div>
        <div className="legenda-gordurinha">
          <span>R$ 0 · reajustar</span>
          <span>{s.percentual}% da gordurinha</span>
          <span>{formatarReais(s.total)} · cheia</span>
        </div>
        <div className="caixas-gordurinha">
          <div className="caixa-gordurinha">
            <span className="kpi-rotulo">Lucro líquido base · por mês</span>
            <strong>{formatarReais(g.base)}</strong>
          </div>
          <div className="caixa-gordurinha">
            <span className="kpi-rotulo">Gordurinha ({formatarPercentual(g.pct)}) · por mês</span>
            <strong>{formatarReais(s.total)}</strong>
          </div>
          <div className="caixa-gordurinha comido">
            <span className="kpi-rotulo">Já foi comido · por mês</span>
            <strong>{formatarReais(s.comido)}</strong>
          </div>
        </div>
        {naTela &&
          (mudando ? (
            <MudarBase g={g} aoFechar={() => setMudando(false)} />
          ) : (
            <div className="hrow">
              <button type="button" className="btn2" onClick={() => setMudando(true)}>
                Mudar base ou porcentagem
              </button>
              <Ajuda texto={AJUDA.gordurinhaBase} />
            </div>
          ))}
        {g.previsao && (
          <p className="rel-conclusao">
            {s.resta > 0 ? (
              <>
                No ritmo de agora, a gordurinha acaba por volta de{' '}
                <strong>{textoPrevisao(g.previsao)}</strong>.
              </>
            ) : (
              <>A gordurinha acabou: é hora de reajustar os preços.</>
            )}
          </p>
        )}
      </section>

      {g.itens.length > 0 && (
        <section className="card relatorio" aria-label="O que comeu a gordurinha">
          <div className="hrow">
            <h2>O que comeu a gordurinha</h2>
            <Ajuda texto={AJUDA.gordurinhaComeu} />
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>O que subiu</th>
                <th className="num">Antes → agora</th>
                <th className="num">A mais por mês</th>
              </tr>
            </thead>
            <tbody>
              {g.itens.map((i) => (
                <tr key={`${i.tipo}-${i.nome}`}>
                  <td>
                    <strong>{i.nome}</strong>
                    <span className="sub">
                      {i.tipo === 'conta'
                        ? 'conta do mês'
                        : i.usoPorMes > 0
                          ? `usa ~${formatarQuantidade(Math.round(i.usoPorMes / 1000) * 1000)} ${i.rotulo} por mês`
                          : 'ainda sem produção registrada'}
                    </span>
                  </td>
                  <td className="num">
                    <span className="valor">
                      {formatarCusto(i.antes)}
                      {i.tipo === 'insumo' && ` /${i.rotulo}`} →{' '}
                      <strong>
                        {formatarCusto(i.agora)}
                        {i.tipo === 'insumo' && ` /${i.rotulo}`}
                      </strong>
                    </span>
                  </td>
                  <td className="num">
                    <strong className="texto-erro valor">+ {formatarReais(i.valor)}</strong>
                    <div className="barra-comido" aria-hidden="true">
                      <span style={{ width: `${i.barra}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  <strong>Total comido</strong>
                </td>
                <td className="num">
                  <strong className="texto-erro valor total-comido">
                    {formatarReais(s.comido)}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      <section className="card relatorio" aria-label="Reajuste de preços">
        <div className="hrow">
          <h2>Reajuste de preços</h2>
          <Ajuda texto={AJUDA.gordurinhaReajuste} />
        </div>
        {g.reajuste === null ? (
          <p style={{ margin: 0 }}>
            {s.comido > 0
              ? 'Ainda não há vendas lançadas para calcular quanto subir.'
              : 'Nada subiu desde o último reajuste: os preços podem ficar como estão.'}
          </p>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              Para encher a gordurinha de novo, os preços precisam subir cerca de{' '}
              <strong>{formatarPercentual(g.reajuste * 10)}</strong>.
            </p>
            <div className="precos-reajuste">
              {g.precos.map((p) => (
                <div key={p.categoria} className="caixa-gordurinha preco-novo">
                  <strong>{p.categoria}</strong>
                  {(
                    [
                      ['Balcão', p.balcao],
                      ['Atacado', p.atacado]
                    ] as const
                  ).map(([onde, v]) => (
                    <div key={onde} className="preco-linha">
                      <span className="muted">{onde}</span>
                      <span className="valor">
                        {formatarReais(v.antes)} → <strong>{formatarReais(v.novo)}</strong>
                      </span>
                      <span className="muted">arredondando: {formatarReais(v.arredondado)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {naTela && (
              <span className="muted">
                Os preços se mudam em Produção e Receitas (o preço é o mesmo para toda a categoria).
              </span>
            )}
          </>
        )}
        {naTela && <JaReajustei />}
      </section>

      {naTela && <ContasFixas g={g} />}
    </>
  )
}
