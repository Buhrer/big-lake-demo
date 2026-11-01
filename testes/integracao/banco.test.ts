import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { abrirBanco, bancoIntegro, emTransacao } from '../../src/main/banco/conexao'
import {
  bancoMaisNovoQueOPrograma,
  migrar,
  MIGRACOES,
  versaoDoBanco
} from '../../src/main/banco/migrador'
import { auditar } from '../../src/main/servicos/auditoria'
import { pastaTemporaria, relogioDeTeste } from './ajuda'

function tabelas(db: ReturnType<typeof abrirBanco>): string[] {
  return (
    db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`).all() as {
      name: string
    }[]
  ).map((t) => t.name)
}

describe('conexão', () => {
  it('abre em WAL, synchronous FULL e chaves estrangeiras ligadas', () => {
    const db = abrirBanco(join(pastaTemporaria(), 'b.db'))
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
    expect(db.prepare('PRAGMA synchronous').get()).toEqual({ synchronous: 2 })
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 })
    expect(bancoIntegro(db)).toBe(true)
    db.close()
  })
})

describe('migrações', () => {
  it('banco novo: aplica todas, sem cópia antes (não há dados)', async () => {
    const db = abrirBanco(join(pastaTemporaria(), 'b.db'))
    const antes = vi.fn(async () => {})
    expect(await migrar(db, antes)).toEqual({ de: 0, para: MIGRACOES.length })
    expect(antes).not.toHaveBeenCalled()
    expect(tabelas(db)).toEqual([
      'auditoria',
      'bem',
      'cartao',
      'categoria',
      'cliente',
      'config',
      'conta_pagar',
      'entrada_mercadoria',
      'fechamento_balcao',
      'fornecedor',
      'gordurinha_conta',
      'gordurinha_reajuste',
      'gordurinha_retrato_conta',
      'gordurinha_retrato_item',
      'historico_custo',
      'historico_preco_categoria',
      'item_estoque',
      'lote',
      'manutencao',
      'movimento_estoque',
      'participacao_socio',
      'pedido',
      'pedido_item',
      'perda',
      'perda_item',
      'producao',
      'producao_item',
      'produto',
      'receita',
      'receita_embalagem',
      'receita_ingrediente',
      'registro_backup',
      'retirada',
      'saida_estoque',
      'socio',
      'tipo_bem',
      'tipo_conta'
    ])
  })

  it('rodar de novo não faz nada', async () => {
    const db = abrirBanco(join(pastaTemporaria(), 'b.db'))
    await migrar(db, async () => {})
    const antes = vi.fn(async () => {})
    expect(await migrar(db, antes)).toEqual({ de: MIGRACOES.length, para: MIGRACOES.length })
    expect(antes).not.toHaveBeenCalled()
  })

  it('banco com dados: faz a cópia antes; migração com erro volta tudo atrás', async () => {
    const db = abrirBanco(join(pastaTemporaria(), 'b.db'))
    await migrar(db, async () => {})
    const antes = vi.fn(async () => {})
    const quebrada = [
      ...MIGRACOES,
      {
        versao: 99,
        sql: 'CREATE TABLE nova (x INTEGER); INSERT INTO tabela_que_nao_existe VALUES (1);'
      }
    ]
    await expect(migrar(db, antes, quebrada)).rejects.toThrow('Falha na migração 99')
    expect(antes).toHaveBeenCalledOnce()
    expect(versaoDoBanco(db)).toBe(MIGRACOES.length)
    expect(tabelas(db)).not.toContain('nova')
  })

  it('reconhece banco de uma versão mais nova do programa', async () => {
    const db = abrirBanco(join(pastaTemporaria(), 'b.db'))
    await migrar(db, async () => {})
    db.exec('PRAGMA user_version = 99')
    expect(bancoMaisNovoQueOPrograma(db)).toBe(true)
  })
})

describe('transação + auditoria', () => {
  it('se algo falha depois de auditar, nem a alteração nem o histórico ficam gravados', async () => {
    const db = abrirBanco(join(pastaTemporaria(), 'b.db'))
    await migrar(db, async () => {})
    const relogio = relogioDeTeste()
    expect(() =>
      emTransacao(db, () => {
        db.prepare(`INSERT INTO config VALUES ('x', '1', ?)`).run(relogio.agora())
        auditar(db, relogio, { modulo: 'teste', acao: 'criar', descricao: 'Criou x' })
        throw new Error('falhou no meio')
      })
    ).toThrow('falhou no meio')
    expect(db.prepare('SELECT count(*) AS n FROM config').get()).toEqual({ n: 0 })
    expect(db.prepare('SELECT count(*) AS n FROM auditoria').get()).toEqual({ n: 0 })
  })
})

describe('T14 · queda de energia no meio de um salvamento', () => {
  it('o que foi confirmado fica; o que estava pela metade some', async () => {
    const arquivo = join(pastaTemporaria(), 'b.db')
    const db = abrirBanco(arquivo)
    await migrar(db, async () => {})
    db.close()

    // Outro processo grava uma linha confirmada, abre outra transação e "cai a energia"
    // (o processo morre sem COMMIT e sem fechar o banco).
    const script = `
      const { DatabaseSync } = require('node:sqlite')
      const db = new DatabaseSync(${JSON.stringify(arquivo)})
      db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;')
      db.exec("INSERT INTO config VALUES ('confirmada', '1', 'x')")
      db.exec('BEGIN IMMEDIATE')
      db.exec("INSERT INTO config VALUES ('pela_metade', '1', 'x')")
      db.exec("INSERT INTO auditoria (data_hora, modulo, acao, descricao) VALUES ('x', 't', 'criar', 'meio')")
      process.exit(1)
    `
    const filho = spawnSync(process.execPath, ['-e', script])
    expect(filho.status).toBe(1)

    const depois = abrirBanco(arquivo)
    expect(bancoIntegro(depois)).toBe(true)
    expect(depois.prepare('SELECT chave FROM config').all()).toEqual([{ chave: 'confirmada' }])
    expect(depois.prepare('SELECT count(*) AS n FROM auditoria').get()).toEqual({ n: 0 })
    depois.close()
  })
})
