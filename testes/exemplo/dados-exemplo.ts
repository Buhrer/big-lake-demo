// Loja de exemplo com 5 meses de movimento (01/06 a 29/10/2026), para mostrar e testar o
// programa com dados. Rodar com "npm run exemplo" com o programa FECHADO.
// Tudo entra pelos próprios serviços, com o relógio andando dia a dia: o Histórico, o estoque,
// as contas que repetem e os avisos ficam como se a loja tivesse usado o programa de verdade.
// Grava em BIGLAKE_DADOS (ou %APPDATA%\BigLake) e faz uma cópia do banco antes.
// Só roda num banco sem movimento (sem vendas, pedidos, produções nem contas).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { it } from 'vitest'
import { centavos } from '../../src/dominio/dinheiro'
import type { Banco } from '../../src/main/banco/conexao'
import type { Relogio } from '../../src/main/relogio'
import { clientes, fornecedores } from '../../src/main/servicos/cadastros'
import {
  criarTipo,
  gerarContasQueRepetem,
  listarTipos,
  pagarConta,
  salvarConta
} from '../../src/main/servicos/contas'
import { cadastrarItem, registrarEntrada } from '../../src/main/servicos/estoque'
import { ligarGordurinha } from '../../src/main/servicos/gordurinha'
import { salvarBem, salvarManutencao, listarTiposBem } from '../../src/main/servicos/patrimonio'
import { salvarPerda } from '../../src/main/servicos/perdas'
import { registrarProducao } from '../../src/main/servicos/producao'
import { salvarProduto } from '../../src/main/servicos/produtos'
import {
  criarCategoria,
  listarCategorias,
  salvarGas,
  salvarReceita
} from '../../src/main/servicos/receitas'
import { listarSocios, salvarRetirada } from '../../src/main/servicos/socios'
import { salvarFechamento, salvarPedido, salvarTaxas } from '../../src/main/servicos/vendas'
import { Sistema } from '../../src/main/sistema'

const INICIO = '2026-06-01'
const ULTIMO_DIA = '2026-10-29'

/** Movimento de cada mês (inverno fraco, primavera forte). */
const RITMO: Record<string, number> = {
  '2026-05': 0.6,
  '2026-06': 0.6,
  '2026-07': 0.62,
  '2026-08': 0.8,
  '2026-09': 1.0,
  '2026-10': 1.15
}

// ---------- utilidades ----------

