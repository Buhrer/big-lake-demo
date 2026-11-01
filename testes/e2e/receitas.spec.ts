import { expect, test, type Page } from '@playwright/test'
import { abrirApp, irPara, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
  await prepararEstoque(aberto.pagina)
})

test.afterEach(async () => {
  await aberto.app.close()
})

/** Insumos com os preços do protótipo e gás e energia a R$ 8,00 por vez. */
async function prepararEstoque(pagina: Page) {
  await pagina.evaluate(async () => {
    const item = (
      nome: string,
      unidade: 'un' | 'L' | 'kg',
      custo: number,
      tipo: 'materia_prima' | 'insumo' = 'materia_prima',
      nomeUnidade: string | null = null
    ) =>
      window.api.estoque.cadastrar({
        tipo,
        unidade,
        nomeUnidade,
        nome,
        quantidade: 1000,
        valorPago: custo as never,
        fornecedorId: null,
        minimo: 0,
        validade: null
      })
    await item('Polpa de maracujá', 'kg', 1400)
    await item('Açúcar refinado', 'kg', 420)
    await item('Leite condensado', 'un', 690, 'materia_prima', 'lata')
    await item('Creme de leite', 'L', 2150)
    await item('Leite integral', 'L', 489)
    await item('Liga neutra', 'kg', 3200)
    await item('Palito', 'un', 8, 'insumo')
    await item('Saquinho plástico', 'un', 27, 'insumo')
    await item('Etiqueta', 'un', 6, 'insumo')
    await window.api.gasEnergia.salvar({
      modo: 'ingrediente',
      precoPorVez: 800 as never,
      valorFixo: 0 as never
    })
  })
}

const INGREDIENTES: [string, string][] = [
  ['Polpa de maracujá', '5'],
  ['Açúcar refinado', '3'],
  ['Leite condensado', '10'],
  ['Creme de leite', '2,5'],
  ['Leite integral', '5'],
  ['Liga neutra', '0,12']
]

