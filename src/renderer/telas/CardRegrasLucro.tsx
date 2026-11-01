// "Como contar o lucro" (D-033): as escolhas do cliente, com a nossa sugestão como padrão.
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { REGRAS_PADRAO, type RegrasLucro } from '../../dominio/socios'
import { Ajuda } from '../componentes/Ajuda'
import { CHAVES, useRegrasLucro } from '../consultas'
import { AJUDA } from '../textos/ajuda'

type Perguntas = {
  [K in keyof RegrasLucro]: { pergunta: string; opcoes: [RegrasLucro[K], string][] }
}

const PERGUNTAS: Perguntas = {
  despesa: {
    pergunta: 'Em que mês uma conta entra nas despesas?',
    opcoes: [
      ['pagamento', 'No mês em que foi paga'],
      ['vencimento', 'No mês do vencimento']
    ]
  },
  credito: {
    pergunta: 'Venda no cartão de crédito conta em que mês?',
    opcoes: [
      ['venda', 'No mês da venda'],
      ['quando_cai', 'No mês em que o dinheiro cai na conta']
    ]
  },
  taxas: {
    pergunta: 'Taxas da maquininha',
    opcoes: [
      ['despesa', 'Aparecem como despesa, numa linha só delas'],
      ['descontar', 'As vendas já contam sem as taxas']
    ]
  },
  prejuizo: {
    pergunta: 'Quando o mês dá prejuízo',
    opcoes: [
      ['nao_dividir', 'Mostrar e não dividir'],
      ['dividir', 'Dividir o prejuízo entre os sócios'],
      ['levar', 'Levar para o mês seguinte']
    ]
  }
}

export function CardRegrasLucro() {
  const cliente = useQueryClient()
  const { data: regras } = useRegrasLucro()
  const [erro, setErro] = useState<string | null>(null)
  if (!regras) return null

  async function escolher<K extends keyof RegrasLucro>(chave: K, valor: RegrasLucro[K]) {
    if (!regras) return
    setErro(null)
    const r = await window.api.regrasLucro.salvar({ ...regras, [chave]: valor })
    if (!r.ok) return setErro(r.mensagem)
    for (const c of [CHAVES.regrasLucro, CHAVES.mesSocios, CHAVES.historico]) {
      await cliente.invalidateQueries({ queryKey: c })
    }
  }

  return (
    <section className="card config-card" aria-labelledby="titulo-regras-lucro">
      <div className="hrow">
        <h2 id="titulo-regras-lucro">Como contar o lucro</h2>
        <Ajuda texto={AJUDA.regrasLucro} />
      </div>
      {(Object.keys(PERGUNTAS) as (keyof RegrasLucro)[]).map((chave) => {
        const p = PERGUNTAS[chave] as { pergunta: string; opcoes: [string, string][] }
        const id = `regra-${chave}`
        return (
          <div key={chave} className="regra-lucro">
            <strong id={id}>{p.pergunta}</strong>
            <div
              className={p.opcoes.length === 3 ? 'opcoes opcoes-3' : 'opcoes opcoes-2'}
              role="radiogroup"
              aria-labelledby={id}
            >
              {p.opcoes.map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={regras[chave] === valor}
                  className={regras[chave] === valor ? 'opt on' : 'opt'}
                  onClick={() => void escolher(chave, valor as never)}
                >
                  {rotulo}
                  {REGRAS_PADRAO[chave] === valor && <small>nossa sugestão</small>}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </section>
  )
}
