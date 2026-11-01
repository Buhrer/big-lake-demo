// Ícones de traço copiados do protótipo (prototipo/fonte/01-Inicio.dc.html).
import type { ReactElement } from 'react'

const caminhos = {
  pedido: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  picole: (
    <>
      <path d="M7 7a5 5 0 0110 0v9H7z" />
      <path d="M12 16v6M10 8v4" />
    </>
  ),
  inicio: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  vendas: (
    <>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M7 8V4h10v4M7 14h4" />
    </>
  ),
  cadastros: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 010 8M22 21c0-3-2-5-4-6" />
    </>
  ),
  producao: (
    <>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 2h6v4H9zM9 13l2 2 4-4" />
    </>
  ),
  estoque: <path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10" />,
  perdas: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  contas: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  socios: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9h9" />
    </>
  ),
  patrimonio: <path d="M4 21V5l8-3 8 3v16M9 21v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />,
  relatorios: <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />,
  certo: <path d="M5 12l4 4 10-10" />,
  alerta: <path d="M12 3l10 18H2zM12 10v5M12 18h.01" />,
  lixeira: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
} satisfies Record<string, ReactElement>

export type NomeIcone = keyof typeof caminhos

export function Icone({ nome, className = 'ic' }: { nome: NomeIcone; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {caminhos[nome]}
    </svg>
  )
}

export function LogoBigLake() {
  return (
    <svg width="44" height="52" viewBox="0 0 48 56" aria-hidden="true">
      <path
        d="M12 24 L24 54 L36 24 Z"
        fill="#C68B3E"
        stroke="#2A1E10"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M16 31 L32 31 M19 39 L29 39" stroke="#2A1E10" strokeWidth="2" />
      <circle cx="24" cy="16" r="13" fill="#C62828" stroke="#2A1E10" strokeWidth="2.5" />
      <circle cx="19" cy="11" r="3" fill="#FFFFFF" opacity="0.7" />
    </svg>
  )
}
