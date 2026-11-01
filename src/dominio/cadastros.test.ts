import { describe, expect, it } from 'vitest'
import {
  combinaBusca,
  descreverMudancas,
  documentoValido,
  formatarDocumento,
  formatarTelefone,
  soDigitos
} from './cadastros'

describe('telefone', () => {
  it('formata fixo e celular', () => {
    expect(formatarTelefone('1134567788')).toBe('(11) 3456-7788')
    expect(formatarTelefone('(41) 99876-5432')).toBe('(41) 99876-5432')
    expect(formatarTelefone('41998765432')).toBe('(41) 99876-5432')
  })
  it('deixa como digitado quando não é um número brasileiro comum', () => {
    expect(formatarTelefone('3456-7788')).toBe('3456-7788')
    expect(formatarTelefone('')).toBe('')
  })
})

describe('CPF e CNPJ', () => {
  it('formata', () => {
    expect(formatarDocumento('12345678000195')).toBe('12.345.678/0001-95')
    expect(formatarDocumento('529.982.247-25')).toBe('529.982.247-25')
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25')
  })
  it('confere os dígitos', () => {
    expect(documentoValido('529.982.247-25')).toBe(true)
    expect(documentoValido('529.982.247-24')).toBe(false)
    expect(documentoValido('12.345.678/0001-95')).toBe(true)
    expect(documentoValido('12.345.678/0001-90')).toBe(false)
    expect(documentoValido('111.111.111-11')).toBe(false)
    expect(documentoValido('123')).toBe(false)
  })
  it('vazio é permitido (o campo não é obrigatório)', () => {
    expect(documentoValido('')).toBe(true)
  })
})

describe('busca por nome ou telefone', () => {
  const cliente = { nome: 'Lanchonete Sabor & Cia', telefone: '11987654321' }
  it('sem acento e sem diferença de maiúsculas', () => {
    expect(combinaBusca(cliente, 'sabor')).toBe(true)
    expect(combinaBusca({ nome: 'Açaí Norte', telefone: '' }, 'acai')).toBe(true)
  })
  it('telefone com ou sem pontuação', () => {
    expect(combinaBusca(cliente, '98765')).toBe(true)
    expect(combinaBusca(cliente, '(11) 98765')).toBe(true)
  })
  it('busca vazia mostra todos; o que não combina some', () => {
    expect(combinaBusca(cliente, '  ')).toBe(true)
    expect(combinaBusca(cliente, 'padaria')).toBe(false)
  })
})

describe('descreverMudancas', () => {
  const rotulos = { nome: 'nome', telefone: 'telefone', cidade: 'cidade' }
  it('só o que mudou, com (vazio)', () => {
    expect(
      descreverMudancas(
        rotulos,
        { nome: 'A', telefone: '', cidade: 'São Paulo' },
        { nome: 'A', telefone: '(11) 3456-7788', cidade: 'Campinas' }
      )
    ).toBe('telefone (vazio) → (11) 3456-7788; cidade São Paulo → Campinas')
  })
  it('nada mudou', () => {
    expect(descreverMudancas(rotulos, { nome: 'A' }, { nome: 'A' })).toBeNull()
  })
})

describe('soDigitos', () => {
  it('tira tudo que não é número', () => {
    expect(soDigitos('(11) 3456-7788')).toBe('1134567788')
  })
})
