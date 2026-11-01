import { expect, test } from '@playwright/test'
import { abrirApp, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
  await aberto.pagina.evaluate(() => (location.hash = '#/vitrine'))
  await expect(aberto.pagina.getByRole('heading', { level: 1 })).toHaveText(
    'Vitrine de componentes'
  )
})

test.afterEach(async () => {
  await aberto.app.close()
})

test('botão vermelho abre o modal padrão; "✕ Fechar" e Esc fecham', async () => {
  const { pagina } = aberto
  await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar produto à venda' })
  await expect(modal).toBeVisible()
  await modal.getByRole('button', { name: '✕ Fechar' }).click()
  await expect(modal).toBeHidden()

  await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
  await pagina.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('validação aparece embaixo do campo, em linguagem simples', async () => {
  const { pagina } = aberto
  await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal.getByText('Digite o nome.')).toBeVisible()
  await expect(modal.getByLabel('Nome / sabor')).toHaveAttribute('aria-invalid', 'true')
})

test('campos de dinheiro, quantidade e data leem o que se digita', async () => {
  const { pagina } = aberto
  await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByLabel('Valor pago (R$)').fill('1234,5')
  await modal.getByLabel('Quantidade').fill('0,12')
  await modal.getByLabel('Validade', { exact: true }).fill('16102026')
  await expect(modal.getByLabel('Validade', { exact: true })).toHaveValue('16/10/2026')
  await expect(modal.getByText('Valores lidos: R$ 1.234,50 · 120 · 2026-10-16')).toBeVisible()
  await modal.getByLabel('Nome / sabor').click()
  await expect(modal.getByLabel('Valor pago (R$)')).toHaveValue('1.234,50')
})

test('lista suspensa: ✓ na escolhida, criar, remover com confirmação, "em uso" e fechar ao clicar fora', async () => {
  const { pagina } = aberto
  await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
  const modal = pagina.getByRole('dialog')
  const lista = modal.getByRole('combobox', { name: 'Categoria' })
  await expect(lista).toContainText('Paleta')

  await lista.click()
  const painel = pagina.getByRole('listbox')
  await expect(painel.getByRole('option', { name: 'Paleta', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(painel.getByText('em uso · 8 produtos')).toBeVisible()

  // criar
  await painel.getByLabel('Nome novo').fill('Açaí no copo')
  await painel.getByRole('button', { name: '+ Criar' }).click()
  await expect(painel.getByRole('option', { name: 'Açaí no copo', exact: true })).toBeVisible()
  await painel.getByLabel('Nome novo').fill('paleta')
  await painel.getByRole('button', { name: '+ Criar' }).click()
  await expect(painel.getByText('Já existe uma categoria com esse nome.')).toBeVisible()

  // remover só o que não está em uso, com "Sim / Não"
  await painel.getByRole('button', { name: 'Remover Açaí', exact: true }).click()
  await painel.getByRole('button', { name: 'Não' }).click()
  await expect(painel.getByRole('option', { name: 'Açaí', exact: true })).toBeVisible()
  await painel.getByRole('button', { name: 'Remover Açaí', exact: true }).click()
  await painel.getByRole('button', { name: 'Sim' }).click()
  await expect(painel.getByRole('option', { name: 'Açaí', exact: true })).toHaveCount(0)

  // Esc fecha só a lista; clicar fora também fecha
  await pagina.keyboard.press('Escape')
  await expect(painel).toBeHidden()
  await expect(modal).toBeVisible()
  await lista.click()
  await expect(pagina.getByRole('listbox')).toBeVisible()
  await pagina.mouse.click(5, 5) // fundo escurecido, fora da lista
  await expect(modal).toBeVisible() // clicar fora não fecha o modal
  await expect(pagina.getByRole('listbox')).toBeHidden()
})

test('lista suspensa dentro do modal flutua por cima e não cria rolagem no modal', async () => {
  const { pagina } = aberto
  await pagina.getByRole('button', { name: '+ Cadastrar produto' }).click()
  const modal = pagina.getByRole('dialog')
  const alturaAntes = await modal.evaluate((m) => m.scrollHeight)
  await modal.getByRole('combobox', { name: 'Categoria' }).click()
  const painel = pagina.getByRole('listbox')
  await expect(painel).toBeVisible()
  expect(await modal.evaluate((m) => m.scrollHeight)).toBe(alturaAntes)
  // o painel fica inteiro dentro da janela
  const caixa = await painel.boundingBox()
  const janela = await pagina.evaluate(() => ({ l: innerWidth, a: innerHeight }))
  expect(caixa).not.toBeNull()
  expect(caixa!.y).toBeGreaterThanOrEqual(0)
  expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(janela.a)
  expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(janela.l)
})

test('excluir pede confirmação na linha e oferece Desfazer', async () => {
  const { pagina } = aberto
  const linha = pagina.getByRole('row', { name: /Paleta de Maracujá/ })
  await linha.getByRole('button', { name: 'Excluir' }).click()
  await expect(linha).toHaveClass(/confirmando/)
  await linha.getByRole('button', { name: 'Não' }).click()
  await expect(linha).not.toHaveClass(/confirmando/)

  await linha.getByRole('button', { name: 'Excluir' }).click()
  await linha.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByRole('row', { name: /Paleta de Maracujá/ })).toHaveCount(0)
  await expect(pagina.getByText('“Paleta de Maracujá” foi excluído da lista.')).toBeVisible()
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(pagina.getByRole('row').nth(1)).toContainText('Paleta de Maracujá')
})
