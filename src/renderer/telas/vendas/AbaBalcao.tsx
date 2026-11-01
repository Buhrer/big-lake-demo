// Vendas do balcão (fim do dia): prototipo/telas/02-Vendas-e-Pedidos.png; D-048, D-049, D-055.
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Fechamento } from '../../../compartilhado/contrato'
import { centavos, type Centavos } from '../../../dominio/dinheiro'
import { dataPorExtenso, diaDaSemana, formatarData, type DataISO } from '../../../dominio/datas'
import { formatarPercentual, formatarReais, lerQuantidade } from '../../../dominio/formatar'
import type { Taxas as TaxasDaMaquininha } from '../../../dominio/vendas'
import { Ajuda } from '../../componentes/Ajuda'
import {
  CampoData,
  CampoDinheiro,
  EntradaNumero,
  numeroErradoNaTela
} from '../../componentes/Campos'
import {
  ErroAoCarregar,
  EscolherMesDoHistorico,
  useFiltroHistorico,
  VerMais
} from '../../componentes/Historico'
import { CHAVES, useFechamentoDoDia, useFechamentos, useTaxas } from '../../consultas'
import { usePreferencias } from '../../contexto/Preferencias'
import { AJUDA } from '../../textos/ajuda'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** "15/10 · quinta" */
export function diaCurto(data: DataISO): string {
  return `${formatarData(data).slice(0, 5)} · ${SEMANA[diaDaSemana(data)]}`
}

const diaMes = (data: DataISO) => formatarData(data).slice(0, 5)

interface Valores {
  dinheiro: Centavos | null
  pix: Centavos | null
  debito: Centavos | null
  credito: Centavos | null
}

function valoresDe(f: Fechamento | null): Valores {
  if (!f || f.lojaFechada) return { dinheiro: null, pix: null, debito: null, credito: null }
  return { dinheiro: f.dinheiro, pix: f.pix, debito: f.debito, credito: f.credito }
}

