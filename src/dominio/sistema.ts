// Regras do "sistema": preferências, cópias de segurança e frases do histórico.
import {
  dataDe,
  descreverQuando,
  diferencaEmDias,
  formatarData,
  lerData,
  somarDias,
  type DataHoraISO,
  type DataISO
} from './datas'

// ---------- Preferências ----------

export type TamanhoLetra = 'pequena' | 'normal' | 'grande' | 'muito_grande'

/** D-023 e D-054: Pequena 90%, Normal 100%, Grande 115%, Muito grande 130%. */
export const TAMANHOS_LETRA: Record<TamanhoLetra, { rotulo: string; escala: number }> = {
  pequena: { rotulo: 'Pequena', escala: 90 },
  normal: { rotulo: 'Normal', escala: 100 },
  grande: { rotulo: 'Grande', escala: 115 },
  muito_grande: { rotulo: 'Muito grande', escala: 130 }
}

export interface Preferencias {
  tamanhoPadrao: TamanhoLetra
  ajudaLigada: boolean
  /** "Copiar sozinho ao fechar o sistema" (pasta + pen drive). */
  backupAoFechar: boolean
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  tamanhoPadrao: 'normal',
  ajudaLigada: true,
  backupAoFechar: true
}

export interface Empresa {
  nome: string
  cnpj: string
  telefone: string
  endereco: string
}

export const EMPRESA_PADRAO: Empresa = {
  nome: 'Big Lake Sorveteria',
  cnpj: '',
  telefone: '',
  endereco: ''
}

/** Frases do histórico. A ajuda ligada/desligada é preferência de tela e não entra. */
export function textosPreferencias(antes: Preferencias, depois: Preferencias): string[] {
  const textos: string[] = []
  if (antes.tamanhoPadrao !== depois.tamanhoPadrao) {
    textos.push(
      `Mudou o tamanho padrão da letra: ${TAMANHOS_LETRA[antes.tamanhoPadrao].rotulo} → ${TAMANHOS_LETRA[depois.tamanhoPadrao].rotulo}`
    )
  }
  if (antes.backupAoFechar !== depois.backupAoFechar) {
    textos.push(
      `${depois.backupAoFechar ? 'Ligou' : 'Desligou'} a cópia automática ao fechar o sistema`
    )
  }
  return textos
}

const CAMPOS_EMPRESA: [keyof Empresa, string][] = [
  ['nome', 'nome'],
  ['cnpj', 'CNPJ'],
  ['telefone', 'telefone'],
  ['endereco', 'endereço']
]

export function textosEmpresa(antes: Empresa, depois: Empresa): string | null {
  const mudancas = CAMPOS_EMPRESA.filter(([c]) => antes[c] !== depois[c]).map(
    ([c, rotulo]) => `${rotulo} ${antes[c] || '(vazio)'} → ${depois[c] || '(vazio)'}`
  )
  return mudancas.length ? `Mudou os dados da empresa: ${mudancas.join('; ')}` : null
}

// ---------- Cópias de segurança ----------

/** Ficam sempre as 10 cópias mais novas e, além delas, a mais nova de cada dia dos últimos 30 dias (D-094). */
export const COPIAS_MAIS_NOVAS = 10
export const DIAS_COM_COPIA = 30
/** Depois disso sem cópia no pen drive, a barra do topo avisa (D-027). */
export const DIAS_SEM_PEN_DRIVE = 7

// O sufixo _2, _3… separa cópias feitas no mesmo segundo (nunca sobrescrever uma cópia).
const PADRAO_NOME = /^biglake_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})(\d{2})(?:_(\d+))?\.db$/

export function nomeArquivoCopia(dataHora: DataHoraISO, numero = 1): string {
  const hora = dataHora.slice(11, 19).replace(/:/g, '')
  return `biglake_${dataDe(dataHora)}_${hora}${numero > 1 ? `_${numero}` : ''}.db`
}

