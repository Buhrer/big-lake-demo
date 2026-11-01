import { readdirSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { abrirBanco } from '../../src/main/banco/conexao'
import { migrar, MIGRACOES, versaoDoBanco } from '../../src/main/banco/migrador'
import { listarHistorico } from '../../src/main/servicos/auditoria'
import { clientes, fornecedores } from '../../src/main/servicos/cadastros'
import { Sistema } from '../../src/main/sistema'
import { caminhosDeTeste, relogioDeTeste } from './ajuda'

const MERCADO = {
  nome: 'Mercado Bom Preço',
  telefone: '1134567788',
  documento: '12345678000195',
  rua: 'Rua das Flores',
  numero: '120',
  bairro: 'Centro',
  cidade: 'São Paulo'
}

beforeEach(() => {
  process.env.BIGLAKE_PENDRIVE = ''
})
afterEach(() => {
  delete process.env.BIGLAKE_PENDRIVE
})

describe('clientes', () => {
  it('cadastra já formatando telefone e CNPJ, e registra no histórico', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    const id = clientes.salvar(s.db, s.relogio, null, MERCADO)
    expect(clientes.obter(s.db, id)).toMatchObject({
      nome: 'Mercado Bom Preço',
      telefone: '(11) 3456-7788',
      documento: '12.345.678/0001-95'
    })
    expect(listarHistorico(s.db, s.relogio.hoje())[0]?.descricao).toBe(
      'Cadastrou o cliente Mercado Bom Preço'
    )
    s.fechar()
  })

  it('corrigir registra só o que mudou; salvar igual não registra', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    const id = clientes.salvar(s.db, s.relogio, null, MERCADO)
    clientes.salvar(s.db, s.relogio, id, { ...MERCADO, numero: '130', cidade: 'Campinas' })
    clientes.salvar(s.db, s.relogio, id, { ...MERCADO, numero: '130', cidade: 'Campinas' })
    const historico = listarHistorico(s.db, s.relogio.hoje()).map((h) => h.descricao)
    expect(historico).toEqual([
      'Mudou o cadastro do cliente Mercado Bom Preço: número 120 → 130; cidade São Paulo → Campinas',
      'Cadastrou o cliente Mercado Bom Preço'
    ])
    s.fechar()
  })

  it('recusa nome vazio e CPF/CNPJ com número errado, sem gravar nada', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    expect(() => clientes.salvar(s.db, s.relogio, null, { ...MERCADO, nome: ' ' })).toThrow(
      'Digite o nome.'
    )
    expect(() =>
      clientes.salvar(s.db, s.relogio, null, { ...MERCADO, documento: '12.345.678/0001-90' })
    ).toThrow('CPF ou CNPJ com algum número errado. Confira.')
    expect(clientes.listar(s.db)).toEqual([])
    expect(listarHistorico(s.db, s.relogio.hoje())).toEqual([])
    s.fechar()
  })

  it('lista em ordem alfabética', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    for (const nome of ['Padaria Pão Quente', 'buffet Festa Feliz', 'Mercado Bom Preço']) {
      clientes.salvar(s.db, s.relogio, null, { ...MERCADO, nome, documento: '' })
    }
    expect(clientes.listar(s.db).map((c) => c.nome)).toEqual([
      'buffet Festa Feliz',
      'Mercado Bom Preço',
      'Padaria Pão Quente'
    ])
    s.fechar()
  })
})

describe('fornecedores', () => {
  it('cadastra e corrige com frases legíveis', async () => {
    const s = await Sistema.abrir(caminhosDeTeste(), relogioDeTeste())
    const dados = {
      nome: 'Laticínios Vale Verde',
      telefone: '11998765432',
      documento: '',
      contato: 'Sr. Antônio',
      oQueFornece: 'leite, creme de leite'
    }
    const id = fornecedores.salvar(s.db, s.relogio, null, dados)
    fornecedores.salvar(s.db, s.relogio, id, { ...dados, contato: 'Dona Rosa' })
    expect(fornecedores.obter(s.db, id)?.telefone).toBe('(11) 99876-5432')
    expect(listarHistorico(s.db, s.relogio.hoje())[0]?.descricao).toBe(
      'Mudou o cadastro do fornecedor Laticínios Vale Verde: pessoa de contato Sr. Antônio → Dona Rosa'
    )
    s.fechar()
  })
})

describe('atualização do banco da versão 1 para a 2', () => {
  it('faz a cópia antes, cria as tabelas novas e anota no histórico', async () => {
    const caminhos = caminhosDeTeste()
    const db = abrirBanco(caminhos.banco)
    await migrar(db, async () => {}, MIGRACOES.slice(0, 1))
    db.prepare(`INSERT INTO config VALUES ('empresa', '{"nome":"Big Lake"}', 'x')`).run()
    db.close()

    const s = await Sistema.abrir(caminhos, relogioDeTeste())
    expect(versaoDoBanco(s.db)).toBe(MIGRACOES.length)
    expect(readdirSync(caminhos.copias)).toHaveLength(1)
    expect(listarHistorico(s.db, s.relogio.hoje())[0]?.descricao).toBe(
      `Atualizou os dados para a versão ${MIGRACOES.length} (cópia de segurança feita antes)`
    )
    clientes.salvar(s.db, s.relogio, null, MERCADO)
    expect(clientes.listar(s.db)).toHaveLength(1)
    s.fechar()
  })
})
