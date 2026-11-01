import { expect, test, type Page } from '@playwright/test'
import { abrirApp, definirEscala, irPara, temRolagemHorizontal, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
})

test.afterEach(async () => {
  await aberto.app.close()
})

async function escolherNaLista(pagina: Page, campo: string, opcao: string) {
  await pagina.getByRole('dialog').getByRole('combobox', { name: campo }).click()
  await pagina.getByRole('option', { name: opcao, exact: true }).click()
}

async function novaConta(
  pagina: Page,
  {
    nome,
    valor,
    vencimento,
    tipo
  }: { nome: string; valor: string; vencimento: string; tipo: string }
) {
  await irPara(pagina, '#/contas')
  await pagina.getByRole('button', { name: '+ Nova conta' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Nova conta' })
  await modal.getByLabel('O que é').fill(nome)
  await modal.getByLabel('Valor (R$)').fill(valor)
  await modal.getByLabel('Vencimento').fill(vencimento)
  await escolherNaLista(pagina, 'Tipo de conta', tipo)
  return modal
}

const menuContas = (pagina: Page) => pagina.getByRole('link', { name: /Contas a pagar/ })

test('T11 + T7: pagar no cartão pessoal do Carlos → reembolso em Sócios; Desfazer tira', async () => {
  const { pagina } = aberto
  const modal = await novaConta(pagina, {
    nome: 'Energia elétrica',
    valor: '2950',
    vencimento: '17/10/2026',
    tipo: 'Energia'
  })
  await modal.getByRole('radio', { name: 'Sim, todo mês' }).click()
  await modal.getByRole('button', { name: 'Salvar conta' }).click()
  await expect(modal).toBeHidden()

  const linha = pagina.getByRole('row', { name: /Energia elétrica/ })
  await expect(linha).toContainText('17/10')
  await expect(linha).toContainText('Amanhã')
  await expect(linha).toContainText('Todo mês')
  await expect(linha).toContainText('R$ 2.950,00')
  await expect(pagina.locator('.kpi-card').first()).toContainText('R$ 2.950,00')
  await expect(menuContas(pagina).locator('.badge')).toHaveText('1')

  // Marcar como paga: cartão de crédito novo, pessoal do Carlos
  await linha.getByRole('button', { name: 'Marcar Energia elétrica como paga' }).click()
  const pag = pagina.getByRole('dialog', { name: 'Como esta conta foi paga?' })
  await expect(pag).toContainText('Energia elétrica · R$ 2.950,00')
  await pag.getByRole('radio', { name: 'Cartão de crédito' }).click()
  await pag.getByRole('combobox', { name: 'Qual cartão?' }).click()
  await pagina.getByRole('radio', { name: 'Carlos' }).click()
  await pagina.getByLabel('Nome do cartão novo').fill('Crédito final 4421')
  await pagina.getByRole('button', { name: '+ Criar' }).click()
  await expect(pag.getByRole('combobox', { name: 'Qual cartão?' })).toContainText(
    'Crédito final 4421 · pessoal do Carlos'
  )
  await expect(pag).toContainText('Este cartão é pessoal do Carlos')
  await pag.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(pag).toBeHidden()
  await expect(pagina.getByText('✓ Conta Energia elétrica marcada como paga.')).toBeVisible()
  await expect(menuContas(pagina).locator('.badge')).toHaveCount(0)

  await pagina.getByRole('button', { name: 'Pagas' }).click()
  await expect(linha).toContainText('Paga')
  await expect(linha).toContainText(
    'pago com cartão de crédito (Crédito final 4421 · pessoal do Carlos · reembolso) em 16/10'
  )

  // Sócios: reembolso do Carlos
  await irPara(pagina, '#/socios')
  await expect(pagina.getByText('Outubro de 2026', { exact: true })).toBeVisible()
  const reembolso = pagina.getByRole('row', { name: /Energia elétrica/ })
  await expect(reembolso).toContainText('Crédito final 4421 (pessoal do Carlos)')
  await expect(reembolso).toContainText('R$ 2.950,00')
  const carlos = pagina.getByRole('region', { name: 'Quanto o Carlos recebe' })
  await expect(carlos).toContainText('+ R$ 2.950,00')
  await expect(pagina.locator('.kpi-card').nth(1)).toContainText('− R$ 2.950,00')

  // Desfazer o pagamento: o reembolso some
  await pagina.getByRole('link', { name: 'Ver em Contas a pagar' }).click()
  await pagina.getByRole('button', { name: 'Desfazer o pagamento de Energia elétrica' }).click()
  await expect(pagina.getByText('✓ A conta Energia elétrica voltou para “A pagar”.')).toBeVisible()
  await irPara(pagina, '#/socios')
  await expect(
    pagina.getByText('Nenhuma conta paga no cartão pessoal de um sócio neste mês.')
  ).toBeVisible()
  await expect(carlos).toContainText('+ R$ 0,00')
})

test('conta que já foi paga: "Salvar e dizer como paguei"; tipo em uso não sai', async () => {
  const { pagina } = aberto
  const modal = await novaConta(pagina, {
    nome: 'Combustível da entrega',
    valor: '280',
    vencimento: '16/10/2026',
    tipo: 'Outros'
  })
  await modal.getByRole('radio', { name: 'Sim, já paguei' }).click()
  await modal.getByRole('button', { name: 'Salvar e dizer como paguei' }).click()
  const pag = pagina.getByRole('dialog', { name: 'Como esta conta foi paga?' })
  await pag.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(pag).toContainText('Escolha como a conta foi paga.')
  await pag.getByRole('radio', { name: 'Pix' }).click()
  await pag.getByRole('button', { name: 'Confirmar pagamento' }).click()
  await expect(pagina.getByText('✓ Conta Combustível da entrega salva como paga.')).toBeVisible()
  await expect(pagina.locator('.kpi-card').nth(2)).toContainText('R$ 280,00')

  // o tipo "Outros" agora está em uso
  await pagina.getByRole('button', { name: 'Todas' }).click()
  await pagina.getByRole('button', { name: 'Editar Combustível da entrega' }).click()
  const editar = pagina.getByRole('dialog', { name: 'Editar conta' })
  await expect(editar).toContainText('Editando uma conta')
  await editar.getByRole('combobox', { name: 'Tipo de conta' }).click()
  const painel = pagina.locator('.ddpanel')
  await expect(painel.locator('.ddrow', { hasText: 'Outros' })).toContainText('em uso · 1')
  await expect(
    painel.locator('.ddrow', { hasText: 'Fatura do cartão da empresa' }).getByRole('button', {
      name: /Remover/
    })
  ).toHaveCount(0)
  await pagina.keyboard.press('Escape')

  // excluir e desfazer
  await editar.getByRole('button', { name: 'Excluir conta' }).click()
  await editar.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText('A conta “Combustível da entrega” foi excluída.')).toBeVisible()
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(pagina.getByRole('row', { name: /Combustível da entrega/ })).toBeVisible()
})

test('Sócios: retirada, participação de 1 em 1% e mês anterior', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/socios')
  await pagina.getByRole('button', { name: '+ Registrar retirada' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Registrar retirada' })
  await modal.getByRole('radio', { name: 'Paulo' }).click()
  await modal.getByLabel('Valor (R$)').fill('1200')
  await escolherNaLista(pagina, 'Como pegou', 'Dinheiro do caixa')
  await modal.getByRole('button', { name: 'Salvar retirada' }).click()
  await expect(pagina.getByText('✓ Retirada registrada.')).toBeVisible()
  const linha = pagina.getByRole('row', { name: /Paulo/ })
  await expect(linha).toContainText('Adiantamento')
  await expect(linha).toContainText('Dinheiro do caixa')
  await expect(linha).toContainText('R$ 1.200,00')
  const paulo = pagina.getByRole('region', { name: 'Quanto o Paulo recebe' })
  await expect(paulo).toContainText('− R$ 1.200,00')
  await expect(paulo).toContainText('−R$ 1.200,00')

  await pagina.getByRole('button', { name: 'Aumentar a parte do Carlos' }).click()
  await expect(pagina.locator('.pct-socio')).toHaveText('61%')
  await expect(paulo).toContainText('39% da empresa')

  // setembro continua 60/40 (D-058)
  await pagina.getByRole('button', { name: 'Mês anterior' }).click()
  await expect(pagina.getByText('Setembro de 2026', { exact: true })).toBeVisible()
  await expect(pagina.locator('.pct-socio')).toHaveText('60%')
  await expect(pagina.getByRole('button', { name: 'Mês seguinte' })).toBeEnabled()
})

test('Configurações: "Como contar o lucro" com a sugestão marcada', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/configuracoes?aba=lucro')
  const card = pagina.getByRole('region', { name: 'Como contar o lucro' })
  await expect(card.getByRole('radio', { name: /No mês em que foi paga/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await card.getByRole('radio', { name: 'Levar para o mês seguinte' }).click()
  await expect(card.getByRole('radio', { name: 'Levar para o mês seguinte' })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await pagina.getByRole('tab', { name: 'Histórico' }).click()
  await expect(
    pagina.getByText(
      'Mudou como contar o lucro: mês com prejuízo: mostrar e não dividir → levar para o mês seguinte'
    )
  ).toBeVisible()
})

test('modais de conta e de pagamento a 130% em 1280×720: sem rolagem horizontal', async () => {
  const { pagina, app } = aberto
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setContentSize(1280, 720)
  )
  await definirEscala(pagina, 130)
  const modal = await novaConta(pagina, {
    nome: 'Aluguel',
    valor: '3500',
    vencimento: '30/10/2026',
    tipo: 'Aluguel'
  })
  expect(await modal.evaluate((m) => m.scrollWidth > m.clientWidth)).toBe(false)
  await modal.getByRole('button', { name: 'Salvar conta' }).click()
  await pagina.getByRole('button', { name: 'Marcar Aluguel como paga' }).click()
  const pag = pagina.getByRole('dialog', { name: 'Como esta conta foi paga?' })
  await pag.getByRole('radio', { name: 'Cartão de débito' }).click()
  expect(await pag.evaluate((m) => m.scrollWidth > m.clientWidth)).toBe(false)
  expect(await temRolagemHorizontal(pagina)).toBe(false)
})
