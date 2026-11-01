import { expect, test, type Page } from '@playwright/test'
import { abrirApp, irPara, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
})

test.afterEach(async () => {
  await aberto.app.close()
})

async function cadastrarFornecedor(pagina: Page, nome: string) {
  await pagina.evaluate(
    (n) =>
      window.api.fornecedores.salvar(null, {
        nome: n,
        telefone: '',
        documento: '',
        contato: '',
        oQueFornece: ''
      }),
    nome
  )
}

async function cadastrarMorango(pagina: Page) {
  await pagina.getByRole('button', { name: '+ Cadastrar insumo' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar insumo / entrada de mercadoria' })
  await expect(modal.getByRole('radio', { name: /Item novo/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await modal.getByRole('radio', { name: /Matéria-prima/ }).click()
  await modal.getByRole('radio', { name: /Quilo/ }).click()
  await modal.getByLabel('Nome', { exact: true }).fill('Morango')
  await modal.getByRole('combobox', { name: 'Fornecedor' }).click()
  await pagina.getByRole('option', { name: 'Hortifruti São José' }).click()
  await modal.getByLabel('Quantidade (kg)').fill('20')
  await modal.getByLabel('Valor pago (R$)').fill('360')
  await modal.getByLabel('Validade', { exact: true }).fill('22102026')
  await modal.getByLabel('Estoque mínimo (kg)').fill('10')
  await expect(modal.locator('.linha-total')).toContainText('Custo por quiloR$ 18,00')
  await modal.getByRole('radio', { name: 'Não', exact: true }).click()
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal).toBeHidden()
}

test('item novo: custo por quilo, lista com validade, mínimo e situação', async () => {
  const { pagina } = aberto
  await cadastrarFornecedor(pagina, 'Hortifruti São José')
  await irPara(pagina, '#/estoque')
  await cadastrarMorango(pagina)
  await expect(pagina.getByText('✓ Morango cadastrado no estoque.')).toBeVisible()
  const linha = pagina.getByRole('row', { name: /Morango/ })
  await expect(linha).toContainText('Hortifruti São José')
  await expect(linha).toContainText('20 kg')
  await expect(linha).toContainText('mín. 10 kg')
  await expect(linha).toContainText('R$ 18,00 /kg')
  await expect(linha).toContainText('22/10')
  await expect(linha.locator('.tag.atencao')).toHaveText('vence em 6 dias')
  await expect(linha.locator('.tag.ok')).toHaveText('OK')
  await expect(pagina.getByRole('button', { name: 'Vencendo (1)' })).toBeVisible()
  await expect(pagina.getByRole('button', { name: 'Estoque baixo (0)' })).toBeVisible()
})

test('chegou mercadoria de item já cadastrado: soma e avisa que o custo subiu', async () => {
  const { pagina } = aberto
  await cadastrarFornecedor(pagina, 'Hortifruti São José')
  await irPara(pagina, '#/estoque')
  await cadastrarMorango(pagina)

  // atalho "Chegou mercadoria" do Início abre o modal direto
  await irPara(pagina, '#/estoque?entrada=1')
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar insumo / entrada de mercadoria' })
  await expect(modal.getByRole('radio', { name: /Já está cadastrado/ })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await modal.getByRole('combobox', { name: 'Qual item chegou?' }).click()
  await pagina.getByRole('option', { name: 'Morango · kg' }).click()
  await expect(modal.getByRole('combobox', { name: 'Fornecedor' })).toContainText(
    'Hortifruti São José'
  )
  await modal.getByLabel('Quantidade (kg)').fill('10')
  await modal.getByLabel('Valor pago (R$)').fill('210')
  await expect(
    modal.getByText('O custo subiu: era R$ 18,00, agora fica R$ 21,00 o quilo (+17%).')
  ).toBeVisible()
  // D-092: precisa dizer se a compra vai para Contas a pagar (nada vem marcado)
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal.getByText('Diga se vai lançar esta compra em Contas a pagar.')).toBeVisible()
  await modal.getByRole('radio', { name: 'Sim, já paguei' }).click()
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal.getByText('Escolha como a conta foi paga.')).toBeVisible()
  await modal.getByRole('radio', { name: 'Pix' }).click()
  await modal.getByRole('button', { name: 'Salvar' }).click()

  await expect(pagina.getByText('✓ Entrada registrada: Morango 10 kg.')).toBeVisible()
  await expect(pagina.getByText('A compra também foi para Contas a pagar, já paga.')).toBeVisible()
  await expect(
    pagina.getByText('O custo subiu: Morango passou de R$ 18,00 para R$ 21,00 o quilo (+17%).')
  ).toBeVisible()
  await expect(pagina.getByRole('row', { name: /Morango/ })).toContainText('30 kg')

  await irPara(pagina, '#/cadastros?aba=fornecedores')
  await expect(pagina.getByRole('row', { name: /Hortifruti/ })).toContainText('R$ 570,00')

  // a conta já paga entra nas despesas do mês
  await irPara(pagina, '#/contas')
  await pagina.getByRole('button', { name: 'Pagas' }).click()
  const conta = pagina.getByRole('row', { name: /Morango 10 kg · Hortifruti São José/ })
  await expect(conta).toContainText('R$ 210,00')
  await expect(conta).toContainText('Fornecedor')
  await expect(conta).toContainText('Paga')
})

test('compra para pagar depois vai para Contas a pagar com o vencimento (D-092)', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/estoque')
  await pagina.getByRole('button', { name: '+ Cadastrar insumo' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar insumo / entrada de mercadoria' })
  await modal.getByLabel('Nome', { exact: true }).fill('Açúcar refinado')
  await modal.getByLabel('Quantidade (kg)').fill('50')
  await modal.getByLabel('Valor pago (R$)').fill('210')
  await modal.getByRole('radio', { name: 'Sim, vou pagar depois' }).click()
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal.getByText('Digite quando a conta vence.')).toBeVisible()
  await modal.getByLabel('Vence em').fill('30102026')
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal).toBeHidden()
  await expect(
    pagina.getByText('A compra também foi para Contas a pagar, para pagar até 30/10/2026.')
  ).toBeVisible()
  await irPara(pagina, '#/contas')
  const conta = pagina.getByRole('row', { name: /Açúcar refinado 50 kg/ })
  await expect(conta).toContainText('30/10')
  await expect(conta).toContainText('R$ 210,00')
  await expect(conta.getByRole('button', { name: /como paga/ })).toBeVisible()
})

test('compra de R$ 0,00 não pergunta da conta', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/estoque')
  await pagina.getByRole('button', { name: '+ Cadastrar insumo' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByLabel('Valor pago (R$)').fill('0')
  await expect(modal.getByText('Lançar esta compra em Contas a pagar?')).toHaveCount(0)
  await modal.getByLabel('Valor pago (R$)').fill('5')
  await expect(modal.getByText('Lançar esta compra em Contas a pagar?')).toBeVisible()
})

test('validação do modal em linguagem simples', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/estoque')
  await pagina.getByRole('button', { name: '+ Cadastrar insumo' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByRole('button', { name: 'Salvar' }).click()
  await expect(modal.getByText('Digite o nome.')).toBeVisible()
  await expect(modal.getByText('Digite a quantidade.')).toBeVisible()
  await expect(modal.getByText('Digite o valor pago.')).toBeVisible()
})

test('"lata" no lugar de "un" (D-039)', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/estoque')
  await pagina.getByRole('button', { name: '+ Cadastrar insumo' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByRole('radio', { name: /Unidade/ }).click()
  await modal.getByLabel('Nome', { exact: true }).fill('Leite condensado')
  await modal.getByLabel('Nome da unidade (opcional)').fill('lata')
  await modal.getByLabel('Quantidade (lata)').fill('12')
  await modal.getByLabel('Valor pago (R$)').fill('82,80')
  await modal.getByLabel('Estoque mínimo (lata)').fill('24')
  await modal.getByRole('radio', { name: 'Não', exact: true }).click()
  await modal.getByRole('button', { name: 'Salvar' }).click()
  const linha = pagina.getByRole('row', { name: /Leite condensado/ })
  await expect(linha).toContainText('12 lata')
  await expect(linha).toContainText('R$ 6,90 /lata')
  await expect(linha.locator('.tag.erro')).toHaveText('Comprar')
})

test('Editar: quantidade, custo e validade de cada compra; vai para o histórico', async () => {
  const { pagina } = aberto
  await cadastrarFornecedor(pagina, 'Hortifruti São José')
  await irPara(pagina, '#/estoque')
  await cadastrarMorango(pagina)
  await pagina.getByRole('button', { name: 'Editar Morango' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Editar insumo' })
  await expect(modal.getByText('Editando um cadastro')).toBeVisible()
  await expect(modal.getByLabel('Quantidade em estoque (kg)')).toHaveValue('20')
  await modal.getByLabel('Quantidade em estoque (kg)').fill('18,5')
  await modal.getByLabel('Custo por quilo (R$)').fill('19')
  await modal.getByLabel('Validade da compra de 16/10/2026').fill('24102026')
  await modal.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(modal).toBeHidden()
  const linha = pagina.getByRole('row', { name: /Morango/ })
  await expect(linha).toContainText('18,5 kg')
  await expect(linha).toContainText('R$ 19,00 /kg')
  await expect(linha).toContainText('24/10')

  await irPara(pagina, '#/configuracoes?aba=historico')
  await expect(
    pagina.getByRole('cell', {
      name: 'Mudou o insumo Morango: validade da compra de 16/10 22/10/2026 → 24/10/2026; quantidade em estoque 20 kg → 18,5 kg; custo R$ 18,00/kg → R$ 19,00/kg'
    })
  ).toBeVisible()
})

test('Excluir insumo com confirmação e Desfazer', async () => {
  const { pagina } = aberto
  await cadastrarFornecedor(pagina, 'Hortifruti São José')
  await irPara(pagina, '#/estoque')
  await cadastrarMorango(pagina)
  const linha = pagina.getByRole('row', { name: /Morango/ })
  await linha.getByRole('button', { name: 'Excluir Morango' }).click()
  await expect(linha).toHaveClass(/confirmando/)
  await linha.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText('“Morango” foi excluído da lista.')).toBeVisible()
  await expect(pagina.getByRole('row', { name: /Morango/ })).toHaveCount(0)
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(pagina.getByRole('row', { name: /Morango/ })).toBeVisible()
})

test('fornecedor em uso não pode ser excluído; cliente sem pedido pode, com Desfazer', async () => {
  const { pagina } = aberto
  await cadastrarFornecedor(pagina, 'Hortifruti São José')
  await irPara(pagina, '#/estoque')
  await cadastrarMorango(pagina)

  await irPara(pagina, '#/cadastros?aba=fornecedores')
  const linhaF = pagina.getByRole('row', { name: /Hortifruti/ })
  await linhaF.getByRole('button', { name: 'Excluir Hortifruti São José' }).click()
  await expect(linhaF).toContainText('Não dá para excluir: fornece 1 item do estoque.')
  await linhaF.getByRole('button', { name: 'Entendi' }).click()

  await pagina.evaluate(() =>
    window.api.clientes.salvar(null, {
      nome: 'Padaria Pão Quente',
      telefone: '',
      documento: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: ''
    })
  )
  await irPara(pagina, '#/cadastros?aba=clientes')
  const linhaC = pagina.getByRole('row', { name: /Padaria/ })
  await linhaC.getByRole('button', { name: 'Excluir Padaria Pão Quente' }).click()
  await linhaC.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText('“Padaria Pão Quente” foi excluído da lista.')).toBeVisible()
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(pagina.getByRole('row', { name: /Padaria/ })).toBeVisible()
})

test('lista com dados a 130% em 1280×720 sem rolagem horizontal', async () => {
  const { app, pagina } = aberto
  await cadastrarFornecedor(pagina, 'Laticínios Vale Verde Indústria e Comércio Ltda')
  await irPara(pagina, '#/estoque')
  await pagina.evaluate(() =>
    window.api.estoque.cadastrar({
      tipo: 'materia_prima',
      unidade: 'kg',
      nomeUnidade: null,
      nome: 'Creme de leite fresco pasteurizado',
      quantidade: 18_000,
      valorPago: 38700 as never,
      fornecedorId: 1,
      minimo: 10_000,
      validade: '2026-10-20'
    })
  )
  await pagina.evaluate(() =>
    window.api.estoque.cadastrar({
      tipo: 'insumo',
      unidade: 'un',
      nomeUnidade: null,
      nome: 'Saquinho plástico para paleta com nome comprido',
      quantidade: 1_800_000,
      valorPago: 48600 as never,
      fornecedorId: null,
      minimo: 500_000,
      validade: '2026-10-17'
    })
  )
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setContentSize(1280, 720)
  )
  await irPara(pagina, '#/')
  for (let i = 0; i < 3; i++) await pagina.getByRole('button', { name: 'Aumentar a letra' }).click()
  await irPara(pagina, '#/estoque')
  await expect(pagina.getByRole('row')).toHaveCount(4) // cabeçalho + gás e energia + 2 itens
  const rolagem = await pagina.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(rolagem).toBe(false)
})
