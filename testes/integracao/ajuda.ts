import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Relogio } from '../../src/main/relogio'
import type { Caminhos } from '../../src/main/sistema'

/** Relógio de teste: hoje = 16/10/2026; cada chamada de agora() anda 1 minuto. */
export function relogioDeTeste(
  inicio = '2026-10-16T08:00'
): Relogio & { avancarDias(n: number): void } {
  let minutos = 0
  let dias = 0
  const base = new Date(`${inicio}:00Z`)
  const relogio = {
    hoje: () => relogio.agora().slice(0, 10),
    agora: () => {
      const d = new Date(base.getTime() + (dias * 1440 + minutos++) * 60_000)
      return d.toISOString().slice(0, 19) + '-03:00'
    },
    avancarDias: (n: number) => {
      dias += n
    }
  }
  return relogio
}

export function pastaTemporaria(prefixo = 'biglake-teste-'): string {
  return mkdtempSync(join(tmpdir(), prefixo))
}

export function caminhosDeTeste(): Caminhos {
  const raiz = pastaTemporaria()
  return { banco: join(raiz, 'biglake.db'), copias: join(raiz, 'Documentos', 'BigLake', 'Backups') }
}

/** Tira as categorias que já vêm no sistema (D-062), para o teste começar sem nenhuma. */
export function semCategoriasIniciais(db: { exec(sql: string): void }): void {
  db.exec('DELETE FROM categoria')
}
