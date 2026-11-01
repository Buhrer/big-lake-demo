// Ajustes do teste de uso de 2 meses (D-089 a D-095).
import { expect, test, type Page } from '@playwright/test'
import {
  abrirApp,
  definirEscala,
  irPara,
  pastasNovas,
  temRolagemHorizontal,
  type AppAberto
} from './app'

let aberto: AppAberto

test.afterEach(async () => {
  await aberto?.app.close().catch(() => {})
})

const dinheiroDe15 = (pagina: Page) =>
  pagina.evaluate(async () => (await window.api.vendas.fechamento('2026-10-15'))?.dinheiro)

async function lancar15(pagina: Page) {
  await pagina.evaluate(() =>
    window.api.vendas.salvarFechamento({
      data: '2026-10-15',
      lojaFechada: false,
      dinheiro: 24063 as never,
      pix: 0 as never,
      debito: 0 as never,
      credito: 0 as never
    })
  )
}

test('número errado no balcão: mostra o motivo e não grava zero (D-089)', async () => {
  aberto = await abrirApp(1280, 720)
  const { pagina } = aberto
  await lancar15(pagina)
  await irPara(pagina, '#/vendas')
  await pagina.getByLabel('Dia', { exact: true }).fill('15102026')
  const dinheiro = pagina.getByLabel('Dinheiro (R$)')
  await expect(dinheiro).toHaveValue('240,63')

  for (const [texto, motivo] of <[string, string][]>[
    ['-50', 'Não use o sinal de menos.'],
    ['abc', 'Número com erro. Use só algarismos e vírgula, como 1.234,56.'],
    ['1,2,3', 'Número com erro. Use só algarismos e vírgula, como 1.234,56.'],
    ['99999999999', 'Número grande demais. Confira.']
  ]) {
    await dinheiro.fill(texto)
    await pagina.getByRole('button', { name: 'Salvar correção' }).click()
    await expect(pagina.getByText(motivo)).toBeVisible()
    await expect(
      pagina.getByText(
        'Há um número digitado errado (marcado em vermelho). Corrija antes de salvar.'
      )
    ).toBeVisible()
    expect(await dinheiroDe15(pagina)).toBe(24063)
    expect(await temRolagemHorizontal(pagina)).toBe(false)
  }
  await dinheiro.fill('250')
  await pagina.getByRole('button', { name: 'Salvar correção' }).click()
  await expect(pagina.getByText('✓ Vendas de 15/10 lançadas!', { exact: false })).toBeVisible()
  expect(await dinheiroDe15(pagina)).toBe(25000)
})

test('balcão todo zerado pergunta se a loja abriu (D-095)', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/vendas')
  await pagina.getByLabel('Dia', { exact: true }).fill('14102026')
  await pagina.getByRole('button', { name: 'Salvar vendas do dia' }).click()
  await expect(pagina.getByText('Está tudo zerado. A loja não abriu neste dia?')).toBeVisible()
  await pagina.getByRole('button', { name: 'Sim, a loja não abriu' }).click()
  await expect(pagina.getByText('✓ Dia 14/10 marcado como loja fechada.')).toBeVisible()

  await pagina.getByLabel('Dia', { exact: true }).fill('13102026')
  await pagina.getByRole('button', { name: 'Salvar vendas do dia' }).click()
  await pagina.getByRole('button', { name: 'Não, salvar com R$ 0,00' }).click()
  await expect(
    pagina.getByText('✓ Vendas de 13/10 lançadas! Total de R$ 0,00.', { exact: false })
  ).toBeVisible()
})

