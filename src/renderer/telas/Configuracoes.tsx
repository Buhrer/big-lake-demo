import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { CopiaParaRestaurar, ResultadoCopia } from '../../compartilhado/contrato'
import { TAMANHOS_LETRA, type Empresa, type TamanhoLetra } from '../../dominio/sistema'
import { Ajuda } from '../componentes/Ajuda'
import { CampoTexto } from '../componentes/Campos'
import { ConfirmarNaLinha } from '../componentes/Excluir'
import { Modal } from '../componentes/Modal'
import {
  ErroAoCarregar,
  EscolherMesDoHistorico,
  useFiltroHistorico,
  VerMais
} from '../componentes/Historico'
import { CHAVES, useCopias, useEmpresa, useEstadoBackup, useHistorico } from '../consultas'
import { usePreferencias } from '../contexto/Preferencias'
import { CabecalhoTela } from '../layout/CabecalhoTela'
import { AJUDA } from '../textos/ajuda'
import { CardGasEnergia } from './CardGasEnergia'
import { CardRegrasLucro } from './CardRegrasLucro'

type Mensagem = { tipo: 'ok' | 'erro'; texto: string } | null

function Faixa({ mensagem }: { mensagem: Mensagem }) {
  if (!mensagem) return null
  return (
    <div className={`faixa ${mensagem.tipo}`} role="status">
      <span>
        {mensagem.tipo === 'ok' ? '✓ ' : ''}
        {mensagem.texto}
      </span>
    </div>
  )
}

function textoDoResultado(r: ResultadoCopia): Mensagem {
  if (r.pasta === 'erro') {
    return {
      tipo: 'erro',
      texto: 'Não foi possível fazer a cópia na pasta do computador. Chame o Lucas.'
    }
  }
  switch (r.penDrive) {
    case 'ok':
      return { tipo: 'ok', texto: 'Cópia feita na pasta do computador e no pen drive.' }
    case 'sem_pen_drive':
      return {
        tipo: 'erro',
        texto: 'Cópia feita na pasta do computador. O pen drive não está conectado.'
      }
    default:
      return {
        tipo: 'erro',
        texto: 'Cópia feita na pasta do computador, mas não deu para copiar no pen drive.'
      }
  }
}

function CardCopia() {
  const { preferencias, salvarPreferencias } = usePreferencias()
  const { data: estado } = useEstadoBackup()
  const cliente = useQueryClient()
  const [copiando, setCopiando] = useState(false)
  const [mensagem, setMensagem] = useState<Mensagem>(null)
  const [restaurando, setRestaurando] = useState(false)

  async function fazerCopia() {
    setCopiando(true)
    setMensagem(null)
    try {
      setMensagem(textoDoResultado(await window.api.backup.fazerAgora()))
      await cliente.invalidateQueries({ queryKey: CHAVES.backup })
    } finally {
      setCopiando(false)
    }
  }

  async function alternarAoFechar() {
    const erro = await salvarPreferencias({
      ...preferencias,
      backupAoFechar: !preferencias.backupAoFechar
    })
    if (erro) setMensagem({ tipo: 'erro', texto: erro })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }

  const ligado = preferencias.backupAoFechar
  return (
    <section className="card config-card" aria-labelledby="titulo-copia">
      <div className="hrow">
        <h2 id="titulo-copia">Cópia de segurança</h2>
        <Ajuda texto={AJUDA.copiaAutomatica} />
      </div>
      <div className="linha-config">
        <strong id="rotulo-ao-fechar">Copiar sozinho ao fechar o sistema</strong>
        <button
          type="button"
          className={ligado ? 'sw' : 'sw off'}
          role="switch"
          aria-checked={ligado}
          aria-labelledby="rotulo-ao-fechar"
          onClick={() => void alternarAoFechar()}
        >
          {ligado ? 'Ligado' : 'Desligado'}
        </button>
      </div>
      <div className="linha-config">
        <span>{estado?.penDrive ? `Pen drive (${estado.penDrive})` : 'Pen drive'}</span>
        {estado &&
          (estado.penDrive ? (
            <span className="tag ok">Conectado</span>
          ) : (
            <span className="tag erro">Não conectado</span>
          ))}
      </div>
      <div className="linha-config">
        <span>Pasta Documentos\BigLake</span>
        {estado &&
          (estado.pastaOk ? (
            <span className="tag ok">OK</span>
          ) : (
            <span className="tag erro">Com problema</span>
          ))}
      </div>
      <strong className="subtitulo-config">Últimas cópias</strong>
      {estado && estado.ultimas.length === 0 && (
        <p className="muted" style={{ margin: 0 }}>
          Nenhuma cópia ainda.
        </p>
      )}
      {estado?.ultimas.map((u, i) => (
        <div className="linha-config" key={i}>
          <span>
            {u.quando}
            <span className="muted"> · {u.destino === 'pen_drive' ? 'pen drive' : 'pasta'}</span>
          </span>
          <span className="tag ok">Completa</span>
        </div>
      ))}
      <Faixa mensagem={mensagem} />
      <div className="hrow">
        <button type="button" className="btn" onClick={() => void fazerCopia()} disabled={copiando}>
          {copiando ? 'Copiando…' : 'Fazer cópia agora'}
        </button>
        <button type="button" className="btn2" onClick={() => setRestaurando(true)}>
          Restaurar uma cópia
        </button>
      </div>
      {restaurando && <ModalRestaurar aoFechar={() => setRestaurando(false)} />}
    </section>
  )
}

