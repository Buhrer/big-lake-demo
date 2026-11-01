import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { abrirApp, irPara, temRolagemHorizontal, type AppAberto } from './app'

let aberto: AppAberto

test.beforeEach(async () => {
  aberto = await abrirApp()
})

test.afterEach(async () => {
  await aberto.app.close()
})

async function preencherTaxas(pagina: Page) {
  await pagina.getByRole('button', { name: 'Ver ou alterar taxas' }).click()
  await pagina.getByLabel('Cartão débito: taxa (%)').fill('1,5')
  await pagina.getByLabel('Cartão débito: cai na conta em (dias)').fill('1')
  await pagina.getByLabel('Cartão crédito: taxa (%)').fill('3,2')
  await pagina.getByLabel('Cartão crédito: cai na conta em (dias)').fill('30')
  await pagina.getByRole('button', { name: 'Pronto' }).click()
  await expect(pagina.getByText('débito 1,5% · crédito 3,2%')).toBeVisible()
}

async function lancarT5(pagina: Page) {
  await pagina.getByLabel('Dinheiro (R$)').fill('412,50')
  await pagina.getByLabel('Pix (R$)').fill('334')
  await pagina.getByLabel('Cartão débito (R$)').fill('218')
  await pagina.getByLabel('Cartão crédito (R$)').fill('320')
  await expect(pagina.locator('.total-dia')).toContainText('R$ 1.284,50')
}

/** Cliente e produtos do T6, pela API. */
async function prepararPedido(pagina: Page) {
  await pagina.evaluate(async () => {
    await window.api.clientes.salvar(null, {
      nome: 'Mercado Bom Preço',
      telefone: '',
      documento: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: ''
    })
    const categoria = async (nome: string, balcao: number, atacado: number) => {
      // Picolé já vem no sistema (D-062); as outras são criadas
      const existente = (await window.api.categorias.listar()).find((x) => x.nome === nome)
      const c = existente
        ? { ok: true as const, valor: existente }
        : await window.api.categorias.criar(nome)
      if (!c.ok) throw new Error(c.mensagem)
      await window.api.receitas.salvar(null, {
        nome: 'Base ' + nome,
        categoriaId: c.valor.id,
        rendimento: 10,
        ingredientes: [],
        embalagens: [],
        gasVezes: null,
        gasValor: null,
        precoBalcao: balcao as never,
        precoAtacado: atacado as never,
        nomeUnidade: 'pote'
      })
      return c.valor.id
    }
    const pote = await categoria('Sorvete de pote', 4900, 4500)
    const acai = await categoria('Açaí', 5600, 5200)
    const picole = await categoria('Picolé', 700, 550)
    const produto = (categoriaId: number, nome: string, caixa: number | null = null) =>
      window.api.produtos.salvar(null, {
        categoriaId,
        nome,
        vendidoComo: caixa ? 'caixa' : 'pote',
        medida: null,
        medidaUnidade: null,
        unidadesPorCaixa: caixa,
        receitaId: null
      })
    await produto(pote, 'Pote 2 L · Morango')
    await produto(pote, 'Pote 2 L · Chocolate')
    await produto(acai, 'Pote 2 L · Creme de açaí')
    await produto(picole, 'Caixa 20 picolés cremosos', 20)
  })
}

test('T5: lançar o balcão de hoje com taxas, e ver no histórico', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/vendas')
  await expect(pagina.getByRole('heading', { name: 'Lançar as vendas de hoje' })).toBeVisible()
  await expect(pagina.getByText('ainda não preenchidas')).toBeVisible()
  await preencherTaxas(pagina)
  await lancarT5(pagina)
  await pagina.getByRole('button', { name: 'Salvar vendas de hoje' }).click()
  await expect(
    pagina.getByText(
      '✓ Vendas de 16/10 lançadas! Total de R$ 1.284,50. Já aparece no histórico abaixo e nos relatórios.'
    )
  ).toBeVisible()
  await expect(pagina.getByRole('heading', { name: 'Corrigir as vendas de 16/10' })).toBeVisible()
  const linha = pagina.getByRole('row', { name: /Corrigir o dia 16\/10/ })
  await expect(linha).toContainText('412,50')
  await expect(linha).toContainText('R$ 1.284,50')
})

