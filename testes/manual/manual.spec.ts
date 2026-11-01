// Gera o manual do Carlos (D-075): monta uma loja de exemplo, tira as capturas de tela
// em recursos/manual/img e transforma recursos/manual/manual.html em Manual-BIG-LAKE.pdf.
// Rodar com "npm run manual". Não faz parte do "npm run verificar".
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test, type Page } from '@playwright/test'
import { abrirApp, irPara } from '../e2e/app'

const PASTA = resolve('recursos/manual')
const IMG = join(PASTA, 'img')

async function prepararLoja(pagina: Page) {
  await pagina.evaluate(async () => {
    const ok = <T>(r: { ok: true; valor: T } | { ok: false; mensagem: string }): T => {
      if (!r.ok) throw new Error(r.mensagem)
      return r.valor
    }
    const api = window.api
    ok(
      await api.empresa.salvar({
        nome: 'BIG LAKE Sorveteria',
        cnpj: '12.345.678/0001-90',
        telefone: '(11) 4002-8922',
        endereco: 'Rua das Flores, 120 · Centro'
      })
    )
    ok(
      await api.vendas.salvarTaxas({
        debitoPct: 150,
        debitoDias: 1,
        creditoPct: 320,
        creditoDias: 30
      })
    )
    const item = async (
      nome: string,
      unidade: 'kg' | 'L' | 'un',
      quantidade: number,
      valorPago: number,
      minimo: number,
      validade: string | null,
      tipo: 'materia_prima' | 'insumo' = 'materia_prima',
      nomeUnidade: string | null = null
    ) =>
      ok(
        await api.estoque.cadastrar({
          tipo,
          unidade,
          nomeUnidade,
          nome,
          quantidade,
          valorPago: valorPago as never,
          fornecedorId: null,
          minimo,
          validade
        })
      )
    const morango = await item('Morango', 'kg', 3500, 6300, 10000, '2026-10-18')
    const leite = await item('Leite integral', 'L', 12000, 5868, 40000, null)
    const condensado = await item(
      'Leite condensado',
      'un',
      30000,
      20700,
      24000,
      '2027-03-01',
      'materia_prima',
      'lata'
    )
    const creme = await item('Creme de leite', 'L', 6000, 12900, 0, '2026-10-20')
    const palito = await item('Palito', 'un', 1_200_000, 9600, 0, null, 'insumo')
    const cats = await api.categorias.listar()
    const cat = (n: string) => cats.find((c) => c.nome === n)!.id
    const receita = async (
      nome: string,
      categoria: string,
      rendimento: number,
      balcao: number,
      atacado: number,
      unidade: string
    ) =>
      ok(
        await api.receitas.salvar(null, {
          nome,
          categoriaId: cat(categoria),
          rendimento,
          ingredientes: [
            { itemId: morango, quantidade: 5000 },
            { itemId: leite, quantidade: 5000 },
            { itemId: condensado, quantidade: 15000 },
            { itemId: creme, quantidade: 2500 }
          ],
          embalagens: [palito],
          gasVezes: 1000,
          gasValor: null,
          precoBalcao: balcao as never,
          precoAtacado: atacado as never,
          nomeUnidade: unidade
        })
      )
    const rPaleta = await receita('Paleta de Morango recheada', 'Paleta', 100, 1000, 700, 'paleta')
    const rPote = await receita('Sorvete de Morango · pote 2 L', 'Pote', 10, 4900, 4500, 'pote')
    const produto = async (
      nome: string,
      categoria: string,
      receitaId: number,
      como: 'unidade' | 'pote'
    ) =>
      ok(
        await api.produtos.salvar(null, {
          categoriaId: cat(categoria),
          nome,
          vendidoComo: como,
          medida: null,
          medidaUnidade: null,
          unidadesPorCaixa: null,
          receitaId
        })
      )
    const pPaleta = await produto('Paleta de Morango', 'Paleta', rPaleta, 'unidade')
    const pPote = await produto('Pote 2 L · Morango', 'Pote', rPote, 'pote')
    const cliente = async (nome: string) =>
      ok(
        await api.clientes.salvar(null, {
          nome,
          telefone: '(11) 98888-7777',
          documento: '',
          rua: 'Av. Brasil',
          numero: '500',
          bairro: 'Centro',
          cidade: 'Lagoa'
        })
      )
    const mercado = await cliente('Mercado Bom Preço')
    const buffet = await cliente('Buffet Festa Feliz')
    for (const [data, d, p, deb, cre] of [
      ['2026-10-13', 52000, 33000, 21000, 28000],
      ['2026-10-14', 48000, 31000, 19500, 26000],
      ['2026-10-15', 50250, 38000, 22000, 28000]
    ] as const) {
      ok(
        await api.vendas.salvarFechamento({
          data,
          lojaFechada: false,
          dinheiro: d as never,
          pix: p as never,
          debito: deb as never,
          credito: cre as never
        })
      )
    }
    ok(
      await api.pedidos.salvar(null, {
        clienteId: mercado,
        data: '2026-10-16',
        forma: 'pix',
        itens: [{ produtoId: pPote, quantidade: 12 }]
      })
    )
    ok(
      await api.pedidos.salvar(null, {
        clienteId: buffet,
        data: '2026-10-14',
        forma: 'dinheiro',
        itens: [{ produtoId: pPaleta, quantidade: 200 }]
      })
    )
    const tipos = await api.tiposConta.listar()
    const tipo = (n: string) => tipos.find((t) => t.nome === n)!.id
    ok(
      await api.contas.salvar(
        null,
        {
          nome: 'Aluguel',
          valor: 350000 as never,
          vencimento: '2026-10-05',
          tipoId: tipo('Aluguel'),
          repete: true,
          avisarDias: 3
        },
        { forma: 'pix', cartaoId: null, pagoEm: '2026-10-05' }
      )
    )
    ok(
      await api.contas.salvar(
        null,
        {
          nome: 'Energia elétrica',
          valor: 295000 as never,
          vencimento: '2026-10-17',
          tipoId: tipo('Energia'),
          repete: true,
          avisarDias: 3
        },
        null
      )
    )
    ok(
      await api.contas.salvar(
        null,
        {
          nome: 'Laticínios Vale Verde (boleto)',
          valor: 197000 as never,
          vencimento: '2026-10-19',
          tipoId: tipo('Fornecedor'),
          repete: false,
          avisarDias: 5
        },
        null
      )
    )
    ok(await api.producao.registrar({ receitaId: rPaleta, vezes: 500, unidadesFeitas: 50 }))
    ok(
      await api.perdas.salvar(null, {
        tipo: 'troca',
        data: '2026-10-15',
        clienteId: mercado,
        itens: [{ id: rPaleta, quantidade: 8000 }],
        motivo: 'Venceu no cliente',
        observacao: ''
      })
    )
    // a Gordurinha liga antes do aumento, para o aumento comer um pedaço dela
    ok(await api.gordurinha.ligar({ base: 1_500_000 as never, pct: 1000, desde: '2026-03-10' }))
    // o morango ficou mais caro: aviso "O custo subiu"
    ok(
      await api.estoque.registrarEntrada({
        itemId: morango,
        quantidade: 1000,
        valorPago: 2200 as never,
        fornecedorId: null,
        validade: '2026-10-25'
      })
    )
    const tiposBem = await api.patrimonio.tipos()
    const furgao = ok(
      await api.patrimonio.salvarBem(null, {
        nome: 'Furgão de entrega 2019',
        tipoId: tiposBem.find((t) => t.nome === 'Veículo')!.id,
        dataCompra: '2022-03',
        valor: 6_800_000 as never,
        identificacao: 'ABC-1D23'
      })
    )
    ok(
      await api.patrimonio.salvarManutencao(
        null,
        {
          bemId: furgao,
          data: '2026-10-08',
          oQueFoiFeito: 'Troca de óleo e filtros',
          quemFez: 'Auto Center Silva',
          valor: 38000 as never,
          garantiaDias: 90,
          tipo: 'revisao',
          vencimento: null
        },
        { forma: 'pix', cartaoId: null, pagoEm: '2026-10-08' }
      )
    )
  })
}