test('clique duplo não grava duas vezes: conta, perda e retirada (D-090)', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await pagina.evaluate(() =>
    window.api.estoque.cadastrar({
      tipo: 'materia_prima',
      unidade: 'kg',
      nomeUnidade: null,
      nome: 'Açúcar refinado',
      quantidade: 50_000,
      valorPago: 21000 as never,
      fornecedorId: null,
      minimo: 0,
      validade: null
    })
  )

  await irPara(pagina, '#/contas')
  await pagina.getByRole('button', { name: '+ Nova conta' }).click()
  const conta = pagina.getByRole('dialog', { name: 'Nova conta' })
  await conta.getByLabel('O que é').fill('Internet fibra')
  await conta.getByLabel('Valor (R$)').fill('99,90')
  await conta.getByLabel('Vencimento').fill('30102026')
  await conta.getByRole('combobox', { name: 'Tipo de conta' }).click()
  await pagina.getByRole('option', { name: 'Contas fixas', exact: true }).click()
  await conta.getByRole('button', { name: 'Salvar conta' }).dblclick()
  await expect(conta).toBeHidden()

  await irPara(pagina, '#/perdas')
  await pagina.getByRole('button', { name: '+ Registrar perda' }).click()
  const perda = pagina.getByRole('dialog', { name: 'Registrar perda' })
  await perda.getByRole('radio', { name: /Matéria-prima ou insumo/ }).click()
  await perda.getByRole('button', { name: /^Açúcar refinado/ }).click()
  await perda.getByLabel('Quantidade de Açúcar refinado').fill('1')
  await perda.getByRole('button', { name: 'Salvar perda' }).dblclick()
  await expect(perda).toBeHidden()

  await irPara(pagina, '#/socios')
  await pagina.getByRole('button', { name: '+ Registrar retirada' }).click()
  const retirada = pagina.getByRole('dialog', { name: 'Registrar retirada' })
  await retirada.getByRole('radio', { name: 'Paulo' }).click()
  await retirada.getByLabel('Valor (R$)').fill('100')
  await retirada.getByRole('combobox', { name: 'Como pegou' }).click()
  await pagina.getByRole('option', { name: 'Dinheiro do caixa', exact: true }).click()
  await retirada.getByRole('button', { name: 'Salvar retirada' }).dblclick()
  await expect(retirada).toBeHidden()

  const quantos = await pagina.evaluate(async () => ({
    contas: (await window.api.contas.listar()).filter((c) => c.nome === 'Internet fibra').length,
    perdas: (await window.api.perdas.listar('2026-10')).length,
    retiradas: (await window.api.socios.mes('2026-10')).retiradas.length
  }))
  expect(quantos).toEqual({ contas: 1, perdas: 1, retiradas: 1 })
})

test('Esc depois de digitar pergunta antes de fechar o modal (D-091)', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/contas')
  // sem digitar nada, Esc fecha direto
  await pagina.getByRole('button', { name: '+ Nova conta' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Nova conta' })
  await pagina.keyboard.press('Escape')
  await expect(modal).toBeHidden()

  await pagina.getByRole('button', { name: '+ Nova conta' }).click()
  await modal.getByLabel('O que é').fill('Internet')
  await pagina.keyboard.press('Escape')
  await expect(modal).toBeVisible()
  const pergunta = modal.getByText('Fechar sem salvar? O que você digitou vai se perder.')
  await expect(pergunta).toBeVisible()
  await modal.getByRole('button', { name: 'Não, continuar' }).click()
  await expect(pergunta).toBeHidden()
  await expect(modal.getByLabel('O que é')).toHaveValue('Internet')
  // Esc de novo com a pergunta aberta = continuar
  await pagina.keyboard.press('Escape')
  await pagina.keyboard.press('Escape')
  await expect(modal).toBeVisible()
  await pagina.keyboard.press('Escape')
  await modal.getByRole('button', { name: 'Sim, fechar' }).click()
  await expect(modal).toBeHidden()
})

test('data do computador antes do último uso: faixa vermelha em todas as telas (D-093)', async () => {
  const pastas = pastasNovas()
  aberto = await abrirApp(1366, 768, pastas, '29/10/2026')
  await expect(aberto.pagina.getByText(/A data do computador parece errada/)).toHaveCount(0)
  await aberto.app.close()

  aberto = await abrirApp(1366, 768, pastas, '01/10/2026')
  const { pagina } = aberto
  const faixa = pagina.getByRole('alert').filter({ hasText: 'A data do computador parece errada' })
  await expect(faixa).toContainText(
    'hoje está 01/10/2026, mas o programa já foi usado em 29/10/2026.'
  )
  await irPara(pagina, '#/vendas')
  await expect(faixa).toBeVisible()
})

test('modal de entrada com a conta da compra a 130% em 1280×720: sem rolagem horizontal', async () => {
  aberto = await abrirApp(1280, 720)
  const { pagina } = aberto
  await definirEscala(pagina, 130)
  await irPara(pagina, '#/estoque')
  await pagina.getByRole('button', { name: '+ Cadastrar insumo' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByLabel('Valor pago (R$)').fill('210')
  for (const opcao of ['Sim, já paguei', 'Sim, vou pagar depois']) {
    await modal.getByRole('radio', { name: opcao }).click()
    expect(await modal.evaluate((m) => m.scrollWidth > m.clientWidth), opcao).toBe(false)
  }
  await modal.getByRole('radio', { name: 'Sim, já paguei' }).click()
  await modal.getByRole('radio', { name: 'Cartão de crédito' }).click()
  expect(await modal.evaluate((m) => m.scrollWidth > m.clientWidth)).toBe(false)
  expect(await temRolagemHorizontal(pagina)).toBe(false)
})
