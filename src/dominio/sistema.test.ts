import { describe, expect, it } from 'vitest'
import {
  avisoDataDoComputador,
  avisoDoBackup,
  compararCopiasMaisNovaPrimeiro,
  copiasParaApagar,
  dataHoraDoNome,
  nomeArquivoCopia,
  textosEmpresa,
  TAMANHOS_LETRA,
  textosPreferencias,
  type Preferencias
} from './sistema'
import { descreverQuando } from './datas'

describe('descreverQuando (histórico e cópias)', () => {
  const hoje = '2026-10-16'
  it('como no protótipo: Hoje, Ontem, dd/mm', () => {
    expect(descreverQuando('2026-10-16T08:02:15-03:00', hoje)).toBe('Hoje, 08:02')
    expect(descreverQuando('2026-10-15T22:15:00-03:00', hoje)).toBe('Ontem, 22:15')
    expect(descreverQuando('2026-10-14T22:08:00', hoje)).toBe('14/10, 22:08')
  })
  it('outro ano mostra o ano', () => {
    expect(descreverQuando('2025-12-31T09:00:00', hoje)).toBe('31/12/2025, 09:00')
  })
})

describe('nome do arquivo de cópia', () => {
  it('ida e volta', () => {
    const nome = nomeArquivoCopia('2026-10-16T08:02:15-03:00')
    expect(nome).toBe('biglake_2026-10-16_080215.db')
    expect(dataHoraDoNome(nome)).toBe('2026-10-16T08:02:15')
  })
  it('cópias no mesmo segundo ganham _2, _3 e ficam em ordem', () => {
    const a = nomeArquivoCopia('2026-10-16T08:02:15')
    const b = nomeArquivoCopia('2026-10-16T08:02:15', 2)
    expect(b).toBe('biglake_2026-10-16_080215_2.db')
    expect(dataHoraDoNome(b)).toBe('2026-10-16T08:02:15')
    expect([a, b].sort(compararCopiasMaisNovaPrimeiro)).toEqual([b, a])
    const dez = nomeArquivoCopia('2026-10-16T08:02:15', 10)
    const nove = nomeArquivoCopia('2026-10-16T08:02:15', 9)
    expect([nove, a, dez].sort(compararCopiasMaisNovaPrimeiro)).toEqual([dez, nove, a])
  })
  it('ignora arquivos que não são cópias', () => {
    expect(dataHoraDoNome('foto.jpg')).toBeNull()
    expect(dataHoraDoNome('biglake_2026-13-99_999999.db')).toBeNull()
  })
})

describe('copiasParaApagar (D-094: as 10 mais novas + 1 por dia dos últimos 30 dias)', () => {
  const copia = (dia: string, hora = '10:00:00') => nomeArquivoCopia(`${dia}T${hora}`)
  const hoje = '2026-10-29'

  it('várias por dia: fica a mais nova de cada dia, além das 10 mais novas', () => {
    // 3 cópias por dia (abrir, fechar, abrir) de 20/10 a 29/10
    const nomes: string[] = []
    for (let d = 20; d <= 29; d++)
      for (const h of ['08:00:00', '12:00:00', '18:00:00']) nomes.push(copia(`2026-10-${d}`, h))
    const apagar = copiasParaApagar(nomes, hoje)
    const ficam = nomes.filter((n) => !apagar.includes(n))
    // 10 mais novas: 29/10 (3), 28/10 (3), 27/10 (3) e 26/10 18h; mais 1 por dia de 20 a 25/10
    expect(ficam).toHaveLength(16)
    for (let d = 20; d <= 25; d++) expect(ficam).toContain(copia(`2026-10-${d}`, '18:00:00'))
    expect(apagar).toContain(copia('2026-10-20', '08:00:00'))
  })
  it('mais de 30 dias atrás: só fica se estiver entre as 10 mais novas', () => {
    const velhas = Array.from({ length: 5 }, (_, i) => copia(`2026-08-0${i + 1}`))
    expect(copiasParaApagar(velhas, hoje)).toEqual([])
    const recentes = Array.from({ length: 10 }, (_, i) =>
      copia(`2026-10-${String(i + 10).padStart(2, '0')}`)
    )
    expect(copiasParaApagar([...velhas, ...recentes], hoje).sort()).toEqual([...velhas].sort())
  })
  it('o 30º dia para trás ainda conta; o 31º não', () => {
    const recentes = Array.from({ length: 10 }, (_, i) => copia('2026-10-29', `1${i}:00:00`))
    const dia30 = copia('2026-09-30')
    const dia31 = copia('2026-09-29')
    expect(copiasParaApagar([...recentes, dia30, dia31], hoje)).toEqual([dia31])
  })
  it('cópias com data depois de hoje (relógio atrasado) não são apagadas', () => {
    const recentes = Array.from({ length: 10 }, (_, i) => copia('2026-11-20', `1${i}:00:00`))
    const futura = copia('2026-11-05')
    expect(copiasParaApagar([...recentes, futura], hoje)).toEqual([])
  })
  it('nunca apaga arquivos que não são cópias', () => {
    const nomes = Array.from({ length: 15 }, (_, i) =>
      copia('2026-01-01', `1${i % 10}:0${Math.floor(i / 10)}:00`)
    )
    expect(copiasParaApagar(['leia-me.txt', ...nomes], hoje)).not.toContain('leia-me.txt')
  })
})