/** Sorteio com semente fixa: rodar de novo dá os mesmos números. */
let semente = 20260601
function sorte(): number {
  semente = (semente + 0x6d2b79f5) | 0
  let t = semente
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const entre = (a: number, b: number) => a + Math.floor(sorte() * (b - a + 1))
const variar = (v: number, pct: number) => v * (1 - pct + sorte() * 2 * pct)
/** Arredonda para 50 centavos (como num caixa de verdade). */
const em50 = (reais: number) => centavos(Math.max(0, Math.round(reais * 2) * 50))

function somarDias(data: string, n: number): string {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
/** 0 = domingo … 6 = sábado */
const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay()
const mesAnterior = (am: string) => somarDias(`${am}-01`, -1).slice(0, 7)

/** Relógio que o script move: cada chamada de agora() anda 3 minutos a partir das 8h. */
function relogioDoExemplo(): Relogio & { irPara(dia: string): void } {
  let dia = INICIO
  let minutos = 0
  return {
    irPara(d: string) {
      dia = d
      minutos = 0
    },
    hoje: () => dia,
    agora: () => {
      const m = 8 * 60 + Math.min(minutos, 13 * 60)
      minutos += 3
      const hh = String(Math.floor(m / 60)).padStart(2, '0')
      const mm = String(m % 60).padStart(2, '0')
      return `${dia}T${hh}:${mm}:00-03:00`
    }
  }
}

// ---------- cadastros da loja ----------

type ChaveFornecedor = 'laticinios' | 'doces' | 'horti' | 'polpas' | 'embalagens'

const FORNECEDORES: Record<ChaveFornecedor, { nome: string; telefone: string; fornece: string }> = {
  laticinios: {
    nome: 'Laticínios Vale Verde',
    telefone: '(11) 3456-7788',
    fornece: 'Leite, creme de leite, leite condensado'
  },
  doces: {
    nome: 'Doce Sabor Distribuidora',
    telefone: '(11) 3322-4455',
    fornece: 'Açúcar, chocolate, coco'
  },
  horti: { nome: 'Hortifruti Bom Dia', telefone: '(11) 98765-1122', fornece: 'Frutas' },
  polpas: {
    nome: 'Polpas Amazônia',
    telefone: '(11) 2233-9900',
    fornece: 'Polpa de açaí e de frutas'
  },
  embalagens: {
    nome: 'Embalagens Polar',
    telefone: '(11) 4004-1234',
    fornece: 'Palitos, saquinhos, potes e copos'
  }
}

interface DefItem {
  nome: string
  tipo: 'materia_prima' | 'insumo'
  unidade: 'kg' | 'L' | 'un'
  nomeUnidade: string | null
  /** preço de cada kg, L ou unidade, em reais, no começo */
  preco: number
  /** quanto se compra de uma vez (kg, L ou unidades) */
  lote: number
  minimo: number
  validadeDias: number | null
  fornecedor: ChaveFornecedor
  /** preço muda por mês (1 = igual ao começo) */
  fator?: Record<string, number>
}

const ITENS = {
  leite: {
    nome: 'Leite integral',
    tipo: 'materia_prima',
    unidade: 'L',
    nomeUnidade: null,
    preco: 4.89,
    lote: 120,
    minimo: 40,
    validadeDias: 10,
    fornecedor: 'laticinios',
    fator: { '2026-07': 1.06, '2026-08': 1.1, '2026-09': 1.1, '2026-10': 1.08 }
  },
  creme: {
    nome: 'Creme de leite',
    tipo: 'materia_prima',
    unidade: 'L',
    nomeUnidade: null,
    preco: 21.5,
    lote: 20,
    minimo: 6,
    validadeDias: 30,
    fornecedor: 'laticinios'
  },
  condensado: {
    nome: 'Leite condensado',
    tipo: 'materia_prima',
    unidade: 'un',
    nomeUnidade: 'lata',
    preco: 6.9,
    lote: 48,
    minimo: 24,
    validadeDias: 240,
    fornecedor: 'laticinios',
    fator: { '2026-09': 1.04, '2026-10': 1.04 }
  },
  leitePo: {
    nome: 'Leite em pó',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 36,
    lote: 5,
    minimo: 2,
    validadeDias: 180,
    fornecedor: 'laticinios'
  },
  acucar: {
    nome: 'Açúcar refinado',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 4.6,
    lote: 50,
    minimo: 15,
    validadeDias: null,
    fornecedor: 'doces'
  },
  chocolate: {
    nome: 'Chocolate em pó 50%',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 42,
    lote: 5,
    minimo: 2,
    validadeDias: 300,
    fornecedor: 'doces',
    fator: { '2026-09': 1.14, '2026-10': 1.14 }
  },
  coco: {
    nome: 'Coco ralado',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 38,
    lote: 5,
    minimo: 2,
    validadeDias: 120,
    fornecedor: 'doces'
  },
  morango: {
    nome: 'Morango',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 14,
    lote: 12,
    minimo: 4,
    validadeDias: 6,
    fornecedor: 'horti',
    fator: { '2026-07': 0.95, '2026-08': 1, '2026-09': 1.15, '2026-10': 1.4 }
  },
  limao: {
    nome: 'Limão',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 7,
    lote: 8,
    minimo: 3,
    validadeDias: 15,
    fornecedor: 'horti'
  },
  manga: {
    nome: 'Polpa de manga',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 14,
    lote: 20,
    minimo: 6,
    validadeDias: 90,
    fornecedor: 'polpas'
  },
  acai: {
    nome: 'Polpa de açaí',
    tipo: 'materia_prima',
    unidade: 'kg',
    nomeUnidade: null,
    preco: 22,
    lote: 30,
    minimo: 10,
    validadeDias: 90,
    fornecedor: 'polpas',
    fator: { '2026-08': 1.05, '2026-09': 1.05, '2026-10': 1.09 }
  },
  palito: {
    nome: 'Palito de madeira',
    tipo: 'insumo',
    unidade: 'un',
    nomeUnidade: null,
    preco: 0.06,
    lote: 5000,
    minimo: 1000,
    validadeDias: null,
    fornecedor: 'embalagens'
  },
  saquinho: {
    nome: 'Saquinho de picolé',
    tipo: 'insumo',
    unidade: 'un',
    nomeUnidade: null,
    preco: 0.05,
    lote: 5000,
    minimo: 1000,
    validadeDias: null,
    fornecedor: 'embalagens'
  },
  sacoPaleta: {
    nome: 'Saco de paleta',
    tipo: 'insumo',
    unidade: 'un',
    nomeUnidade: null,
    preco: 0.12,
    lote: 2000,
    minimo: 400,
    validadeDias: null,
    fornecedor: 'embalagens'
  },
  pote: {
    nome: 'Pote 2 L com tampa',
    tipo: 'insumo',
    unidade: 'un',
    nomeUnidade: null,
    preco: 2.4,
    lote: 200,
    minimo: 50,
    validadeDias: null,
    fornecedor: 'embalagens'
  },
  copo: {
    nome: 'Copo 500 ml com tampa',
    tipo: 'insumo',
    unidade: 'un',
    nomeUnidade: null,
    preco: 0.45,
    lote: 500,
    minimo: 100,
    validadeDias: null,
    fornecedor: 'embalagens'
  },
  colher: {
    nome: 'Colher de açaí',
    tipo: 'insumo',
    unidade: 'un',
    nomeUnidade: null,
    preco: 0.08,
    lote: 1000,
    minimo: 200,
    validadeDias: null,
    fornecedor: 'embalagens'
  }
} satisfies Record<string, DefItem>

type ChaveItem = keyof typeof ITENS
type ChaveCategoria = 'Paleta' | 'Picolé' | 'Pote' | 'Açaí'

interface DefReceita {
  nome: string
  categoria: ChaveCategoria
  rendimento: number
  nomeUnidade: string
  /** quanto vai de cada item numa receita (kg, L ou unidades) */
  ingredientes: Partial<Record<ChaveItem, number>>
  embalagens: ChaveItem[]
  /** chance de entrar numa produção */
  peso: number
}

const RECEITAS = {
  paletaMorango: {
    nome: 'Paleta de Morango recheada',
    categoria: 'Paleta',
    rendimento: 40,
    nomeUnidade: 'paleta',
    ingredientes: { morango: 3, leite: 4, condensado: 4, creme: 1, acucar: 0.8 },
    embalagens: ['palito', 'sacoPaleta'],
    peso: 4
  },
  paletaCoco: {
    nome: 'Paleta de Coco cremosa',
    categoria: 'Paleta',
    rendimento: 40,
    nomeUnidade: 'paleta',
    ingredientes: { coco: 1.2, leite: 5, condensado: 5, creme: 1, acucar: 0.5 },
    embalagens: ['palito', 'sacoPaleta'],
    peso: 2
  },
  paletaChocolate: {
    nome: 'Paleta de Chocolate',
    categoria: 'Paleta',
    rendimento: 40,
    nomeUnidade: 'paleta',
    ingredientes: { chocolate: 0.8, leite: 5, condensado: 5, creme: 1, acucar: 0.6 },
    embalagens: ['palito', 'sacoPaleta'],
    peso: 3
  },
  paletaLimao: {
    nome: 'Paleta de Limão',
    categoria: 'Paleta',
    rendimento: 40,
    nomeUnidade: 'paleta',
    ingredientes: { limao: 2, leite: 3, condensado: 6, creme: 1, acucar: 0.5 },
    embalagens: ['palito', 'sacoPaleta'],
    peso: 2
  },
  picoleMorango: {
    nome: 'Picolé de Morango',
    categoria: 'Picolé',
    rendimento: 100,
    nomeUnidade: 'picolé',
    ingredientes: { morango: 3, acucar: 2 },
    embalagens: ['palito', 'saquinho'],
    peso: 4
  },
  picoleManga: {
    nome: 'Picolé de Manga',
    categoria: 'Picolé',
    rendimento: 100,
    nomeUnidade: 'picolé',
    ingredientes: { manga: 4, acucar: 2 },
    embalagens: ['palito', 'saquinho'],
    peso: 2
  },
  picoleChocolate: {
    nome: 'Picolé de Chocolate',
    categoria: 'Picolé',
    rendimento: 100,
    nomeUnidade: 'picolé',
    ingredientes: { chocolate: 1, leite: 8, acucar: 2, leitePo: 0.5 },
    embalagens: ['palito', 'saquinho'],
    peso: 4
  },
  picoleCoco: {
    nome: 'Picolé de Coco',
    categoria: 'Picolé',
    rendimento: 100,
    nomeUnidade: 'picolé',
    ingredientes: { coco: 1.5, leite: 8, acucar: 2, condensado: 3 },
    embalagens: ['palito', 'saquinho'],
    peso: 2
  },
  poteMorango: {
    nome: 'Sorvete de Morango · pote 2 L',
    categoria: 'Pote',
    rendimento: 8,
    nomeUnidade: 'pote',
    ingredientes: { morango: 2, leite: 8, condensado: 6, creme: 2, acucar: 1 },
    embalagens: ['pote'],
    peso: 2
  },
  poteChocolate: {
    nome: 'Sorvete de Chocolate · pote 2 L',
    categoria: 'Pote',
    rendimento: 8,
    nomeUnidade: 'pote',
    ingredientes: { chocolate: 1, leite: 8, condensado: 6, creme: 2, acucar: 1 },
    embalagens: ['pote'],
    peso: 2
  },
  poteCreme: {
    nome: 'Sorvete de Creme · pote 2 L',
    categoria: 'Pote',
    rendimento: 8,
    nomeUnidade: 'pote',
    ingredientes: { leite: 10, condensado: 8, creme: 2, acucar: 1, leitePo: 0.5 },
    embalagens: ['pote'],
    peso: 2
  },
  acai: {
    nome: 'Açaí batido · copo 500 ml',
    categoria: 'Açaí',
    rendimento: 20,
    nomeUnidade: 'copo',
    ingredientes: { acai: 6, acucar: 1, leitePo: 0.5 },
    embalagens: ['copo', 'colher'],
    peso: 3
  }
} satisfies Record<string, DefReceita>

type ChaveReceita = keyof typeof RECEITAS

/** Preço de cada categoria (balcão, atacado), em reais. Em 01/08 sobem Paleta e Pote. */
const PRECOS: Record<ChaveCategoria, [number, number]> = {
  Paleta: [10, 6.5],
  Picolé: [4, 2.3],
  Pote: [42, 34],
  Açaí: [18, 13]
}
const REAJUSTE: Partial<Record<ChaveCategoria, [number, number]>> = {
  Paleta: [11, 7],
  Pote: [45, 36]
}

type ChaveProduto =
  | 'paletaMorango'
  | 'paletaCoco'
  | 'paletaChocolate'
  | 'paletaLimao'
  | 'picoleMorango'
  | 'picoleManga'
  | 'picoleChocolate'
  | 'picoleCoco'
  | 'caixaMorango'
  | 'caixaChocolate'
  | 'caixaSortida'
  | 'poteMorango'
  | 'poteChocolate'
  | 'poteCreme'
  | 'acai'

const PRODUTOS: Record<
  ChaveProduto,
  {
    nome: string
    receita: ChaveReceita
    como: 'unidade' | 'pote' | 'copo' | 'caixa'
    medida?: [number, 'L' | 'ml']
    porCaixa?: number
  }
> = {
  paletaMorango: { nome: 'Paleta de Morango', receita: 'paletaMorango', como: 'unidade' },
  paletaCoco: { nome: 'Paleta de Coco', receita: 'paletaCoco', como: 'unidade' },
  paletaChocolate: { nome: 'Paleta de Chocolate', receita: 'paletaChocolate', como: 'unidade' },
  paletaLimao: { nome: 'Paleta de Limão', receita: 'paletaLimao', como: 'unidade' },
  picoleMorango: { nome: 'Picolé de Morango', receita: 'picoleMorango', como: 'unidade' },
  picoleManga: { nome: 'Picolé de Manga', receita: 'picoleManga', como: 'unidade' },
  picoleChocolate: { nome: 'Picolé de Chocolate', receita: 'picoleChocolate', como: 'unidade' },
  picoleCoco: { nome: 'Picolé de Coco', receita: 'picoleCoco', como: 'unidade' },
  caixaMorango: {
    nome: 'Caixa de Picolé de Morango',
    receita: 'picoleMorango',
    como: 'caixa',
    porCaixa: 20
  },
  caixaChocolate: {
    nome: 'Caixa de Picolé de Chocolate',
    receita: 'picoleChocolate',
    como: 'caixa',
    porCaixa: 20
  },
  caixaSortida: {
    nome: 'Caixa de Picolé de Coco',
    receita: 'picoleCoco',
    como: 'caixa',
    porCaixa: 20
  },
  poteMorango: { nome: 'Morango', receita: 'poteMorango', como: 'pote', medida: [2, 'L'] },
  poteChocolate: { nome: 'Chocolate', receita: 'poteChocolate', como: 'pote', medida: [2, 'L'] },
  poteCreme: { nome: 'Creme', receita: 'poteCreme', como: 'pote', medida: [2, 'L'] },
  acai: { nome: 'Açaí batido', receita: 'acai', como: 'copo', medida: [500, 'ml'] }
}

interface DefCliente {
  nome: string
  telefone: string
  bairro: string
  forma: 'dinheiro' | 'pix' | 'debito' | 'credito'
  /** em que dia faz pedido */
  pede: (data: string, n: number) => boolean
  itens: [ChaveProduto, number, number][]
}

const CLIENTES: DefCliente[] = [
  {
    nome: 'Mercado Bom Preço',
    telefone: '(11) 3411-2020',
    bairro: 'Centro',
    forma: 'pix',
    pede: (d) => diaDaSemana(d) === 2,
    itens: [
      ['caixaMorango', 2, 5],
      ['caixaChocolate', 2, 5],
      ['poteCreme', 3, 6],
      ['poteChocolate', 2, 5]
    ]
  },
  {
    nome: 'Padaria Pão Quente',
    telefone: '(11) 3411-8899',
    bairro: 'Vila Nova',
    forma: 'pix',
    pede: (d) => diaDaSemana(d) === 5,
    itens: [
      ['paletaMorango', 15, 30],
      ['paletaChocolate', 10, 25],
      ['poteMorango', 1, 3]
    ]
  },
  {
    nome: 'Lanchonete do Trevo',
    telefone: '(11) 99812-3344',
    bairro: 'Trevo',
    forma: 'dinheiro',
    pede: (d, n) => diaDaSemana(d) === 3 && n % 2 === 0,
    itens: [
      ['caixaSortida', 1, 3],
      ['acai', 15, 35]
    ]
  },
  {
    nome: 'Quiosque da Praça',
    telefone: '(11) 98123-4567',
    bairro: 'Praça da Matriz',
    forma: 'pix',
    pede: (d, n) => diaDaSemana(d) === 6 && (d >= '2026-09-01' || n % 2 === 1),
    itens: [
      ['paletaMorango', 20, 40],
      ['paletaLimao', 10, 25],
      ['paletaCoco', 10, 20],
      ['caixaMorango', 1, 3]
    ]
  },
  {
    nome: 'Restaurante Sabor da Terra',
    telefone: '(11) 3412-7070',
    bairro: 'Centro',
    forma: 'debito',
    pede: (d) => ['05', '15', '25'].includes(d.slice(8)),
    itens: [
      ['poteCreme', 3, 6],
      ['poteChocolate', 2, 4]
    ]
  },
  {
    nome: 'Buffet Festa Feliz',
    telefone: '(11) 99700-5544',
    bairro: 'Jardim das Flores',
    forma: 'credito',
    pede: (d) => ['12', '26'].includes(d.slice(8)),
    itens: [
      ['paletaMorango', 50, 120],
      ['paletaChocolate', 40, 100],
      ['picoleCoco', 50, 100],
      ['poteMorango', 2, 6]
    ]
  },
  {
    nome: 'Escola Pequeno Saber',
    telefone: '(11) 3413-1500',
    bairro: 'Jardim Escola',
    forma: 'pix',
    pede: (d) => d.slice(8) === '18' && d.slice(5, 7) !== '07',
    itens: [
      ['caixaMorango', 4, 8],
      ['caixaChocolate', 4, 8]
    ]
  }
]

/** Contas que repetem todo mês: nome, tipo, valor, dia, como paga. */
const CONTAS_FIXAS: {
  nome: string
  tipo: string
  valor: number
  dia: number
  forma: 'pix' | 'boleto'
}[] = [
  { nome: 'Aluguel do ponto', tipo: 'Aluguel', valor: 3500, dia: 5, forma: 'pix' },
  { nome: 'Salário da atendente', tipo: 'Funcionários', valor: 1850, dia: 5, forma: 'pix' },
  {
    nome: 'Salário do ajudante de produção',
    tipo: 'Funcionários',
    valor: 1950,
    dia: 5,
    forma: 'pix'
  },
  { nome: 'Contador', tipo: 'Serviços', valor: 650, dia: 10, forma: 'pix' },
  { nome: 'Água', tipo: 'Contas fixas', valor: 185, dia: 12, forma: 'boleto' },
  { nome: 'Energia elétrica', tipo: 'Energia', valor: 2650, dia: 17, forma: 'boleto' },
  { nome: 'Internet e telefone', tipo: 'Contas fixas', valor: 129.9, dia: 20, forma: 'boleto' },
  {
    nome: 'FGTS e INSS dos funcionários',
    tipo: 'Funcionários',
    valor: 560,
    dia: 20,
    forma: 'boleto'
  },
  { nome: 'Aluguel da maquininha', tipo: 'Contas fixas', valor: 89.9, dia: 25, forma: 'boleto' },
  { nome: 'Seguro do furgão', tipo: 'Outros', valor: 310, dia: 28, forma: 'boleto' }
]
/** A energia muda todo mês (os freezers gastam mais no calor). */
const ENERGIA: Record<string, number> = {
  '2026-06': 2650,
  '2026-07': 2480,
  '2026-08': 2720,
  '2026-09': 3050,
  '2026-10': 3280
}
/** Fica sem pagar, para aparecer o aviso de conta atrasada. */
const SEM_PAGAR = new Set(['Água|2026-10'])

// ---------- o gerador ----------

function pastaDosDados(): string {
  if (process.env.BIGLAKE_DADOS) return process.env.BIGLAKE_DADOS
  const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  return join(appData, 'BigLake')
}

function contar(db: Banco, tabela: string): number {
  return (db.prepare(`SELECT count(*) AS n FROM ${tabela}`).get() as { n: number }).n
}

it('monta a loja de exemplo com 5 meses de movimento', async () => {
  process.env.BIGLAKE_PENDRIVE = ''
  const pasta = pastaDosDados()
  const banco = join(pasta, 'biglake.db')
  mkdirSync(pasta, { recursive: true })
  if (existsSync(banco)) {
    const carimbo = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
    const copia = join(pasta, `biglake.antes-do-exemplo-${carimbo}.db`)
    copyFileSync(banco, copia)
    console.log(`Cópia do banco antes do exemplo: ${copia}`)
  }
  const relogio = relogioDoExemplo()
  const s = await Sistema.abrir(
    {
      banco,
      copias: process.env.BIGLAKE_COPIAS ?? join(homedir(), 'Documents', 'BigLake', 'Backups')
    },
    relogio
  )
  const db = s.db
  try {
    for (const t of ['fechamento_balcao', 'pedido', 'producao', 'conta_pagar', 'item_estoque']) {
      if (contar(db, t) > 0) {
        throw new Error(
          `O banco ${banco} já tem movimento (${t}). O exemplo só entra num banco vazio: ` +
            'use "Apagar todos os dados" em Configurações antes.'
        )
      }
    }
    gerar(db, relogio)
  } finally {
    s.fechar()
    delete process.env.BIGLAKE_PENDRIVE
  }
}, 600_000)

function gerar(db: Banco, relogio: ReturnType<typeof relogioDoExemplo>): void {
  relogio.irPara(INICIO)
  const am = (d: string) => d.slice(0, 7)
  const precoDoItem = (k: ChaveItem, d: string) => {
    const def: DefItem = ITENS[k]
    return def.preco * (def.fator?.[am(d)] ?? 1)
  }

  // --- configurações ---
  salvarTaxas(db, relogio, { debitoPct: 150, debitoDias: 1, creditoPct: 320, creditoDias: 30 })
  salvarGas(db, relogio, { modo: 'ingrediente', precoPorVez: 600, valorFixo: 0 })

  // --- fornecedores ---
  const forn = {} as Record<ChaveFornecedor, number>
  for (const [k, f] of Object.entries(FORNECEDORES) as [
    ChaveFornecedor,
    (typeof FORNECEDORES)[ChaveFornecedor]
  ][]) {
    forn[k] = fornecedores.salvar(db, relogio, null, {
      nome: f.nome,
      telefone: f.telefone,
      documento: '',
      contato: '',
      oQueFornece: f.fornece
    })
  }
  /** Compras de cada fornecedor por mês, em centavos (viram o boleto do mês seguinte). */
  const compras = new Map<string, number>()
  const anotarCompra = (f: ChaveFornecedor, d: string, valor: number) => {
    const chave = `${f}|${am(d)}`
    compras.set(chave, (compras.get(chave) ?? 0) + valor)
  }

  // --- estoque inicial ---
  const itemId = {} as Record<ChaveItem, number>
  for (const [k, def] of Object.entries(ITENS) as [ChaveItem, DefItem][]) {
    const valor = em50(precoDoItem(k, INICIO) * def.lote)
    itemId[k] = cadastrarItem(db, relogio, {
      tipo: def.tipo,
      unidade: def.unidade,
      nomeUnidade: def.nomeUnidade,
      nome: def.nome,
      quantidade: Math.round(def.lote * 1000),
      valorPago: valor,
      fornecedorId: forn[def.fornecedor],
      minimo: Math.round(def.minimo * 1000),
      validade: def.validadeDias === null ? null : somarDias(INICIO, def.validadeDias)
    })
    anotarCompra(def.fornecedor, INICIO, valor)
  }
  const estoque = (k: ChaveItem) =>
    (
      db.prepare('SELECT quantidade_x1000 AS q FROM item_estoque WHERE id = ?').get(itemId[k]) as {
        q: number
      }
    ).q
  const comprar = (k: ChaveItem, d: string, vezes = 1) => {
    const def: DefItem = ITENS[k]
    const qtd = def.lote * vezes
    const valor = em50(precoDoItem(k, d) * qtd)
    registrarEntrada(db, relogio, {
      itemId: itemId[k],
      quantidade: Math.round(qtd * 1000),
      valorPago: valor,
      fornecedorId: forn[def.fornecedor],
      validade: def.validadeDias === null ? null : somarDias(d, def.validadeDias)
    })
    anotarCompra(def.fornecedor, d, valor)
  }

  // --- categorias, receitas e produtos ---
  const acai = criarCategoria(db, relogio, 'Açaí')
  const catId = (n: ChaveCategoria) =>
    n === 'Açaí' ? acai.id : listarCategorias(db).find((c) => c.nome === n)!.id
  const dadosReceita = (r: DefReceita, precos: [number, number]) => ({
    nome: r.nome,
    categoriaId: catId(r.categoria),
    rendimento: r.rendimento,
    ingredientes: (Object.entries(r.ingredientes) as [ChaveItem, number][]).map(([k, q]) => ({
      itemId: itemId[k],
      quantidade: Math.round(q * 1000)
    })),
    embalagens: r.embalagens.map((k) => itemId[k]),
    gasVezes: 1000,
    gasValor: null,
    precoBalcao: centavos(Math.round(precos[0] * 100)),
    precoAtacado: centavos(Math.round(precos[1] * 100)),
    nomeUnidade: r.nomeUnidade
  })
  const receitaId = {} as Record<ChaveReceita, number>
  for (const [k, r] of Object.entries(RECEITAS) as [ChaveReceita, DefReceita][]) {
    receitaId[k] = salvarReceita(db, relogio, null, dadosReceita(r, PRECOS[r.categoria]))
  }
  const produtoId = {} as Record<ChaveProduto, number>
  for (const [k, p] of Object.entries(PRODUTOS) as [
    ChaveProduto,
    (typeof PRODUTOS)[ChaveProduto]
  ][]) {
    const r: DefReceita = RECEITAS[p.receita]
    produtoId[k] = salvarProduto(db, relogio, null, {
      categoriaId: catId(r.categoria),
      nome: p.nome,
      vendidoComo: p.como,
      medida: p.medida ? p.medida[0] * 1000 : null,
      medidaUnidade: p.medida ? p.medida[1] : null,
      unidadesPorCaixa: p.porCaixa ?? null,
      receitaId: receitaId[p.receita]
    })
  }

  // --- clientes ---
  const clienteId = CLIENTES.map((c, i) =>
    clientes.salvar(db, relogio, null, {
      nome: c.nome,
      telefone: c.telefone,
      documento: '',
      rua: ['Rua XV de Novembro', 'Av. Brasil', 'Rua das Palmeiras', 'Rua São João'][i % 4],
      numero: String(100 + i * 37),
      bairro: c.bairro,
      cidade: 'Lagoa Grande'
    })
  )

  // --- patrimônio ---
  const tiposBem = listarTiposBem(db)
  const tipoBem = (n: string) => tiposBem.find((t) => t.nome === n)!.id
  const bem = (nome: string, tipo: string, compra: string, valor: number, ident: string) =>
    salvarBem(db, relogio, null, {
      nome,
      tipoId: tipoBem(tipo),
      dataCompra: compra,
      valor: centavos(valor * 100),
      identificacao: ident
    })
  const furgao = bem('Furgão de entrega 2019', 'Veículo', '2022-03', 68_000, 'ABC-1D23')
  const maquina = bem('Máquina de paleta 30 formas', 'Equipamento', '2022-08', 18_500, '')
  const freezer = bem('Freezer horizontal 500 L', 'Equipamento', '2021-11', 4_200, '')
  bem('Balcão refrigerado da loja', 'Equipamento', '2020-02', 9_800, '')
  bem('Mesas e cadeiras da loja', 'Móvel', '2020-02', 3_600, '')
  bem('Computador do escritório', 'Informática', '2026-05', 3_200, '')

  // --- tipos e contas ---
  criarTipo(db, relogio, 'Impostos')
  const tipos = listarTipos(db)
  const tipoId = (n: string) => tipos.find((t) => t.nome === n)!.id
  const formaDa = new Map(CONTAS_FIXAS.map((c) => [c.nome, c.forma]))
  for (const c of CONTAS_FIXAS) {
    salvarConta(
      db,
      relogio,
      null,
      {
        nome: c.nome,
        valor: centavos(Math.round(c.valor * 100)),
        vencimento: `2026-06-${String(c.dia).padStart(2, '0')}`,
        tipoId: tipoId(c.tipo),
        repete: true,
        avisarDias: 3
      },
      null
    )
  }
  const contaAvulsa = (
    nome: string,
    tipo: string,
    valor: number,
    vencimento: string,
    forma: 'pix' | 'boleto' | null
  ) => {
    const id = salvarConta(
      db,
      relogio,
      null,
      {
        nome,
        valor: centavos(valor),
        vencimento,
        tipoId: tipoId(tipo),
        repete: false,
        avisarDias: forma === 'boleto' ? 5 : 3
      },
      null
    )
    formaDa.set(nome, forma ?? 'pix')
    return id
  }
  // boletos das compras de maio (antes do programa), pagos em junho
  for (const [f, valor] of [
    ['laticinios', 465_000],
    ['doces', 98_000],
    ['horti', 61_000],
    ['polpas', 142_000],
    ['embalagens', 87_500]
  ] as [ChaveFornecedor, number][]) {
    contaAvulsa(
      `${FORNECEDORES[f].nome} · compras de 05/2026`,
      'Fornecedor',
      valor,
      '2026-06-10',
      'boleto'
    )
  }

  const socios = listarSocios(db)
  const carlos = socios.find((x) => x.nome === 'Carlos') ?? socios[0]!
  const paulo = socios.find((x) => x.nome === 'Paulo') ?? socios[1]!

  // --- o dia a dia ---
  const faturamento = new Map<string, number>()
  const anotarVenda = (d: string, v: number) =>
    faturamento.set(am(d), (faturamento.get(am(d)) ?? 0) + v)
  const sortearReceita = (): ChaveReceita => {
    const lista = Object.entries(RECEITAS) as [ChaveReceita, DefReceita][]
    const total = lista.reduce((a, [, r]) => a + r.peso, 0)
    let x = sorte() * total
    for (const [k, r] of lista) {
      x -= r.peso
      if (x <= 0) return k
    }
    return lista[0]![0]
  }
  const produzir = (d: string, k: ChaveReceita, vezes: number) => {
    const r: DefReceita = RECEITAS[k]
    const precisa = new Map<ChaveItem, number>()
    for (const [i, q] of Object.entries(r.ingredientes) as [ChaveItem, number][]) {
      precisa.set(i, Math.round(q * 1000 * vezes))
    }
    for (const e of r.embalagens) {
      precisa.set(e, (precisa.get(e) ?? 0) + r.rendimento * vezes * 1000)
    }
    for (const [i, q] of precisa) {
      const def: DefItem = ITENS[i]
      let n = 0
      while (estoque(i) + n * def.lote * 1000 < q + def.minimo * 1000) n++
      if (n > 0) comprar(i, d, n)
    }
    const previstas = r.rendimento * vezes
    const perdeu = sorte() < 0.15 ? entre(1, Math.max(1, Math.round(previstas * 0.04))) : 0
    registrarProducao(db, relogio, {
      receitaId: receitaId[k],
      vezes: vezes * 1000,
      unidadesFeitas: previstas - perdeu
    })
  }
  const precoAtacado = (p: ChaveProduto, d: string) => {
    const def = PRODUTOS[p]
    const r: DefReceita = RECEITAS[def.receita]
    const tabela =
      d >= '2026-08-01' ? (REAJUSTE[r.categoria] ?? PRECOS[r.categoria]) : PRECOS[r.categoria]
    return Math.round(tabela[1] * 100) * (def.porCaixa ?? 1)
  }

  let n = 0
  for (let d = INICIO; d <= ULTIMO_DIA; d = somarDias(d, 1), n++) {
    relogio.irPara(d)
    const mes = am(d)
    const ritmo = RITMO[mes]!
    const semana = diaDaSemana(d)
    const diaDoMes = Number(d.slice(8))
    gerarContasQueRepetem(db, relogio)

    // reajuste dos preços em 01/08 (Paleta e Pote)
    if (d === '2026-08-01') {
      for (const k of ['paletaMorango', 'poteMorango'] as const) {
        const r: DefReceita = RECEITAS[k]
        salvarReceita(db, relogio, receitaId[k], dadosReceita(r, REAJUSTE[r.categoria]!))
      }
    }
    // Gordurinha ligada em 01/10, contando desde o reajuste de 01/08
    if (d === '2026-10-01') {
      ligarGordurinha(db, relogio, { base: centavos(1_200_000), pct: 1000, desde: '2026-08-01' })
    }

    // produção: terça e sexta; na primavera também quarta
    if (semana === 2 || semana === 5 || (semana === 3 && mes >= '2026-09')) {
      const quantas = Math.max(3, Math.round(9 * ritmo + sorte() * 2 - 1))
      for (let i = 0; i < quantas; i++) {
        const k = sortearReceita()
        produzir(d, k, RECEITAS[k].categoria === 'Picolé' && sorte() < 0.5 ? 2 : 1)
      }
    }

    // pedidos do atacado (manhã)
    CLIENTES.forEach((c, i) => {
      if (!c.pede(d, Math.floor(n / 7))) return
      const itens = c.itens
        .filter(() => sorte() < 0.85)
        .map(([p, min, max]) => ({
          produtoId: produtoId[p],
          quantidade: Math.max(1, Math.round(entre(min, max) * (0.6 + ritmo * 0.4))),
          p
        }))
      if (itens.length === 0) return
      salvarPedido(db, relogio, null, {
        clienteId: clienteId[i]!,
        data: d,
        forma: c.forma,
        itens: itens.map(({ produtoId, quantidade }) => ({ produtoId, quantidade }))
      })
      anotarVenda(
        d,
        itens.reduce((a, x) => a + precoAtacado(x.p, d) * x.quantidade, 0)
      )
    })

    // contas do dia: energia com o valor do mês; paga o que vence hoje
    const vencendo = db
      .prepare(
        `SELECT id, nome, valor_centavos, vencimento, tipo_id, repete, avisar_dias FROM conta_pagar
         WHERE excluido_em IS NULL AND pago_em IS NULL AND vencimento <= ?
           AND id NOT IN (SELECT conta_id FROM manutencao WHERE conta_id IS NOT NULL)`
      )
      .all(d) as {
      id: number
      nome: string
      valor_centavos: number
      vencimento: string
      tipo_id: number
      repete: number
      avisar_dias: number
    }[]
    for (const c of vencendo) {
      if (SEM_PAGAR.has(`${c.nome}|${am(c.vencimento)}`)) continue
      if (c.nome === 'Energia elétrica' && ENERGIA[am(c.vencimento)]) {
        salvarConta(
          db,
          relogio,
          c.id,
          {
            nome: c.nome,
            valor: centavos(ENERGIA[am(c.vencimento)]! * 100),
            vencimento: c.vencimento,
            tipoId: c.tipo_id,
            repete: c.repete === 1,
            avisarDias: c.avisar_dias
          },
          null
        )
      }
      pagarConta(db, relogio, c.id, {
        forma: formaDa.get(c.nome) ?? 'pix',
        cartaoId: null,
        pagoEm: d
      })
    }

    // no dia 1: boletos dos fornecedores (compras do mês que passou) e o imposto do mês
    if (diaDoMes === 1 && d > INICIO) {
      const passado = mesAnterior(mes)
      for (const f of Object.keys(FORNECEDORES) as ChaveFornecedor[]) {
        const valor = compras.get(`${f}|${passado}`)
        if (!valor) continue
        const [ano, m] = passado.split('-')
        contaAvulsa(
          `${FORNECEDORES[f].nome} · compras de ${m}/${ano}`,
          'Fornecedor',
          valor,
          `${mes}-10`,
          'boleto'
        )
      }
    }
    if (diaDoMes === 2) {
      const base = faturamento.get(mesAnterior(mes)) ?? 3_200_000
      contaAvulsa(
        `Simples Nacional (DAS) · ${mesAnterior(mes).slice(5)}/${mes.slice(0, 4)}`,
        'Impostos',
        Math.round(base * 0.06),
        `${mes}-20`,
        'boleto'
      )
    }
    if (diaDoMes === 14) {
      const id = contaAvulsa(
        'Gás P45 (botijão da cozinha)',
        'Energia',
        entre(46, 52) * 1000,
        d,
        'pix'
      )
      pagarConta(db, relogio, id, { forma: 'pix', cartaoId: null, pagoEm: d })
    }

    // retiradas dos sócios
    if (diaDoMes === 6 || diaDoMes === 21) {
      const forte = mes >= '2026-09'
      salvarRetirada(db, relogio, null, {
        socioId: carlos.id,
        valor: centavos(forte ? 350_000 : 250_000),
        data: d,
        como: 'pix_empresa',
        motivo: ''
      })
      salvarRetirada(db, relogio, null, {
        socioId: paulo.id,
        valor: centavos(forte ? 230_000 : 170_000),
        data: d,
        como: 'pix_empresa',
        motivo: ''
      })
    }
    if (d === '2026-07-23' || d === '2026-09-30') {
      salvarRetirada(db, relogio, null, {
        socioId: carlos.id,
        valor: centavos(30_000),
        data: d,
        como: 'dinheiro_caixa',
        motivo: 'Farmácia'
      })
    }

    // patrimônio
    if (d === '2026-07-08') {
      salvarManutencao(
        db,
        relogio,
        null,
        {
          bemId: furgao,
          data: d,
          oQueFoiFeito: 'Troca de óleo e filtros',
          quemFez: 'Auto Center Silva',
          valor: centavos(38_000),
          garantiaDias: 90,
          tipo: 'revisao',
          vencimento: null
        },
        { forma: 'pix', cartaoId: null, pagoEm: d }
      )
    }
    if (d === '2026-08-19') {
      salvarManutencao(
        db,
        relogio,
        null,
        {
          bemId: maquina,
          data: d,
          oQueFoiFeito: 'Revisão e troca das borrachas',
          quemFez: 'Refrigeração Polo Norte',
          valor: centavos(52_000),
          garantiaDias: 180,
          tipo: 'revisao',
          vencimento: null
        },
        { forma: 'pix', cartaoId: null, pagoEm: d }
      )
    }
    if (d === '2026-10-22') {
      salvarManutencao(
        db,
        relogio,
        null,
        {
          bemId: freezer,
          data: d,
          oQueFoiFeito: 'Carga de gás e troca do termostato',
          quemFez: 'Refrigeração Polo Norte',
          valor: centavos(65_000),
          garantiaDias: 90,
          tipo: 'conserto',
          vencimento: '2026-11-05'
        },
        null
      )
    }

    // perdas
    if (d === '2026-07-14') {
      salvarPerda(db, relogio, null, {
        tipo: 'produto',
        data: d,
        clienteId: null,
        itens: [
          { id: receitaId.paletaMorango, quantidade: 12_000 },
          { id: receitaId.picoleChocolate, quantidade: 30_000 },
          { id: receitaId.poteCreme, quantidade: 3_000 }
        ],
        motivo: 'Derreteu',
        observacao: 'Faltou luz a tarde toda'
      })
    }
    if (diaDoMes === 9 && semana !== 0) {
      salvarPerda(db, relogio, null, {
        tipo: 'materia_prima',
        data: d,
        clienteId: null,
        itens: [{ id: itemId.morango, quantidade: entre(5, 15) * 100 }],
        motivo: 'Estragou',
        observacao: ''
      })
    }
    if (diaDoMes === 16) {
      salvarPerda(db, relogio, null, {
        tipo: 'troca',
        data: d,
        clienteId: clienteId[0]!,
        itens: [{ id: receitaId.picoleMorango, quantidade: entre(6, 15) * 1000 }],
        motivo: 'Venceu no cliente',
        observacao: ''
      })
    }
    if (d === '2026-09-24') {
      salvarPerda(db, relogio, null, {
        tipo: 'produto',
        data: d,
        clienteId: null,
        itens: [{ id: receitaId.poteChocolate, quantidade: 2_000 }],
        motivo: 'Quebrou ou amassou',
        observacao: 'Caiu da prateleira do freezer'
      })
    }

    // fechamento do balcão, à noite (o de hoje ainda não foi lançado)
    if (d < ULTIMO_DIA) {
      const fechada = semana === 1 && (mes === '2026-06' || mes === '2026-07')
      const pesoDoDia = [1.6, 0.7, 0.9, 0.9, 1.0, 1.2, 1.7][semana]!
      const frio = sorte() < 0.12 ? 0.6 : 1
      const total = fechada ? 0 : variar(1200 * ritmo * pesoDoDia * frio, 0.15)
      const dinheiro = em50(total * variar(0.22, 0.2))
      const debito = em50(total * variar(0.18, 0.2))
      const credito = em50(total * variar(0.2, 0.2))
      const pix = em50(total - (dinheiro + debito + credito) / 100)
      salvarFechamento(db, relogio, {
        data: d,
        lojaFechada: fechada,
        dinheiro,
        pix,
        debito,
        credito
      })
      anotarVenda(d, dinheiro + pix + debito + credito)
    }
  }

  const linhas = [
    'fechamento_balcao',
    'pedido',
    'producao',
    'entrada_mercadoria',
    'conta_pagar',
    'retirada',
    'perda',
    'manutencao',
    'auditoria'
  ].map((t) => `${t}: ${contar(db, t)}`)
  console.log(`Loja de exemplo pronta (${INICIO} a ${ULTIMO_DIA}).\n${linhas.join('\n')}`)
  for (const [mes, v] of faturamento) {
    console.log(`Vendas de ${mes}: R$ ${(v / 100).toFixed(2)}`)
  }
}
