// Contrato entre a interface (renderer) e o processo principal.
// A interface só fala com o resto do sistema por estas funções (window.api).
import type { Centavos, CustoX10000, QuantidadeX1000 } from '../dominio/dinheiro'
import type { DataISO } from '../dominio/datas'
import type { TipoInsumo, Unidade } from '../dominio/estoque'
import type { UnidadeMedida, VendidoComo } from '../dominio/produto'
import type {
  DiaDoResumo,
  FechamentoCalculado,
  FormaPagamento,
  ResumoDoMes,
  Taxas,
  ValoresDoBalcao
} from '../dominio/vendas'
import type { FormaPagamentoConta } from '../dominio/contas'
import type { TipoPerda } from '../dominio/perdas'
import type { TipoManutencao } from '../dominio/patrimonio'
import type { ItemComido, SituacaoGordurinha } from '../dominio/gordurinha'
import type { LucroNaVenda, ModoGasEnergia } from '../dominio/receita'
import type { ComoRetirou, RegrasLucro, ResultadoDoMes, SocioNoMes } from '../dominio/socios'
import type { AvisoBackup, Empresa, Preferencias } from '../dominio/sistema'

export interface Ambiente {
  /** Data de hoje no computador da loja (nos testes, uma data fixa). */
  hoje: DataISO
  /** Tela "Vitrine" de componentes: só em desenvolvimento e testes. */
  mostrarVitrine: boolean
  versao: string
}

export interface LinhaHistorico {
  id: number
  /** "Hoje, 10:42" */
  quando: string
  descricao: string
}

/** Filtro dos históricos (D-085). */
export interface FiltroHistorico {
  /** "AAAA-MM"; null = "Últimos" (os mais novos, de qualquer mês) */
  anoMes: string | null
  /** quantos mostrar: 15, e mais 16 a cada "Ver mais" */
  limite: number
}

export interface PaginaHistorico<T> {
  itens: T[]
  /** quantos existem no filtro (para o "Ver mais") */
  total: number
  /** meses que têm lançamento, do mais novo para o mais antigo ("AAAA-MM") */
  meses: string[]
}

export interface EstadoBackup {
  aviso: AvisoBackup
  pastaOk: boolean
  pastaCaminho: string
  /** "E:" quando há pen drive conectado. */
  penDrive: string | null
  ultimas: { quando: string; destino: 'pasta' | 'pen_drive' }[]
  /** relógio do computador atrasado (D-093); null quando a data parece certa */
  avisoData: string | null
}

export interface CopiaParaRestaurar {
  caminho: string
  quando: string
  destino: 'pasta' | 'pen_drive'
}

export interface ResultadoCopia {
  pasta: 'ok' | 'erro'
  penDrive: 'ok' | 'erro' | 'sem_pen_drive' | 'nao_pedido'
}

/** Resposta padrão das ações: ou deu certo, ou vem uma mensagem simples para mostrar. */
export type Resposta<T> = { ok: true; valor: T } | { ok: false; mensagem: string }

export interface DadosCliente {
  nome: string
  telefone: string
  documento: string
  rua: string
  numero: string
  bairro: string
  cidade: string
}

export interface Cliente extends DadosCliente {
  id: number
}

export interface DadosFornecedor {
  nome: string
  telefone: string
  documento: string
  contato: string
  oQueFornece: string
}

export interface Fornecedor extends DadosFornecedor {
  id: number
  /** Soma das entradas de mercadoria deste fornecedor no mês atual. */
  compradoNoMes: Centavos
}

/** Motivo de um cadastro não poder ser excluído (ex.: "fornece 3 itens do estoque"), ou null. */
export type EmUso = string | null

export interface ItemEstoque {
  id: number
  nome: string
  tipo: TipoInsumo
  unidade: Unidade
  /** Ex.: "lata" (D-039) */
  nomeUnidade: string | null
  /** O que aparece depois do número: "kg", "L", "un" ou o nome da unidade. */
  rotulo: string
  fornecedorId: number | null
  fornecedorNome: string | null
  quantidade: QuantidadeX1000
  minimo: QuantidadeX1000
  custo: CustoX10000
  /** Compras com saldo (validade por compra, D-036). */
  lotes: {
    id: number
    validade: DataISO | null
    quantidade: QuantidadeX1000
    compradoEm: DataISO | null
  }[]
}

export interface DadosItemNovo {
  tipo: TipoInsumo
  unidade: Unidade
  nomeUnidade: string | null
  nome: string
  quantidade: QuantidadeX1000
  valorPago: Centavos
  fornecedorId: number | null
  minimo: QuantidadeX1000
  validade: DataISO | null
}

