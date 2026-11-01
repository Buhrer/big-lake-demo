// Regra: nunca barra de rolagem horizontal (docs/05 §1.7), nas telas da loja (D-016)
// e com a letra de 80% a 130%. 1280×720 também equivale a 1920×1080 com escala de 150%.
import { expect, test } from '@playwright/test'
import { abrirApp, definirEscala, definirTamanho, temRolagemHorizontal } from './app'

const TELAS = [
  '#/',
  '#/vendas',
  '#/cadastros',
  '#/cadastros?aba=fornecedores',
  '#/cadastros?aba=produtos',
  '#/producao?aba=receitas',
  '#/producao?aba=avisos',
  '#/producao',
  '#/estoque',
  '#/perdas',
  '#/contas',
  '#/socios',
  '#/patrimonio',
  '#/relatorios',
  '#/configuracoes',
  '#/vitrine'
]
const TAMANHOS: [number, number][] = [
  [1280, 720],
  [1366, 768],
  [1920, 1080]
]
const ESCALAS = [80, 100, 130]

test('nenhuma tela tem rolagem horizontal em nenhum tamanho de tela e letra', async () => {
  test.setTimeout(180_000)
  const { app, pagina } = await abrirApp()
  const falhas: string[] = []
  try {
    for (const [largura, altura] of TAMANHOS) {
      await definirTamanho(app, largura, altura)
      for (const escala of ESCALAS) {
        await definirEscala(pagina, escala)
        for (const tela of TELAS) {
          await pagina.evaluate((h) => (location.hash = h), tela)
          await pagina.waitForTimeout(50)
          if (await temRolagemHorizontal(pagina))
            falhas.push(`${tela} em ${largura}×${altura} a ${escala}%`)
        }
      }
    }
  } finally {
    await app.close()
  }
  expect(falhas).toEqual([])
})

test('modal aberto a 130% em 1280×720 não cria rolagem horizontal', async () => {
  const { app, pagina } = await abrirApp(1280, 720)
  try {
    await definirEscala(pagina, 130)
    await pagina.evaluate(() => (location.hash = '#/vitrine'))
    await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
    const modal = pagina.getByRole('dialog')
    expect(await modal.evaluate((m) => m.scrollWidth > m.clientWidth)).toBe(false)
    expect(await temRolagemHorizontal(pagina)).toBe(false)
  } finally {
    await app.close()
  }
})