test('dia que passou, loja fechada e correção pelo histórico', async () => {
  const { pagina } = aberto
  await irPara(pagina, '#/vendas')
  await pagina.getByLabel('Dia', { exact: true }).fill('12102026')
  await expect(pagina.getByRole('heading', { name: 'Lançar as vendas do dia' })).toBeVisible()
  await pagina.getByRole('button', { name: 'A loja não abriu neste dia' }).click()
  await expect(pagina.getByText('✓ Dia 12/10 marcado como loja fechada.')).toBeVisible()
  await expect(pagina.getByRole('row', { name: /Corrigir o dia 12\/10/ })).toContainText(
    'Loja fechada'
  )

  await pagina.getByLabel('Dia', { exact: true }).fill('15102026')
  await lancarT5(pagina)
  await pagina.getByRole('button', { name: 'Salvar vendas do dia' }).click()
  await expect(pagina.getByText('✓ Vendas de 15/10 lançadas!', { exact: false })).toBeVisible()

  await pagina.getByRole('button', { name: 'Corrigir o dia 15/10/2026' }).click()
  await expect(pagina.getByRole('heading', { name: 'Corrigir as vendas de 15/10' })).toBeVisible()
  await expect(pagina.getByLabel('Dinheiro (R$)')).toHaveValue('412,50')
  await pagina.getByLabel('Dinheiro (R$)').fill('420')
  await pagina.getByRole('button', { name: 'Salvar correção' }).click()
  await expect(pagina.getByRole('row', { name: /Corrigir o dia 15\/10/ })).toContainText(
    'R$ 1.292,00'
  )

  await irPara(pagina, '#/configuracoes?aba=historico')
  await expect(
    pagina.getByRole('cell', {
      name: 'Corrigiu as vendas do dia 15/10: dinheiro R$ 412,50 → R$ 420,00'
    })
  ).toBeVisible()
})

