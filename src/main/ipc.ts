import { app, ipcMain } from 'electron'
import { z } from 'zod'
import { nomeDoMes } from '../dominio/datas'
import {
  CANAIS,
  RELATORIOS,
  type Ambiente,
  type DadosConta,
  type DadosEdicaoItem,
  type DadosFechamento,
  type DadosPedido,
  type DadosPerda,
  type DadosBem,
  type DadosGordurinha,
  type DadosManutencao,
  type DadosEntrada,
  type DadosItemNovo,
  type DadosProducao,
  type DadosProduto,
  type DadosReceita,
  type DadosRetirada,
  type FiltroHistorico,
  type OpcoesImpressao,
  type Resposta
} from '../compartilhado/contrato'
import {
  cadastrarItem,
  compradoNoMes,
  desfazerExclusaoItem,
  editarItem,
  excluirItem,
  listarItens,
  registrarEntrada
} from './servicos/estoque'
import {
  criarCategoria,
  desfazerExclusaoReceita,
  excluirReceita,
  listarCategorias,
  listarReceitas,
  obterGas,
  obterReceita,
  receitaEmUso,
  receitasQueUsam,
  removerCategoria,
  salvarGas,
  salvarReceita
} from './servicos/receitas'
import {
  desfazerExclusaoProduto,
  excluirProduto,
  listarProdutos,
  salvarProduto
} from './servicos/produtos'
import { entenderAvisoDeCusto, listarAvisosDeCusto } from './servicos/avisoCusto'
import {
  cancelarPedido,
  desfazerCancelamento,
  listarPedidos,
  obterFechamento,
  paginaDeFechamentos,
  paginaDePedidos,
  paginaVendasPorDia,
  obterPedido,
  obterTaxas,
  proximoNumero,
  resumoDasVendas,
  salvarFechamento,
  salvarPedido,
  salvarTaxas
} from './servicos/vendas'
import {
  criarCartao,
  criarTipo,
  desfazerExclusaoConta,
  desfazerPagamento,
  excluirConta,
  gerarContasQueRepetem,
  lancarContaDaCompra,
  listarCartoes,
  listarContas,
  listarTipos,
  pagarConta,
  quantasNoAviso,
  removerCartao,
  removerTipo,
  salvarConta
} from './servicos/contas'
import {
  desfazerExclusaoRetirada,
  excluirRetirada,
  listarSocios,
  mesDosSocios,
  mudarParticipacao,
  obterRegras,
  salvarRegras,
  salvarRetirada
} from './servicos/socios'
import {
  desfazerExclusaoProducao,
  excluirProducao,
  listarProducoes,
  registrarProducao
} from './servicos/producao'
import { desfazerExclusaoPerda, excluirPerda, listarPerdas, salvarPerda } from './servicos/perdas'
import {
  idRelatorio,
  anoMes as anoMesRelatorio,
  mesesComDados,
  obterRelatorio
} from './servicos/relatorios'
import {
  jaReajustei,
  ligarGordurinha,
  marcarContaFixa,
  mudarGordurinha,
  obterGordurinha
} from './servicos/gordurinha'
import {
  criarTipoBem,
  desfazerExclusaoBem,
  desfazerExclusaoManutencao,
  excluirBem,
  excluirManutencao,
  listarBens,
  listarManutencoes,
  listarTiposBem,
  removerTipoBem,
  salvarBem,
  salvarManutencao
} from './servicos/patrimonio'
import { paginaDoHistorico } from './servicos/auditoria'
import { clientes, fornecedores } from './servicos/cadastros'
import {
  esquemaEmpresa,
  esquemaPreferencias,
  obterEmpresa,
  obterPreferencias,
  salvarEmpresa,
  salvarPreferencias
} from './servicos/configuracoes'
import { emTransacao } from './banco/conexao'
import { registrarErro } from './log'
import type { Sistema } from './sistema'

// Regra sem mensagem própria no esquema: frase simples em português, nunca o texto técnico
// do zod em inglês ("Too big: expected number to be <=10000000000"; D-089).
z.config({
  customError: (problema) => {
    if (problema.code === 'too_big') return 'Esse valor é grande demais. Confira os números.'
    if (problema.code === 'too_small') return 'Esse valor é pequeno demais. Confira os números.'
    return 'Algum dado está errado. Confira e tente de novo.'
  }
})