async function montarPaletaDeMaracuja(pagina: Page) {
  await irPara(pagina, '#/producao?aba=receitas')
  await pagina.getByRole('button', { name: '+ Nova receita' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Nova receita' })
  await modal.getByLabel('Nome da receita').fill('Paleta de Maracujá')
  await modal.getByRole('combobox', { name: 'Categoria do produto' }).click()
  // a categoria Paleta já vem no sistema (D-062)
  await pagina.getByRole('option', { name: 'Paleta', exact: true }).click()
  await expect(modal.getByRole('combobox', { name: 'Categoria do produto' })).toContainText(
    'Paleta'
  )

  for (const [nome, quantidade] of INGREDIENTES) {
    await modal.getByRole('button', { name: '+ Adicionar ingrediente' }).click()
    await modal.getByRole('button', { name: new RegExp(`^${nome}`) }).click()
    await modal.getByLabel(`Quantidade de ${nome}`).fill(quantidade)
  }
  // gás e energia já vem com 1 vez
  await expect(modal.getByLabel('Quantidade de Gás e energia da produção')).toHaveValue('1')
  await expect(modal.locator('.linha-total').first()).toContainText('R$ 241,64')

  for (const e of ['Palito', 'Saquinho plástico', 'Etiqueta']) {
    await modal.getByRole('button', { name: new RegExp(`\\+ ${e}`) }).click()
  }
  await modal.getByLabel('Quantas paletas essa receita rende').fill('100')
  await expect(modal.locator('.linha-total').nth(1)).toContainText('R$ 41,00')
  await expect(modal.locator('.kl.destaque')).toContainText('Custo de cada paletaR$ 2,83')

  const [balcao, atacado] = [
    modal.locator('.quadro-venda').nth(0),
    modal.locator('.quadro-venda').nth(1)
  ]
  await balcao.getByLabel('Preço de cada paleta (R$)').fill('10')
  await atacado.getByLabel('Preço de cada paleta (R$)').fill('7')
  await expect(balcao).toContainText('R$ 7,17')
  await expect(balcao).toContainText('72% do preço vira lucro')
  await expect(balcao).toContainText('R$ 717,36')
  await expect(atacado).toContainText('R$ 4,17')
  await expect(atacado).toContainText('60% do preço vira lucro')
  await modal.getByRole('button', { name: 'Salvar receita' }).click()
  await expect(modal).toBeHidden()
}

test('T1 no modal: Paleta de Maracujá com custo e lucro ao vivo', async () => {
  const { pagina } = aberto
  await montarPaletaDeMaracuja(pagina)
  await expect(pagina.getByText('✓ Receita Paleta de Maracujá cadastrada.')).toBeVisible()
  const linha = pagina.getByRole('row', { name: /Paleta de Maracujá/ })
  await expect(linha).toContainText('rende 100 paletas')
  await expect(linha).toContainText('R$ 2,83')
  await expect(linha).toContainText('R$ 7,17')
  await expect(linha).toContainText('72% do preço')
  await expect(linha).toContainText('R$ 4,17')
  await expect(pagina.getByRole('button', { name: 'Paleta', exact: true })).toBeVisible()
})

test('validação da receita em linguagem simples', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/producao?aba=receitas')
  await pagina.getByRole('button', { name: '+ Nova receita' }).click()
  const modal = pagina.getByRole('dialog')
  await modal.getByRole('button', { name: 'Salvar receita' }).click()
  await expect(modal.getByText('Digite o nome da receita.')).toBeVisible()
  await expect(modal.getByText('Escolha a categoria do produto.')).toBeVisible()
  await expect(modal.getByText('Diga quantas unidades a receita rende.')).toBeVisible()
})

test('Editar, menor lucro, Excluir e Desfazer', async () => {
  const { pagina } = aberto
  await montarPaletaDeMaracuja(pagina)
  // segunda receita, mais cara, pela API
  await pagina.evaluate(async () => {
    const receitas = await window.api.receitas.listar()
    const r = await window.api.receitas.obter(receitas[0]!.id)
    await window.api.receitas.salvar(null, {
      ...r!,
      nome: 'Paleta de Coco cremoso',
      rendimento: 90
    })
  })
  await irPara(pagina, '#/producao?aba=planejar')
  await irPara(pagina, '#/producao?aba=receitas')
  const coco = pagina.getByRole('row', { name: /Paleta de Coco/ })
  await expect(coco.getByText('menor lucro')).toBeVisible()
  await expect(pagina.getByRole('row').nth(1)).toContainText('Paleta de Maracujá')

  await pagina.getByRole('button', { name: 'Editar Paleta de Coco cremoso' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Editar receita' })
  await expect(modal.getByLabel('Nome da receita')).toHaveValue('Paleta de Coco cremoso')
  await modal.getByLabel('Quantas paletas essa receita rende').fill('100')
  await modal.getByRole('button', { name: 'Salvar receita' }).click()
  await expect(pagina.getByText('✓ Receita Paleta de Coco cremoso salva.')).toBeVisible()

  const linha = pagina.getByRole('row', { name: /Paleta de Coco/ })
  await linha.getByRole('button', { name: 'Excluir Paleta de Coco cremoso' }).click()
  await linha.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText('A receita “Paleta de Coco cremoso” foi excluída.')).toBeVisible()
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(pagina.getByRole('row', { name: /Paleta de Coco/ })).toBeVisible()

  await irPara(pagina, '#/configuracoes?aba=historico')
  await expect(
    pagina.getByRole('cell', {
      name: 'Mudou a receita Paleta de Coco cremoso: rende 90 → 100 paletas'
    })
  ).toBeVisible()
})

test('gás e energia: item especial no Estoque e troca para valor fixo em Configurações', async () => {
  const { pagina } = aberto
  await montarPaletaDeMaracuja(pagina)

  await irPara(pagina, '#/estoque')
  const gas = pagina.getByRole('row', { name: /Gás e energia da produção/ })
  await expect(gas).toContainText('R$ 8,00 /vez')
  await gas.getByRole('button', { name: 'Editar Gás e energia da produção' }).click()
  await pagina.getByLabel('Custo por vez (R$)').fill('10')
  await pagina.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(gas).toContainText('R$ 10,00 /vez')

  await irPara(pagina, '#/configuracoes?aba=gas')
  await pagina.getByRole('radio', { name: /Valor fixo/ }).click()
  await pagina.getByLabel('Valor em cada receita (R$)').fill('12')
  await pagina.getByRole('button', { name: 'Salvar valor' }).click()
  await expect(pagina.getByText('✓ Valor salvo.')).toBeVisible()

  await irPara(pagina, '#/estoque')
  await expect(pagina.getByRole('row', { name: /Gás e energia/ })).toHaveCount(0)
  await irPara(pagina, '#/producao?aba=receitas')
  // 233,64 + 12,00 + 41,00 = 286,64 → R$ 2,87
  await expect(pagina.getByRole('row', { name: /Paleta de Maracujá/ })).toContainText('R$ 2,87')

  // D-052: não contar nas receitas (gás e luz só como conta a pagar)
  await irPara(pagina, '#/configuracoes?aba=gas')
  await pagina.getByRole('radio', { name: /Não contar/ }).click()
  await expect(
    pagina.getByText('As receitas não somam gás e energia.', { exact: false })
  ).toBeVisible()
  await irPara(pagina, '#/producao?aba=receitas')
  // 233,64 + 41,00 = 274,64 → R$ 2,75
  await expect(pagina.getByRole('row', { name: /Paleta de Maracujá/ })).toContainText('R$ 2,75')
  await pagina.getByRole('button', { name: 'Editar Paleta de Maracujá' }).click()
  await expect(pagina.getByRole('dialog').getByText('Gás e energia da produção')).toHaveCount(0)
})
