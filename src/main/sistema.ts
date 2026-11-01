// Ciclo de vida do banco: abrir, conferir, migrar, copiar e restaurar.
import { existsSync } from 'node:fs'
import { access, constants, copyFile, rename, rm } from 'node:fs/promises'
import { avisoDataDoComputador, avisoDoBackup } from '../dominio/sistema'
import { descreverQuando, type DataHoraISO } from '../dominio/datas'
import { abrirBanco, bancoIntegro, emTransacao, type Banco } from './banco/conexao'
import { bancoMaisNovoQueOPrograma, migrar } from './banco/migrador'
import {
  aplicarRetencao,
  arquivoIntegro,
  copiarBanco,
  detectarPenDrive,
  listarCopias,
  maisNovaPrimeiro,
  pastaNoPenDrive,
  type ArquivoDeCopia
} from './backup/copias'
import type { EstadoBackup, ResultadoCopia } from '../compartilhado/contrato'
import type { Relogio } from './relogio'
import { auditar } from './servicos/auditoria'
import { manterPreferencias, obterPreferencias } from './servicos/configuracoes'
import { registrarErro } from './log'

export type MotivoCopia = 'abrir' | 'periodico' | 'fechar' | 'manual' | 'migracao' | 'restaurar'

export interface Caminhos {
  /** Arquivo do banco (ex.: %APPDATA%\BigLake\biglake.db). */
  banco: string
  /** Documentos\BigLake\Backups */
  copias: string
}

export interface CopiaListada extends ArquivoDeCopia {
  destino: 'pasta' | 'pen_drive'
  quando: string
}

export class BancoDanificado extends Error {
  constructor() {
    super('O arquivo de dados está com problema.')
  }
}

export class BancoDeVersaoMaisNova extends Error {
  constructor() {
    super('Os dados foram gravados por uma versão mais nova do programa.')
  }
}

export class Sistema {
  private constructor(
    private banco: Banco,
    readonly caminhos: Caminhos,
    readonly relogio: Relogio
  ) {}

  get db(): Banco {
    return this.banco
  }

  /** Abre o banco, confere a integridade e aplica as migrações (com cópia antes). */
  static async abrir(caminhos: Caminhos, relogio: Relogio): Promise<Sistema> {
    let db: Banco
    try {
      db = abrirBanco(caminhos.banco)
    } catch {
      throw new BancoDanificado()
    }
    if (!bancoIntegro(db)) {
      db.close()
      throw new BancoDanificado()
    }
    if (bancoMaisNovoQueOPrograma(db)) {
      db.close()
      throw new BancoDeVersaoMaisNova()
    }
    const sistema = new Sistema(db, caminhos, relogio)
    await sistema.migrar()
    return sistema
  }

  private async migrar(): Promise<void> {
    const { de, para } = await migrar(this.banco, async () => {
      await copiarBanco(this.banco, this.caminhos.copias, this.relogio.agora())
    })
    if (de > 0 && para > de) {
      emTransacao(this.banco, () =>
        auditar(this.banco, this.relogio, {
          modulo: 'sistema',
          acao: 'sistema',
          descricao: `Atualizou os dados para a versão ${para} (cópia de segurança feita antes)`
        })
      )
    }
  }

  fechar(): void {
    if (this.banco.isOpen) this.banco.close()
  }