/** Converte erro em mensagem simples para a tela; o detalhe técnico vai para o log. */
function responder<T>(onde: string, fn: () => T | Promise<T>): Promise<Resposta<T>> {
  return Promise.resolve()
    .then(fn)
    .then((valor) => ({ ok: true as const, valor }))
    .catch((erro: unknown) => {
      if (erro instanceof z.ZodError) {
        return { ok: false as const, mensagem: erro.issues[0]?.message ?? 'Confira os dados.' }
      }
      registrarErro(onde, erro)
      return {
        ok: false as const,
        mensagem: erro instanceof Error ? erro.message : 'Não foi possível concluir.'
      }
    })
}

/** O que o processo principal faz com a impressora (index.ts; D-088). */
export interface AcoesDeImpressao {
  previa(hash: string): Promise<{ pdf: Buffer; folhas: number }>
  impressoras(): Promise<string[]>
  imprimir(hash: string, nomeDoArquivo: string, opcoes: OpcoesImpressao): Promise<void>
}

const esquemaOpcoesImpressao = z.object({
  impressora: z.string().min(1).max(300).nullable(),
  copias: z.number().int().min(1, 'Pelo menos 1 cópia.').max(20, 'No máximo 20 cópias.')
})

export function registrarIpc(
  sistema: Sistema,
  aoRestaurar: () => void,
  impressao: AcoesDeImpressao,
  salvarPdf: (hash: string, nomeDoArquivo: string) => Promise<string | null>,
  mostrarNaPasta: (caminho: string) => void,
  abrirManual: () => Promise<void>
): void {
  const { relogio } = sistema

  ipcMain.handle(CANAIS.ambiente, (): Ambiente => ({
    hoje: relogio.hoje(),
    mostrarVitrine: !app.isPackaged,
    versao: app.getVersion()
  }))

  ipcMain.handle(CANAIS.preferenciasObter, () => obterPreferencias(sistema.db))
  ipcMain.handle(CANAIS.preferenciasSalvar, (_e, p: unknown) =>
    responder('Salvar preferências', () =>
      salvarPreferencias(sistema.db, relogio, esquemaPreferencias.parse(p))
    )
  )

  ipcMain.handle(CANAIS.empresaObter, () => obterEmpresa(sistema.db))
  ipcMain.handle(CANAIS.empresaSalvar, (_e, dados: unknown) =>
    responder('Salvar empresa', () =>
      salvarEmpresa(sistema.db, relogio, esquemaEmpresa.parse(dados))
    )
  )

  ipcMain.handle(CANAIS.historicoListar, (_e, f: unknown) =>
    paginaDoHistorico(sistema.db, relogio.hoje(), f as FiltroHistorico)
  )
  ipcMain.handle(CANAIS.manualAbrir, () =>
    responder('Abrir o manual', async () => {
      await abrirManual()
      return null
    })
  )

  const idOuNulo = z.number().int().positive().nullable()
  ipcMain.handle(CANAIS.clientesListar, () => clientes.listar(sistema.db))
  ipcMain.handle(CANAIS.clientesSalvar, (_e, id: unknown, dados: unknown) =>
    responder('Salvar cliente', () =>
      clientes.salvar(sistema.db, relogio, idOuNulo.parse(id), dados)
    )
  )
  ipcMain.handle(CANAIS.fornecedoresListar, () => {
    const anoMes = relogio.hoje().slice(0, 7)
    return fornecedores
      .listar(sistema.db)
      .map((f) => ({ ...f, compradoNoMes: compradoNoMes(sistema.db, f.id, anoMes) }))
  })

  const id = z.number().int().positive()
  for (const [servico, canais, nome] of [
    [clientes, [CANAIS.clientesEmUso, CANAIS.clientesExcluir, CANAIS.clientesDesfazer], 'cliente'],
    [
      fornecedores,
      [CANAIS.fornecedoresEmUso, CANAIS.fornecedoresExcluir, CANAIS.fornecedoresDesfazer],
      'fornecedor'
    ]
  ] as const) {
    const [emUso, excluir, desfazer] = canais
    ipcMain.handle(emUso, (_e, i: unknown) => servico.emUso(sistema.db, id.parse(i)))
    ipcMain.handle(excluir, (_e, i: unknown) =>
      responder(`Excluir ${nome}`, () => servico.excluir(sistema.db, relogio, id.parse(i)))
    )
    ipcMain.handle(desfazer, (_e, i: unknown) =>
      responder(`Desfazer exclusão de ${nome}`, () =>
        servico.desfazerExclusao(sistema.db, relogio, id.parse(i))
      )
    )
  }

  ipcMain.handle(CANAIS.estoqueListar, () => listarItens(sistema.db))
  // a compra e a conta dela (D-092) entram juntas: uma não fica sem a outra
  ipcMain.handle(CANAIS.estoqueCadastrar, (_e, dados: unknown, conta: unknown) =>
    responder('Cadastrar insumo', () =>
      emTransacao(sistema.db, () => {
        const d = dados as DadosItemNovo
        const itemId = cadastrarItem(sistema.db, relogio, d)
        if (conta != null) lancarContaDaCompra(sistema.db, relogio, itemId, d, conta)
        return itemId
      })
    )
  )
  ipcMain.handle(CANAIS.estoqueEntrada, (_e, dados: unknown, conta: unknown) =>
    responder('Entrada de mercadoria', () =>
      emTransacao(sistema.db, () => {
        const d = dados as DadosEntrada
        const r = registrarEntrada(sistema.db, relogio, d)
        if (conta != null) lancarContaDaCompra(sistema.db, relogio, d.itemId, d, conta)
        return r
      })
    )
  )
  ipcMain.handle(CANAIS.estoqueEditar, (_e, i: unknown, dados: unknown) =>
    responder('Editar insumo', () => {
      editarItem(sistema.db, relogio, id.parse(i), dados as DadosEdicaoItem)
      return null
    })
  )
  ipcMain.handle(CANAIS.estoqueExcluir, (_e, i: unknown) =>
    responder('Excluir insumo', () => {
      excluirItem(sistema.db, relogio, id.parse(i))
      return null
    })
  )
  ipcMain.handle(CANAIS.estoqueDesfazer, (_e, i: unknown) =>
    responder('Desfazer exclusão de insumo', () => {
      desfazerExclusaoItem(sistema.db, relogio, id.parse(i))
      return null
    })
  )
  ipcMain.handle(CANAIS.fornecedoresSalvar, (_e, id: unknown, dados: unknown) =>
    responder('Salvar fornecedor', () =>
      fornecedores.salvar(sistema.db, relogio, idOuNulo.parse(id), dados)
    )
  )

  ipcMain.handle(CANAIS.categoriasListar, () => listarCategorias(sistema.db))
  ipcMain.handle(CANAIS.categoriasCriar, (_e, nome: unknown) =>
    responder('Criar categoria', () => criarCategoria(sistema.db, relogio, nome))
  )
  ipcMain.handle(CANAIS.categoriasRemover, (_e, i: unknown) =>
    responder('Remover categoria', () => {
      removerCategoria(sistema.db, relogio, id.parse(i))
      return null
    })
  )
  ipcMain.handle(CANAIS.gasObter, () => obterGas(sistema.db))
  ipcMain.handle(CANAIS.gasSalvar, (_e, c: unknown) =>
    responder('Salvar gás e energia', () => salvarGas(sistema.db, relogio, c))
  )
  ipcMain.handle(CANAIS.receitasListar, () => listarReceitas(sistema.db))
  ipcMain.handle(CANAIS.receitasObter, (_e, i: unknown) => obterReceita(sistema.db, id.parse(i)))
  ipcMain.handle(CANAIS.receitasSalvar, (_e, i: unknown, dados: unknown) =>
    responder('Salvar receita', () =>
      salvarReceita(sistema.db, relogio, idOuNulo.parse(i), dados as DadosReceita)
    )
  )
  ipcMain.handle(CANAIS.receitasExcluir, (_e, i: unknown) =>
    responder('Excluir receita', () => {
      excluirReceita(sistema.db, relogio, id.parse(i))
      return null
    })
  )
  ipcMain.handle(CANAIS.receitasDesfazer, (_e, i: unknown) =>
    responder('Desfazer exclusão de receita', () => {
      desfazerExclusaoReceita(sistema.db, relogio, id.parse(i))
      return null
    })
  )

  ipcMain.handle(CANAIS.receitasEmUso, (_e, i: unknown) => receitaEmUso(sistema.db, id.parse(i)))
  ipcMain.handle(CANAIS.estoqueReceitasQueUsam, (_e, i: unknown) =>
    receitasQueUsam(sistema.db, id.parse(i))
  )
  ipcMain.handle(CANAIS.produtosListar, () => listarProdutos(sistema.db))
  ipcMain.handle(CANAIS.produtosSalvar, (_e, i: unknown, dados: unknown) =>
    responder('Salvar produto', () =>
      salvarProduto(sistema.db, relogio, idOuNulo.parse(i), dados as DadosProduto)
    )
  )
  ipcMain.handle(CANAIS.produtosExcluir, (_e, i: unknown) =>
    responder('Excluir produto', () => {
      excluirProduto(sistema.db, relogio, id.parse(i))
      return null
    })
  )
  ipcMain.handle(CANAIS.produtosDesfazer, (_e, i: unknown) =>
    responder('Desfazer exclusão de produto', () => {
      desfazerExclusaoProduto(sistema.db, relogio, id.parse(i))
      return null
    })
  )
  ipcMain.handle(CANAIS.avisosListar, () => listarAvisosDeCusto(sistema.db))
  ipcMain.handle(CANAIS.avisosEntendi, (_e, i: unknown) =>
    responder('Entendi (custo subiu)', () => {
      entenderAvisoDeCusto(sistema.db, relogio, id.parse(i))
      return null
    })
  )

  // ---------- Vendas e pedidos ----------
  const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  ipcMain.handle(CANAIS.vendasTaxas, () => obterTaxas(sistema.db))
  ipcMain.handle(CANAIS.vendasSalvarTaxas, (_e, t: unknown) =>
    responder('Salvar taxas', () => salvarTaxas(sistema.db, relogio, t))
  )
  ipcMain.handle(CANAIS.vendasFechamentos, (_e, f: unknown) =>
    paginaDeFechamentos(sistema.db, f as FiltroHistorico)
  )
  ipcMain.handle(CANAIS.vendasFechamento, (_e, d: unknown) =>
    obterFechamento(sistema.db, dataISO.parse(d))
  )
  ipcMain.handle(CANAIS.vendasSalvarFechamento, (_e, d: unknown) =>
    responder('Salvar fechamento', () =>
      salvarFechamento(sistema.db, relogio, d as DadosFechamento)
    )
  )
  ipcMain.handle(CANAIS.vendasResumo, () => resumoDasVendas(sistema.db, relogio.hoje()))
  ipcMain.handle(CANAIS.vendasPorDia, (_e, f: unknown) =>
    paginaVendasPorDia(sistema.db, relogio.hoje(), f as FiltroHistorico)
  )
  ipcMain.handle(CANAIS.pedidosHistorico, (_e, f: unknown) =>
    paginaDePedidos(sistema.db, f as FiltroHistorico)
  )
  ipcMain.handle(CANAIS.pedidosListar, (_e, anoMes: unknown) =>
    listarPedidos(
      sistema.db,
      z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .parse(anoMes)
    )
  )
  ipcMain.handle(CANAIS.pedidosObter, (_e, i: unknown) => obterPedido(sistema.db, id.parse(i)))
  ipcMain.handle(CANAIS.pedidosProximo, () => proximoNumero(sistema.db))
  ipcMain.handle(CANAIS.pedidosSalvar, (_e, i: unknown, dados: unknown) =>
    responder('Salvar pedido', () =>
      salvarPedido(sistema.db, relogio, idOuNulo.parse(i), dados as DadosPedido)
    )
  )
  ipcMain.handle(CANAIS.pedidosCancelar, (_e, i: unknown, motivo: unknown) =>
    responder('Cancelar pedido', () => {
      cancelarPedido(sistema.db, relogio, id.parse(i), motivo)
      return null
    })
  )
  ipcMain.handle(CANAIS.pedidosDesfazer, (_e, i: unknown) =>
    responder('Desfazer cancelamento', () => {
      desfazerCancelamento(sistema.db, relogio, id.parse(i))
      return null
    })
  )

  // ---------- Produção ----------
  ipcMain.handle(CANAIS.producaoListar, (_e, am: unknown) =>
    listarProducoes(
      sistema.db,
      z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .parse(am)
    )
  )
  ipcMain.handle(CANAIS.producaoRegistrar, (_e, d: unknown) =>
    responder('Registrar produção', () =>
      registrarProducao(sistema.db, relogio, d as DadosProducao)
    )
  )
  for (const [canal, nome, fn] of [
    [CANAIS.producaoExcluir, 'Excluir produção', excluirProducao],
    [CANAIS.producaoDesfazer, 'Desfazer exclusão de produção', desfazerExclusaoProducao]
  ] as const) {
    ipcMain.handle(canal, (_e, i: unknown) =>
      responder(nome, () => {
        fn(sistema.db, relogio, id.parse(i))
        return null
      })
    )
  }

  // ---------- Perdas ----------
  ipcMain.handle(CANAIS.perdasListar, (_e, am: unknown) =>
    listarPerdas(
      sistema.db,
      z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .parse(am)
    )
  )
  ipcMain.handle(CANAIS.perdasSalvar, (_e, i: unknown, dados: unknown) =>
    responder('Salvar perda', () =>
      salvarPerda(sistema.db, relogio, idOuNulo.parse(i), dados as DadosPerda)
    )
  )
  for (const [canal, nome, fn] of [
    [CANAIS.perdasExcluir, 'Excluir perda', excluirPerda],
    [CANAIS.perdasDesfazer, 'Desfazer exclusão de perda', desfazerExclusaoPerda]
  ] as const) {
    ipcMain.handle(canal, (_e, i: unknown) =>
      responder(nome, () => {
        fn(sistema.db, relogio, id.parse(i))
        return null
      })
    )
  }

  // ---------- Gordurinha ----------
  ipcMain.handle(CANAIS.gordurinhaObter, () => obterGordurinha(sistema.db, relogio.hoje()))
  ipcMain.handle(CANAIS.gordurinhaLigar, (_e, d: unknown) =>
    responder('Ligar a Gordurinha', () => {
      ligarGordurinha(sistema.db, relogio, d as DadosGordurinha)
      return null
    })
  )
  ipcMain.handle(CANAIS.gordurinhaMudar, (_e, d: unknown) =>
    responder('Mudar a Gordurinha', () => {
      mudarGordurinha(sistema.db, relogio, d as DadosGordurinha)
      return null
    })
  )
  ipcMain.handle(CANAIS.gordurinhaConta, (_e, i: unknown, entra: unknown) =>
    responder('Marcar conta fixa', () => {
      marcarContaFixa(sistema.db, relogio, i, entra)
      return null
    })
  )
  ipcMain.handle(CANAIS.gordurinhaReajustei, () =>
    responder('Já reajustei os preços', () => {
      jaReajustei(sistema.db, relogio)
      return null
    })
  )

  // ---------- Relatórios ----------
  ipcMain.handle(CANAIS.relatoriosMeses, () => mesesComDados(sistema.db, relogio.hoje()))
  ipcMain.handle(CANAIS.relatoriosObter, (_e, i: unknown, am: unknown) =>
    obterRelatorio(sistema.db, i, am, relogio.hoje())
  )
  /** "Resultado de setembro de 2026" */
  const nomeDoPdf = (i: unknown, am: unknown) => {
    const id = idRelatorio.parse(i)
    const [ano, mes] = anoMesRelatorio.parse(am).split('-').map(Number) as [number, number]
    const r = RELATORIOS.find((x) => x.id === id)!
    return {
      hash: `/imprimir/relatorio/${id}/${ano}-${String(mes).padStart(2, '0')}`,
      nome: `${r.arquivo} de ${nomeDoMes(mes)} de ${ano}`
    }
  }
  ipcMain.handle(CANAIS.relatoriosPdf, (_e, i: unknown, am: unknown) =>
    responder('Salvar relatório em PDF', async () => {
      const { hash, nome } = nomeDoPdf(i, am)
      return salvarPdf(hash, nome)
    })
  )
  ipcMain.handle(CANAIS.relatoriosAbrirPasta, (_e, caminho: unknown) =>
    mostrarNaPasta(z.string().min(1).parse(caminho))
  )

  // ---------- Impressão: prévia no programa e direto na impressora (D-088) ----------
  const esquemaAlvo = z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('relatorio'), id: z.unknown(), anoMes: z.unknown() }),
    z.object({ tipo: z.literal('pedido'), id })
  ])
  /** Página a imprimir, nome do arquivo (nos testes) e título da prévia. */
  const paraImprimir = (bruto: unknown) => {
    const alvo = esquemaAlvo.parse(bruto)
    if (alvo.tipo === 'relatorio') {
      const { hash, nome } = nomeDoPdf(alvo.id, alvo.anoMes)
      return { hash, nome, titulo: nome }
    }
    const pedido = obterPedido(sistema.db, alvo.id)
    if (!pedido) throw new Error('Pedido não encontrado.')
    return {
      hash: `/imprimir/pedido/${pedido.id}`,
      nome: `pedido-${pedido.numero}`,
      titulo: `Comprovante do pedido #${pedido.numero}`
    }
  }
  ipcMain.handle(CANAIS.impressaoPrevia, (_e, alvo: unknown) =>
    responder('Prévia da impressão', async () => {
      const { hash, titulo } = paraImprimir(alvo)
      const [{ pdf, folhas }, impressoras] = await Promise.all([
        impressao.previa(hash),
        impressao.impressoras()
      ])
      return { titulo, pdf: new Uint8Array(pdf), folhas, impressoras }
    })
  )
  ipcMain.handle(CANAIS.impressaoImprimir, (_e, alvo: unknown, opcoes: unknown) =>
    responder('Imprimir', async () => {
      const { hash, nome } = paraImprimir(alvo)
      const o = esquemaOpcoesImpressao.parse(opcoes)
      if (o.impressora !== null && !(await impressao.impressoras()).includes(o.impressora)) {
        throw new Error('Essa impressora não está mais ligada ao computador. Escolha outra.')
      }
      await impressao.imprimir(hash, nome, o)
      return null
    })
  )

  // ---------- Patrimônio ----------
  ipcMain.handle(CANAIS.patrimonioTipos, () => listarTiposBem(sistema.db))
  ipcMain.handle(CANAIS.patrimonioCriarTipo, (_e, nome: unknown) =>
    responder('Criar tipo de bem', () => criarTipoBem(sistema.db, relogio, nome))
  )
  ipcMain.handle(CANAIS.patrimonioBens, () => listarBens(sistema.db))
  ipcMain.handle(CANAIS.patrimonioSalvarBem, (_e, i: unknown, dados: unknown) =>
    responder('Salvar bem', () =>
      salvarBem(sistema.db, relogio, idOuNulo.parse(i), dados as DadosBem)
    )
  )
  ipcMain.handle(CANAIS.patrimonioManutencoes, () => listarManutencoes(sistema.db))
  ipcMain.handle(
    CANAIS.patrimonioSalvarManutencao,
    (_e, i: unknown, dados: unknown, pagamento: unknown) =>
      responder('Salvar manutenção', () =>
        salvarManutencao(
          sistema.db,
          relogio,
          idOuNulo.parse(i),
          dados as DadosManutencao,
          pagamento
        )
      )
  )
  for (const [canal, nome, fn] of [
    [CANAIS.patrimonioRemoverTipo, 'Remover tipo de bem', removerTipoBem],
    [CANAIS.patrimonioExcluirBem, 'Excluir bem', excluirBem],
    [CANAIS.patrimonioDesfazerBem, 'Desfazer exclusão de bem', desfazerExclusaoBem],
    [CANAIS.patrimonioExcluirManutencao, 'Excluir manutenção', excluirManutencao],
    [
      CANAIS.patrimonioDesfazerManutencao,
      'Desfazer exclusão de manutenção',
      desfazerExclusaoManutencao
    ]
  ] as const) {
    ipcMain.handle(canal, (_e, i: unknown) =>
      responder(nome, () => {
        fn(sistema.db, relogio, id.parse(i))
        return null
      })
    )
  }

  // ---------- Contas a pagar e sócios ----------
  // A conta do mês das que repetem nasce sozinha ao abrir a lista ou contar os avisos.
  const contasEmDia = () => gerarContasQueRepetem(sistema.db, relogio)
  ipcMain.handle(CANAIS.contasListar, () => {
    contasEmDia()
    return listarContas(sistema.db)
  })
  ipcMain.handle(CANAIS.contasAvisos, () => {
    contasEmDia()
    return quantasNoAviso(sistema.db, relogio.hoje())
  })
  ipcMain.handle(CANAIS.contasSalvar, (_e, i: unknown, dados: unknown, pagamento: unknown) =>
    responder('Salvar conta', () =>
      salvarConta(sistema.db, relogio, idOuNulo.parse(i), dados as DadosConta, pagamento)
    )
  )
  ipcMain.handle(CANAIS.contasPagar, (_e, i: unknown, pagamento: unknown) =>
    responder('Pagar conta', () => {
      pagarConta(sistema.db, relogio, id.parse(i), pagamento)
      return null
    })
  )
  for (const [canal, nome, fn] of [
    [CANAIS.contasDesfazerPagamento, 'Desfazer pagamento', desfazerPagamento],
    [CANAIS.contasExcluir, 'Excluir conta', excluirConta],
    [CANAIS.contasDesfazer, 'Desfazer exclusão de conta', desfazerExclusaoConta],
    [CANAIS.tiposContaRemover, 'Remover tipo de conta', removerTipo],
    [CANAIS.cartoesRemover, 'Remover cartão', removerCartao],
    [CANAIS.retiradasExcluir, 'Excluir retirada', excluirRetirada],
    [CANAIS.retiradasDesfazer, 'Desfazer exclusão de retirada', desfazerExclusaoRetirada]
  ] as const) {
    ipcMain.handle(canal, (_e, i: unknown) =>
      responder(nome, () => {
        fn(sistema.db, relogio, id.parse(i))
        return null
      })
    )
  }
  ipcMain.handle(CANAIS.tiposContaListar, () => listarTipos(sistema.db))
  ipcMain.handle(CANAIS.tiposContaCriar, (_e, nome: unknown) =>
    responder('Criar tipo de conta', () => criarTipo(sistema.db, relogio, nome))
  )
  ipcMain.handle(CANAIS.cartoesListar, () => listarCartoes(sistema.db))
  ipcMain.handle(CANAIS.cartoesCriar, (_e, nome: unknown, socio: unknown) =>
    responder('Criar cartão', () => criarCartao(sistema.db, relogio, nome, socio))
  )
  ipcMain.handle(CANAIS.sociosListar, () => listarSocios(sistema.db))
  ipcMain.handle(CANAIS.sociosMes, (_e, am: unknown) => {
    contasEmDia()
    return mesDosSocios(sistema.db, am)
  })
  ipcMain.handle(CANAIS.sociosParticipacao, (_e, am: unknown, pct: unknown) =>
    responder('Mudar participação', () => {
      mudarParticipacao(sistema.db, relogio, am, pct)
      return null
    })
  )
  ipcMain.handle(CANAIS.retiradasSalvar, (_e, i: unknown, dados: unknown) =>
    responder('Salvar retirada', () =>
      salvarRetirada(sistema.db, relogio, idOuNulo.parse(i), dados as DadosRetirada)
    )
  )
  ipcMain.handle(CANAIS.regrasLucroObter, () => obterRegras(sistema.db))
  ipcMain.handle(CANAIS.regrasLucroSalvar, (_e, r: unknown) =>
    responder('Salvar regras do lucro', () => salvarRegras(sistema.db, relogio, r))
  )

  ipcMain.handle(CANAIS.backupEstado, () => sistema.estadoBackup())
  ipcMain.handle(CANAIS.backupFazerAgora, () => sistema.copiar('manual', true))
  ipcMain.handle(CANAIS.backupListar, async () =>
    (await sistema.listarCopias()).map(({ caminho, quando, destino }) => ({
      caminho,
      quando,
      destino
    }))
  )
  ipcMain.handle(CANAIS.dadosApagarTudo, (_e, confirmacao: unknown) =>
    responder('Apagar todos os dados', async () => {
      if (confirmacao !== 'APAGAR') throw new Error('Digite APAGAR para confirmar.')
      await sistema.apagarTudo()
      aoRestaurar()
      return null
    })
  )
  ipcMain.handle(CANAIS.backupRestaurar, (_e, caminho: unknown) =>
    responder('Restaurar cópia', async () => {
      await sistema.restaurar(z.string().parse(caminho))
      aoRestaurar()
      return null
    })
  )
}
