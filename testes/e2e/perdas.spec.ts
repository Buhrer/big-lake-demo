import { expect, test, type Page } from '@playwright/test'
import { abrirApp, definirEscala, irPara, temRolagemHorizontal, type AppAberto } from './app'

let aberto: AppAberto

test.afterEach(async () => {
  await aberto.app.close()
})

/** T10: morango (R$ 18,00/kg) e manga (R$ 7,50/kg), uma receita de paleta e um cliente. */
async function preparar(pagina: Page) {
  await pagina.evaluate(async () => {
    const item = async (
      nome: string,
      quantidade: number,
      valorPago: number,
      tipo: 'materia_prima' | 'insumo' = 'materia_prima'
    ) => {
      const r = await window.api.estoque.cadastrar({
        tipo,
        unidade: tipo === 'insumo' ? 'un' : 'kg',
        nomeUnidade: null,
        nome,
        quantidade,
        valorPago: valorPago as never,
        fornecedorId: null,
        minimo: 0,
        validade: null
      })
      if (!r.ok) throw new Error(r.mensagem)
      return r.valor
    }
    const morango = await item('Morango', 7500, 13500)
    const manga = await item('Manga', 5000, 3750)
    await item('Palito', 500_000, 3000, 'insumo')
    const paleta = (await window.api.categorias.listar()).find((c) => c.nome === 'Paleta')!
    // 1 kg de morango rende 10 paletas: R$ 1,80 cada (gás começa em R$ 0,00, D-041)
    const r = await window.api.receitas.salvar(null, {
      nome: 'Paleta de Morango',
      categoriaId: paleta.id,
      rendimento: 10,
      ingredientes: [{ itemId: morango, quantidade: 1000 }],
      embalagens: [],
      gasVezes: 1000,
      gasValor: null,
      precoBalcao: 1000 as never,
      precoAtacado: 700 as never,
      nomeUnidade: 'paleta'
    })
    if (!r.ok) throw new Error(r.mensagem)
    // outra categoria, para as abas de categoria no modal (D-081)
    const picole = (await window.api.categorias.listar()).find((c) => c.nome === 'Picolé')!
    const r2 = await window.api.receitas.salvar(null, {
      nome: 'Picolé de Manga',
      categoriaId: picole.id,
      rendimento: 20,
      ingredientes: [{ itemId: manga, quantidade: 1000 }],
      embalagens: [],
      gasVezes: 1000,
      gasValor: null,
      precoBalcao: 400 as never,
      precoAtacado: 250 as never,
      nomeUnidade: 'picolé'
    })
    if (!r2.ok) throw new Error(r2.mensagem)
    const c = await window.api.clientes.salvar(null, {
      nome: 'Mercado Bom Preço',
      telefone: '',
      documento: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: ''
    })
    if (!c.ok) throw new Error(c.mensagem)
  })
}

const noEstoque = (pagina: Page, nome: string) =>
  pagina.evaluate(
    async (n) => (await window.api.estoque.listar()).find((i) => i.nome === n)!.quantidade,
    nome
  )

