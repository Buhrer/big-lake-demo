import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, Menu, shell } from 'electron'
import { CANAIS } from '../compartilhado/contrato'
import { formatarData } from '../dominio/datas'
import { contarFolhas, gerarPdf, imprimirPagina, listarImpressoras } from './impressao'
import { registrarIpc, type AcoesDeImpressao } from './ipc'
import { configurarLog, registrarErro } from './log'
import { relogioDoComputador } from './relogio'
import { obterPreferencias } from './servicos/configuracoes'
import { BancoDanificado, BancoDeVersaoMaisNova, Sistema, type Caminhos } from './sistema'

const modoTeste = process.env.BIGLAKE_E2E === '1'
const DUAS_HORAS = 2 * 60 * 60 * 1000

// Dados fora da pasta do programa (D-007): %APPDATA%\BigLake. BIGLAKE_DADOS muda nos testes.
const pastaDados = process.env.BIGLAKE_DADOS ?? join(app.getPath('appData'), 'BigLake')
mkdirSync(pastaDados, { recursive: true })
// Arquivos internos do navegador (cache etc.) numa subpasta, longe do banco.
app.setPath('userData', join(pastaDados, 'interno'))
configurarLog(join(pastaDados, 'logs'))

// Um programa aberto só: o segundo clique no atalho só traz a janela para a frente.
if (!app.requestSingleInstanceLock()) {
  app.exit(0)
}
app.on('second-instance', () => {
  if (!janela) return
  if (janela.isMinimized()) janela.restore()
  janela.focus()
})

const caminhos: Caminhos = {
  banco: join(pastaDados, 'biglake.db'),
  copias: process.env.BIGLAKE_COPIAS ?? join(app.getPath('documents'), 'BigLake', 'Backups')
}

let sistema: Sistema | null = null
let janela: BrowserWindow | null = null

function criarJanela(): void {
  janela = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#FFF7DE',
    title: 'BIG LAKE · Gestão',
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  janela.once('ready-to-show', () => {
    if (!modoTeste) janela?.maximize()
    janela?.show()
  })

  // Nada de abrir sites ou outras janelas: o sistema é 100% local.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  janela.webContents.on('will-navigate', (evento, url) => {
    if (!url.startsWith('file://') && !url.startsWith(process.env.ELECTRON_RENDERER_URL ?? '#')) {
      evento.preventDefault()
    }
  })

  void carregarTela(janela, '')
}

const PRELOAD = join(__dirname, '../preload/index.js')

/** Carrega a interface numa janela, já na tela do `hash` (ex.: "/imprimir/pedido/3"). */
async function carregarTela(alvo: BrowserWindow, hash: string): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    await alvo.loadURL(`${process.env.ELECTRON_RENDERER_URL}${hash ? `#${hash}` : ''}`)
  } else {
    await alvo.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined)
  }
}

/**
 * D-057, D-088: comprovante e relatórios. A prévia é o PDF da página; imprimir vai direto
 * para a impressora escolhida. Nos testes vai para PDF em <dados>/impressoes.
 */
const impressao: AcoesDeImpressao = {
  async previa(hash) {
    const pdf = await gerarPdf(carregarTela, PRELOAD, hash)
    return { pdf, folhas: contarFolhas(pdf) }
  },
  impressoras: () => (janela ? listarImpressoras(janela) : Promise.resolve([])),
  imprimir: (hash, nomeDoArquivo, opcoes) =>
    imprimirPagina(
      carregarTela,
      PRELOAD,
      hash,
      nomeDoArquivo,
      opcoes,
      modoTeste ? join(pastaDados, 'impressoes') : null
    )
}

/**
 * D-071: "Salvar como" já em DocumentosBigLakeRelatórios, com o nome pronto.
 * Devolve onde salvou, ou null se cancelou. Nos testes salva direto em <dados>/Relatórios.
 */
