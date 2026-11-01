import { expect, test, type Page } from '@playwright/test'
import { abrirApp, irPara, type AppAberto } from './app'

let aberto: AppAberto
let ids: { morango: number; liga: number; categoria: number; receita: number }

test.beforeEach(async () => {
  aberto = await abrirApp()
  ids = await prepararPaletaDeMorango(aberto.pagina)
})

test.afterEach(async () => {
  await aberto.app.close()
})

/** Paleta de Morango recheada (T2), com o morango a R$ 14,00 (antes do aumento do T3). */
async function prepararPaletaDeMorango(pagina: Page) {
  return pagina.evaluate(async () => {
    const item = async (
      nome: string,
      unidade: 'un' | 'L' | 'kg',
      custo: number,
      tipo: 'materia_prima' | 'insumo' = 'materia_prima'
    ) => {
      const r = await window.api.estoque.cadastrar({
        tipo,
        unidade,
        nomeUnidade: null,
        nome,
        quantidade: 1000,
        valorPago: custo as never,
        fornecedorId: null,
        minimo: 0,
        validade: null
      })
      if (!r.ok) throw new Error(r.mensagem)
      return r.valor
    }
    const morango = await item('Morango', 'kg', 1400)
    const acucar = await item('Açúcar refinado', 'kg', 420)
    const condensado = await item('Leite condensado', 'un', 690)
    const creme = await item('Creme de leite', 'L', 2150)
    const leite = await item('Leite integral', 'L', 489)
    const liga = await item('Liga neutra', 'kg', 3200)
    const palito = await item('Palito', 'un', 8, 'insumo')
    const saquinho = await item('Saquinho plástico', 'un', 27, 'insumo')
    const etiqueta = await item('Etiqueta', 'un', 6, 'insumo')
    await window.api.gasEnergia.salvar({
      modo: 'ingrediente',
      precoPorVez: 800 as never,
      valorFixo: 0 as never
    })
    // a categoria Paleta já vem no sistema (D-062)
    const paleta = (await window.api.categorias.listar()).find((c) => c.nome === 'Paleta')!
    const r = await window.api.receitas.salvar(null, {
      nome: 'Paleta de Morango recheada',
      categoriaId: paleta.id,
      rendimento: 100,
      ingredientes: [
        { itemId: morango, quantidade: 5000 },
        { itemId: acucar, quantidade: 2500 },
        { itemId: condensado, quantidade: 15000 },
        { itemId: creme, quantidade: 2500 },
        { itemId: leite, quantidade: 5000 },
        { itemId: liga, quantidade: 120 }
      ],
      embalagens: [palito, saquinho, etiqueta],
      gasVezes: 1000,
      gasValor: null,
      precoBalcao: 1000 as never,
      precoAtacado: 700 as never,
      nomeUnidade: 'paleta'
    })
    if (!r.ok) throw new Error(r.mensagem)
    return { morango, liga, categoria: paleta.id, receita: r.valor }
  })
}

test('cadastrar produto à venda: preço da categoria, custo e lucro da receita', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/cadastros?aba=produtos')
  await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar produto à venda' })
  await modal.getByRole('combobox', { name: 'Categoria' }).click()
  await pagina.getByRole('option', { name: 'Paleta', exact: true }).click()
  await modal.getByLabel('Nome / sabor').fill('Paleta de Morango recheada')
  await modal.getByLabel('Peso ou volume', { exact: true }).fill('110')
  await modal.getByRole('combobox', { name: 'Receita usada' }).click()
  await pagina.getByRole('option', { name: 'Paleta de Morango recheada' }).click()
  await expect(modal.locator('.quadro-venda')).toContainText('R$ 10,00')
  await expect(modal.locator('.quadro-venda')).toContainText('R$ 7,00')
  await expect(modal.locator('.caixa-valor').nth(0)).toContainText('R$ 3,15')
  await expect(modal.locator('.caixa-valor').nth(1)).toContainText('R$ 6,85')
  await expect(modal.locator('.caixa-valor').nth(2)).toContainText('R$ 3,85')
  await modal.getByRole('button', { name: 'Salvar produto' }).click()
  await expect(pagina.getByText('✓ Produto Paleta de Morango recheada cadastrado.')).toBeVisible()
  const linha = pagina.getByRole('row', { name: /Paleta de Morango recheada/ })
  await expect(linha).toContainText('Paleta · 1 unidade · 110 g')
  await expect(linha).toContainText('R$ 3,15')
  await expect(linha).toContainText('R$ 6,85')
  await expect(pagina.getByRole('button', { name: 'Paleta', exact: true })).toBeVisible()
})

test('receita usada em produto não pode ser excluída', async () => {
  const { pagina } = aberto
  await pagina.evaluate(
    ({ categoria, receita }) =>
      window.api.produtos.salvar(null, {
        categoriaId: categoria,
        nome: 'Paleta de Morango recheada',
        vendidoComo: 'unidade',
        medida: 110000,
        medidaUnidade: 'g',
        unidadesPorCaixa: null,
        receitaId: receita
      }),
    ids
  )
  await irPara(pagina, '#/producao?aba=receitas')
  const linha = pagina.getByRole('row', { name: /Paleta de Morango/ })
  await linha.getByRole('button', { name: 'Excluir Paleta de Morango recheada' }).click()
  await expect(linha).toContainText('Não dá para excluir: é usada em 1 produto à venda.')
})