export interface DadosEntrada {
  itemId: number
  quantidade: QuantidadeX1000
  valorPago: Centavos
  fornecedorId: number | null
  validade: DataISO | null
}

export interface DadosEdicaoItem {
  tipo: TipoInsumo
  unidade: Unidade
  nomeUnidade: string | null
  nome: string
  quantidade: QuantidadeX1000
  custo: CustoX10000
  fornecedorId: number | null
  minimo: QuantidadeX1000
  validades: { loteId: number; validade: DataISO | null }[]
}

export interface ResultadoEntrada {
  custoAntes: CustoX10000
  custoDepois: CustoX10000
  /** % que o custo subiu (+29), ou null se não subiu. */
  aumento: number | null
}

export interface Categoria {
  id: number
  nome: string
  /** Como se chama cada unidade: "paleta" (D-043) */
  nomeUnidade: string
  precoBalcao: Centavos
  precoAtacado: Centavos
  /** Receitas e produtos que usam a categoria ("em uso · N"). */
  emUso: number
}

/** Configuração do gás e energia da produção (D-041). */
export interface ConfigGasEnergia {
  modo: ModoGasEnergia
  /** A: preço de cada vez (o item especial em Estoque). */
  precoPorVez: Centavos
  /** B: valor somado em toda receita. */
  valorFixo: Centavos
}

export interface DadosReceita {
  nome: string
  categoriaId: number
  rendimento: number
  ingredientes: { itemId: number; quantidade: QuantidadeX1000 }[]
  /** Itens de embalagem marcados (1 por unidade). */
  embalagens: number[]
  /** A: vezes de gás e energia; null = não usa. */
  gasVezes: QuantidadeX1000 | null
  /** C: valor próprio de gás e energia. */
  gasValor: Centavos | null
  /** Da categoria inteira: mudar aqui muda em todos os sabores (R1). */
  precoBalcao: Centavos
  precoAtacado: Centavos
  nomeUnidade: string
}

export interface Receita extends DadosReceita {
  id: number
}

export interface ResumoReceita {
  id: number
  nome: string
  categoriaId: number
  categoriaNome: string
  nomeUnidade: string
  rendimento: number
  custoDeCada: CustoX10000
  balcao: LucroNaVenda
  atacado: LucroNaVenda
}

export interface DadosProduto {
  categoriaId: number
  nome: string
  vendidoComo: VendidoComo
  /** Peso ou volume (×1.000) */
  medida: QuantidadeX1000 | null
  medidaUnidade: UnidadeMedida | null
  /** Só na Caixa (D-045) */
  unidadesPorCaixa: number | null
  receitaId: number | null
}

export interface Produto extends DadosProduto {
  id: number
  categoriaNome: string
  receitaNome: string | null
  precoBalcao: Centavos
  precoAtacado: Centavos
  /** Custo de cada (×10.000), da receita; null sem receita. */
  custo: CustoX10000 | null
  lucroBalcao: CustoX10000 | null
  lucroAtacado: CustoX10000 | null
}

/** Aviso "O custo subiu" de um insumo (D-046). */
export interface AvisoCusto {
  itemId: number
  nome: string
  rotulo: string
  unidade: Unidade
  /** dia do último aumento */
  quando: DataISO
  custoAntes: CustoX10000
  custoAgora: CustoX10000
  aumento: number
  receitas: {
    id: number
    nome: string
    categoriaNome: string
    custoAntes: CustoX10000
    custoAgora: CustoX10000
    /** lucro de cada no balcão */
    lucroAntes: CustoX10000
    lucroAgora: CustoX10000
  }[]
}

export interface DadosFechamento extends ValoresDoBalcao {
  data: DataISO
  /** "A loja não abriu neste dia" (D-055) */
  lojaFechada: boolean
}

export interface Fechamento extends DadosFechamento {
  /** Retrato das taxas do dia. */
  taxas: Taxas
  calculado: FechamentoCalculado
}

export interface DadosPedido {
  clienteId: number
  data: DataISO
  forma: FormaPagamento
  itens: { produtoId: number; quantidade: number }[]
}

export interface Pedido {
  id: number
  numero: number
  data: DataISO
  clienteId: number
  clienteNome: string
  forma: FormaPagamento
  /** Retrato do nome e do preço de atacado do dia do pedido. */
  itens: { produtoId: number; nome: string; quantidade: number; precoUnitario: Centavos }[]
  total: Centavos
  taxaPct: number
  taxa: Centavos
  cancelado: boolean
  motivoCancelamento: string | null
}

