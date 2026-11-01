import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { abrirApp, irPara, type AppAberto } from './app'

let aberto: AppAberto

test.afterEach(async () => {
  await aberto.app.close()
})

/** Morango a R$ 18,00/kg; Paleta usa 5 kg; 2 receitas em outubro; energia R$ 2.840,00; setembro vendeu R$ 40.000,00. */
async function preparar(pagina: Page) {
  await pagina.evaluate(async () => {
    const ok = <T>(r: { ok: true; valor: T } | { ok: false; mensagem: string }): T => {
      if (!r.ok) throw new Error(r.mensagem)
      return r.valor
    }
    const morango = ok(
      await window.api.estoque.cadastrar({
        tipo: 'materia_prima',
        unidade: 'kg',
        nomeUnidade: null,
        nome: 'Morango',
        quantidade: 20000,
        valorPago: 36000 as never,
        fornecedorId: null,
        minimo: 0,
        validade: null
      })
    )
    const paleta = (await window.api.categorias.listar()).find((c) => c.nome === 'Paleta')!
    const receitaId = ok(
      await window.api.receitas.salvar(null, {
        nome: 'Paleta de Morango',
        categoriaId: paleta.id,
        rendimento: 100,
        ingredientes: [{ itemId: morango, quantidade: 5000 }],
        embalagens: [],
        gasVezes: 1000,
        gasValor: null,
        precoBalcao: 1000 as never,
        precoAtacado: 700 as never,
        nomeUnidade: 'paleta'
      })
    )
    ok(await window.api.producao.registrar({ receitaId, vezes: 2000, unidadesFeitas: 200 }))
    const energia = (await window.api.tiposConta.listar()).find((t) => t.nome === 'Energia')!
    ok(
      await window.api.contas.salvar(
        null,
        {
          nome: 'Energia elétrica',
          valor: 284000 as never,
          vencimento: '2026-10-10',
          tipoId: energia.id,
          repete: true,
          avisarDias: 3
        },
        null
      )
    )
    ok(
      await window.api.vendas.salvarFechamento({
        data: '2026-09-10',
        lojaFechada: false,
        dinheiro: 4_000_000 as never,
        pix: 0 as never,
        debito: 0 as never,
        credito: 0 as never
      })
    )
  })
}

/** O morango sobe para R$ 22,00/kg e a energia para R$ 2.950,00. */
async function subirPrecos(pagina: Page) {
  await pagina.evaluate(async () => {
    const itens = await window.api.estoque.listar()
    const morango = itens.find((i) => i.nome === 'Morango')!
    const r = await window.api.estoque.registrarEntrada({
      itemId: morango.id,
      quantidade: 1000,
      valorPago: 2200 as never,
      fornecedorId: null,
      validade: null
    })
    if (!r.ok) throw new Error(r.mensagem)
    const conta = (await window.api.contas.listar()).find((c) => c.nome === 'Energia elétrica')!
    // a conta vem de Contas a pagar (não é de manutenção): pode ser corrigida
    const c = await window.api.contas.salvar(conta.id, { ...conta, valor: 295000 as never }, null)
    if (!c.ok) throw new Error(c.mensagem)
  })
}

