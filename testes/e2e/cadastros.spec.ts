import { expect, test } from '@playwright/test'
import { abrirApp, definirEscala, irPara, temRolagemHorizontal, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
  await irPara(aberto.pagina, '#/cadastros')
})

test.afterEach(async () => {
  await aberto.app.close()
})

async function cadastrarCliente(nome: string, telefone: string, documento = '') {
  const { pagina } = aberto
  await pagina.getByRole('button', { name: '+ Cadastrar cliente' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar novo cliente' })
  await modal.getByLabel('Nome', { exact: true }).fill(nome)
  await modal.getByLabel('Telefone / WhatsApp').fill(telefone)
  await modal.getByLabel('CPF ou CNPJ').fill(documento)
  await modal.getByLabel('Rua').fill('Rua das Flores')
  await modal.getByLabel('Número').fill('120')
  await modal.getByLabel('Bairro').fill('Centro')
  await modal.getByLabel('Cidade').fill('São Paulo')
  await modal.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(modal).toBeHidden()
}

test('cadastrar cliente: aparece na lista já formatado, com contador na aba', async () => {
  const { pagina } = aberto
  await expect(pagina.getByText('Nenhum cliente cadastrado ainda.')).toBeVisible()
  await cadastrarCliente('Mercado Bom Preço', '1134567788', '12345678000195')
  await expect(pagina.getByText('✓ Cliente Mercado Bom Preço cadastrado.')).toBeVisible()
  const linha = pagina.getByRole('row', { name: /Mercado Bom Preço/ })
  await expect(linha).toContainText('(11) 3456-7788')
  await expect(linha).toContainText('12.345.678/0001-95')
  await expect(linha).toContainText('Rua das Flores, 120')
  await expect(linha).toContainText('Centro · São Paulo')
  await expect(pagina.getByRole('tab', { name: 'Clientes (1)' })).toBeVisible()
})

test('validação: nome vazio e CPF/CNPJ errado', async () => {
  const { pagina } = aberto
  await pagina.getByRole('button', { name: '+ Cadastrar cliente' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(modal.getByText('Digite o nome.')).toBeVisible()
  await modal.getByLabel('Nome', { exact: true }).fill('Padaria')
  await modal.getByLabel('CPF ou CNPJ').fill('123.456.789-00')
  await modal.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(modal.getByRole('alert')).toHaveText('CPF ou CNPJ com algum número errado. Confira.')
  await expect(modal).toBeVisible()
})

test('Editar abre o mesmo modal preenchido e grava no histórico', async () => {
  const { pagina } = aberto
  await cadastrarCliente('Mercado Bom Preço', '1134567788')
  await pagina.getByRole('button', { name: 'Editar Mercado Bom Preço' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Editar cliente' })
  await expect(modal.getByText('Editando um cadastro')).toBeVisible()
  await expect(modal.getByLabel('Telefone / WhatsApp')).toHaveValue('(11) 3456-7788')
  await modal.getByLabel('Cidade').fill('Campinas')
  await modal.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(pagina.getByText('✓ Cadastro de Mercado Bom Preço corrigido.')).toBeVisible()
  await expect(pagina.getByRole('row', { name: /Mercado Bom Preço/ })).toContainText('Campinas')

  await irPara(pagina, '#/configuracoes?aba=historico')
  await expect(
    pagina.getByRole('cell', {
      name: 'Mudou o cadastro do cliente Mercado Bom Preço: cidade São Paulo → Campinas'
    })
  ).toBeVisible()
})

test('busca por nome (sem acento) e por telefone', async () => {
  const { pagina } = aberto
  await cadastrarCliente('Mercado Bom Preço', '1134567788')
  await cadastrarCliente('Lanchonete Sabor & Cia', '11987654321')
  const busca = pagina.getByLabel('Procurar cliente por nome ou telefone')
  await busca.fill('preco')
  await expect(pagina.getByRole('row')).toHaveCount(2)
  await expect(pagina.getByRole('row', { name: /Mercado Bom Preço/ })).toBeVisible()
  await busca.fill('98765')
  await expect(pagina.getByRole('row', { name: /Lanchonete/ })).toBeVisible()
  await expect(pagina.getByRole('row')).toHaveCount(2)
  await busca.fill('padaria')
  await expect(pagina.getByText('Nenhum cliente encontrado com “padaria”.')).toBeVisible()
})

test('fornecedores: o botão vermelho muda com a aba e cadastra', async () => {
  const { pagina } = aberto
  await pagina.getByRole('tab', { name: /Fornecedores/ }).click()
  await pagina.getByRole('button', { name: '+ Cadastrar fornecedor' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Cadastrar novo fornecedor' })
  await modal.getByLabel('Nome / Razão social').fill('Laticínios Vale Verde')
  await modal.getByLabel('Telefone / WhatsApp').fill('11998765432')
  await modal.getByLabel('Pessoa de contato').fill('Sr. Antônio')
  await modal.getByLabel('O que fornece').fill('leite, creme de leite')
  await modal.getByRole('button', { name: 'Salvar fornecedor' }).click()
  const linha = pagina.getByRole('row', { name: /Laticínios Vale Verde/ })
  await expect(linha).toContainText('leite, creme de leite')
  await expect(linha).toContainText('Sr. Antônio')
  await expect(linha).toContainText('(11) 99876-5432')
  await expect(pagina.getByRole('tab', { name: 'Fornecedores (1)' })).toBeVisible()
})

test('modal de cliente a 130% em 1280×720 sem rolagem horizontal', async () => {
  const { app, pagina } = aberto
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setContentSize(1280, 720)
  )
  await definirEscala(pagina, 130)
  await cadastrarCliente('Buffet Festa Feliz com um nome bem comprido para testar', '1130001000')
  await pagina.getByRole('button', { name: '+ Cadastrar cliente' }).click()
  const modal = pagina.getByRole('dialog')
  expect(await modal.evaluate((m) => m.scrollWidth > m.clientWidth)).toBe(false)
  await modal.getByRole('button', { name: 'Cancelar' }).click()
  expect(await temRolagemHorizontal(pagina)).toBe(false)
})