/** Data e hora (local, sem fuso) a partir do nome do arquivo; null se não for uma cópia. */
export function dataHoraDoNome(nome: string): DataHoraISO | null {
  const m = PADRAO_NOME.exec(nome)
  if (!m || !m[1]) return null
  const [ano, mes, dia] = m[1].split('-')
  if (!lerData(`${dia}/${mes}/${ano}`)) return null
  if (Number(m[2]) > 23 || Number(m[3]) > 59 || Number(m[4]) > 59) return null
  return `${m[1]}T${m[2]}:${m[3]}:${m[4]}`
}

/** Ordena nomes de cópia da mais nova para a mais antiga (data, hora e depois _2, _3…, _10). */
export function compararCopiasMaisNovaPrimeiro(a: string, b: string): number {
  const porData = (dataHoraDoNome(b) ?? '').localeCompare(dataHoraDoNome(a) ?? '')
  if (porData !== 0) return porData
  return Number(PADRAO_NOME.exec(b)?.[5] ?? 1) - Number(PADRAO_NOME.exec(a)?.[5] ?? 1)
}

/**
 * Quais cópias apagar (D-094): ficam as 10 mais novas e a mais nova de cada dia dos
 * últimos 30 dias. Assim, abrir e fechar várias vezes no dia não empurra para fora as
 * cópias das semanas anteriores. Cópias com data depois de hoje (relógio atrasado) ficam.
 */
export function copiasParaApagar(nomes: readonly string[], hoje: DataISO): string[] {
  const copias = nomes
    .filter((n) => dataHoraDoNome(n) !== null)
    .sort(compararCopiasMaisNovaPrimeiro)
  const primeiroDia = somarDias(hoje, -(DIAS_COM_COPIA - 1))
  const diasJaGuardados = new Set<DataISO>()
  return copias.filter((nome, i) => {
    const dia = dataDe(dataHoraDoNome(nome)!)
    const primeiraDoDia = !diasJaGuardados.has(dia)
    diasJaGuardados.add(dia)
    if (i < COPIAS_MAIS_NOVAS) return false
    return !(primeiraDoDia && dia >= primeiroDia)
  })
}

export interface AvisoBackup {
  nivel: 'ok' | 'atencao' | 'erro'
  texto: string
}

export function avisoDoBackup(
  estado: { ultima: DataHoraISO | null; ultimaNoPenDrive: DataHoraISO | null },
  hoje: DataISO
): AvisoBackup {
  if (!estado.ultima) {
    return { nivel: 'erro', texto: 'Ainda não foi feita nenhuma cópia de segurança.' }
  }
  const dica = 'Conecte o pen drive e toque em "Fazer cópia agora".'
  if (!estado.ultimaNoPenDrive) {
    return { nivel: 'atencao', texto: `Ainda não há cópia no pen drive. ${dica}` }
  }
  const dias = diferencaEmDias(dataDe(estado.ultimaNoPenDrive), hoje)
  if (dias > DIAS_SEM_PEN_DRIVE) {
    return { nivel: 'atencao', texto: `Faz ${dias} dias que não há cópia no pen drive. ${dica}` }
  }
  const quando = descreverQuando(estado.ultima, hoje)
  return {
    nivel: 'ok',
    texto: `Cópia de segurança feita ${quando.charAt(0).toLowerCase()}${quando.slice(1)}`
  }
}

/**
 * Relógio do computador atrasado (D-093): hoje é antes do último dia em que o programa
 * foi usado. Lançar assim poria as vendas no dia errado. `ultimoUso` = a cópia mais nova.
 */
export function avisoDataDoComputador(hoje: DataISO, ultimoUso: DataHoraISO | null): string | null {
  if (!ultimoUso || hoje >= dataDe(ultimoUso)) return null
  return `A data do computador parece errada: hoje está ${formatarData(hoje)}, mas o programa já foi usado em ${formatarData(dataDe(ultimoUso))}. Confira o dia no relógio do Windows (no canto de baixo da tela) antes de lançar as vendas.`
}