export interface ResumoVendas extends ResumoDoMes {
  hoje: {
    balcao: Fechamento | null
    pedidos: Centavos
    qtdPedidos: number
    vendas: Centavos
    taxaPedidos: Centavos
    taxas: Centavos
    ficaParaASorveteria: Centavos
  }
  taxasAtuais: Taxas
}

export interface TipoConta {
  id: number
  nome: string
  /** "Fatura do cartão da empresa" (D-061): não entra nas despesas e não pode ser removido. */
  fatura: boolean
  /** Contas que usam o tipo ("em uso · N"). */
  emUso: number
}

export interface Socio {
  id: number
  nome: string
}

export interface CartaoPagamento {
  id: number
  nome: string
  /** null = cartão da empresa; senão, pessoal do sócio (gera reembolso). */
  socioId: number | null
  donoNome: string | null
  /** Contas pagas com o cartão ("em uso · N contas"). */
  emUso: number
}

export interface DadosConta {
  nome: string
  valor: Centavos
  vencimento: DataISO
  tipoId: number
  repete: boolean
  avisarDias: number
}

/**
 * A compra do "Chegou mercadoria" vai também para Contas a pagar (D-092): conta paga
 * (com o pagamento) ou para pagar depois (só o vencimento). null = não lançar.
 */
export interface ContaDaCompra {
  vencimento: DataISO
  pagamento: DadosPagamento | null
}

export interface DadosPagamento {
  forma: FormaPagamentoConta
  /** Só no cartão de débito ou de crédito. */
  cartaoId: number | null
  pagoEm: DataISO
}

export interface Conta extends DadosConta {
  id: number
  tipoNome: string
  fatura: boolean
  /** Conta criada por uma manutenção do Patrimônio: só se paga aqui; corrigir lá (D-070). */
  manutencaoId: number | null
  pagamento:
    | (DadosPagamento & {
        cartaoNome: string | null
        /** Sócio dono do cartão pessoal (reembolso), ou null. */
        donoNome: string | null
      })
    | null
}

export interface DadosRetirada {
  socioId: number
  valor: Centavos
  data: DataISO
  como: ComoRetirou
  motivo: string
}

export interface Retirada extends DadosRetirada {
  id: number
  socioNome: string
}

export interface Reembolso {
  contaId: number
  data: DataISO
  conta: string
  cartao: string
  socioId: number
  socioNome: string
  valor: Centavos
}

/** Tela Sócios de um mês ("AAAA-MM"). */
export interface MesDosSocios {
  anoMes: string
  regras: RegrasLucro
  resultado: ResultadoDoMes
  /** Prejuízo de meses anteriores (só na regra "levar para o mês seguinte"; ≤ 0). */
  prejuizoAnterior: Centavos
  paraDividir: Centavos
  socios: (SocioNoMes & { nome: string })[]
  reembolsos: Reembolso[]
  retiradas: Retirada[]
}

export interface DadosProducao {
  receitaId: number
  /** Quantas receitas (×1.000: ½ = 500). */
  vezes: QuantidadeX1000
  /** Quanto saiu de verdade (D-032 p.33). */
  unidadesFeitas: number
}

export interface Producao {
  id: number
  data: DataISO
  receitaId: number
  nomeReceita: string
  /** "paleta", "pote"… da categoria (para "100 paletas"). */
  nomeUnidade: string
  vezes: QuantidadeX1000
  unidadesPrevistas: number
  unidadesFeitas: number
  custoTotal: Centavos
}

/** Um item da perda: a receita (produto pronto e troca) ou o item do estoque (matéria-prima). */
export interface DadosItemPerda {
  id: number
  /** ×1.000; produto pronto e troca só em unidades inteiras. */
  quantidade: QuantidadeX1000
}

export interface DadosPerda {
  tipo: TipoPerda
  data: DataISO
  /** Só na troca. */
  clienteId: number | null
  itens: DadosItemPerda[]
  motivo: string
  observacao: string
}

export interface ItemPerda {
  /** Receita (produto pronto e troca) ou item do estoque (matéria-prima). */
  id: number
  nome: string
  /** "kg", "L", "un", "pote"… */
  rotulo: string
  quantidade: QuantidadeX1000
  /** Custo de fazer ou preço pago, guardado no dia da perda (D-069). */
  custo: CustoX10000
  valor: Centavos
}

export interface Perda {
  id: number
  data: DataISO
  tipo: TipoPerda
  clienteId: number | null
  clienteNome: string | null
  motivo: string
  observacao: string
  valor: Centavos
  itens: ItemPerda[]
}

