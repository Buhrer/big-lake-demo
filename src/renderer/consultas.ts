// Leituras do processo principal, com cache (TanStack Query).
// Depois de gravar, invalide a chave para a tela atualizar sozinha.
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FiltroHistorico } from '../compartilhado/contrato'
import { useEffect } from 'react'

export const CHAVES = {
  backup: ['backup'],
  copias: ['copias'],
  historico: ['historico'],
  empresa: ['empresa'],
  clientes: ['clientes'],
  fornecedores: ['fornecedores'],
  estoque: ['estoque'],
  categorias: ['categorias'],
  receitas: ['receitas'],
  gas: ['gas'],
  produtos: ['produtos'],
  avisosCusto: ['avisos-custo'],
  taxas: ['taxas'],
  fechamentos: ['fechamentos'],
  fechamentoDoDia: ['fechamento-do-dia'],
  resumoVendas: ['resumo-vendas'],
  pedidos: ['pedidos'],
  contas: ['contas'],
  avisosContas: ['avisos-contas'],
  tiposConta: ['tipos-conta'],
  cartoes: ['cartoes'],
  socios: ['socios'],
  mesSocios: ['mes-socios'],
  regrasLucro: ['regras-lucro'],
  producoes: ['producoes'],
  perdas: ['perdas'],
  tiposBem: ['tipos-bem'],
  bens: ['bens'],
  manutencoes: ['manutencoes'],
  gordurinha: ['gordurinha']
} as const

export function useEstadoBackup() {
  const cliente = useQueryClient()
  useEffect(
    () =>
      window.api.backup.aoTerminarCopia(() => {
        void cliente.invalidateQueries({ queryKey: CHAVES.backup })
      }),
    [cliente]
  )
  return useQuery({
    queryKey: CHAVES.backup,
    queryFn: () => window.api.backup.estado(),
    refetchInterval: 60_000
  })
}

/** Os históricos mantêm a lista na tela enquanto o "Ver mais" busca (D-085). */
export function useHistorico(filtro: FiltroHistorico) {
  return useQuery({
    queryKey: [...CHAVES.historico, filtro],
    queryFn: () => window.api.historico.listar(filtro),
    placeholderData: keepPreviousData
  })
}

export function useEmpresa() {
  return useQuery({ queryKey: CHAVES.empresa, queryFn: () => window.api.empresa.obter() })
}

export function useCopias(ativo: boolean) {
  return useQuery({
    queryKey: CHAVES.copias,
    queryFn: () => window.api.backup.listarCopias(),
    enabled: ativo
  })
}

export function useClientes() {
  return useQuery({ queryKey: CHAVES.clientes, queryFn: () => window.api.clientes.listar() })
}

export function useFornecedores() {
  return useQuery({
    queryKey: CHAVES.fornecedores,
    queryFn: () => window.api.fornecedores.listar()
  })
}

export function useItensEstoque() {
  return useQuery({ queryKey: CHAVES.estoque, queryFn: () => window.api.estoque.listar() })
}

export function useCategorias() {
  return useQuery({ queryKey: CHAVES.categorias, queryFn: () => window.api.categorias.listar() })
}

export function useReceitas() {
  return useQuery({ queryKey: CHAVES.receitas, queryFn: () => window.api.receitas.listar() })
}

export function useGasEnergia() {
  return useQuery({ queryKey: CHAVES.gas, queryFn: () => window.api.gasEnergia.obter() })
}

export function useTaxas() {
  return useQuery({ queryKey: CHAVES.taxas, queryFn: () => window.api.vendas.taxas() })
}

export function useFechamentos(filtro: FiltroHistorico) {
  return useQuery({
    queryKey: [...CHAVES.fechamentos, filtro],
    queryFn: () => window.api.vendas.fechamentos(filtro),
    placeholderData: keepPreviousData
  })
}

export function useFechamentoDoDia(data: string | null) {
  return useQuery({
    queryKey: [...CHAVES.fechamentoDoDia, data],
    queryFn: () => window.api.vendas.fechamento(data!),
    enabled: data !== null
  })
}

export function useResumoVendas() {
  return useQuery({ queryKey: CHAVES.resumoVendas, queryFn: () => window.api.vendas.resumo() })
}

/** "Vendas por dia" do Resumo (D-086); a chave fica sob o resumo para atualizar junto. */
export function useVendasPorDia(filtro: FiltroHistorico) {
  return useQuery({
    queryKey: [...CHAVES.resumoVendas, 'por-dia', filtro],
    queryFn: () => window.api.vendas.porDia(filtro),
    placeholderData: keepPreviousData
  })
}

export function useHistoricoPedidos(filtro: FiltroHistorico) {
  return useQuery({
    queryKey: [...CHAVES.pedidos, 'historico', filtro],
    queryFn: () => window.api.pedidos.historico(filtro),
    placeholderData: keepPreviousData
  })
}

export function usePedidos(anoMes: string) {
  return useQuery({
    queryKey: [...CHAVES.pedidos, anoMes],
    queryFn: () => window.api.pedidos.listar(anoMes)
  })
}

export function useContas() {
  return useQuery({ queryKey: CHAVES.contas, queryFn: () => window.api.contas.listar() })
}

/** Bolinha vermelha do menu; olha de novo a cada 10 minutos (a conta do mês nasce no dia 1º). */
export function useAvisosContas() {
  return useQuery({
    queryKey: CHAVES.avisosContas,
    queryFn: () => window.api.contas.avisos(),
    refetchInterval: 600_000
  })
}

export function useTiposConta() {
  return useQuery({ queryKey: CHAVES.tiposConta, queryFn: () => window.api.tiposConta.listar() })
}

export function useCartoes() {
  return useQuery({ queryKey: CHAVES.cartoes, queryFn: () => window.api.cartoes.listar() })
}

export function useSocios() {
  return useQuery({ queryKey: CHAVES.socios, queryFn: () => window.api.socios.listar() })
}

export function useMesDosSocios(anoMes: string) {
  return useQuery({
    queryKey: [...CHAVES.mesSocios, anoMes],
    queryFn: () => window.api.socios.mes(anoMes)
  })
}

export function useRegrasLucro() {
  return useQuery({ queryKey: CHAVES.regrasLucro, queryFn: () => window.api.regrasLucro.obter() })
}

export function useProducoes(anoMes: string) {
  return useQuery({
    queryKey: [...CHAVES.producoes, anoMes],
    queryFn: () => window.api.producao.listar(anoMes)
  })
}

export function usePerdas(anoMes: string) {
  return useQuery({
    queryKey: [...CHAVES.perdas, anoMes],
    queryFn: () => window.api.perdas.listar(anoMes)
  })
}

export function useTiposBem() {
  return useQuery({ queryKey: CHAVES.tiposBem, queryFn: () => window.api.patrimonio.tipos() })
}

export function useBens() {
  return useQuery({ queryKey: CHAVES.bens, queryFn: () => window.api.patrimonio.bens() })
}

export function useManutencoes() {
  return useQuery({
    queryKey: CHAVES.manutencoes,
    queryFn: () => window.api.patrimonio.manutencoes()
  })
}

export function useGordurinha() {
  return useQuery({ queryKey: CHAVES.gordurinha, queryFn: () => window.api.gordurinha.obter() })
}
