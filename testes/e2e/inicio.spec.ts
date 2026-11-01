import { expect, test } from '@playwright/test'
import { abrirApp, irPara, type AppAberto } from './app'

let aberto: AppAberto

test.afterEach(async () => {
  await aberto.app.close()
})

test('sem nada lançado: meta pede as contas e não há avisos', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/')
  await expect(pagina.getByText(/Nenhuma conta lançada para outubro/)).toBeVisible()
  await expect(pagina.getByText('✓ Nada precisa de atenção hoje.')).toBeVisible()
  await expect(pagina.locator('.kpi-card').nth(0)).toContainText('balcão não lançado')
})

test('T8 e avisos: vendas, despesas, lucro, meta, estoque baixo, validade e contas', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await pagina.evaluate(async () => {
    const ok = <T>(r: { ok: true; valor: T } | { ok: false; mensagem: string }) => {
      if (!r.ok) throw new Error(r.mensagem)
      return r.valor
    }
    const balcao = (data: string, dinheiro: number) =>
      window.api.vendas.salvarFechamento({
        data,
        lojaFechada: false,
        dinheiro: dinheiro as never,
        pix: 0 as never,
        debito: 0 as never,
        credito: 0 as never
      })
    ok(await balcao('2026-10-14', 50000))
    ok(await balcao('2026-10-15', 138250))
    const tipos = await window.api.tiposConta.listar()
    const tipo = (n: string) => tipos.find((t) => t.nome === n)!.id
    ok(
      await window.api.contas.salvar(
        null,
        {
          nome: 'Aluguel',
          valor: 350000 as never,
          vencimento: '2026-10-05',
          tipoId: tipo('Aluguel'),
          repete: false,
          avisarDias: 3
        },
        { forma: 'pix', cartaoId: null, pagoEm: '2026-10-05' }
      )
    )
    ok(
      await window.api.contas.salvar(
        null,
        {
          nome: 'Energia elétrica',
          valor: 295000 as never,
          vencimento: '2026-10-17',
          tipoId: tipo('Energia'),
          repete: false,
          avisarDias: 3
        },
        null
      )
    )
    const item = (
      nome: string,
      unidade: 'kg' | 'L',
      q: number,
      v: number,
      min: number,
      val: string | null
    ) =>
      window.api.estoque.cadastrar({
        tipo: 'materia_prima',
        unidade,
        nomeUnidade: null,
        nome,
        quantidade: q,
        valorPago: v as never,
        fornecedorId: null,
        minimo: min,
        validade: val
      })
    ok(await item('Leite integral', 'L', 12000, 5868, 40000, null))
    ok(await item('Morango', 'kg', 3500, 6300, 0, '2026-10-18'))
  })
  // o Início já estava aberto: passa por outra tela para ler os dados novos
  await irPara(pagina, '#/vendas')
  await irPara(pagina, '#/')

  const cards = pagina.locator('.kpi-card')
  await expect(cards.nth(0)).toContainText('R$ 1.382,50')
  await expect(cards.nth(1)).toContainText('Vendas de outubro')
  await expect(cards.nth(1)).toContainText('R$ 1.882,50')
  await expect(cards.nth(2)).toContainText('R$ 3.500,00')
  await expect(cards.nth(3)).toContainText('−R$ 1.617,50')

  // meta: contas 6.450,00; vendido 1.882,50 em 2 dias → 29%, faltam 4.567,50, cerca de 5 dias
  const meta = pagina.locator('.meta-mes')
  await expect(meta).toContainText('Meta para pagar as contas de outubro')
  await expect(meta).toContainText('Meta R$ 6.450,00')
  await expect(meta.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '29')
  await expect(meta).toContainText('Faltam R$ 4.567,50, cerca de 5 dias de vendas no ritmo atual')
  await expect(meta).toContainText('Faltam uns 5 dias de vendas')

  const baixo = pagina.getByRole('region', { name: 'Estoque baixo' })
  await expect(baixo).toContainText('Leite integral')
  await expect(baixo).toContainText('mínimo 40 L')
  await expect(baixo).toContainText('12 L')
  const vencendo = pagina.getByRole('region', { name: 'Vencendo em breve' })
  await expect(vencendo).toContainText('Morango · 3,5 kg')
  await expect(vencendo).toContainText('em 2 dias')
  const contas = pagina.getByRole('region', { name: 'Contas para pagar' })
  await expect(contas).toContainText('Energia elétrica')
  await expect(contas).toContainText('vence amanhã, 17/10')
  await expect(contas).toContainText('1 vence logo')
  await expect(contas).not.toContainText('Aluguel')

  // um card por linha, todos na largura toda (D-079)
  const caixas = await pagina
    .locator('.aviso-inicio')
    .evaluateAll((cards) => cards.map((c) => c.getBoundingClientRect()))
  expect(caixas.length).toBeGreaterThan(2)
  for (const [i, c] of caixas.entries()) {
    expect(c.left).toBe(caixas[0]!.left)
    expect(c.width).toBe(caixas[0]!.width)
    if (i > 0) expect(c.top).toBeGreaterThan(caixas[i - 1]!.bottom)
  }

  // atalho "Chegou mercadoria" abre a entrada no Estoque
  await pagina.getByRole('link', { name: 'Chegou mercadoria' }).click()
  await expect(pagina.getByRole('dialog')).toBeVisible()
})
