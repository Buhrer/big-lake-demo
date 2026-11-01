import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nomeArquivoCopia } from '../../src/dominio/sistema'
import { arquivoIntegro } from '../../src/main/backup/copias'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import {
  obterEmpresa,
  obterPreferencias,
  salvarEmpresa,
  salvarPreferencias
} from '../../src/main/servicos/configuracoes'
import { clientes } from '../../src/main/servicos/cadastros'
import { listarCategorias } from '../../src/main/servicos/receitas'
import { BancoDanificado, Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, pastaTemporaria, relogioDeTeste } from './ajuda'

let penDrive: string

beforeEach(() => {
  penDrive = pastaTemporaria('biglake-pendrive-')
  process.env.BIGLAKE_PENDRIVE = penDrive
})

afterEach(() => {
  delete process.env.BIGLAKE_PENDRIVE
})

const EMPRESA = { nome: 'Big Lake Sorveteria', cnpj: '', telefone: '', endereco: '' }

describe('preferências, dados da empresa e histórico', () => {
  it('salva e registra no histórico com frase legível', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    expect(obterPreferencias(s.db)).toEqual({
      tamanhoPadrao: 'normal',
      ajudaLigada: true,
      backupAoFechar: true
    })
    salvarPreferencias(s.db, s.relogio, {
      tamanhoPadrao: 'grande',
      ajudaLigada: false,
      backupAoFechar: true
    })
    salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: '(41) 3333-4444' })
    expect(obterPreferencias(s.db).tamanhoPadrao).toBe('grande')
    expect(obterEmpresa(s.db).telefone).toBe('(41) 3333-4444')

    const historico = listarHistorico(s.db, s.relogio.hoje())
    expect(historico.map((h) => h.descricao)).toEqual([
      'Mudou os dados da empresa: telefone (vazio) → (41) 3333-4444',
      'Mudou o tamanho padrão da letra: Normal → Grande'
    ])
    expect(historico[0]?.quando).toMatch(/^Hoje, \d{2}:\d{2}$/)
    s.fechar()
  })

  it('salvar sem mudar nada não suja o histórico', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    salvarEmpresa(s.db, s.relogio, EMPRESA)
    expect(listarHistorico(s.db, s.relogio.hoje())).toEqual([])
    s.fechar()
  })

  it('empresa sem nome é recusada com mensagem simples', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    expect(() => salvarEmpresa(s.db, s.relogio, { ...EMPRESA, nome: '  ' })).toThrow(
      'Digite o nome da empresa.'
    )
    s.fechar()
  })
})

describe('cópias de segurança', () => {
  it('copia na pasta e no pen drive; a cópia é um banco íntegro', async () => {
    const caminhos = caminhosDeTeste()
    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    expect(await s.copiar('manual', true)).toEqual({ pasta: 'ok', penDrive: 'ok' })
    const [naPasta] = readdirSync(caminhos.copias)
    const [noPen] = readdirSync(join(penDrive, 'BigLake-Backups'))
    expect(naPasta).toMatch(/^biglake_2026-10-16_\d{6}\.db$/)
    expect(noPen).toBe(naPasta)
    expect(arquivoIntegro(join(caminhos.copias, naPasta!))).toBe(true)

    const estado = await s.estadoBackup()
    expect(estado.aviso.nivel).toBe('ok')
    expect(estado.aviso.texto).toMatch(/^Cópia de segurança feita hoje, \d{2}:\d{2}$/)
    expect(estado.ultimas).toHaveLength(2)
    s.fechar()
  })

  it('sem pen drive: copia só na pasta, avisa e nada trava (T14)', async () => {
    process.env.BIGLAKE_PENDRIVE = ''
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    expect(await s.copiar('fechar', true)).toEqual({ pasta: 'ok', penDrive: 'sem_pen_drive' })
    const estado = await s.estadoBackup()
    expect(estado.penDrive).toBeNull()
    expect(estado.aviso).toEqual({
      nivel: 'atencao',
      texto: 'Ainda não há cópia no pen drive. Conecte o pen drive e toque em "Fazer cópia agora".'
    })
    s.fechar()
  })

  it('guarda as 10 mais novas e 1 por dia dos últimos 30 dias (D-094)', async () => {
    const caminhos = caminhosDeTeste()
    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    await s.copiar('manual', false)
    const antiga = (dia: string, hora: string) =>
      writeFileSync(join(caminhos.copias, nomeArquivoCopia(`${dia}T${hora}`)), 'antiga')
    for (let dia = 1; dia <= 31; dia++)
      antiga(`2026-08-${String(dia).padStart(2, '0')}`, '10:00:00')
    // 3 por dia (abrir, fechar, abrir) de 01/10 a 15/10
    for (let dia = 1; dia <= 15; dia++)
      for (const hora of ['08:00:00', '12:00:00', '18:00:00'])
        antiga(`2026-10-${String(dia).padStart(2, '0')}`, hora)
    writeFileSync(join(caminhos.copias, 'nao-e-copia.txt'), 'fica')
    await s.copiar('manual', false)
    const arquivos = readdirSync(caminhos.copias)
    // 10 mais novas: 2 de hoje, 15/10 (3), 14/10 (3), 13/10 (2); mais a última de 01 a 12/10
    expect(arquivos.filter((a) => a.endsWith('.db'))).toHaveLength(22)
    expect(arquivos).toContain('nao-e-copia.txt')
    expect(arquivos).toContain(nomeArquivoCopia('2026-10-01T18:00:00'))
    expect(arquivos).not.toContain(nomeArquivoCopia('2026-10-01T08:00:00'))
    expect(arquivos).not.toContain(nomeArquivoCopia('2026-08-31T10:00:00'))
    s.fechar()
  })

  it('restaurar volta os dados e guarda antes uma cópia de como estava', async () => {
    const caminhos = caminhosDeTeste()
    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: 'A' })
    await s.copiar('manual', false)
    const [copiaComA] = await s.listarCopias()
    salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: 'B' })

    await s.restaurar(copiaComA!.caminho)
    expect(obterEmpresa(s.db).telefone).toBe('A')
    expect(listarHistorico(s.db, s.relogio.hoje())[0]?.descricao).toMatch(
      /^Restaurou a cópia de segurança de hoje, \d{2}:\d{2}/
    )

    // a cópia "de antes de restaurar" tem o telefone B
    const copias = await s.listarCopias()
    const deAntes = copias.find((c) => c.caminho !== copiaComA!.caminho && c.destino === 'pasta')
    const outro = await Sistema.abrir(
      { banco: deAntes!.caminho, copias: pastaTemporaria() },
      relogioDeTeste()
    )
    expect(obterEmpresa(outro.db).telefone).toBe('B')
    outro.fechar()
    s.fechar()
  })

  it('não restaura arquivo que não está na lista de cópias', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    await expect(s.restaurar('C:\\qualquer\\arquivo.db')).rejects.toThrow('Cópia não encontrada.')
    s.fechar()
  })
})

