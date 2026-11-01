import { expect, test, type Page } from '@playwright/test'
import { abrirApp, definirEscala, irPara, temRolagemHorizontal, type AppAberto } from './app'

let aberto: AppAberto

test.afterEach(async () => {
  await aberto.app.close()
})

async function cadastrarFurgao(pagina: Page) {
  await pagina.getByRole('button', { name: '+ Cadastrar bem' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Novo bem da empresa' })
  await modal.getByLabel('O que é').fill('Furgão de entrega 2019')
  await modal.getByRole('combobox', { name: 'Tipo' }).click()
  await pagina.getByRole('option', { name: 'Veículo' }).click()
  await modal.getByLabel('Data da compra').fill('032022')
  await expect(modal.getByLabel('Data da compra')).toHaveValue('03/2022')
  await modal.getByLabel('Valor pago (R$)').fill('68000')
  await modal.getByLabel('Placa / nº de série').fill('ABC-1D23')
  await modal.getByRole('button', { name: 'Salvar bem' }).click()
  await expect(pagina.getByText('✓ Bem cadastrado.')).toBeVisible()
}

test('T12: bem, manutenção paga no Pix, conta em Contas a pagar, editar, excluir e desfazer', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/patrimonio')
  await expect(pagina.getByText('Nenhum bem cadastrado ainda.')).toBeVisible()
  await cadastrarFurgao(pagina)

  const linha = pagina.getByRole('row', { name: /Furgão de entrega 2019/ })
  await expect(linha).toContainText('Veículo · ABC-1D23')
  await expect(linha).toContainText('03/2022')
  await expect(linha).toContainText('R$ 68.000,00')
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText('1 item')
  await pagina.getByRole('button', { name: 'Móveis' }).click()
  await expect(pagina.getByText('Nenhum bem deste tipo.')).toBeVisible()
  await pagina.getByRole('button', { name: 'Todos' }).click()

  // manutenção pela linha do bem: o bem já vem escolhido
  await linha.getByRole('button', { name: 'Manutenção de Furgão de entrega 2019' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Registrar manutenção' })
  await expect(modal.getByRole('combobox', { name: 'Qual patrimônio?' })).toContainText(
    'Furgão de entrega 2019'
  )
  await expect(modal.getByText('Nenhuma manutenção ainda.')).toBeVisible()
  await modal.getByLabel('O que foi feito').fill('Troca de óleo e filtros')
  await modal.getByLabel('Quem fez').fill('Auto Center Silva')
  await modal.getByLabel('Valor (R$)').fill('450')
  await expect(modal.getByText('Garantia vale até 14/01/2027.')).toBeVisible()
  await expect(modal.getByRole('radio', { name: 'Conserto' })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await modal.getByRole('button', { name: 'Salvar manutenção' }).click()
  await expect(modal.getByText('Escolha como a conta foi paga.')).toBeVisible()
  await modal.getByRole('radio', { name: 'Pix' }).click()
  await modal.getByRole('button', { name: 'Salvar manutenção' }).click()
  await expect(
    pagina.getByText(
      '✓ Manutenção do Furgão de entrega 2019 registrada. Ela já está em Contas a pagar como paga.'
    )
  ).toBeVisible()

  // a conta paga em Contas a pagar; lá só se paga (D-070)
  await pagina.getByRole('link', { name: 'Ver em Contas a pagar' }).click()
  const conta = pagina.getByRole('row', {
    name: /Troca de óleo e filtros · Furgão de entrega 2019/
  })
  await expect(conta).toContainText('Manutenção')
  await expect(conta).toContainText('R$ 450,00')
  await expect(conta).toContainText('pago com Pix')
  await conta.getByRole('button', { name: /^Editar/ }).click()
  await expect(pagina.getByText(/vem de uma manutenção\. Corrija em Patrimônio/)).toBeVisible()
  await expect(pagina.getByRole('dialog')).toHaveCount(0)
  await pagina.getByRole('link', { name: 'Ir para Patrimônio' }).click()

  // aba Manutenções: resumo do ano e histórico
  await expect(pagina.getByRole('tab', { name: 'Manutenções' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText('Gasto com manutenção em 2026')
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText('R$ 450,00')
  await expect(pagina.locator('.kpi-card').nth(1)).toContainText('1 conserto')
  await expect(pagina.locator('.kpi-card').nth(2)).toContainText('Furgão de entrega 2019')
  const hist = pagina.getByRole('row', { name: /16\/10\/2026.*Troca de óleo e filtros/ })
  await expect(hist).toContainText('feito por Auto Center Silva')
  await expect(hist).toContainText('Conserto')

  // corrigir: muda a conta junto; o pagamento continua
  await hist.getByRole('button', { name: /^Editar/ }).click()
  const edicao = pagina.getByRole('dialog', { name: 'Corrigir manutenção' })
  await expect(edicao.getByText(/A conta já está paga \(pago com Pix em 16\/10\)/)).toBeVisible()
  await expect(edicao.getByRole('radio', { name: 'Sim, já paguei' })).toHaveCount(0)
  await edicao.getByLabel('Valor (R$)').fill('380')
  await edicao.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(pagina.getByText('✓ Alterações da manutenção salvas.')).toBeVisible()
  await expect(hist).toContainText('R$ 380,00')

  // bem com manutenção não sai (D-067)
  await pagina.getByRole('tab', { name: 'Bens da empresa' }).click()
  await linha.getByRole('button', { name: /^Editar/ }).click()
  await expect(pagina.getByText('Tem 1 manutenção: não dá para excluir')).toBeVisible()
  await pagina.getByRole('button', { name: 'Cancelar' }).click()

  // excluir a manutenção tira a conta; desfazer traz de volta
  await pagina.getByRole('tab', { name: 'Manutenções' }).click()
  await hist.getByRole('button', { name: /^Excluir/ }).click()
  await pagina.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText(/foi excluída e a conta saiu de Contas a pagar/)).toBeVisible()
  expect(await pagina.evaluate(async () => (await window.api.contas.listar()).length)).toBe(0)
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(hist).toBeVisible()
  expect(await pagina.evaluate(async () => (await window.api.contas.listar())[0]?.valor)).toBe(
    38000
  )
})

test('manutenção não paga vai para Contas a pagar com o vencimento digitado', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/patrimonio')
  await cadastrarFurgao(pagina)
  await pagina.getByRole('tab', { name: 'Manutenções' }).click()
  await pagina.getByRole('button', { name: '+ Registrar manutenção' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Registrar manutenção' })
  await modal.getByRole('combobox', { name: 'Qual patrimônio?' }).click()
  await pagina.getByRole('option', { name: 'Furgão de entrega 2019' }).click()
  await modal.getByLabel('O que foi feito').fill('Revisão dos 60.000 km')
  await modal.getByLabel('Valor (R$)').fill('900')
  await modal.getByRole('radio', { name: 'Revisão (preventiva)' }).click()
  await modal.getByRole('radio', { name: 'Não, vou pagar depois' }).click()
  await modal.getByRole('button', { name: 'Salvar manutenção' }).click()
  await expect(modal.getByText('Digite quando a conta vence.')).toBeVisible()
  await modal.getByLabel('Vence em').fill('05/11/2026')
  await modal.getByRole('button', { name: 'Salvar manutenção' }).click()
  await expect(pagina.getByText(/Ela está em Contas a pagar para pagar depois\./)).toBeVisible()
  const hist = pagina.getByRole('row', { name: /Revisão dos 60\.000 km/ })
  await expect(hist).toContainText('a pagar · vence 05/11')
  await expect(hist).toContainText('Revisão')
  const conta = await pagina.evaluate(async () => (await window.api.contas.listar())[0]!)
  expect(conta).toMatchObject({ vencimento: '2026-11-05', pagamento: null, valor: 90000 })
})

test('modal de manutenção a 130% em 1280×720 não cria rolagem horizontal', async () => {
  aberto = await abrirApp(1280, 720)
  const { pagina } = aberto
  await irPara(pagina, '#/patrimonio')
  await cadastrarFurgao(pagina)
  await definirEscala(pagina, 130)
  await pagina.getByRole('button', { name: 'Manutenção de Furgão de entrega 2019' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByLabel('Valor (R$)').fill('450')
  await modal.getByRole('radio', { name: 'Cartão de crédito' }).click()
  expect(await modal.evaluate((m) => m.scrollWidth > m.clientWidth)).toBe(false)
  expect(await temRolagemHorizontal(pagina)).toBe(false)
})
