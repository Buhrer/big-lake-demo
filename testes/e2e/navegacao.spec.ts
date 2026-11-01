import { expect, test } from '@playwright/test'
import { abrirApp, definirEscala, irPara, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
})

test.afterEach(async () => {
  await aberto.app.close()
})

test('abre no Início com a data por extenso e "Bem-vindo!"', async () => {
  const { pagina } = aberto
  await expect(pagina.getByRole('heading', { level: 1 })).toHaveText('Bem-vindo!')
  await expect(pagina.getByText('Sexta-feira, 16 de outubro de 2026')).toBeVisible()
  await expect(pagina.getByRole('link', { name: 'Início' })).toHaveClass(/on/)
})

test('o menu leva a todas as telas, na ordem do protótipo', async () => {
  const { pagina } = aberto
  const telas: [string, string][] = [
    ['Vendas e Pedidos', 'Vendas e Pedidos'],
    ['Cadastros', 'Cadastros'],
    ['Produção e Receitas', 'Produção e Receitas'],
    ['Estoque e Insumos', 'Estoque e Insumos'],
    ['Perdas', 'Perdas'],
    ['Contas a pagar', 'Contas a pagar'],
    ['Sócios', 'Sócios e Divisão do Lucro'],
    ['Patrimônio', 'Patrimônio'],
    ['Relatórios', 'Relatórios'],
    ['Início', 'Bem-vindo!']
  ]
  const menu = pagina.getByRole('navigation', { name: 'Menu principal' })
  const itens = await menu.locator('a.nav').allInnerTexts()
  expect(itens.map((t) => t.trim())).toEqual([
    'Início',
    ...telas.slice(0, -1).map(([item]) => item)
  ])
  for (const [item, titulo] of telas) {
    await menu.getByRole('link', { name: item, exact: true }).click()
    await expect(pagina.getByRole('heading', { level: 1 })).toHaveText(titulo)
    await expect(menu.getByRole('link', { name: item, exact: true })).toHaveClass(/on/)
  }
  await pagina.getByRole('link', { name: 'Configurações' }).click()
  await expect(pagina.getByRole('heading', { level: 1 })).toHaveText('Configurações')
})

test('A+ e A− mudam a letra de 80% a 130% e o menu não muda', async () => {
  const { pagina } = aberto
  const tamanhoTitulo = () =>
    pagina
      .getByRole('heading', { level: 1 })
      .evaluate((h) => parseFloat(getComputedStyle(h).fontSize))
  const larguraMenu = () =>
    pagina.locator('nav.menu').evaluate((n) => n.getBoundingClientRect().width)

  expect(await tamanhoTitulo()).toBeCloseTo(44, 0)
  await definirEscala(pagina, 130)
  expect(await tamanhoTitulo()).toBeCloseTo(44 * 1.3, 0)
  await expect(pagina.getByRole('button', { name: 'Aumentar a letra' })).toBeDisabled()
  await definirEscala(pagina, 80)
  expect(await tamanhoTitulo()).toBeCloseTo(44 * 0.8, 0)
  await expect(pagina.getByRole('button', { name: 'Diminuir a letra' })).toBeDisabled()
  expect(await larguraMenu()).toBe(292)
})

test('o menu fica parado quando a tela rola (D-084)', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/relatorios')
  await definirEscala(pagina, 130)
  const rolou = await pagina.evaluate(() => {
    window.scrollTo(0, 500)
    return window.scrollY
  })
  expect(rolou).toBeGreaterThan(0)
  const menu = await pagina
    .locator('nav.menu')
    .evaluate((n) => ({ topo: n.getBoundingClientRect().top, altura: n.clientHeight }))
  expect(menu.topo).toBe(0)
  expect(menu.altura).toBe(await pagina.evaluate(() => window.innerHeight))
  await expect(pagina.getByRole('link', { name: 'Relatórios' })).toBeInViewport()
  await definirEscala(pagina, 100)
})

test('"Ajuda ligada/desligada" esconde e mostra todos os "?"', async () => {
  const { pagina } = aberto
  const ajudas = pagina.getByRole('button', { name: /^Ajuda:/ })
  expect(await ajudas.count()).toBeGreaterThan(0)
  await ajudas.first().hover()
  await expect(pagina.getByRole('tooltip')).toContainText('Cópia de segurança automática')
  await pagina.getByRole('button', { name: '? Ajuda ligada' }).click()
  await expect(ajudas).toHaveCount(0)
  await pagina.getByRole('button', { name: '? Ajuda desligada' }).click()
  await expect.poll(() => ajudas.count()).toBeGreaterThan(0)
})

test('abrir o programa duas vezes não cria uma segunda janela', async () => {
  const { _electron } = await import('@playwright/test')
  const ambiente = { ...process.env }
  delete ambiente.ELECTRON_RUN_AS_NODE
  const segundo = await _electron
    .launch({
      args: ['.'],
      env: {
        ...ambiente,
        BIGLAKE_E2E: '1',
        BIGLAKE_DADOS: aberto.pastas.dados,
        BIGLAKE_COPIAS: aberto.pastas.copias,
        BIGLAKE_PENDRIVE: ''
      } as Record<string, string>
    })
    .catch(() => null)
  // O segundo processo sai sozinho; se chegou a abrir, não pode ter janela.
  if (segundo) {
    await expect.poll(async () => segundo.windows().length, { timeout: 3000 }).toBe(0)
    await segundo.close().catch(() => {})
  }
  expect(aberto.app.windows()).toHaveLength(1)
})