export interface TipoBem {
  id: number
  nome: string
  /** Quantos bens usam este tipo. */
  emUso: number
}

export interface DadosBem {
  nome: string
  tipoId: number
  /** "AAAA-MM"; null = não sabe. */
  dataCompra: string | null
  valor: Centavos
  /** Placa ou nº de série. */
  identificacao: string
}

export interface Bem extends DadosBem {
  id: number
  tipoNome: string
  /** Quantas manutenções tem (bem com manutenção não pode ser excluído, D-067). */
  manutencoes: number
}

export interface DadosManutencao {
  bemId: number
  data: DataISO
  oQueFoiFeito: string
  quemFez: string
  /** R$ 0,00 = serviço de graça: não cria conta (D-070). */
  valor: Centavos
  garantiaDias: number
  tipo: TipoManutencao
  /** Vencimento da conta quando ainda não foi paga (D-032 p.19). */
  vencimento: DataISO | null
}

export interface Manutencao extends DadosManutencao {
  id: number
  bemNome: string
  /** A conta em Contas a pagar (null = sem conta). */
  conta: { id: number; vencimento: DataISO; pagamento: Conta['pagamento'] } | null
}

/** O que imprimir (D-057, D-088): um relatório de um mês ou o comprovante de um pedido. */
export type AlvoImpressao =
  { tipo: 'relatorio'; id: IdRelatorio; anoMes: string } | { tipo: 'pedido'; id: number }

export interface PreviaImpressao {
  /** "Resultado de outubro de 2026" · "Comprovante do pedido #12" */
  titulo: string
  pdf: Uint8Array
  folhas: number
  /** nomes das impressoras do Windows */
  impressoras: string[]
}

export interface OpcoesImpressao {
  /** null = a impressora padrão do Windows */
  impressora: string | null
  copias: number
}

export type IdRelatorio =
  'resultado' | 'gordurinha' | 'mais_vendidos' | 'formas' | 'comparar' | 'lucro_produto' | 'perdas'

/** Nome na lista da tela e no começo do nome do PDF. */
export const RELATORIOS: { id: IdRelatorio; nome: string; arquivo: string }[] = [
  { id: 'resultado', nome: 'Resultado do mês (lucro)', arquivo: 'Resultado' },
  { id: 'gordurinha', nome: 'Gordurinha (hora de reajustar?)', arquivo: 'Gordurinha' },
  { id: 'mais_vendidos', nome: 'Mais vendidos nos pedidos', arquivo: 'Mais vendidos nos pedidos' },
  { id: 'formas', nome: 'Dinheiro, cartão e Pix', arquivo: 'Dinheiro, cartão e Pix' },
  { id: 'comparar', nome: 'Comparar com o ano passado', arquivo: 'Comparar com o ano passado' },
  { id: 'lucro_produto', nome: 'Lucro por produto (estimado)', arquivo: 'Lucro por produto' },
  { id: 'perdas', nome: 'Perdas', arquivo: 'Perdas' }
]

export interface RelResultado {
  balcao: Centavos
  pedidos: Centavos
  total: Centavos
  /** grupos = tipos de conta (D-032 p.26) */
  despesas: { tipo: string; valor: Centavos }[]
  taxas: Centavos
  lucro: Centavos
}

export interface RelMaisVendidos {
  produtos: { nome: string; quantidade: string; valor: Centavos; barra: number }[]
  clientes: { nome: string; pedidos: number; valor: Centavos }[]
  total: Centavos
}

export interface RelFormas {
  formas: { nome: string; valor: Centavos; pct: number }[]
  total: Centavos
  taxas: Centavos
  /** taxas de hoje da maquininha, para o texto (×100) */
  taxaDebitoPct: number
  taxaCreditoPct: number
  diasAbertos: number
  mediaPorDia: Centavos
}

export interface RelComparar {
  anoMesAnterior: string
  linhas: {
    nome: string
    reais: boolean
    antes: number
    agora: number
    /** ×10 (26,9% = 269); null sem ano passado */
    diferenca: number | null
    /** subir é bom (faturamento, lucro) ou ruim (despesas) */
    subirEBom: boolean
  }[]
  /** 6 meses até o mês escolhido: vendas deste ano e do ano passado */
  meses: { mes: number; antes: Centavos; agora: Centavos }[]
}

export interface RelLucroProduto {
  produtos: {
    nome: string
    sairam: number
    lucroDeCada: CustoX10000
    lucro: Centavos
    barra: number
  }[]
}