describe('avisoDoBackup (barra do topo)', () => {
  const hoje = '2026-10-16'
  it('tudo em dia', () => {
    expect(
      avisoDoBackup(
        { ultima: '2026-10-16T08:02:00', ultimaNoPenDrive: '2026-10-15T22:15:00' },
        hoje
      )
    ).toEqual({ nivel: 'ok', texto: 'Cópia de segurança feita hoje, 08:02' })
  })
  it('última de ontem', () => {
    expect(
      avisoDoBackup(
        { ultima: '2026-10-15T22:15:00', ultimaNoPenDrive: '2026-10-15T22:15:00' },
        hoje
      ).texto
    ).toBe('Cópia de segurança feita ontem, 22:15')
  })
  it('nenhuma cópia', () => {
    expect(avisoDoBackup({ ultima: null, ultimaNoPenDrive: null }, hoje)).toEqual({
      nivel: 'erro',
      texto: 'Ainda não foi feita nenhuma cópia de segurança.'
    })
  })
  it('pen drive sem cópia há mais de 7 dias', () => {
    expect(
      avisoDoBackup(
        { ultima: '2026-10-16T08:02:00', ultimaNoPenDrive: '2026-10-08T22:00:00' },
        hoje
      )
    ).toEqual({
      nivel: 'atencao',
      texto:
        'Faz 8 dias que não há cópia no pen drive. Conecte o pen drive e toque em "Fazer cópia agora".'
    })
  })
  it('7 dias ainda está em dia', () => {
    expect(
      avisoDoBackup(
        { ultima: '2026-10-16T08:02:00', ultimaNoPenDrive: '2026-10-09T22:00:00' },
        hoje
      ).nivel
    ).toBe('ok')
  })
  it('nunca copiou no pen drive', () => {
    expect(
      avisoDoBackup({ ultima: '2026-10-16T08:02:00', ultimaNoPenDrive: null }, hoje).texto
    ).toBe('Ainda não há cópia no pen drive. Conecte o pen drive e toque em "Fazer cópia agora".')
  })
})

describe('frases do histórico', () => {
  const base: Preferencias = { tamanhoPadrao: 'normal', ajudaLigada: true, backupAoFechar: true }
  it('tamanho da letra e cópia ao fechar', () => {
    expect(
      textosPreferencias(base, { ...base, tamanhoPadrao: 'grande', backupAoFechar: false })
    ).toEqual([
      'Mudou o tamanho padrão da letra: Normal → Grande',
      'Desligou a cópia automática ao fechar o sistema'
    ])
    expect(textosPreferencias({ ...base, backupAoFechar: false }, base)).toEqual([
      'Ligou a cópia automática ao fechar o sistema'
    ])
  })
  it('letra Pequena (D-054)', () => {
    expect(textosPreferencias(base, { ...base, tamanhoPadrao: 'pequena' })).toEqual([
      'Mudou o tamanho padrão da letra: Normal → Pequena'
    ])
    expect(TAMANHOS_LETRA.pequena.escala).toBe(90)
  })
  it('ligar/desligar a ajuda não vai para o histórico', () => {
    expect(textosPreferencias(base, { ...base, ajudaLigada: false })).toEqual([])
  })
  it('dados da empresa: só o que mudou', () => {
    const antes = { nome: 'Big Lake Sorveteria', cnpj: '', telefone: '', endereco: '' }
    expect(textosEmpresa(antes, { ...antes, telefone: '(41) 3333-4444' })).toBe(
      'Mudou os dados da empresa: telefone (vazio) → (41) 3333-4444'
    )
    expect(textosEmpresa(antes, { ...antes, nome: 'Big Lake', cnpj: '12.345.678/0001-90' })).toBe(
      'Mudou os dados da empresa: nome Big Lake Sorveteria → Big Lake; CNPJ (vazio) → 12.345.678/0001-90'
    )
    expect(textosEmpresa(antes, antes)).toBeNull()
  })
})

describe('avisoDataDoComputador (D-093)', () => {
  it('data de hoje antes do último uso: avisa', () => {
    expect(avisoDataDoComputador('2026-10-01', '2026-10-29T18:05:00')).toBe(
      'A data do computador parece errada: hoje está 01/10/2026, mas o programa já foi usado em 29/10/2026. Confira o dia no relógio do Windows (no canto de baixo da tela) antes de lançar as vendas.'
    )
  })
  it('mesmo dia, dia seguinte ou sem uso anterior: não avisa', () => {
    expect(avisoDataDoComputador('2026-10-29', '2026-10-29T18:05:00')).toBeNull()
    expect(avisoDataDoComputador('2026-10-30', '2026-10-29T18:05:00')).toBeNull()
    expect(avisoDataDoComputador('2026-10-30', null)).toBeNull()
  })
})