export function AbaBalcao() {
  const { ambiente } = usePreferencias()
  const { filtro, escolherMes, verMais } = useFiltroHistorico()
  const { data: pagina, isError } = useFechamentos(filtro)
  const historico = pagina?.itens ?? []
  const [data, setData] = useState<DataISO | null>(ambiente.hoje)
  const [salvo, setSalvo] = useState<Fechamento | null>(null)
  const { data: doDia, isSuccess } = useFechamentoDoDia(data)

  function abrirDia(novo: DataISO | null) {
    setData(novo)
    setSalvo(null)
  }

  return (
    <>
      <section className="card destaque-borda" aria-labelledby="titulo-balcao">
        {(isSuccess || data === null) && (
          <FormularioDoDia
            // um formulário novo para cada dia aberto (e quando o dia passa a existir)
            key={`${data}-${doDia ? 'existe' : 'novo'}`}
            data={data}
            hoje={ambiente.hoje}
            existente={doDia ?? null}
            salvo={salvo}
            aoMudarDia={abrirDia}
            aoSalvar={setSalvo}
          />
        )}
        <Taxas />
      </section>

      <section className="card" aria-labelledby="titulo-historico-balcao">
        <div className="lista-cabecalho">
          <div className="hrow">
            <h2 id="titulo-historico-balcao">Histórico do balcão</h2>
            <Ajuda texto={AJUDA.historicoBalcao} />
          </div>
          {pagina && pagina.meses.length > 0 && (
            <EscolherMesDoHistorico
              rotulo="Mês do histórico do balcão"
              meses={pagina.meses}
              anoMes={filtro.anoMes}
              aoEscolher={escolherMes}
            />
          )}
        </div>
        {isError ? (
          <ErroAoCarregar />
        ) : historico.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nenhum dia lançado ainda.
          </p>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Dia</th>
                <th className="num">Dinheiro</th>
                <th className="num">Débito</th>
                <th className="num">Crédito</th>
                <th className="num">Pix</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((f) => {
                const sem = (v: Centavos) => formatarReais(v).replace('R$ ', '')
                return (
                  <tr key={f.data} className={f.data === data ? 'linha-aberta' : undefined}>
                    <td>
                      <button
                        type="button"
                        className="link-linha"
                        aria-label={`Corrigir o dia ${formatarData(f.data)}`}
                        onClick={() => abrirDia(f.data)}
                      >
                        {diaCurto(f.data)}
                      </button>
                    </td>
                    <td className="num">{f.lojaFechada ? '—' : sem(f.dinheiro)}</td>
                    <td className="num">{f.lojaFechada ? '—' : sem(f.debito)}</td>
                    <td className="num">{f.lojaFechada ? '—' : sem(f.credito)}</td>
                    <td className="num">{f.lojaFechada ? '—' : sem(f.pix)}</td>
                    <td className="num">
                      <strong>
                        {f.lojaFechada ? 'Loja fechada' : formatarReais(f.calculado.total)}
                      </strong>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {pagina && (
          <VerMais mostrando={historico.length} total={pagina.total} aoVerMais={verMais} />
        )}
      </section>
    </>
  )
}

function FormularioDoDia({
  data,
  hoje,
  existente,
  salvo,
  aoMudarDia,
  aoSalvar
}: {
  data: DataISO | null
  hoje: DataISO
  existente: Fechamento | null
  salvo: Fechamento | null
  aoMudarDia(d: DataISO | null): void
  aoSalvar(f: Fechamento): void
}) {
  const cliente = useQueryClient()
  const [valores, setValores] = useState<Valores>(valoresDe(existente))
  const [erro, setErro] = useState<string | null>(null)
  // tudo zerado: pergunta se a loja abriu (D-095)
  const [perguntarZero, setPerguntarZero] = useState(false)
  const corrigindo = existente !== null
  const eHoje = data === hoje
  const total = centavos(
    (valores.dinheiro ?? 0) + (valores.pix ?? 0) + (valores.debito ?? 0) + (valores.credito ?? 0)
  )

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar(lojaFechada: boolean, comZero = false) {
    const errado = !lojaFechada && numeroErradoNaTela()
    if (errado) return setErro(errado)
    setErro(null)
    if (!data) return setErro('Digite o dia.')
    if (!lojaFechada && total === 0 && !comZero) return setPerguntarZero(true)
    setPerguntarZero(false)
    const r = await window.api.vendas.salvarFechamento({
      data,
      lojaFechada,
      dinheiro: valores.dinheiro ?? centavos(0),
      pix: valores.pix ?? centavos(0),
      debito: valores.debito ?? centavos(0),
      credito: valores.credito ?? centavos(0)
    })
    if (!r.ok) return setErro(r.mensagem)
    aoSalvar(r.valor)
    for (const chave of [
      CHAVES.fechamentos,
      CHAVES.fechamentoDoDia,
      CHAVES.resumoVendas,
      CHAVES.historico
    ]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  const titulo = corrigindo
    ? `Corrigir as vendas de ${data ? diaMes(data) : ''}`
    : eHoje
      ? 'Lançar as vendas de hoje'
      : 'Lançar as vendas do dia'
  const botao = corrigindo
    ? 'Salvar correção'
    : eHoje
      ? 'Salvar vendas de hoje'
      : 'Salvar vendas do dia'

  return (
    <>
      <div className="lista-cabecalho">
        <div className="hrow">
          <h2 id="titulo-balcao">{titulo}</h2>
          <Ajuda texto={AJUDA.fechamentoDoDia} />
        </div>
        <div className="dia-escolhido">
          <span className="muted">{data ? dataPorExtenso(data).split(',')[0] : ''}</span>
          <CampoData rotulo="Dia" valor={data} aoMudar={aoMudarDia} />
        </div>
      </div>
      {existente?.lojaFechada && !salvo && (
        <div className="faixa atencao" role="status">
          Este dia está marcado como loja fechada. Digite os valores para corrigir.
        </div>
      )}
      <div className="balcao-grade">
        <div className="campos linha-2">
          {(
            [
              ['dinheiro', 'Dinheiro (R$)'],
              ['pix', 'Pix (R$)'],
              ['debito', 'Cartão débito (R$)'],
              ['credito', 'Cartão crédito (R$)']
            ] as const
          ).map(([campo, rotulo]) => (
            <CampoDinheiro
              key={campo}
              rotulo={rotulo}
              valor={valores[campo]}
              aoMudar={(v) => {
                setValores((atual) => ({ ...atual, [campo]: v }))
                setPerguntarZero(false)
              }}
              grande
            />
          ))}
        </div>
        <div className="balcao-lado">
          <div className="ins total-dia">
            <span>Total do dia</span>
            <strong className="num">{formatarReais(total)}</strong>
          </div>
          <button type="button" className="btn btn-grande" onClick={() => void salvarUmaVez(false)}>
            {botao}
          </button>
          {!existente?.lojaFechada && (
            <button type="button" className="btn2" onClick={() => void salvarUmaVez(true)}>
              A loja não abriu neste dia
            </button>
          )}
        </div>
      </div>
      {perguntarZero && (
        <div className="faixa atencao" role="alert">
          <span>Está tudo zerado. A loja não abriu neste dia?</span>
          <span className="hrow">
            <button type="button" className="btn2" onClick={() => void salvarUmaVez(true)}>
              Sim, a loja não abriu
            </button>
            <button type="button" className="btn2" onClick={() => void salvarUmaVez(false, true)}>
              Não, salvar com R$ 0,00
            </button>
          </span>
        </div>
      )}
      {salvo && !perguntarZero && (
        <div className="faixa ok" role="status">
          <span>
            ✓{' '}
            {salvo.lojaFechada
              ? `Dia ${diaMes(salvo.data)} marcado como loja fechada.`
              : `Vendas de ${diaMes(salvo.data)} lançadas! Total de ${formatarReais(salvo.calculado.total)}. Já aparece no histórico abaixo e nos relatórios.`}
          </span>
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

/** "Taxas da maquininha" (área recolhível). Preenche uma vez; vale para balcão e pedidos. */
function Taxas() {
  const cliente = useQueryClient()
  const { data: taxas } = useTaxas()
  const [aberta, setAberta] = useState(false)
  const [rascunho, setRascunho] = useState<TaxasDaMaquininha | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const salvarUmaVez = useUmaVezPorVez(salvar)
  if (!taxas) return null
  const t = rascunho ?? taxas
  const semTaxas = taxas.debitoPct === 0 && taxas.creditoPct === 0

  async function salvar() {
    const r = await window.api.vendas.salvarTaxas(t)
    if (!r.ok) return setMensagem({ tipo: 'erro', texto: r.mensagem })
    setRascunho(null)
    setAberta(false)
    setMensagem({ tipo: 'ok', texto: 'Taxas salvas.' })
    for (const chave of [CHAVES.taxas, CHAVES.resumoVendas, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: chave })
    }
  }

  return (
    <div className="taxas">
      <div className="lista-cabecalho">
        <div className="hrow">
          <strong>Taxas da maquininha</strong>
          <Ajuda texto={AJUDA.taxasMaquininha} />
          <span className="muted pequeno">
            {semTaxas
              ? 'ainda não preenchidas'
              : `débito ${formatarPercentual(taxas.debitoPct)} · crédito ${formatarPercentual(taxas.creditoPct)}`}
          </span>
        </div>
        <button
          type="button"
          className="btn2"
          aria-expanded={aberta}
          onClick={() => setAberta(!aberta)}
        >
          {aberta ? 'Fechar' : 'Ver ou alterar taxas'}
        </button>
      </div>
      {aberta && (
        <div className="taxas-campos">
          {(
            [
              ['Cartão débito', 'debitoPct', 'debitoDias'],
              ['Cartão crédito', 'creditoPct', 'creditoDias']
            ] as const
          ).map(([rotulo, campoPct, campoDias]) => (
            <div key={rotulo} className="quadro-venda">
              <strong>{rotulo}</strong>
              <div className="taxas-linha">
                <div className="campo">
                  <span className="lb">Taxa (%)</span>
                  {/* % com 2 casas (1,5% = 150); a caixa lê com 3 casas (×1.000) */}
                  <EntradaNumero
                    rotuloAcessivel={`${rotulo}: taxa (%)`}
                    valor={t[campoPct] * 10}
                    aoMudar={(v) =>
                      setRascunho({ ...t, [campoPct]: v === null ? 0 : Math.round(v / 10) })
                    }
                    ler={lerQuantidade}
                    formatar={(v) => formatarPercentual(Math.round(v / 10)).replace('%', '')}
                  />
                </div>
                <div className="campo">
                  <span className="lb">Cai na conta em (dias)</span>
                  <EntradaNumero
                    rotuloAcessivel={`${rotulo}: cai na conta em (dias)`}
                    valor={t[campoDias]}
                    aoMudar={(v) => setRascunho({ ...t, [campoDias]: v ?? 0 })}
                    ler={(texto) => (/^\d{1,3}$/.test(texto.trim()) ? Number(texto.trim()) : null)}
                    formatar={String}
                  />
                </div>
              </div>
            </div>
          ))}
          <div>
            <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
              Pronto
            </button>
          </div>
        </div>
      )}
      {mensagem && (
        <div className={`faixa ${mensagem.tipo}`} role="status">
          {mensagem.tipo === 'ok' ? '✓ ' : ''}
          {mensagem.texto}
        </div>
      )}
    </div>
  )
}