async function salvarPdf(hash: string, nomeDoArquivo: string): Promise<string | null> {
  const pasta = modoTeste
    ? join(pastaDados, 'Relatórios')
    : join(app.getPath('documents'), 'BigLake', 'Relatórios')
  mkdirSync(pasta, { recursive: true })
  let destino = join(pasta, `${nomeDoArquivo}.pdf`)
  if (!modoTeste) {
    const escolha = janela
      ? await dialog.showSaveDialog(janela, {
          title: 'Salvar relatório em PDF',
          defaultPath: destino,
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        })
      : await dialog.showSaveDialog({ defaultPath: destino })
    if (escolha.canceled || !escolha.filePath) return null
    destino = escolha.filePath
  }
  writeFileSync(destino, await gerarPdf(carregarTela, PRELOAD, hash))
  return destino
}

/** D-075: o manual vai em resourcesmanual no instalador; em desenvolvimento, em recursosmanual. */
async function abrirManual(): Promise<void> {
  const arquivo = app.isPackaged
    ? join(process.resourcesPath, 'manual', 'Manual-BIG-LAKE.pdf')
    : join(app.getAppPath(), 'recursos', 'manual', 'Manual-BIG-LAKE.pdf')
  if (!existsSync(arquivo)) {
    throw new Error('O manual não foi encontrado. Peça ao Lucas para instalar o sistema de novo.')
  }
  if (modoTeste) return
  const erro = await shell.openPath(arquivo)
  if (erro) throw new Error('Não foi possível abrir o manual. Ele precisa de um leitor de PDF.')
}

async function abrirSistema(): Promise<Sistema | null> {
  try {
    return await Sistema.abrir(caminhos, relogioDoComputador)
  } catch (erro) {
    registrarErro('Abrir o banco', erro)
    if (erro instanceof BancoDeVersaoMaisNova) {
      dialog.showErrorBox(
        'BIG LAKE',
        'Os dados foram gravados por uma versão mais nova do programa. Peça ao Lucas para instalar a versão atual.'
      )
      return null
    }
    if (!(erro instanceof BancoDanificado)) {
      dialog.showErrorBox('BIG LAKE', `Não foi possível abrir os dados.\n\n${String(erro)}`)
      return null
    }
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'BIG LAKE',
      message: 'O arquivo de dados está com problema.',
      detail:
        'Posso colocar no lugar a cópia de segurança mais recente. O arquivo com problema fica guardado, nada é apagado.',
      buttons: ['Usar a cópia mais recente', 'Fechar o programa'],
      defaultId: 0,
      cancelId: 1
    })
    if (response !== 0) return null
    const usada = await Sistema.recuperarDaUltimaCopia(caminhos, relogioDoComputador)
    if (!usada) {
      dialog.showErrorBox('BIG LAKE', 'Não há cópia de segurança na pasta. Chame o Lucas.')
      return null
    }
    await dialog.showMessageBox({
      type: 'info',
      title: 'BIG LAKE',
      message: `Os dados voltaram para a cópia de ${formatarData(usada.slice(0, 10))}, ${usada.slice(11, 16)}.`,
      detail: 'O que foi lançado depois dessa hora precisa ser lançado de novo.'
    })
    return Sistema.abrir(caminhos, relogioDoComputador)
  }
}

let saindo = false

app.on('before-quit', (evento) => {
  if (saindo || !sistema) return
  evento.preventDefault()
  saindo = true
  const s = sistema
  const preferencias = obterPreferencias(s.db)
  const copia = preferencias.backupAoFechar ? s.copiar('fechar', true) : Promise.resolve()
  void copia
    .catch((erro) => registrarErro('Cópia ao fechar', erro))
    .finally(() => {
      s.fechar()
      app.quit()
    })
})

Menu.setApplicationMenu(null)

app.whenReady().then(async () => {
  sistema = await abrirSistema()
  if (!sistema) {
    app.exit(1)
    return
  }
  const s = sistema
  registrarIpc(
    s,
    () => janela?.webContents.reload(),
    impressao,
    salvarPdf,
    (caminho) => shell.showItemInFolder(caminho),
    abrirManual
  )
  criarJanela()
  // D-012: cópia ao abrir e a cada 2 horas, só na pasta.
  // A tela já abriu; quando a cópia termina, o topo atualiza na hora.
  const avisar = () => janela?.webContents.send(CANAIS.backupTerminou)
  void s.copiar('abrir', false).then(avisar, avisar)
  setInterval(() => void s.copiar('periodico', false).then(avisar, avisar), DUAS_HORAS).unref()
})

app.on('window-all-closed', () => app.quit())
