import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { abrirApp, definirEscala, irPara, temRolagemHorizontal, type AppAberto } from './app'

let aberto: AppAberto

test.afterEach(async () => {
  await aberto.app.close()
})

/** Outubro: balcão 01/10 e 15/10, aluguel pago; setembro: balcão 10/09. */
async function preparar(a: AppAberto) {
  await a.pagina.evaluate(async () => {
    const ok = (r: { ok: boolean; mensagem?: string }) => {
      if (!r.ok) throw new Error(r.mensagem)
    }
    const balcao = (data: string, dinheiro: number, debito = 0) =>
      window.api.vendas.salvarFechamento({
        data,
        lojaFechada: false,
        dinheiro: dinheiro as never,
        pix: 0 as never,
        debito: debito as never,
        credito: 0 as never
      })
    ok(await balcao('2026-09-10', 80000))
    ok(await balcao('2026-10-01', 100000, 50000))
    ok(await balcao('2026-10-15', 50000))
    const aluguel = (await window.api.tiposConta.listar()).find((t) => t.nome === 'Aluguel')!
    ok(
      await window.api.contas.salvar(
        null,
        {
          nome: 'Aluguel',
          valor: 120000 as never,
          vencimento: '2026-10-05',
          tipoId: aluguel.id,
          repete: false,
          avisarDias: 3
        },
        { forma: 'pix', cartaoId: null, pagoEm: '2026-10-05' }
      )
    )
  })
}

test('Resultado do mês, troca de relatório e de mês, Imprimir e Salvar em PDF', async () => {
  aberto = await abrirApp()
  const { pagina, pastas } = aberto
  await preparar(aberto)
  await irPara(pagina, '#/relatorios')

  const resultado = pagina.getByRole('region', { name: 'Resultado de outubro' })
  await expect(pagina.getByText('Período: outubro de 2026')).toBeVisible()
  await expect(resultado).toContainText('Vendas no balcãoR$ 2.000,00')
  await expect(resultado).toContainText('Total que entrouR$ 2.000,00')
  await expect(resultado).toContainText('− AluguelR$ 1.200,00')
  // taxa de débito padrão sobre R$ 500,00
  const lucro = await pagina.evaluate(
    async () => (await window.api.socios.mes('2026-10')).resultado.lucro
  )
  await expect(resultado.locator('.rel-linha.escuro')).toContainText(
    `R$ ${(lucro / 100).toFixed(2).replace('.', ',')}`
  )
  await expect(resultado.locator('.rel-conclusao')).toContainText('Sobraram')

  await pagina.getByRole('button', { name: 'Dinheiro, cartão e Pix' }).click()
  const formas = pagina.getByRole('region', { name: 'Balcão por forma de pagamento · outubro' })
  await expect(formas).toContainText('DinheiroR$ 1.500,00 · 75%')
  await expect(formas).toContainText('Cartão débitoR$ 500,00 · 25%')
  await expect(formas).toContainText('Outubro teve 2 dias de loja aberta: média de R$ 1.000,00')

  // setembro
  await pagina.getByRole('combobox', { name: 'Período' }).click()
  await pagina.getByRole('option', { name: 'Setembro de 2026' }).click()
  await expect(pagina.getByText('Período: setembro de 2026')).toBeVisible()
  await expect(
    pagina.getByRole('region', { name: 'Balcão por forma de pagamento · setembro' })
  ).toContainText('DinheiroR$ 800,00 · 100%')

  await pagina.getByRole('button', { name: 'Comparar com o ano passado' }).click()
  await expect(pagina.getByText(/Ainda não há setembro de 2025 no sistema/)).toBeVisible()
  await pagina.getByRole('button', { name: 'Perdas', exact: true }).click()
  await expect(pagina.getByRole('region', { name: 'Perdas de setembro' })).toContainText(
    'Total perdidoR$ 0,00'
  )

  // Imprimir: prévia no programa, cópias e direto na impressora (D-088).
  // Nos testes, vira PDF em <dados>/impressoes, com as opções escolhidas ao lado (.json).
  await pagina.getByRole('button', { name: 'Resultado do mês (lucro)' }).click()
  await pagina.getByRole('button', { name: 'Imprimir' }).click()
  const previa = pagina.getByRole('dialog', { name: 'Imprimir' })
  await expect(previa.getByText('Resultado de setembro de 2026')).toBeVisible()
  await expect(previa.getByText(/Vai imprimir 1 folha por cópia/)).toBeVisible()
  await expect(previa.locator('iframe')).toHaveAttribute('src', /^blob:.*#toolbar=0/)
  await previa.getByRole('button', { name: 'Uma cópia a mais' }).click()
  await expect(previa.getByLabel('Número de cópias')).toHaveValue('2')
  await previa.getByRole('button', { name: 'Imprimir', exact: true }).click()
  await expect(previa).toBeHidden()
  await expect(
    pagina.getByText('✓ Resultado de setembro de 2026 enviado para a impressora (2 cópias).')
  ).toBeVisible()
  const impresso = join(pastas.dados, 'impressoes', 'Resultado de setembro de 2026')
  expect(existsSync(`${impresso}.pdf`)).toBe(true)
  expect(JSON.parse(readFileSync(`${impresso}.json`, 'utf8'))).toEqual({
    impressora: null,
    copias: 2
  })
  await pagina.getByRole('button', { name: 'Salvar em PDF' }).click()
  const pdf = join(pastas.dados, 'Relatórios', 'Resultado de setembro de 2026.pdf')
  await expect(pagina.getByText(`✓ Salvo em ${pdf}`)).toBeVisible()
  expect(statSync(pdf).size).toBeGreaterThan(1000)
  await expect(pagina.getByRole('button', { name: 'Abrir pasta' })).toBeVisible()
})

test('todos os relatórios a 130% em 1280×720 sem rolagem horizontal', async () => {
  aberto = await abrirApp(1280, 720)
  const { pagina } = aberto
  await preparar(aberto)
  await definirEscala(pagina, 130)
  for (const r of [
    'resultado',
    'gordurinha',
    'mais_vendidos',
    'formas',
    'comparar',
    'lucro_produto',
    'perdas'
  ]) {
    await irPara(pagina, `#/relatorios?r=${r}`)
    await expect(pagina.locator('.relatorio').first()).toBeVisible()
    expect(await temRolagemHorizontal(pagina), r).toBe(false)
    // nada passa da borda do quadro (tabela do "Comparar" já passou)
    const vazando = await pagina
      .locator('.relatorio')
      .evaluateAll((qs) => qs.some((q) => q.scrollWidth > q.clientWidth + 1))
    expect(vazando, r).toBe(false)
  }
})
