import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { abrirApp, irPara, pastasNovas, type AppAberto } from './app'

let aberto: AppAberto

test.afterEach(async () => {
  await aberto?.app.close().catch(() => {})
})

test('ao abrir faz cópia na pasta; avisa que falta cópia no pen drive', async () => {
  aberto = await abrirApp()
  const { pagina, pastas } = aberto
  await expect(pagina.getByRole('status').first()).toHaveText(
    'Ainda não há cópia no pen drive. Conecte o pen drive e toque em "Fazer cópia agora".'
  )
  expect(readdirSync(pastas.copias).filter((a) => a.endsWith('.db'))).toHaveLength(1)
})

test('"Fazer cópia agora" copia na pasta e no pen drive e atualiza o topo', async () => {
  aberto = await abrirApp()
  const { pagina, pastas } = aberto
  await irPara(pagina, '#/configuracoes')
  await pagina.getByRole('button', { name: 'Fazer cópia agora' }).click()
  await expect(pagina.getByText('Cópia feita na pasta do computador e no pen drive.')).toBeVisible()
  await expect(pagina.locator('.bk')).toHaveText(/^Cópia de segurança feita hoje, \d{2}:\d{2}$/)
  expect(readdirSync(join(pastas.penDrive, 'BigLake-Backups'))).toHaveLength(1)
  await expect(pagina.getByText('Conectado')).toBeVisible()
})

test('sem pen drive: avisa em linguagem simples e não trava', async () => {
  aberto = await abrirApp(1366, 768, pastasNovas(false))
  const { pagina } = aberto
  await irPara(pagina, '#/configuracoes')
  await expect(pagina.getByText('Não conectado')).toBeVisible()
  await pagina.getByRole('button', { name: 'Fazer cópia agora' }).click()
  await expect(
    pagina.getByText('Cópia feita na pasta do computador. O pen drive não está conectado.')
  ).toBeVisible()
})

test('tamanho padrão da letra vale ao abrir de novo e vai para o histórico', async () => {
  const pastas = pastasNovas()
  aberto = await abrirApp(1366, 768, pastas)
  let { pagina } = aberto
  await irPara(pagina, '#/configuracoes?aba=letra')
  await pagina.getByRole('radio', { name: 'Grande', exact: true }).click()
  const tamanhoTitulo = () =>
    pagina
      .getByRole('heading', { level: 1 })
      .evaluate((h) => parseFloat(getComputedStyle(h).fontSize))
  await expect.poll(tamanhoTitulo).toBeCloseTo(44 * 1.15, 0)
  await pagina.getByRole('tab', { name: 'Histórico' }).click()
  await expect(
    pagina.getByRole('cell', { name: 'Mudou o tamanho padrão da letra: Normal → Grande' })
  ).toBeVisible()
  await aberto.app.close()

  aberto = await abrirApp(1366, 768, pastas)
  pagina = aberto.pagina
  expect(await tamanhoTitulo()).toBeCloseTo(44 * 1.15, 0)
  await irPara(pagina, '#/configuracoes?aba=letra')
  await expect(pagina.getByRole('radio', { name: 'Grande', exact: true })).toHaveAttribute(
    'aria-checked',
    'true'
  )
})

test('letra Pequena: 90% e as quatro opções em Configurações', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/configuracoes?aba=letra')
  await expect(
    pagina.getByRole('radiogroup', { name: 'Tamanho da letra' }).getByRole('radio')
  ).toHaveText(['Pequena', 'Normal', 'Grande', 'Muito grande'])
  await pagina.getByRole('radio', { name: 'Pequena' }).click()
  await expect
    .poll(() =>
      pagina
        .getByRole('heading', { level: 1 })
        .evaluate((h) => parseFloat(getComputedStyle(h).fontSize))
    )
    .toBeCloseTo(44 * 0.9, 0)
})

test('dados da empresa: salvar, validar e aparecer no histórico', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/configuracoes?aba=empresa')
  await expect(pagina.getByLabel('Nome', { exact: true })).toHaveValue('Big Lake Sorveteria')
  await pagina.getByLabel('Nome', { exact: true }).fill('')
  await pagina.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(pagina.getByText('Digite o nome da empresa.')).toBeVisible()
  await pagina.getByLabel('Nome', { exact: true }).fill('Big Lake Sorveteria')
  await pagina.getByLabel('Telefone').fill('(41) 3333-4444')
  await pagina.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(pagina.getByText('Dados da empresa salvos.')).toBeVisible()
  await pagina.getByRole('tab', { name: 'Histórico' }).click()
  await expect(
    pagina.getByRole('cell', {
      name: 'Mudou os dados da empresa: telefone (vazio) → (41) 3333-4444'
    })
  ).toBeVisible()
})