describe('banco danificado ao abrir', () => {
  it('avisa e recupera da última cópia boa, guardando o arquivo com defeito', async () => {
    const caminhos = caminhosDeTeste()
    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: 'antes do defeito' })
    await s.copiar('manual', false)
    s.fechar()

    writeFileSync(caminhos.banco, 'isto não é um banco de dados'.repeat(500))
    await expect(Sistema.abrir(caminhos, relogioDeTeste())).rejects.toBeInstanceOf(BancoDanificado)

    const usada = await Sistema.recuperarDaUltimaCopia(caminhos, relogioDeTeste())
    expect(usada).toMatch(/^2026-10-16T/)
    const pasta = join(caminhos.banco, '..')
    expect(readdirSync(pasta).some((a) => a.startsWith('biglake.db.danificado-'))).toBe(true)
    const recuperado = await Sistema.abrir(caminhos, relogioDeTeste())
    expect(obterEmpresa(recuperado.db).telefone).toBe('antes do defeito')
    recuperado.fechar()
  })

  it('sem nenhuma cópia, não mexe em nada', async () => {
    const caminhos = caminhosDeTeste()
    writeFileSync(caminhos.banco, 'lixo')
    expect(await Sistema.recuperarDaUltimaCopia(caminhos, relogioDeTeste())).toBeNull()
    expect(existsSync(caminhos.banco)).toBe(true)
  })

  it('arquivo corrompido é reconhecido como danificado', async () => {
    const caminhos = caminhosDeTeste()
    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    for (let i = 0; i < 200; i++) salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: `t${i}` })
    s.fechar()
    // estraga o meio do arquivo (como um setor ruim do disco)
    const { openSync, writeSync, closeSync } = await import('node:fs')
    const fd = openSync(caminhos.banco, 'r+')
    writeSync(fd, Buffer.alloc(4096, 0xff), 0, 4096, 4096)
    closeSync(fd)
    await expect(Sistema.abrir(caminhos, relogioDeTeste())).rejects.toBeInstanceOf(BancoDanificado)
  })
})

describe('a cópia é um arquivo único', () => {
  it('não deixa -wal, -shm nem .parcial ao lado', async () => {
    const caminhos = caminhosDeTeste()
    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    await s.copiar('manual', true)
    expect(readdirSync(caminhos.copias)).toEqual([expect.stringMatching(/^biglake_.*\.db$/)])
    expect(readdirSync(join(penDrive, 'BigLake-Backups'))).toEqual([
      expect.stringMatching(/^biglake_.*\.db$/)
    ])
    s.fechar()
  })
})