test('T6: pedido com produtos, taxa no crédito, comprovante e histórico', async () => {
  const { pagina, pastas } = aberto
  await prepararPedido(pagina)
  await pagina.evaluate(() =>
    window.api.vendas.salvarTaxas({
      debitoPct: 150,
      debitoDias: 1,
      creditoPct: 320,
      creditoDias: 30
    })
  )
  await irPara(pagina, '#/vendas?aba=pedidos')
  await pagina.getByRole('combobox', { name: 'Cliente' }).click()
  await pagina.getByRole('option', { name: 'Mercado Bom Preço' }).click()
  const produto = (nome: string) => pagina.locator('.prod', { hasText: nome })
  await produto('Morango').click()
  // digitar tecla por tecla não tira o cursor do campo (antes, "14" virava "1")
  const qtdMorango = pagina.getByLabel('Quantidade de Pote 2 L · Morango')
  await qtdMorango.fill('')
  await qtdMorango.pressSequentially('14')
  await expect(qtdMorango).toHaveValue('14')
  await expect(qtdMorango).toBeFocused()
  await qtdMorango.fill('4')
  await produto('Chocolate').click()
  for (let i = 0; i < 3; i++)
    await pagina.getByRole('button', { name: 'Aumentar Pote 2 L · Chocolate' }).click()
  await produto('Creme de açaí').click()
  await produto('Creme de açaí').click()
  await produto('Caixa 20').click()
  await expect(produto('Caixa 20')).toContainText('R$ 110,00')
  await expect(pagina.locator('.total-pedido')).toContainText('R$ 574,00')
  await pagina.getByRole('radio', { name: 'Cartão crédito' }).click()
  await expect(pagina.locator('.total-pedido')).toContainText('Taxa da maquininha (3,2%)')
  await expect(pagina.locator('.total-pedido')).toContainText('− R$ 18,37')
  await expect(pagina.locator('.total-pedido')).toContainText('R$ 555,63')
  await pagina.getByRole('button', { name: 'Salvar pedido' }).click()

  await expect(
    pagina.getByText(
      '✓ Pedido nº 1 salvo! Total de R$ 574,00 em Cartão crédito. Já aparece no histórico abaixo.'
    )
  ).toBeVisible()
  const comprovante = pagina.getByLabel('Comprovante do pedido nº 1')
  await expect(comprovante).toContainText('Cliente: Mercado Bom Preço')
  await expect(comprovante).toContainText('1 x Caixa 20 picolés cremosos')
  await expect(comprovante).toContainText('Recebido por:')

  // prévia e "Imprimir"; nos testes salva o PDF em <dados>/impressoes (D-057, D-088)
  await pagina.getByRole('button', { name: 'Imprimir comprovante' }).click()
  const previa = pagina.getByRole('dialog', { name: 'Imprimir' })
  await expect(previa.getByText('Comprovante do pedido #1')).toBeVisible()
  await previa.getByRole('button', { name: 'Imprimir', exact: true }).click()
  await expect(
    pagina.getByText('✓ Comprovante do pedido #1 enviado para a impressora.')
  ).toBeVisible()
  expect(existsSync(join(pastas.dados, 'impressoes', 'pedido-1.pdf'))).toBe(true)

  await expect(pagina.getByText('Outubro de 2026:')).toContainText('1 pedido · R$ 574,00')
  const linha = pagina.getByRole('row', { name: /#1/ })
  await expect(linha).toContainText('Cartão crédito')
  await expect(linha).toContainText('4 Pote 2 L · Morango + 4 Pote 2 L · Chocolate + mais 2')

  await pagina.getByRole('button', { name: 'Fazer outro pedido' }).click()
  await expect(pagina.getByRole('heading', { name: 'Novo pedido' })).toBeVisible()
})

test('validação, corrigir e cancelar pedido (com Desfazer)', async () => {
  const { pagina } = aberto
  await prepararPedido(pagina)
  await irPara(pagina, '#/vendas?aba=pedidos')
  await pagina.getByRole('button', { name: 'Salvar pedido' }).click()
  await expect(pagina.getByText('Escolha o cliente.')).toBeVisible()
  await expect(pagina.getByText('Toque nos produtos para colocar no pedido.')).toBeVisible()
  await expect(pagina.getByText('Escolha como o cliente pagou.')).toBeVisible()

  await pagina.getByRole('combobox', { name: 'Cliente' }).click()
  await pagina.getByRole('option', { name: 'Mercado Bom Preço' }).click()
  await pagina.locator('.prod', { hasText: 'Morango' }).click()
  await pagina.getByRole('radio', { name: 'Pix' }).click()
  await pagina.getByRole('button', { name: 'Salvar pedido' }).click()
  await pagina.getByRole('button', { name: 'Fazer outro pedido' }).click()

  await pagina.getByRole('button', { name: 'Corrigir o pedido 1' }).click()
  await expect(pagina.getByRole('heading', { name: 'Corrigindo o pedido nº 1' })).toBeVisible()
  await pagina.getByLabel('Quantidade de Pote 2 L · Morango').fill('3')
  await pagina.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(pagina.getByRole('row', { name: /#1/ })).toContainText('R$ 135,00')

  const linha = pagina.getByRole('row', { name: /#1/ })
  await linha.getByRole('button', { name: 'Cancelar o pedido 1' }).click()
  await linha.getByRole('button', { name: 'Sim' }).click()
  await expect(linha.getByText('Cancelado')).toBeVisible()
  await expect(pagina.getByText('Outubro de 2026:')).toContainText('0 pedidos · R$ 0,00')
  await linha.getByRole('button', { name: 'Desfazer cancelamento' }).click()
  await expect(pagina.getByText('Outubro de 2026:')).toContainText('1 pedido · R$ 135,00')
})

test('"Novo pedido" em Cadastros abre o pedido já com o cliente', async () => {
  const { pagina } = aberto
  await prepararPedido(pagina)
  await irPara(pagina, '#/cadastros')
  await pagina.getByRole('button', { name: 'Novo pedido' }).click()
  await expect(pagina.getByRole('combobox', { name: 'Cliente' })).toContainText('Mercado Bom Preço')
})

test('resumo do dia e do mês; sem rolagem horizontal a 130% em 1280×720', async () => {
  const { app, pagina } = aberto
  await prepararPedido(pagina)
  await pagina.evaluate(async () => {
    await window.api.vendas.salvarTaxas({
      debitoPct: 150,
      debitoDias: 1,
      creditoPct: 320,
      creditoDias: 30
    })
    await window.api.vendas.salvarFechamento({
      data: '2026-10-15',
      lojaFechada: false,
      dinheiro: 42000 as never,
      pix: 35250 as never,
      debito: 25000 as never,
      credito: 36000 as never
    })
    const [cliente] = await window.api.clientes.listar()
    const produtos = await window.api.produtos.listar()
    await window.api.pedidos.salvar(null, {
      clienteId: cliente!.id,
      data: '2026-10-16',
      forma: 'pix',
      itens: [{ produtoId: produtos.find((p) => p.nome.includes('Morango'))!.id, quantidade: 12 }]
    })
  })
  await irPara(pagina, '#/vendas?aba=resumo')
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText('R$ 540,00')
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText(
    'só pedidos · balcão ainda não lançado'
  )
  await expect(pagina.locator('.kpi-card').nth(3)).toContainText('1 de 2')
  await expect(pagina.locator('.kpi-card').nth(3)).toContainText('falta lançar hoje')
  await expect(pagina.locator('.kpi-card').nth(4)).toContainText('R$ 1.922,50')
  await expect(pagina.getByRole('row', { name: /16\/10 · sexta/ })).toContainText('falta lançar')
  await expect(pagina.getByRole('row', { name: /15\/10 · quinta/ })).toContainText('R$ 1.382,50')

  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setContentSize(1280, 720)
  )
  for (let i = 0; i < 3; i++) await pagina.getByRole('button', { name: 'Aumentar a letra' }).click()
  for (const aba of ['balcao', 'pedidos', 'resumo']) {
    await irPara(pagina, `#/vendas?aba=${aba}`)
    await pagina.waitForTimeout(100)
    expect(await temRolagemHorizontal(pagina), aba).toBe(false)
  }
  expect(readdirSync(join(aberto.pastas.dados))).toContain('biglake.db')
})

test('histórico do balcão: últimos 10, "Ver mais" e escolher o mês (D-085, D-086)', async () => {
  const { pagina } = aberto
  // 20 dias: 21/09 a 10/10
  await pagina.evaluate(async () => {
    for (let i = 0; i < 20; i++) {
      const d = new Date(Date.UTC(2026, 8, 21 + i))
      await window.api.vendas.salvarFechamento({
        data: d.toISOString().slice(0, 10),
        lojaFechada: false,
        dinheiro: 10000 as never,
        pix: 0 as never,
        debito: 0 as never,
        credito: 0 as never
      })
    }
  })
  await irPara(pagina, '#/vendas')
  const quadro = pagina.getByRole('region', { name: 'Histórico do balcão' })
  const linhas = quadro.locator('tbody tr')
  await expect(linhas).toHaveCount(10)
  await expect(linhas.first()).toContainText('10/10')
  await expect(quadro.getByText('Mostrando 10 de 20')).toBeVisible()
  await quadro.getByRole('button', { name: 'Ver mais 10' }).click()
  await expect(linhas).toHaveCount(20)
  await expect(quadro.getByRole('button', { name: /^Ver mais/ })).toHaveCount(0)

  // só setembro: 21/09 a 30/09 (e volta a mostrar do começo)
  await quadro.getByRole('combobox', { name: 'Mês do histórico do balcão' }).click()
  await pagina.getByRole('option', { name: 'Setembro de 2026' }).click()
  await expect(linhas).toHaveCount(10)
  await expect(linhas.first()).toContainText('30/09')
  await expect(quadro.getByRole('button', { name: /^Ver mais/ })).toHaveCount(0)

  // Resumo › Vendas por dia: de hoje (16/10, falta lançar) até 21/09 = 26 dias
  await irPara(pagina, '#/vendas?aba=resumo')
  const porDia = pagina.getByRole('region', { name: 'Vendas por dia' })
  const dias = porDia.locator('tbody tr')
  await expect(dias).toHaveCount(10)
  await expect(dias.first()).toContainText('16/10')
  await expect(dias.first()).toContainText('falta lançar')
  await expect(porDia.getByText('Mostrando 10 de 26')).toBeVisible()
  await porDia.getByRole('button', { name: 'Ver mais 10' }).click()
  await expect(dias).toHaveCount(20)
  await porDia.getByRole('button', { name: 'Ver mais 6' }).click()
  await expect(dias).toHaveCount(26)
  await porDia.getByRole('combobox', { name: 'Mês das vendas por dia' }).click()
  await pagina.getByRole('option', { name: 'Setembro de 2026' }).click()
  await expect(dias).toHaveCount(10)
  await expect(dias.last()).toContainText('21/09')
})