test('desligar a cópia ao fechar: vai para o histórico e não copia ao fechar', async () => {
  aberto = await abrirApp()
  const { pagina, pastas } = aberto
  await irPara(pagina, '#/configuracoes')
  await pagina.getByRole('switch', { name: 'Copiar sozinho ao fechar o sistema' }).click()
  await expect(pagina.getByRole('switch')).toHaveText('Desligado')
  await pagina.getByRole('tab', { name: 'Histórico' }).click()
  await expect(
    pagina.getByRole('cell', { name: 'Desligou a cópia automática ao fechar o sistema' })
  ).toBeVisible()
  await aberto.app.close()
  expect(readdirSync(pastas.penDrive)).toHaveLength(0)
})

test('ao fechar, copia no pen drive (ligado por padrão)', async () => {
  aberto = await abrirApp()
  const { pastas } = aberto
  await aberto.app.close()
  expect(readdirSync(join(pastas.penDrive, 'BigLake-Backups'))).toHaveLength(1)
})

test('restaurar uma cópia volta os dados, com confirmação', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/configuracoes?aba=empresa')
  const telefone = pagina.getByLabel('Telefone')
  const aba = (nome: string) => pagina.getByRole('tab', { name: nome }).click()
  await telefone.fill('A')
  await pagina.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(pagina.getByText('Dados da empresa salvos.')).toBeVisible()
  await aba('Cópia de segurança')
  await pagina.getByRole('button', { name: 'Fazer cópia agora' }).click()
  await expect(pagina.getByText(/Cópia feita na pasta/)).toBeVisible()
  await aba('Dados da empresa')
  await telefone.fill('B')
  await pagina.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(pagina.getByText('Dados da empresa salvos.')).toBeVisible()
  await aba('Cópia de segurança')

  await pagina.getByRole('button', { name: 'Restaurar uma cópia' }).click()
  const modal = pagina.getByRole('dialog', { name: 'Restaurar uma cópia' })
  const primeira = modal.getByRole('row').nth(1)
  await primeira.getByRole('button', { name: 'Restaurar esta' }).click()
  await expect(primeira).toContainText('O que foi feito depois será desfeito.')
  await primeira.getByRole('button', { name: 'Sim' }).click()

  // depois de restaurar, o programa recarrega
  await expect
    .poll(
      async () => {
        await aba('Dados da empresa')
        return pagina.getByLabel('Telefone').inputValue()
      },
      { timeout: 15_000 }
    )
    .toBe('A')
  await aba('Histórico')
  await expect(
    pagina.getByRole('cell', { name: /^Restaurou a cópia de segurança de hoje/ })
  ).toBeVisible()
})

test('"Abrir o manual" acha o PDF do manual (D-075)', async () => {
  aberto = await abrirApp()
  const { pagina } = aberto
  await irPara(pagina, '#/configuracoes')
  await pagina.getByRole('button', { name: 'Abrir o manual' }).click()
  // nos testes não abre o leitor de PDF; só confere que o arquivo existe
  await expect(pagina.getByRole('alert')).toHaveCount(0)
  expect(await pagina.evaluate(() => window.api.manual.abrir())).toEqual({ ok: true, valor: null })
})

test('apagar todos os dados: pede APAGAR, guarda uma cópia antes e volta ao primeiro dia (D-076)', async () => {
  aberto = await abrirApp()
  const { pagina, pastas } = aberto
  await pagina.evaluate(async () => {
    const r = await window.api.clientes.salvar(null, {
      nome: 'Mercado Bom Preço',
      telefone: '',
      documento: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: ''
    })
    if (!r.ok) throw new Error(r.mensagem)
  })
  const clientes = () => pagina.evaluate(async () => (await window.api.clientes.listar()).length)
  await irPara(pagina, '#/configuracoes?aba=apagar')
  await pagina.getByRole('button', { name: 'Apagar todos os dados', exact: true }).click()
  const modal = pagina.getByRole('dialog', { name: 'Apagar todos os dados?' })
  const apagar = modal.getByRole('button', { name: 'Apagar tudo' })
  await expect(apagar).toBeDisabled()
  await modal.getByLabel('Para confirmar, digite APAGAR').fill('apaga')
  await expect(apagar).toBeDisabled()
  // cancelar não apaga nada
  await modal.getByRole('button', { name: 'Cancelar' }).click()
  expect(await clientes()).toBe(1)

  await pagina.getByRole('button', { name: 'Apagar todos os dados', exact: true }).click()
  await modal.getByLabel('Para confirmar, digite APAGAR').fill('APAGAR')
  await apagar.click()
  // o programa recarrega já sem os dados
  await expect.poll(clientes, { timeout: 15_000 }).toBe(0)
  await irPara(pagina, '#/configuracoes?aba=historico')
  await expect(pagina.getByRole('cell', { name: /^Apagou todos os dados/ })).toBeVisible()
  // a cópia de antes está no pen drive (e na pasta)
  expect(readdirSync(join(pastas.penDrive, 'BigLake-Backups')).length).toBeGreaterThan(0)
  // sem "APAGAR", o processo principal recusa
  expect(await pagina.evaluate(() => window.api.dados.apagarTudo('apagar'))).toEqual({
    ok: false,
    mensagem: 'Digite APAGAR para confirmar.'
  })
})