describe('cópias no mesmo segundo', () => {
  it('nunca sobrescrevem uma à outra (restaurar logo depois de copiar)', async () => {
    const caminhos = caminhosDeTeste()
    const parado = { hoje: () => '2026-10-16', agora: () => '2026-10-16T08:00:00-03:00' }
    const s = await Sistema.abrir(caminhos, parado)
    salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: 'A' })
    await s.copiar('manual', false)
    const [copiaComA] = await s.listarCopias()
    salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: 'B' })
    await s.restaurar(copiaComA!.caminho)
    expect(obterEmpresa(s.db).telefone).toBe('A')
    expect(readdirSync(caminhos.copias)).toHaveLength(2)
    s.fechar()
  })
})

describe('cópias ao mesmo tempo', () => {
  it('entram na fila e cada uma vira um arquivo', async () => {
    const caminhos = caminhosDeTeste()
    const parado = { hoje: () => '2026-10-16', agora: () => '2026-10-16T08:00:00-03:00' }
    const s = await Sistema.abrir(caminhos, parado)
    const resultados = await Promise.all([
      s.copiar('periodico', false),
      s.copiar('manual', false),
      s.copiar('manual', false)
    ])
    expect(resultados.every((r) => r.pasta === 'ok')).toBe(true)
    expect(readdirSync(caminhos.copias)).toHaveLength(3)
    s.fechar()
  })
})

describe('relógio do computador atrasado (D-093)', () => {
  it('abrir com data antes do último uso avisa; com a data certa, não', async () => {
    const caminhos = caminhosDeTeste()
    let s = await Sistema.abrir(caminhos, relogioDeTeste('2026-10-29T08:00'))
    await s.copiar('abrir', false)
    expect((await s.estadoBackup()).avisoData).toBeNull()
    s.fechar()
    s = await Sistema.abrir(caminhos, relogioDeTeste('2026-10-01T08:00'))
    expect((await s.estadoBackup()).avisoData).toContain(
      'hoje está 01/10/2026, mas o programa já foi usado em 29/10/2026.'
    )
    s.fechar()
    s = await Sistema.abrir(caminhos, relogioDeTeste('2026-10-30T08:00'))
    expect((await s.estadoBackup()).avisoData).toBeNull()
    s.fechar()
  })
})

describe('ordem das cópias', () => {
  it('cópias no mesmo segundo: a última feita aparece primeiro', async () => {
    const caminhos = caminhosDeTeste()
    const parado = { hoje: () => '2026-10-16', agora: () => '2026-10-16T08:00:00-03:00' }
    const s = await Sistema.abrir(caminhos, parado)
    for (let i = 1; i <= 10; i++) await s.copiar('manual', false)
    const nomes = (await s.listarCopias()).map((c) => basename(c.caminho))
    expect(nomes[0]).toBe('biglake_2026-10-16_080000_10.db')
    expect(nomes.at(-1)).toBe('biglake_2026-10-16_080000.db')
    s.fechar()
  })
})

describe('apagar todos os dados (D-076)', () => {
  it('guarda uma cópia antes, volta ao primeiro dia e mantém só as preferências', async () => {
    const caminhos = caminhosDeTeste()
    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    salvarEmpresa(s.db, s.relogio, { ...EMPRESA, telefone: '(11) 4002-8922' })
    salvarPreferencias(s.db, s.relogio, {
      ...obterPreferencias(s.db),
      tamanhoPadrao: 'grande',
      backupAoFechar: false
    })
    clientes.salvar(s.db, s.relogio, null, {
      nome: 'Mercado Bom Preço',
      telefone: '',
      documento: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: ''
    })

    await s.apagarTudo()

    expect(clientes.listar(s.db)).toEqual([])
    expect(obterEmpresa(s.db).telefone).toBe('')
    // o que o sistema já traz no primeiro dia volta (D-062)
    expect(listarCategorias(s.db).map((c) => c.nome)).toEqual(['Paleta', 'Picolé', 'Pote'])
    expect(obterPreferencias(s.db)).toMatchObject({
      tamanhoPadrao: 'grande',
      backupAoFechar: false
    })
    expect(listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)).toEqual([
      'Apagou todos os dados: o sistema voltou a ficar como no primeiro dia (antes guardou uma cópia de como estava)'
    ])

    // a cópia de antes está na pasta e no pen drive, e dá para voltar
    const copias = await s.listarCopias()
    expect(copias.some((c) => c.destino === 'pasta')).toBe(true)
    expect(readdirSync(join(penDrive, 'BigLake-Backups'))).toHaveLength(1)
    await s.restaurar(copias.find((c) => c.destino === 'pasta')!.caminho)
    expect(clientes.listar(s.db).map((c) => c.nome)).toEqual(['Mercado Bom Preço'])
    s.fechar()
  })
})