test('T9: ligar, o que subiu come, mudar base, contas fixas, card no Início e "Já reajustei"', async () => {
  aberto = await abrirApp()
  const { pagina, pastas } = aberto
  await preparar(pagina)
  await irPara(pagina, '#/relatorios?r=gordurinha')
  await expect(pagina.getByText('A Gordurinha é sempre a de hoje')).toBeVisible()
  await expect(pagina.getByRole('combobox', { name: 'Período' })).toBeHidden()

  // ligar
  await pagina.getByRole('button', { name: 'Ligar a Gordurinha' }).click()
  await expect(pagina.getByText('Digite o lucro líquido de um mês normal.')).toBeVisible()
  await pagina.getByLabel('Lucro líquido base por mês (R$)').fill('15000')
  await pagina.getByLabel('Último reajuste dos preços').fill('10032026')
  await pagina.getByRole('button', { name: 'Ligar a Gordurinha' }).click()
  const quadro = pagina.getByRole('region', { name: 'Gordurinha', exact: true })
  await expect(quadro).toContainText('Tranquilo')
  await expect(quadro).toContainText('Desde o último reajuste, em 10/03/2026')
  await expect(quadro).toContainText('Ainda restamR$ 1.500,00 por mês')
  await expect(pagina.getByText('Nada subiu desde o último reajuste')).toBeVisible()

  // o que subiu come a gordurinha: morango +R$ 40,00 (10 kg por mês) e energia +R$ 110,00
  await subirPrecos(pagina)
  await irPara(pagina, '#/relatorios?r=resultado')
  await irPara(pagina, '#/relatorios?r=gordurinha')
  const comeu = pagina.getByRole('region', { name: 'O que comeu a gordurinha' })
  await expect(comeu.getByRole('row', { name: /Energia elétrica/ })).toContainText('+ R$ 110,00')
  await expect(comeu.getByRole('row', { name: /Morango/ })).toContainText('usa ~10 kg por mês')
  await expect(comeu.getByRole('row', { name: /Morango/ })).toContainText(
    'R$ 18,00 /kg → R$ 22,00 /kg'
  )
  await expect(comeu).toContainText('Total comidoR$ 150,00')
  await expect(quadro).toContainText('Ainda restamR$ 1.350,00 por mês')
  const reajuste = pagina.getByRole('region', { name: 'Reajuste de preços' })
  await expect(reajuste).toContainText('precisam subir cerca de 0,4%')
  await expect(reajuste).toContainText('BalcãoR$ 10,00 → R$ 10,04')
  await expect(reajuste).toContainText('arredondando: R$ 10,50')
  await expect(reajuste).toContainText('AtacadoR$ 7,00 → R$ 7,03')

  // mudar base
  await pagina.getByRole('button', { name: 'Mudar base ou porcentagem' }).click()
  await pagina.getByLabel('Lucro líquido base por mês (R$)').fill('20000')
  await expect(pagina.getByText('= gordurinha de R$ 2.000,00 por mês')).toBeVisible()
  await pagina.getByRole('button', { name: 'Pronto' }).click()
  await expect(quadro).toContainText('Ainda restamR$ 1.850,00 por mês')

  // tirar a energia da conta
  await pagina.getByRole('checkbox', { name: 'Energia elétrica' }).click()
  await expect(pagina.getByRole('checkbox', { name: 'Energia elétrica' })).toHaveAttribute(
    'aria-checked',
    'false'
  )
  await expect(comeu).toContainText('Total comidoR$ 40,00')

  // salvar em PDF
  await pagina.getByRole('button', { name: 'Salvar em PDF' }).click()
  await expect(pagina.getByText(/✓ Salvo em .*Gordurinha de outubro de 2026\.pdf/)).toBeVisible()
  expect(existsSync(join(pastas.dados, 'Relatórios', 'Gordurinha de outubro de 2026.pdf'))).toBe(
    true
  )

  // card no Início
  await irPara(pagina, '#/')
  const card = pagina.getByRole('region', { name: 'Gordurinha' })
  await expect(card).toContainText('Restam R$ 1.960,00 de R$ 2.000,00 por mês (98%).')
  await expect(card).toContainText('Mais comeu: morango.')
  await card.getByRole('link', { name: 'Ver em Relatórios › Gordurinha' }).click()

  // já reajustei
  await pagina.getByRole('button', { name: 'Já reajustei os preços' }).click()
  await expect(pagina.getByText('Os preços novos já estão valendo?')).toBeVisible()
  await pagina.getByRole('button', { name: 'Sim, zerar a conta' }).click()
  await expect(pagina.getByText(/✓ Pronto! A gordurinha voltou a ficar cheia/)).toBeVisible()
  await expect(quadro).toContainText('Desde o último reajuste, em 16/10/2026')
  await expect(quadro).toContainText('Ainda restamR$ 2.000,00 por mês')
})