test('T3: o custo subiu aparece em Produção; "Ver receita" abre a receita; "Entendi" tira o aviso', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/estoque?entrada=1')
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar insumo / entrada de mercadoria' })
  await modal.getByRole('combobox', { name: 'Qual item chegou?' }).click()
  await pagina.getByRole('option', { name: 'Morango · kg' }).click()
  await modal.getByLabel('Quantidade (kg)').fill('20')
  await modal.getByLabel('Valor pago (R$)').fill('360')
  await modal.getByRole('radio', { name: 'Não', exact: true }).click()
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal).toBeHidden()

  // bolinha no menu (no canto do ícone, sem alargar o menu) e o menu abre direto em Avisos (D-079)
  await irPara(pagina, '#/')
  const itemMenu = pagina.getByRole('link', { name: /Produção e Receitas/ })
  await expect(itemMenu.getByLabel('1 aviso de custo')).toHaveText('1')
  expect(await pagina.locator('nav.menu').evaluate((e) => e.getBoundingClientRect().width)).toBe(
    292
  )
  await itemMenu.click()
  await expect(pagina.getByRole('tab', { name: 'Avisos (1)' })).toHaveAttribute(
    'aria-selected',
    'true'
  )

  // o aviso fica só na aba Avisos, com a bolinha do número (D-078)
  await irPara(pagina, '#/producao?aba=receitas')
  await expect(pagina.getByRole('tab', { name: 'Avisos (1)' })).toBeVisible()
  await expect(pagina.locator('.aviso-custo')).toHaveCount(0)
  await pagina.getByRole('tab', { name: 'Avisos (1)' }).click()
  const aviso = pagina.locator('.aviso-custo')
  await expect(aviso.getByRole('heading')).toHaveText('O custo subiu: Morango')
  await expect(aviso).toContainText(
    'Em 16/10, Morango passou de R$ 14,00 para R$ 18,00 por quilo (+29%). Estas receitas ficaram mais caras:'
  )
  const linha = aviso.locator('.aviso-linha')
  await expect(linha).toContainText('Paleta de Morango recheada')
  await expect(linha).toContainText('Preço no balcão: R$ 10,00')
  await expect(linha).toContainText('R$ 3,15 → R$ 3,35')
  await expect(linha).toContainText('R$ 6,85 → R$ 6,65')

  await linha.getByRole('button', { name: 'Ver receita' }).click()
  await expect(pagina.getByRole('dialog', { name: 'Editar receita' })).toBeVisible()
  await pagina.getByRole('button', { name: 'Fechar sem salvar' }).click()

  // pior caso: 1280×720 com letra a 130%
  await aberto.app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setContentSize(1280, 720)
  )
  for (let i = 0; i < 3; i++) await pagina.getByRole('button', { name: 'Aumentar a letra' }).click()
  expect(
    await pagina.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
  ).toBe(false)

  // "Ver receita" levou para Receitas; volta para Avisos
  await pagina.getByRole('tab', { name: 'Avisos (1)' }).click()
  await aviso.getByRole('button', { name: 'Entendi' }).click()
  await expect(pagina.locator('.aviso-custo')).toHaveCount(0)
  await expect(pagina.getByRole('tab', { name: 'Avisos', exact: true })).toBeVisible()
  await expect(pagina.getByText('Nenhum aviso agora.')).toBeVisible()
  await expect(pagina.getByLabel('1 aviso de custo')).toHaveCount(0)
})

test('apagar ingrediente usado em receita: modal com as receitas, e Desfazer devolve', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/estoque')
  await pagina.getByRole('button', { name: 'Excluir Liga neutra' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Apagar Liga neutra?' })
  await expect(modal).toContainText('Liga neutra é usado nestas receitas')
  await expect(modal.getByRole('listitem')).toHaveText(['Paleta de Morango recheada'])
  await modal.getByRole('button', { name: 'Não apagar' }).click()
  await expect(pagina.getByRole('row', { name: /Liga neutra/ })).toBeVisible()

  await pagina.getByRole('button', { name: 'Excluir Liga neutra' }).click()
  await pagina.getByRole('button', { name: 'Sim, apagar e tirar das receitas' }).click()
  await expect(pagina.getByRole('row', { name: /Liga neutra/ })).toHaveCount(0)
  await irPara(pagina, '#/producao?aba=receitas')
  // sem a liga (R$ 3,84 na receita): 3,1504 − 0,0384 = 3,1120
  await expect(pagina.getByRole('row', { name: /Paleta de Morango/ })).toContainText('R$ 3,11')

  await irPara(pagina, '#/estoque')
  // a faixa do Desfazer some ao trocar de tela; desfaz pela API, como o botão faz
  await pagina.evaluate((id) => window.api.estoque.desfazerExclusao(id), ids.liga)
  await irPara(pagina, '#/producao?aba=receitas')
  await expect(pagina.getByRole('row', { name: /Paleta de Morango/ })).toContainText('R$ 3,15')
})
