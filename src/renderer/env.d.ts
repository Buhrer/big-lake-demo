import type { ApiBigLake } from '../compartilhado/contrato'

declare global {
  interface Window {
    api: ApiBigLake
  }
}