function ModalRestaurar({ aoFechar }: { aoFechar(): void }) {
  const { data: copias, isLoading } = useCopias(true)
  const [escolhida, setEscolhida] = useState<CopiaParaRestaurar | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [trabalhando, setTrabalhando] = useState(false)

  async function restaurar(c: CopiaParaRestaurar) {
    setTrabalhando(true)
    setErro(null)
    const r = await window.api.backup.restaurar(c.caminho)
    // Se deu certo, o programa recarrega a tela sozinho com os dados da cópia.
    if (!r.ok) {
      setErro(r.mensagem)
      setTrabalhando(false)
      setEscolhida(null)
    }
  }

  return (
    <Modal
      titulo="Restaurar uma cópia"
      largura={760}
      aoFechar={aoFechar}
      rodape={
        <button type="button" className="btn2" onClick={aoFechar} disabled={trabalhando}>
          Cancelar
        </button>
      }
    >
      <p style={{ margin: 0 }}>
        Escolha a cópia. Tudo volta a ficar como estava naquela hora. Antes, o sistema guarda uma
        cópia de agora, por segurança.
      </p>
      {erro && <Faixa mensagem={{ tipo: 'erro', texto: erro }} />}
      {isLoading && <p className="muted">Procurando as cópias…</p>}
      {copias && copias.length === 0 && <p className="muted">Nenhuma cópia encontrada.</p>}
      {copias && copias.length > 0 && (
        <table className="tbl">
          <thead>
            <tr>
              <th>Cópia</th>
              <th>Onde está</th>
              <th className="num">
                <span className="sr-only">Ação</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {copias.map((c) => (
              <tr key={c.caminho} className={escolhida === c ? 'confirmando' : undefined}>
                <td>{c.quando}</td>
                <td>{c.destino === 'pen_drive' ? 'Pen drive' : 'Pasta do computador'}</td>
                <td className="acoes">
                  {escolhida === c ? (
                    <ConfirmarNaLinha
                      pergunta={`Voltar tudo para ${c.quando.toLowerCase()}? O que foi feito depois será desfeito.`}
                      aoConfirmar={() => void restaurar(c)}
                      aoCancelar={() => setEscolhida(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="sm"
                      onClick={() => setEscolhida(c)}
                      disabled={trabalhando}
                    >
                      Restaurar esta
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {trabalhando && <p className="muted">Restaurando… não desligue o computador.</p>}
    </Modal>
  )
}

function CardLetra() {
  const { preferencias, salvarPreferencias } = usePreferencias()
  const cliente = useQueryClient()
  async function escolher(t: TamanhoLetra) {
    await salvarPreferencias({ ...preferencias, tamanhoPadrao: t })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }
  return (
    <section className="card config-card" aria-labelledby="titulo-letra">
      <div className="hrow">
        <h2 id="titulo-letra">Tamanho da letra</h2>
        <Ajuda texto={AJUDA.tamanhoPadrao} />
      </div>
      <div className="opcoes opcoes-2" role="radiogroup" aria-labelledby="titulo-letra">
        {(Object.keys(TAMANHOS_LETRA) as TamanhoLetra[]).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={preferencias.tamanhoPadrao === t}
            className={preferencias.tamanhoPadrao === t ? 'opt on' : 'opt'}
            onClick={() => void escolher(t)}
          >
            {TAMANHOS_LETRA[t].rotulo}
          </button>
        ))}
      </div>
      <div className="ins">Exemplo: Paleta de Morango recheada · R$ 10,00</div>
    </section>
  )
}

function CardHistorico() {
  const { filtro, escolherMes, verMais } = useFiltroHistorico()
  const { data: pagina, isError } = useHistorico(filtro)
  const data = pagina?.itens
  return (
    <section className="card" aria-labelledby="titulo-historico">
      <div className="lista-cabecalho" style={{ marginBottom: 0 }}>
        <div className="hrow">
          <h2 id="titulo-historico">Histórico do que foi feito</h2>
          <Ajuda texto={AJUDA.historico} />
        </div>
        {pagina && pagina.meses.length > 0 && (
          <EscolherMesDoHistorico
            rotulo="Mês do histórico"
            meses={pagina.meses}
            anoMes={filtro.anoMes}
            aoEscolher={escolherMes}
          />
        )}
      </div>
      {isError && <ErroAoCarregar />}
      {data && data.length === 0 && (
        <p className="muted" style={{ marginBottom: 0 }}>
          Nada foi alterado ainda.
        </p>
      )}
      {data && data.length > 0 && (
        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Quando</th>
              <th>O que foi feito</th>
            </tr>
          </thead>
          <tbody>
            {data.map((h) => (
              <tr key={h.id}>
                <td>
                  <strong>{h.quando}</strong>
                </td>
                <td>{h.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pagina && (
        <VerMais mostrando={pagina.itens.length} total={pagina.total} aoVerMais={verMais} />
      )}
    </section>
  )
}

function FormularioEmpresa({ inicial }: { inicial: Empresa }) {
  const cliente = useQueryClient()
  const [dados, setDados] = useState(inicial)
  const [mensagem, setMensagem] = useState<Mensagem>(null)
  const [tentou, setTentou] = useState(false)
  const mudar = (campo: keyof Empresa) => (v: string) => {
    setDados({ ...dados, [campo]: v })
    setMensagem(null)
  }

  async function salvar() {
    setTentou(true)
    if (!dados.nome.trim()) return
    const r = await window.api.empresa.salvar(dados)
    if (!r.ok) {
      setMensagem({ tipo: 'erro', texto: r.mensagem })
      return
    }
    setMensagem({ tipo: 'ok', texto: 'Dados da empresa salvos.' })
    await cliente.invalidateQueries({ queryKey: CHAVES.empresa })
    await cliente.invalidateQueries({ queryKey: CHAVES.historico })
  }

  return (
    <>
      <div className="campos campos-2">
        <CampoTexto
          rotulo="Nome"
          valor={dados.nome}
          aoMudar={mudar('nome')}
          erro={tentou && !dados.nome.trim() ? 'Digite o nome da empresa.' : undefined}
        />
        <CampoTexto rotulo="CNPJ" valor={dados.cnpj} aoMudar={mudar('cnpj')} />
        <CampoTexto rotulo="Telefone" valor={dados.telefone} aoMudar={mudar('telefone')} />
        <CampoTexto rotulo="Endereço" valor={dados.endereco} aoMudar={mudar('endereco')} />
      </div>
      <Faixa mensagem={mensagem} />
      <div>
        <button type="button" className="btn" onClick={() => void salvar()}>
          Salvar dados
        </button>
      </div>
    </>
  )
}

function CardEmpresa() {
  const { data } = useEmpresa()
  return (
    <section className="card config-card" aria-labelledby="titulo-empresa">
      <div className="hrow">
        <h2 id="titulo-empresa">Dados da empresa</h2>
        <Ajuda texto={AJUDA.dadosEmpresa} />
      </div>
      {data && <FormularioEmpresa inicial={data} />}
    </section>
  )
}

function BotaoManual() {
  const [erro, setErro] = useState<string | null>(null)
  return (
    <div className="hrow">
      <button
        type="button"
        className="btn2"
        onClick={async () => {
          setErro(null)
          const r = await window.api.manual.abrir()
          if (!r.ok) setErro(r.mensagem)
        }}
      >
        Abrir o manual
      </button>
      {erro && (
        <span className="texto-erro" role="alert">
          {erro}
        </span>
      )}
    </div>
  )
}

/** "Apagar todos os dados" (D-076): só com "APAGAR" digitado; antes, uma cópia de segurança. */
function CardApagar() {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const confirmado = texto.trim().toUpperCase() === 'APAGAR'

  function fechar() {
    setAberto(false)
    setTexto('')
    setErro(null)
  }

  async function apagar() {
    if (!confirmado) return
    setErro(null)
    setApagando(true)
    // depois de apagar, o programa recarrega sozinho
    const r = await window.api.dados.apagarTudo('APAGAR')
    setApagando(false)
    if (!r.ok) setErro(r.mensagem)
  }

  return (
    <section className="card config-card card-perigo" aria-labelledby="titulo-apagar">
      <div className="hrow">
        <h2 id="titulo-apagar">Apagar todos os dados</h2>
        <Ajuda texto={AJUDA.apagarDados} />
      </div>
      <p style={{ margin: 0 }}>
        Apaga vendas, pedidos, cadastros, estoque, receitas, contas, sócios, perdas, patrimônio,
        Gordurinha, histórico e dados da empresa: o sistema volta a ficar como no primeiro dia.
        Ficam só o tamanho da letra e as opções de cópia.
      </p>
      <p className="muted" style={{ margin: 0 }}>
        Antes de apagar, o sistema guarda uma cópia de segurança. Se foi engano, dá para voltar em
        "Cópia de segurança › Restaurar uma cópia".
      </p>
      <div>
        <button type="button" className="btn" onClick={() => setAberto(true)}>
          Apagar todos os dados
        </button>
      </div>
      {aberto && (
        <Modal
          titulo="Apagar todos os dados?"
          largura={640}
          aoFechar={fechar}
          rodape={
            <>
              <button
                type="button"
                className="btn"
                disabled={!confirmado || apagando}
                onClick={() => void apagar()}
              >
                {apagando ? 'Apagando…' : 'Apagar tudo'}
              </button>
              <button type="button" className="btn2" onClick={fechar}>
                Cancelar
              </button>
            </>
          }
        >
          <div className="faixa erro" role="alert">
            <span>
              Isto apaga <strong>todos os dados</strong> do sistema. Antes, uma cópia de segurança é
              guardada.
            </span>
          </div>
          <CampoTexto
            rotulo="Para confirmar, digite APAGAR"
            valor={texto}
            aoMudar={setTexto}
            placeholder="APAGAR"
          />
          {erro && (
            <div className="faixa erro" role="alert">
              {erro}
            </div>
          )}
        </Modal>
      )}
    </section>
  )
}

type Aba = 'copia' | 'letra' | 'lucro' | 'gas' | 'empresa' | 'historico' | 'apagar'

const ABAS: [Aba, string][] = [
  ['copia', 'Cópia de segurança'],
  ['letra', 'Tamanho da letra'],
  ['lucro', 'Como contar o lucro'],
  ['gas', 'Gás e energia'],
  ['empresa', 'Dados da empresa'],
  ['historico', 'Histórico'],
  ['apagar', 'Apagar dados']
]

export function TelaConfiguracoes() {
  const { ambiente } = usePreferencias()
  const [parametros, setParametros] = useSearchParams()
  const pedida = parametros.get('aba')
  const aba: Aba = ABAS.some(([a]) => a === pedida) ? (pedida as Aba) : 'copia'
  return (
    <>
      <CabecalhoTela
        subtitulo="Segurança dos dados e preferências"
        titulo="Configurações"
        ajuda={AJUDA.configuracoes}
        acao={<BotaoManual />}
      />
      <div className="seg" role="tablist" aria-label="Configurações">
        {ABAS.map(([a, rotulo]) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            className={aba === a ? 'sg on' : 'sg'}
            onClick={() => setParametros(a === 'copia' ? {} : { aba: a }, { replace: true })}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {aba === 'copia' && <CardCopia />}
      {aba === 'letra' && <CardLetra />}
      {aba === 'lucro' && <CardRegrasLucro />}
      {aba === 'gas' && <CardGasEnergia />}
      {aba === 'empresa' && <CardEmpresa />}
      {aba === 'historico' && <CardHistorico />}
      {aba === 'apagar' && <CardApagar />}
      {ambiente.mostrarVitrine && aba === 'copia' && (
        <Link to="/vitrine" className="btn2" style={{ alignSelf: 'flex-start' }}>
          Vitrine de componentes (só em desenvolvimento)
        </Link>
      )}
    </>
  )
}
