import { contextBridge, ipcRenderer } from 'electron'
import { CANAIS, type ApiBigLake } from '../compartilhado/contrato'

const chamar = (canal: string, ...args: unknown[]) => ipcRenderer.invoke(canal, ...args)

const api: ApiBigLake = {
  ambiente: () => chamar(CANAIS.ambiente),
  preferencias: {
    obter: () => chamar(CANAIS.preferenciasObter),
    salvar: (p) => chamar(CANAIS.preferenciasSalvar, p)
  },
  empresa: {
    obter: () => chamar(CANAIS.empresaObter),
    salvar: (e) => chamar(CANAIS.empresaSalvar, e)
  },
  historico: {
    listar: (filtro) => chamar(CANAIS.historicoListar, filtro)
  },
  manual: {
    abrir: () => chamar(CANAIS.manualAbrir)
  },
  impressao: {
    previa: (alvo) => chamar(CANAIS.impressaoPrevia, alvo),
    imprimir: (alvo, opcoes) => chamar(CANAIS.impressaoImprimir, alvo, opcoes)
  },
  dados: {
    apagarTudo: (confirmacao) => chamar(CANAIS.dadosApagarTudo, confirmacao)
  },
  clientes: {
    listar: () => chamar(CANAIS.clientesListar),
    salvar: (id, dados) => chamar(CANAIS.clientesSalvar, id, dados),
    emUso: (id) => chamar(CANAIS.clientesEmUso, id),
    excluir: (id) => chamar(CANAIS.clientesExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.clientesDesfazer, id)
  },
  fornecedores: {
    listar: () => chamar(CANAIS.fornecedoresListar),
    salvar: (id, dados) => chamar(CANAIS.fornecedoresSalvar, id, dados),
    emUso: (id) => chamar(CANAIS.fornecedoresEmUso, id),
    excluir: (id) => chamar(CANAIS.fornecedoresExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.fornecedoresDesfazer, id)
  },
  estoque: {
    listar: () => chamar(CANAIS.estoqueListar),
    cadastrar: (dados, conta) => chamar(CANAIS.estoqueCadastrar, dados, conta ?? null),
    registrarEntrada: (dados, conta) => chamar(CANAIS.estoqueEntrada, dados, conta ?? null),
    editar: (id, dados) => chamar(CANAIS.estoqueEditar, id, dados),
    excluir: (id) => chamar(CANAIS.estoqueExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.estoqueDesfazer, id),
    receitasQueUsam: (id) => chamar(CANAIS.estoqueReceitasQueUsam, id)
  },
  categorias: {
    listar: () => chamar(CANAIS.categoriasListar),
    criar: (nome) => chamar(CANAIS.categoriasCriar, nome),
    remover: (id) => chamar(CANAIS.categoriasRemover, id)
  },
  gasEnergia: {
    obter: () => chamar(CANAIS.gasObter),
    salvar: (c) => chamar(CANAIS.gasSalvar, c)
  },
  receitas: {
    listar: () => chamar(CANAIS.receitasListar),
    obter: (id) => chamar(CANAIS.receitasObter, id),
    salvar: (id, dados) => chamar(CANAIS.receitasSalvar, id, dados),
    excluir: (id) => chamar(CANAIS.receitasExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.receitasDesfazer, id),
    emUso: (id) => chamar(CANAIS.receitasEmUso, id)
  },
  produtos: {
    listar: () => chamar(CANAIS.produtosListar),
    salvar: (id, dados) => chamar(CANAIS.produtosSalvar, id, dados),
    excluir: (id) => chamar(CANAIS.produtosExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.produtosDesfazer, id)
  },
  producao: {
    listar: (anoMes) => chamar(CANAIS.producaoListar, anoMes),
    registrar: (d) => chamar(CANAIS.producaoRegistrar, d),
    excluir: (id) => chamar(CANAIS.producaoExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.producaoDesfazer, id)
  },
  patrimonio: {
    tipos: () => chamar(CANAIS.patrimonioTipos),
    criarTipo: (nome) => chamar(CANAIS.patrimonioCriarTipo, nome),
    removerTipo: (id) => chamar(CANAIS.patrimonioRemoverTipo, id),
    bens: () => chamar(CANAIS.patrimonioBens),
    salvarBem: (id, d) => chamar(CANAIS.patrimonioSalvarBem, id, d),
    excluirBem: (id) => chamar(CANAIS.patrimonioExcluirBem, id),
    desfazerExclusaoBem: (id) => chamar(CANAIS.patrimonioDesfazerBem, id),
    manutencoes: () => chamar(CANAIS.patrimonioManutencoes),
    salvarManutencao: (id, d, p) => chamar(CANAIS.patrimonioSalvarManutencao, id, d, p),
    excluirManutencao: (id) => chamar(CANAIS.patrimonioExcluirManutencao, id),
    desfazerExclusaoManutencao: (id) => chamar(CANAIS.patrimonioDesfazerManutencao, id)
  },
  gordurinha: {
    obter: () => chamar(CANAIS.gordurinhaObter),
    ligar: (d) => chamar(CANAIS.gordurinhaLigar, d),
    mudar: (d) => chamar(CANAIS.gordurinhaMudar, d),
    marcarConta: (id, entra) => chamar(CANAIS.gordurinhaConta, id, entra),
    reajustei: () => chamar(CANAIS.gordurinhaReajustei)
  },
  relatorios: {
    meses: () => chamar(CANAIS.relatoriosMeses),
    obter: (id, anoMes) => chamar(CANAIS.relatoriosObter, id, anoMes),
    salvarPdf: (id, anoMes) => chamar(CANAIS.relatoriosPdf, id, anoMes),
    abrirPasta: (caminho) => chamar(CANAIS.relatoriosAbrirPasta, caminho)
  },
  perdas: {
    listar: (anoMes) => chamar(CANAIS.perdasListar, anoMes),
    salvar: (id, d) => chamar(CANAIS.perdasSalvar, id, d),
    excluir: (id) => chamar(CANAIS.perdasExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.perdasDesfazer, id)
  },
  avisosCusto: {
    listar: () => chamar(CANAIS.avisosListar),
    entendi: (itemId) => chamar(CANAIS.avisosEntendi, itemId)
  },
  vendas: {
    taxas: () => chamar(CANAIS.vendasTaxas),
    salvarTaxas: (t) => chamar(CANAIS.vendasSalvarTaxas, t),
    fechamentos: (filtro) => chamar(CANAIS.vendasFechamentos, filtro),
    fechamento: (data) => chamar(CANAIS.vendasFechamento, data),
    salvarFechamento: (d) => chamar(CANAIS.vendasSalvarFechamento, d),
    resumo: () => chamar(CANAIS.vendasResumo),
    porDia: (filtro) => chamar(CANAIS.vendasPorDia, filtro)
  },
  pedidos: {
    listar: (anoMes) => chamar(CANAIS.pedidosListar, anoMes),
    historico: (filtro) => chamar(CANAIS.pedidosHistorico, filtro),
    obter: (id) => chamar(CANAIS.pedidosObter, id),
    proximoNumero: () => chamar(CANAIS.pedidosProximo),
    salvar: (id, dados) => chamar(CANAIS.pedidosSalvar, id, dados),
    cancelar: (id, motivo) => chamar(CANAIS.pedidosCancelar, id, motivo),
    desfazerCancelamento: (id) => chamar(CANAIS.pedidosDesfazer, id)
  },
  contas: {
    listar: () => chamar(CANAIS.contasListar),
    avisos: () => chamar(CANAIS.contasAvisos),
    salvar: (id, dados, pagamento) => chamar(CANAIS.contasSalvar, id, dados, pagamento),
    pagar: (id, pagamento) => chamar(CANAIS.contasPagar, id, pagamento),
    desfazerPagamento: (id) => chamar(CANAIS.contasDesfazerPagamento, id),
    excluir: (id) => chamar(CANAIS.contasExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.contasDesfazer, id)
  },
  tiposConta: {
    listar: () => chamar(CANAIS.tiposContaListar),
    criar: (nome) => chamar(CANAIS.tiposContaCriar, nome),
    remover: (id) => chamar(CANAIS.tiposContaRemover, id)
  },
  cartoes: {
    listar: () => chamar(CANAIS.cartoesListar),
    criar: (nome, socioId) => chamar(CANAIS.cartoesCriar, nome, socioId),
    remover: (id) => chamar(CANAIS.cartoesRemover, id)
  },
  socios: {
    listar: () => chamar(CANAIS.sociosListar),
    mes: (anoMes) => chamar(CANAIS.sociosMes, anoMes),
    mudarParticipacao: (anoMes, pct) => chamar(CANAIS.sociosParticipacao, anoMes, pct)
  },
  retiradas: {
    salvar: (id, dados) => chamar(CANAIS.retiradasSalvar, id, dados),
    excluir: (id) => chamar(CANAIS.retiradasExcluir, id),
    desfazerExclusao: (id) => chamar(CANAIS.retiradasDesfazer, id)
  },
  regrasLucro: {
    obter: () => chamar(CANAIS.regrasLucroObter),
    salvar: (r) => chamar(CANAIS.regrasLucroSalvar, r)
  },
  backup: {
    estado: () => chamar(CANAIS.backupEstado),
    fazerAgora: () => chamar(CANAIS.backupFazerAgora),
    listarCopias: () => chamar(CANAIS.backupListar),
    restaurar: (caminho) => chamar(CANAIS.backupRestaurar, caminho),
    aoTerminarCopia: (fn) => {
      const ouvinte = () => fn()
      ipcRenderer.on(CANAIS.backupTerminou, ouvinte)
      return () => ipcRenderer.off(CANAIS.backupTerminou, ouvinte)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