  private registrar(
    destino: 'pasta' | 'pen_drive',
    motivo: MotivoCopia,
    arquivo: string | null,
    erro?: unknown
  ): void {
    this.banco
      .prepare(
        `INSERT INTO registro_backup (data_hora, destino, motivo, arquivo, status, mensagem)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        this.relogio.agora(),
        destino,
        motivo,
        arquivo,
        erro ? 'erro' : 'ok',
        erro ? String((erro as Error).message ?? erro) : null
      )
  }

  /** Faz a cópia na pasta e, se pedido, no pen drive. Nunca lança erro: devolve o resultado. */
  /** As cópias entram numa fila: nunca duas ao mesmo tempo (ex.: a periódica e a manual). */
  private fila: Promise<unknown> = Promise.resolve()

  copiar(motivo: MotivoCopia, incluirPenDrive: boolean): Promise<ResultadoCopia> {
    const vez = this.fila.then(() => this.copiarAgora(motivo, incluirPenDrive))
    this.fila = vez.catch(() => {})
    return vez
  }

  private async copiarAgora(
    motivo: MotivoCopia,
    incluirPenDrive: boolean
  ): Promise<ResultadoCopia> {
    const resultado: ResultadoCopia = { pasta: 'ok', penDrive: 'nao_pedido' }
    const agora = this.relogio.agora()
    try {
      const arquivo = await copiarBanco(this.banco, this.caminhos.copias, agora)
      await aplicarRetencao(this.caminhos.copias, this.relogio.hoje())
      this.registrar('pasta', motivo, arquivo)
    } catch (erro) {
      resultado.pasta = 'erro'
      registrarErro('Cópia na pasta', erro)
      this.registrar('pasta', motivo, null, erro)
    }
    if (incluirPenDrive) {
      const raiz = await detectarPenDrive()
      if (!raiz) {
        resultado.penDrive = 'sem_pen_drive'
      } else {
        const pasta = pastaNoPenDrive(raiz)
        try {
          const arquivo = await copiarBanco(this.banco, pasta, agora)
          await aplicarRetencao(pasta, this.relogio.hoje())
          this.registrar('pen_drive', motivo, arquivo)
          resultado.penDrive = 'ok'
        } catch (erro) {
          resultado.penDrive = 'erro'
          registrarErro('Cópia no pen drive', erro)
          this.registrar('pen_drive', motivo, null, erro)
        }
      }
    }
    return resultado
  }

  private ultimaOk(destino?: 'pasta' | 'pen_drive'): DataHoraISO | null {
    const sql = destino
      ? `SELECT max(data_hora) AS d FROM registro_backup WHERE status = 'ok' AND destino = ?`
      : `SELECT max(data_hora) AS d FROM registro_backup WHERE status = 'ok'`
    const linha = (
      destino ? this.banco.prepare(sql).get(destino) : this.banco.prepare(sql).get()
    ) as { d: string | null }
    return linha.d
  }

  /** Abrir e fechar sempre fazem cópia: a mais nova registrada é o último uso (D-093). */
  private ultimoUso(): DataHoraISO | null {
    const linha = this.banco.prepare('SELECT max(data_hora) AS d FROM registro_backup').get() as {
      d: string | null
    }
    return linha.d
  }

  async estadoBackup(): Promise<EstadoBackup> {
    const hoje = this.relogio.hoje()
    const penDrive = await detectarPenDrive()
    let pastaOk = true
    try {
      if (existsSync(this.caminhos.copias)) await access(this.caminhos.copias, constants.W_OK)
    } catch {
      pastaOk = false
    }
    const ultimas = (
      this.banco
        .prepare(
          `SELECT data_hora, destino FROM registro_backup WHERE status = 'ok'
           ORDER BY data_hora DESC, id DESC LIMIT 3`
        )
        .all() as { data_hora: string; destino: 'pasta' | 'pen_drive' }[]
    ).map((l) => ({ quando: descreverQuando(l.data_hora, hoje), destino: l.destino }))
    return {
      aviso: avisoDoBackup(
        { ultima: this.ultimaOk(), ultimaNoPenDrive: this.ultimaOk('pen_drive') },
        hoje
      ),
      pastaOk,
      pastaCaminho: this.caminhos.copias,
      penDrive: penDrive ? penDrive.replace(/\\$/, '') : null,
      ultimas,
      avisoData: avisoDataDoComputador(hoje, this.ultimoUso())
    }
  }

  /** Todas as cópias que dá para restaurar (pasta e pen drive), da mais nova para a mais antiga. */
  async listarCopias(): Promise<CopiaListada[]> {
    const hoje = this.relogio.hoje()
    const daPasta = (await listarCopias(this.caminhos.copias)).map((c) => ({
      ...c,
      destino: 'pasta' as const
    }))
    const raiz = await detectarPenDrive()
    const doPen = raiz
      ? (await listarCopias(pastaNoPenDrive(raiz))).map((c) => ({
          ...c,
          destino: 'pen_drive' as const
        }))
      : []
    return [...daPasta, ...doPen]
      .sort(maisNovaPrimeiro)
      .map((c) => ({ ...c, quando: descreverQuando(c.dataHora, hoje) }))
  }

  /**
   * Volta os dados para como estavam na cópia escolhida.
   * Antes, guarda uma cópia do estado atual (motivo "restaurar").
   */
  async restaurar(caminho: string): Promise<void> {
    const copia = (await this.listarCopias()).find((c) => c.caminho === caminho)
    if (!copia) throw new Error('Cópia não encontrada.')
    if (!arquivoIntegro(caminho)) throw new Error('Esta cópia está com defeito. Escolha outra.')

    const antes = await this.copiar('restaurar', false)
    if (antes.pasta !== 'ok') {
      throw new Error('Não foi possível guardar uma cópia de agora. Nada foi mudado.')
    }
    this.banco.close()
    await rm(`${this.caminhos.banco}-wal`, { force: true })
    await rm(`${this.caminhos.banco}-shm`, { force: true })
    await copyFile(caminho, this.caminhos.banco)
    this.banco = abrirBanco(this.caminhos.banco)
    await this.migrar()
    emTransacao(this.banco, () => {
      auditar(this.banco, this.relogio, {
        modulo: 'configuracoes',
        acao: 'sistema',
        descricao: `Restaurou a cópia de segurança de ${descreverQuando(copia.dataHora, this.relogio.hoje()).toLowerCase()} (antes guardou uma cópia de como estava)`
      })
    })
  }

  /**
   * "Apagar todos os dados" (D-076): antes, uma cópia na pasta e no pen drive (dá para voltar
   * em "Restaurar uma cópia"); depois, um banco novo, como no primeiro dia. Ficam só as
   * preferências (letra, ajuda, cópia ao fechar). As cópias de segurança nunca são apagadas.
   */
  async apagarTudo(): Promise<void> {
    const preferencias = obterPreferencias(this.banco)
    const antes = await this.copiar('manual', true)
    if (antes.pasta !== 'ok') {
      throw new Error('Não foi possível guardar uma cópia de agora. Nada foi apagado.')
    }
    this.banco.close()
    await rm(this.caminhos.banco, { force: true })
    await rm(`${this.caminhos.banco}-wal`, { force: true })
    await rm(`${this.caminhos.banco}-shm`, { force: true })
    this.banco = abrirBanco(this.caminhos.banco)
    await this.migrar()
    emTransacao(this.banco, () => {
      manterPreferencias(this.banco, this.relogio, preferencias)
      auditar(this.banco, this.relogio, {
        modulo: 'configuracoes',
        acao: 'sistema',
        descricao:
          'Apagou todos os dados: o sistema voltou a ficar como no primeiro dia (antes guardou uma cópia de como estava)'
      })
    })
  }

  /**
   * Banco danificado ao abrir: guarda o arquivo com defeito ao lado (nunca apaga)
   * e coloca no lugar a cópia íntegra mais recente da pasta.
   * Devolve a data da cópia usada, ou null se não houver nenhuma.
   */
  static async recuperarDaUltimaCopia(
    caminhos: Caminhos,
    relogio: Relogio
  ): Promise<DataHoraISO | null> {
    const boa = (await listarCopias(caminhos.copias)).find((c) => arquivoIntegro(c.caminho))
    if (!boa) return null
    const sufixo = relogio.agora().slice(0, 19).replace(/[:T]/g, '-')
    await rename(caminhos.banco, `${caminhos.banco}.danificado-${sufixo}`)
    await rm(`${caminhos.banco}-wal`, { force: true })
    await rm(`${caminhos.banco}-shm`, { force: true })
    await copyFile(boa.caminho, caminhos.banco)
    return boa.dataHora
  }
}