export interface RelPerdas {
  produtos: Centavos
  materiaPrima: Centavos
  trocas: Centavos
  total: Centavos
  quemMaisTrocou: { nome: string; valor: Centavos } | null
  maiorMotivo: string | null
}

export type Relatorio =
  | { id: 'resultado'; anoMes: string; dados: RelResultado }
  /** a Gordurinha é sempre a de hoje (o mês escolhido não muda nada) */
  | { id: 'gordurinha'; anoMes: string; dados: Gordurinha }
  | { id: 'mais_vendidos'; anoMes: string; dados: RelMaisVendidos }
  | { id: 'formas'; anoMes: string; dados: RelFormas }
  | { id: 'comparar'; anoMes: string; dados: RelComparar }
  | { id: 'lucro_produto'; anoMes: string; dados: RelLucroProduto }
  | { id: 'perdas'; anoMes: string; dados: RelPerdas }

/** Relatório e card da Gordurinha (R14; D-074). */
export interface Gordurinha {
  /** false: ainda não foi ligada (pede base, % e data do último reajuste) */
  ligada: boolean
  desde: DataISO | null
  base: Centavos
  /** 10% = 1000 */
  pct: number
  situacao: SituacaoGordurinha
  itens: (ItemComido & { barra: number })[]
  maisComeram: string | null
  previsao: { mes: number; ano: number } | null
  /** % de reajuste ×10 (2,3% = 23); null sem nada comido ou sem vendas */
  reajuste: number | null
  faturamentoMedio: Centavos
  /** preços novos de cada categoria, no balcão e no atacado (D-071) */
  precos: {
    categoria: string
    balcao: { antes: Centavos; novo: Centavos; arredondado: Centavos }
    atacado: { antes: Centavos; novo: Centavos; arredondado: Centavos }
  }[]
  /** contas que repetem todo mês, para marcar quais entram na conta */
  contas: { serieId: number; nome: string; valor: Centavos; entra: boolean }[]
  /** já há 12 meses de vendas: a base passa a ser calculada no reajuste */
  baseAutomatica: boolean
}

export interface DadosGordurinha {
  base: Centavos
  pct: number
  /** só ao ligar: data do último reajuste (D-074) */
  desde?: DataISO
}

