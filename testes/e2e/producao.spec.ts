import { expect, test, type Page } from '@playwright/test'
import { abrirApp, irPara, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
  await prepararPaletaDeMorango(aberto.pagina)
})

test.afterEach(async () => {
  await aberto.app.close()
})

/** T13: Paleta de Morango recheada, com só 3,5 kg de morango (R$ 18,00/kg) no estoque. */
async function prepararPaletaDeMorango(pagina: Page) {
  await pagina.evaluate(async () => {
    const item = async (
      nome: string,
      unidade: 'un' | 'L' | 'kg',
      quantidade: number,
      valorPago: number,
      tipo: 'materia_prima' | 'insumo' = 'materia_prima'
    ) => {
      const r = await window.api.estoque.cadastrar({
        tipo,
        unidade,
        nomeUnidade: nome === 'Leite condensado' ? 'lata' : null,
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
    const ingredientes = [
      await item('Morango', 'kg', 3500, 6300),
      await item('Açúcar refinado', 'kg', 50000, 21000),
      await item('Leite condensado', 'un', 30000, 20700),
      await item('Creme de leite', 'L', 18000, 38700),
      await item('Leite integral', 'L', 30000, 14670),
      await item('Liga neutra', 'kg', 2000, 6400)
    ]
    const embalagens = [
      await item('Palito', 'un', 1_200_000, 9600, 'insumo'),
      await item('Saquinho plástico', 'un', 900_000, 24300, 'insumo'),
      await item('Etiqueta', 'un', 2_000_000, 12000, 'insumo')
    ]
    const paleta = (await window.api.categorias.listar()).find((c) => c.nome === 'Paleta')!
    const r = await window.api.receitas.salvar(null, {
      nome: 'Paleta de Morango recheada',
      categoriaId: paleta.id,
      rendimento: 100,
      ingredientes: [5000, 2500, 15000, 2500, 5000, 120].map((quantidade, i) => ({
        itemId: ingredientes[i]!,
        quantidade
      })),
      embalagens,
      gasVezes: 1000,
      gasValor: null,
      precoBalcao: 1000 as never,
      precoAtacado: 700 as never,
      nomeUnidade: 'paleta'
    })
    if (!r.ok) throw new Error(r.mensagem)
  })
}

const morangoNoEstoque = (pagina: Page) =>
  pagina.evaluate(
    async () => (await window.api.estoque.listar()).find((i) => i.nome === 'Morango')!.quantidade
  )

test('T13: planejar, ver o que falta, registrar com estoque negativo, excluir e desfazer', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/producao')
  await expect(pagina.getByRole('radio', { name: 'Paleta de Morango recheada' })).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await expect(pagina.locator('.faixa-produz')).toContainText('Esta receita produz100 paletas')

  const morango = pagina.getByRole('row', { name: /^Morango/ })
  await expect(morango).toContainText('5 kg')
  await expect(morango).toContainText('3,5 kg')
  await expect(morango).toContainText('Falta 1,5 kg')
  await expect(pagina.getByRole('row', { name: /^Palito/ })).toContainText('100 un')
  await expect(pagina.getByRole('row', { name: /^Leite condensado/ })).toContainText('15 lata')
  await expect(pagina.getByRole('row', { name: /Gás e energia/ })).toHaveCount(0)
  await expect(pagina.locator('.caixa-falta')).toContainText('Falta comprar: Morango 1,5 kg')
  await expect(pagina.locator('.caixa-falta')).toContainText('Custo estimado: R$ 27,00')

  // meia receita: dá com o estoque que tem
  await pagina.getByRole('button', { name: 'Meia receita a menos' }).click()
  await expect(pagina.getByLabel('Quantas receitas vai fazer?')).toHaveValue('½')
  await expect(pagina.getByText('✓ Tem tudo no estoque. Pode produzir!')).toBeVisible()
  await expect(pagina.getByLabel('Quantas paletas saíram?')).toHaveValue('50')
  await pagina.getByRole('button', { name: 'Meia receita a mais' }).click()

  // receita inteira: pede confirmação porque falta morango (D-032 p.31)
  await pagina.getByLabel('Quantas paletas saíram?').fill('98')
  await pagina.getByRole('button', { name: 'Registrar produção', exact: true }).click()
  await expect(pagina.getByText('Falta estoque. Registrar mesmo assim?')).toBeVisible()
  await pagina.getByRole('button', { name: 'Sim' }).click()
  await expect(
    pagina.getByText('✓ Produção registrada! 98 paletas de Paleta de Morango recheada anotadas.')
  ).toBeVisible()
  expect(await morangoNoEstoque(pagina)).toBe(-1500)

  const linha = pagina.getByRole('row', { name: /16\/10.*Paleta de Morango recheada/ })
  await expect(linha).toContainText('1 receita')
  await expect(linha).toContainText('98 paletas')
  // T2 sem o gás e energia (começa em R$ 0,00, D-041): 335,04 − 8,00
  await expect(linha).toContainText('R$ 327,04')

  // excluir devolve o estoque; desfazer baixa de novo
  await linha
    .getByRole('button', { name: 'Excluir a produção de Paleta de Morango recheada' })
    .click()
  await pagina.getByRole('button', { name: 'Sim' }).click()
  await expect(pagina.getByText('Nenhuma produção registrada neste mês.')).toBeVisible()
  expect(await morangoNoEstoque(pagina)).toBe(3500)
  await pagina.getByRole('button', { name: 'Desfazer' }).click()
  await expect(linha).toBeVisible()
  expect(await morangoNoEstoque(pagina)).toBe(-1500)
})

test('"Mudar na receita" abre a receita para editar', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/producao')
  await pagina.getByRole('button', { name: 'Mudar na receita' }).click()
  await expect(pagina.getByRole('dialog', { name: 'Editar receita' })).toBeVisible()
})