test('T10: matéria-prima baixa o estoque; troca no cliente; editar; excluir e desfazer', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await preparar(pagina)
  await irPara(pagina, '#/perdas')
  await expect(pagina.getByText('Nenhuma perda neste mês.')).toBeVisible()

  // matéria-prima: 4 kg de morango + 2 kg de manga = R$ 87,00
  await pagina.getByRole('button', { name: '+ Registrar perda' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Registrar perda' })
  await modal.getByRole('radio', { name: /Matéria-prima ou insumo/ }).click()
  await expect(modal.getByRole('radio', { name: 'Venceu', exact: true })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  // abas Matéria-prima / Insumos (D-082)
  const tipos = modal.getByRole('group', { name: 'Tipo do item' })
  await tipos.getByRole('button', { name: 'Insumos' }).click()
  await expect(modal.getByRole('button', { name: /^Palito/ })).toBeVisible()
  await expect(modal.getByRole('button', { name: /^Morango/ })).toHaveCount(0)
  await tipos.getByRole('button', { name: 'Matéria-prima' }).click()
  await expect(modal.getByRole('button', { name: /^Palito/ })).toHaveCount(0)
  await modal.getByRole('button', { name: /^Morango R\$ 18,00 \/kg/ }).click()
  await modal.getByRole('button', { name: /^Manga/ }).click()
  await modal.getByLabel('Quantidade de Morango').fill('4')
  await modal.getByLabel('Quantidade de Manga').fill('2')
  await expect(modal.getByRole('row', { name: /^Morango/ })).toContainText('R$ 72,00')
  await expect(modal.getByLabel('Valor da perda')).toHaveText('R$ 87,00')
  await expect(modal.getByText('(pelo preço pago)')).toBeVisible()
  await modal.getByRole('button', { name: 'Salvar perda' }).click()
  await expect(pagina.getByText('✓ Perda anotada. Já aparece na lista abaixo.')).toBeVisible()
  const linhaMp = pagina.getByRole('row', { name: /4 kg Morango · 2 kg Manga/ })
  await expect(linhaMp).toContainText('16/10')
  await expect(linhaMp).toContainText('Matéria-prima')
  await expect(linhaMp).toContainText('Venceu')
  await expect(linhaMp).toContainText('R$ 87,00')
  expect(await noEstoque(pagina, 'Morango')).toBe(3500)
  expect(await noEstoque(pagina, 'Manga')).toBe(3000)

  // troca: 2 paletas pelo custo de fazer (R$ 1,80), ligada ao cliente
  await pagina.getByRole('button', { name: '+ Registrar perda' }).click()
  await modal.getByRole('radio', { name: /Troca em cliente/ }).click()
  // abas por categoria, como no Novo pedido (D-081)
  const abas = modal.getByRole('group', { name: 'Categoria do produto' })
  await abas.getByRole('button', { name: 'Picolé' }).click()
  await expect(modal.getByRole('button', { name: /^Picolé de Manga/ })).toBeVisible()
  await expect(modal.getByRole('button', { name: /^Paleta de Morango/ })).toHaveCount(0)
  await abas.getByRole('button', { name: 'Paleta' }).click()
  await expect(modal.getByRole('button', { name: /^Picolé de Manga/ })).toHaveCount(0)
  await modal.getByRole('button', { name: /^Paleta de Morango R\$ 1,80 cada/ }).click()
  await modal.getByRole('button', { name: /^Paleta de Morango R\$ 1,80 cada/ }).click()
  await expect(modal.getByLabel('Quantidade de Paleta de Morango')).toHaveValue('2')
  await expect(modal.getByLabel('Valor da perda')).toHaveText('R$ 3,60')
  // digitar tecla por tecla não tira o cursor do campo (antes, "20" virava "2")
  const qtd = modal.getByLabel('Quantidade de Paleta de Morango')
  await qtd.fill('')
  await qtd.pressSequentially('20')
  await expect(qtd).toHaveValue('20')
  await expect(qtd).toBeFocused()
  await expect(modal.getByLabel('Valor da perda')).toHaveText('R$ 36,00')
  await qtd.fill('2')
  await modal.getByRole('button', { name: 'Salvar perda' }).click()
  await expect(modal.getByText('Escolha o cliente.')).toBeVisible()
  await modal.getByRole('combobox', { name: 'Qual cliente?' }).click()
  await pagina.getByRole('option', { name: 'Mercado Bom Preço' }).click()
  await modal.getByRole('radio', { name: 'Embalagem com defeito', exact: true }).click()
  await modal.getByRole('button', { name: 'Salvar perda' }).click()
  const linhaTroca = pagina.getByRole('row', { name: /2 un Paleta de Morango/ })
  await expect(linhaTroca).toContainText('Troca · Mercado Bom Preço')
  await expect(linhaTroca).toContainText('Embalagem com defeito')
  expect(await noEstoque(pagina, 'Morango')).toBe(3500)

  // resumo do mês e trocas por cliente
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText('R$ 90,60')
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText('2 registros')
  await expect(pagina.locator('.kpi-card').nth(2)).toContainText('R$ 87,00')
  await expect(pagina.locator('.kpi-card').nth(3)).toContainText('1 troca em 1 cliente')
  await expect(pagina.locator('.troca-cliente')).toContainText('Mercado Bom Preço · 1 troca')
  await pagina.getByRole('button', { name: 'Trocas (1)' }).click()
  await expect(linhaMp).toHaveCount(0)
  await pagina.getByRole('button', { name: 'Todas (2)' }).click()

  // editar: 5 kg de morango, sem manga
  await linhaMp.getByRole('button', { name: /Editar/ }).click()
  const edicao = pagina.getByRole('dialog', { name: 'Corrigir perda' })
  await expect(edicao.getByText('Editando o registro de 16/10')).toBeVisible()
  await edicao.getByRole('button', { name: 'Remover Manga' }).click()
  await edicao.getByLabel('Quantidade de Morango').fill('5')
  await edicao.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(pagina.getByText('✓ Alterações salvas.')).toBeVisible()
  const corrigida = pagina.getByRole('row', { name: /5 kg Morango/ })
  await expect(corrigida).toContainText('R$ 90,00')
  expect(await noEstoque(pagina, 'Morango')).toBe(2500)
  expect(await noEstoque(pagina, 'Manga')).toBe(5000)

  // excluir → desfazer
  await corrigida.getByRole('button', { name: /Excluir/ }).click()
  await pagina.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText('O registro de 16/10 foi excluído.')).toBeVisible()
  expect(await noEstoque(pagina, 'Morango')).toBe(7500)
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(corrigida).toBeVisible()
  expect(await noEstoque(pagina, 'Morango')).toBe(2500)
})

test('perda maior que o estoque pede confirmação; data do mês passado vai para o mês dela', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await preparar(pagina)
  await irPara(pagina, '#/perdas')
  await pagina.getByRole('button', { name: '+ Registrar perda' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Registrar perda' })
  await modal.getByRole('radio', { name: /Matéria-prima ou insumo/ }).click()
  await modal.getByRole('button', { name: /^Manga/ }).click()
  await modal.getByLabel('Quantidade de Manga').fill('6')
  await modal.getByLabel('Quando?').fill('30/09/2026')
  await modal.getByRole('button', { name: 'Salvar perda' }).click()
  await expect(
    modal.getByText('O estoque de Manga vai ficar negativo. Salvar mesmo assim?')
  ).toBeVisible()
  await modal.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText('Setembro de 2026')).toBeVisible()
  await expect(pagina.getByRole('row', { name: /6 kg Manga/ })).toContainText('30/09')
  expect(await noEstoque(pagina, 'Manga')).toBe(-1000)
})

test('modal com itens a 130% em 1280×720 não cria rolagem horizontal', async () => {
  aberto = await abrirApp(1280, 720)
  const { pagina } = aberto
  await preparar(pagina)
  await definirEscala(pagina, 130)
  await irPara(pagina, '#/perdas')
  await pagina.getByRole('button', { name: '+ Registrar perda' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByRole('radio', { name: /Troca em cliente/ }).click()
  await modal.getByRole('button', { name: /^Paleta de Morango/ }).click()
  expect(await modal.evaluate((m) => m.scrollWidth > m.clientWidth)).toBe(false)
  expect(await temRolagemHorizontal(pagina)).toBe(false)
})