export interface ApiBigLake {
  ambiente(): Promise<Ambiente>
  preferencias: {
    obter(): Promise<Preferencias>
    salvar(p: Preferencias): Promise<Resposta<Preferencias>>
  }
  empresa: {
    obter(): Promise<Empresa>
    salvar(e: Empresa): Promise<Resposta<Empresa>>
  }
  historico: {
    listar(filtro: FiltroHistorico): Promise<PaginaHistorico<LinhaHistorico>>
  }
  impressao: {
    /** Prévia da folha (PDF), quantas folhas e as impressoras instaladas (D-088). */
    previa(alvo: AlvoImpressao): Promise<Resposta<PreviaImpressao>>
    /** Manda direto para a impressora, sem a janela do Windows (D-088). */
    imprimir(alvo: AlvoImpressao, opcoes: OpcoesImpressao): Promise<Resposta<null>>
  }
  dados: {
    /**
     * Apaga todos os dados (D-076). Só funciona com o texto "APAGAR".
     * Antes, guarda uma cópia; ficam só as preferências.
     */
    apagarTudo(confirmacao: string): Promise<Resposta<null>>
  }
  manual: {
    /** Abre o manual do Carlos (PDF que vai junto no instalador; D-075). */
    abrir(): Promise<Resposta<null>>
  }
  clientes: {
    listar(): Promise<Cliente[]>
    /** id null = cadastrar. Devolve o id. */
    salvar(id: number | null, dados: DadosCliente): Promise<Resposta<number>>
    emUso(id: number): Promise<EmUso>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
  }
  fornecedores: {
    listar(): Promise<Fornecedor[]>
    salvar(id: number | null, dados: DadosFornecedor): Promise<Resposta<number>>
    emUso(id: number): Promise<EmUso>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
  }
  estoque: {
    listar(): Promise<ItemEstoque[]>
    cadastrar(dados: DadosItemNovo, conta?: ContaDaCompra | null): Promise<Resposta<number>>
    registrarEntrada(
      dados: DadosEntrada,
      conta?: ContaDaCompra | null
    ): Promise<Resposta<ResultadoEntrada>>
    editar(id: number, dados: DadosEdicaoItem): Promise<Resposta<null>>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
    /** Receitas que usam o item (antes de apagar, pergunta 11). */
    receitasQueUsam(id: number): Promise<{ id: number; nome: string }[]>
  }
  categorias: {
    listar(): Promise<Categoria[]>
    criar(nome: string): Promise<Resposta<Categoria>>
    remover(id: number): Promise<Resposta<null>>
  }
  gasEnergia: {
    obter(): Promise<ConfigGasEnergia>
    salvar(c: ConfigGasEnergia): Promise<Resposta<ConfigGasEnergia>>
  }
  receitas: {
    listar(): Promise<ResumoReceita[]>
    obter(id: number): Promise<Receita | null>
    salvar(id: number | null, dados: DadosReceita): Promise<Resposta<number>>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
    emUso(id: number): Promise<EmUso>
  }
  produtos: {
    listar(): Promise<Produto[]>
    salvar(id: number | null, dados: DadosProduto): Promise<Resposta<number>>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
  }
  producao: {
    /** Produções do mês ("AAAA-MM"), da mais nova para a mais antiga (D-065). */
    listar(anoMes: string): Promise<Producao[]>
    /** Baixa do estoque o que a receita usa e anota a produção de hoje. */
    registrar(d: DadosProducao): Promise<Resposta<Producao>>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
  }
  perdas: {
    /** Perdas do mês ("AAAA-MM"), da mais nova para a mais antiga. */
    listar(anoMes: string): Promise<Perda[]>
    /** id null = registrar. Matéria-prima baixa do estoque. Devolve o id. */
    salvar(id: number | null, dados: DadosPerda): Promise<Resposta<number>>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
  }
  patrimonio: {
    tipos(): Promise<TipoBem[]>
    criarTipo(nome: string): Promise<Resposta<TipoBem>>
    removerTipo(id: number): Promise<Resposta<null>>
    bens(): Promise<Bem[]>
    /** id null = cadastrar. Devolve o id. */
    salvarBem(id: number | null, dados: DadosBem): Promise<Resposta<number>>
    excluirBem(id: number): Promise<Resposta<null>>
    desfazerExclusaoBem(id: number): Promise<Resposta<null>>
    /** Todas as manutenções, da mais nova para a mais antiga. */
    manutencoes(): Promise<Manutencao[]>
    /**
     * id null = registrar. Com valor, cria a conta "Manutenção" em Contas a pagar:
     * paga (com pagamento) ou em aberto (vence em dados.vencimento). Devolve o id.
     */
    salvarManutencao(
      id: number | null,
      dados: DadosManutencao,
      pagamento: DadosPagamento | null
    ): Promise<Resposta<number>>
    excluirManutencao(id: number): Promise<Resposta<null>>
    desfazerExclusaoManutencao(id: number): Promise<Resposta<null>>
  }
  gordurinha: {
    obter(): Promise<Gordurinha>
    /** Primeira vez: base, % e a data do último reajuste; os preços de partida são os de hoje. */
    ligar(d: DadosGordurinha): Promise<Resposta<null>>
    /** "Mudar base ou porcentagem" */
    mudar(d: DadosGordurinha): Promise<Resposta<null>>
    marcarConta(serieId: number, entra: boolean): Promise<Resposta<null>>
    /** "Já reajustei os preços": zera a conta a partir de hoje (D-032 p.37). */
    reajustei(): Promise<Resposta<null>>
  }
  relatorios: {
    /** Meses com dados, do mais novo (o mês de hoje) para o mais antigo ("AAAA-MM"). */
    meses(): Promise<string[]>
    obter(id: IdRelatorio, anoMes: string): Promise<Relatorio>
    /** "Salvar como" do Windows (D-071). Devolve onde salvou, ou null se cancelou. */
    salvarPdf(id: IdRelatorio, anoMes: string): Promise<Resposta<string | null>>
    /** Abre a pasta do arquivo no Windows Explorer. */
    abrirPasta(caminho: string): Promise<void>
  }
  avisosCusto: {
    listar(): Promise<AvisoCusto[]>
    entendi(itemId: number): Promise<Resposta<null>>
  }
  vendas: {
    taxas(): Promise<Taxas>
    salvarTaxas(t: Taxas): Promise<Resposta<Taxas>>
    /** Histórico do balcão (D-085). */
    fechamentos(filtro: FiltroHistorico): Promise<PaginaHistorico<Fechamento>>
    fechamento(data: DataISO): Promise<Fechamento | null>
    salvarFechamento(d: DadosFechamento): Promise<Resposta<Fechamento>>
    resumo(): Promise<ResumoVendas>
    /** Resumo › "Vendas por dia", com filtro e "Ver mais" (D-086). */
    porDia(filtro: FiltroHistorico): Promise<PaginaHistorico<DiaDoResumo>>
  }
  pedidos: {
    /** Pedidos do mês ("AAAA-MM"), do mais novo para o mais antigo. */
    listar(anoMes: string): Promise<Pedido[]>
    /** Histórico de pedidos (D-085). */
    historico(filtro: FiltroHistorico): Promise<PaginaHistorico<Pedido>>
    obter(id: number): Promise<Pedido | null>
    proximoNumero(): Promise<number>
    salvar(id: number | null, dados: DadosPedido): Promise<Resposta<Pedido>>
    cancelar(id: number, motivo: string | null): Promise<Resposta<null>>
    desfazerCancelamento(id: number): Promise<Resposta<null>>
  }
  contas: {
    /** Todas as contas (cria antes as contas do mês das que repetem). */
    listar(): Promise<Conta[]>
    /** Quantas contas estão no aviso (bolinha do menu). */
    avisos(): Promise<number>
    /** id null = nova conta; com pagamento = já está paga. Devolve o id. */
    salvar(
      id: number | null,
      dados: DadosConta,
      pagamento: DadosPagamento | null
    ): Promise<Resposta<number>>
    pagar(id: number, pagamento: DadosPagamento): Promise<Resposta<null>>
    desfazerPagamento(id: number): Promise<Resposta<null>>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
  }
  tiposConta: {
    listar(): Promise<TipoConta[]>
    criar(nome: string): Promise<Resposta<TipoConta>>
    remover(id: number): Promise<Resposta<null>>
  }
  cartoes: {
    listar(): Promise<CartaoPagamento[]>
    criar(nome: string, socioId: number | null): Promise<Resposta<CartaoPagamento>>
    remover(id: number): Promise<Resposta<null>>
  }
  socios: {
    listar(): Promise<Socio[]>
    /** Faturamento, despesas, lucro e quanto cada um recebe no mês ("AAAA-MM"). */
    mes(anoMes: string): Promise<MesDosSocios>
    /** Muda a porcentagem do primeiro sócio (o outro completa 100%) do mês em diante (D-058). */
    mudarParticipacao(anoMes: string, pctPrimeiro: number): Promise<Resposta<null>>
  }
  retiradas: {
    salvar(id: number | null, dados: DadosRetirada): Promise<Resposta<number>>
    excluir(id: number): Promise<Resposta<null>>
    desfazerExclusao(id: number): Promise<Resposta<null>>
  }
  regrasLucro: {
    obter(): Promise<RegrasLucro>
    salvar(r: RegrasLucro): Promise<Resposta<RegrasLucro>>
  }
  backup: {
    estado(): Promise<EstadoBackup>
    fazerAgora(): Promise<ResultadoCopia>
    listarCopias(): Promise<CopiaParaRestaurar[]>
    restaurar(caminho: string): Promise<Resposta<null>>
    /** Avisa quando uma cópia feita sozinha (ao abrir, a cada 2 horas) termina. */
    aoTerminarCopia(fn: () => void): () => void
  }
}