async function foto(pagina: Page, nome: string, inteira = false) {
  await pagina.waitForTimeout(400)
  await pagina.screenshot({ path: join(IMG, `${nome}.png`), fullPage: inteira })
}

async function ir(pagina: Page, hash: string) {
  // passa por outra tela para ler os dados novos
  await irPara(pagina, hash === '#/socios' ? '#/' : '#/socios')
  await irPara(pagina, hash)
}

test('gera o manual do Carlos', async () => {
  test.setTimeout(240_000)
  mkdirSync(IMG, { recursive: true })
  const { app, pagina } = await abrirApp(1366, 768)
  try {
    await prepararLoja(pagina)
    // cópia feita: o aviso do alto fica verde
    await pagina.evaluate(() => window.api.backup.fazerAgora())
    await pagina.reload()
    await pagina.waitForSelector('nav[aria-label="Menu principal"]')

    await ir(pagina, '#/')
    await foto(pagina, '01-inicio')
    await pagina.mouse.wheel(0, 700)
    await foto(pagina, '02-inicio-avisos')
    await pagina.mouse.wheel(0, -2000)
    await pagina.waitForTimeout(300)
    await pagina.screenshot({
      path: join(IMG, '03-topo.png'),
      clip: { x: 300, y: 8, width: 1060, height: 92 }
    })

    await ir(pagina, '#/vendas')
    for (const [campo, valor] of [
      ['Dinheiro (R$)', '520'],
      ['Pix (R$)', '380'],
      ['Cartão débito (R$)', '210'],
      ['Cartão crédito (R$)', '280']
    ]) {
      await pagina.getByLabel(campo!, { exact: true }).fill(valor!)
    }
    await pagina.locator('h1').click()
    await foto(pagina, '04-balcao')
    await ir(pagina, '#/vendas?aba=pedidos')
    await foto(pagina, '05-pedido')
    await ir(pagina, '#/vendas?aba=resumo')
    await foto(pagina, '06-resumo-vendas')

    await ir(pagina, '#/estoque')
    await foto(pagina, '07-estoque')
    await ir(pagina, '#/estoque?entrada=1')
    await foto(pagina, '08-entrada')
    await pagina.keyboard.press('Escape')

    await ir(pagina, '#/producao')
    await foto(pagina, '09-producao')
    await ir(pagina, '#/producao?aba=receitas')
    await foto(pagina, '10-receitas')

    await ir(pagina, '#/perdas')
    await pagina.getByRole('button', { name: '+ Registrar perda' }).click()
    await foto(pagina, '11-perda')
    await pagina.keyboard.press('Escape')

    await ir(pagina, '#/contas')
    await foto(pagina, '12-contas')
    await pagina.getByRole('button', { name: /Marcar Energia elétrica como paga/ }).click()
    await foto(pagina, '13-pagar-conta')
    await pagina.keyboard.press('Escape')

    await ir(pagina, '#/socios')
    await foto(pagina, '14-socios')
    await ir(pagina, '#/patrimonio?aba=manutencoes')
    await foto(pagina, '15-patrimonio')

    await ir(pagina, '#/relatorios')
    await foto(pagina, '16-relatorios')
    await ir(pagina, '#/relatorios?r=gordurinha')
    await foto(pagina, '17-gordurinha')

    await ir(pagina, '#/configuracoes')
    await foto(pagina, '18-configuracoes')
    await ir(pagina, '#/cadastros?aba=produtos')
    await foto(pagina, '19-produtos')

    // o PDF sai pelo próprio Electron, como os relatórios
    const pdf = await app.evaluate(
      async ({ BrowserWindow }, arquivo) => {
        const janela = new BrowserWindow({ show: false, width: 900, height: 1200 })
        try {
          await janela.loadFile(arquivo)
          const dados = await janela.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate:
              '<div style="width:100%;text-align:center;font-size:10px;color:#5e4b33">BIG LAKE Gestão · Manual de uso · página <span class="pageNumber"></span> de <span class="totalPages"></span></div>'
          })
          return Buffer.from(dados).toString('base64')
        } finally {
          janela.destroy()
        }
      },
      join(PASTA, 'manual.html')
    )
    writeFileSync(join(PASTA, 'Manual-BIG-LAKE.pdf'), Buffer.from(pdf, 'base64'))
  } finally {
    await app.close()
  }
})