export const CANAIS = {
  ambiente: 'ambiente',
  preferenciasObter: 'preferencias:obter',
  preferenciasSalvar: 'preferencias:salvar',
  empresaObter: 'empresa:obter',
  empresaSalvar: 'empresa:salvar',
  historicoListar: 'historico:listar',
  manualAbrir: 'manual:abrir',
  dadosApagarTudo: 'dados:apagar-tudo',
  clientesListar: 'clientes:listar',
  clientesSalvar: 'clientes:salvar',
  fornecedoresListar: 'fornecedores:listar',
  fornecedoresSalvar: 'fornecedores:salvar',
  clientesEmUso: 'clientes:em-uso',
  clientesExcluir: 'clientes:excluir',
  clientesDesfazer: 'clientes:desfazer',
  fornecedoresEmUso: 'fornecedores:em-uso',
  fornecedoresExcluir: 'fornecedores:excluir',
  fornecedoresDesfazer: 'fornecedores:desfazer',
  estoqueListar: 'estoque:listar',
  estoqueCadastrar: 'estoque:cadastrar',
  estoqueEntrada: 'estoque:entrada',
  estoqueEditar: 'estoque:editar',
  estoqueExcluir: 'estoque:excluir',
  estoqueDesfazer: 'estoque:desfazer',
  categoriasListar: 'categorias:listar',
  categoriasCriar: 'categorias:criar',
  categoriasRemover: 'categorias:remover',
  gasObter: 'gas:obter',
  gasSalvar: 'gas:salvar',
  receitasListar: 'receitas:listar',
  receitasObter: 'receitas:obter',
  receitasSalvar: 'receitas:salvar',
  receitasExcluir: 'receitas:excluir',
  receitasDesfazer: 'receitas:desfazer',
  receitasEmUso: 'receitas:em-uso',
  estoqueReceitasQueUsam: 'estoque:receitas-que-usam',
  produtosListar: 'produtos:listar',
  produtosSalvar: 'produtos:salvar',
  produtosExcluir: 'produtos:excluir',
  produtosDesfazer: 'produtos:desfazer',
  producaoListar: 'producao:listar',
  producaoRegistrar: 'producao:registrar',
  producaoExcluir: 'producao:excluir',
  producaoDesfazer: 'producao:desfazer',
  perdasListar: 'perdas:listar',
  perdasSalvar: 'perdas:salvar',
  perdasExcluir: 'perdas:excluir',
  perdasDesfazer: 'perdas:desfazer',
  patrimonioTipos: 'patrimonio:tipos',
  patrimonioCriarTipo: 'patrimonio:criar-tipo',
  patrimonioRemoverTipo: 'patrimonio:remover-tipo',
  patrimonioBens: 'patrimonio:bens',
  patrimonioSalvarBem: 'patrimonio:salvar-bem',
  patrimonioExcluirBem: 'patrimonio:excluir-bem',
  patrimonioDesfazerBem: 'patrimonio:desfazer-bem',
  patrimonioManutencoes: 'patrimonio:manutencoes',
  patrimonioSalvarManutencao: 'patrimonio:salvar-manutencao',
  patrimonioExcluirManutencao: 'patrimonio:excluir-manutencao',
  patrimonioDesfazerManutencao: 'patrimonio:desfazer-manutencao',
  gordurinhaObter: 'gordurinha:obter',
  gordurinhaLigar: 'gordurinha:ligar',
  gordurinhaMudar: 'gordurinha:mudar',
  gordurinhaConta: 'gordurinha:conta',
  gordurinhaReajustei: 'gordurinha:reajustei',
  relatoriosMeses: 'relatorios:meses',
  relatoriosObter: 'relatorios:obter',
  relatoriosPdf: 'relatorios:pdf',
  relatoriosAbrirPasta: 'relatorios:abrir-pasta',
  avisosListar: 'avisos-custo:listar',
  avisosEntendi: 'avisos-custo:entendi',
  vendasTaxas: 'vendas:taxas',
  vendasSalvarTaxas: 'vendas:salvar-taxas',
  vendasFechamentos: 'vendas:fechamentos',
  vendasFechamento: 'vendas:fechamento',
  vendasSalvarFechamento: 'vendas:salvar-fechamento',
  vendasResumo: 'vendas:resumo',
  vendasPorDia: 'vendas:por-dia',
  impressaoPrevia: 'impressao:previa',
  impressaoImprimir: 'impressao:imprimir',
  pedidosListar: 'pedidos:listar',
  pedidosHistorico: 'pedidos:historico',
  pedidosObter: 'pedidos:obter',
  pedidosProximo: 'pedidos:proximo',
  pedidosSalvar: 'pedidos:salvar',
  pedidosCancelar: 'pedidos:cancelar',
  pedidosDesfazer: 'pedidos:desfazer',
  contasListar: 'contas:listar',
  contasAvisos: 'contas:avisos',
  contasSalvar: 'contas:salvar',
  contasPagar: 'contas:pagar',
  contasDesfazerPagamento: 'contas:desfazer-pagamento',
  contasExcluir: 'contas:excluir',
  contasDesfazer: 'contas:desfazer',
  tiposContaListar: 'tipos-conta:listar',
  tiposContaCriar: 'tipos-conta:criar',
  tiposContaRemover: 'tipos-conta:remover',
  cartoesListar: 'cartoes:listar',
  cartoesCriar: 'cartoes:criar',
  cartoesRemover: 'cartoes:remover',
  sociosListar: 'socios:listar',
  sociosMes: 'socios:mes',
  sociosParticipacao: 'socios:participacao',
  retiradasSalvar: 'retiradas:salvar',
  retiradasExcluir: 'retiradas:excluir',
  retiradasDesfazer: 'retiradas:desfazer',
  regrasLucroObter: 'regras-lucro:obter',
  regrasLucroSalvar: 'regras-lucro:salvar',
  backupEstado: 'backup:estado',
  backupTerminou: 'backup:terminou',
  backupFazerAgora: 'backup:fazer-agora',
  backupListar: 'backup:listar',
  backupRestaurar: 'backup:restaurar'
} as const
