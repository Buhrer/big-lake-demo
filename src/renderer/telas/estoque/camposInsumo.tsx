// Partes do formulário de insumo usadas no cadastro e no Editar.
import type { TipoInsumo, Unidade } from '../../../dominio/estoque'
import { Ajuda } from '../../componentes/Ajuda'
import { ListaSuspensa } from '../../componentes/ListaSuspensa'
import { useFornecedores } from '../../consultas'
import { AJUDA } from '../../textos/ajuda'

const TIPOS: [TipoInsumo, string, string][] = [
  ['materia_prima', 'Matéria-prima', 'leite, fruta, açúcar'],
  ['insumo', 'Insumo', 'pote, palito, saquinho']
]

const MEDIDAS: [Unidade, string, string][] = [
  ['un', 'Unidade', 'un'],
  ['L', 'Litro', 'L'],
  ['kg', 'Quilo', 'kg']
]

export function EscolhaTipoEMedida({
  tipo,
  unidade,
  aoMudarTipo,
  aoMudarUnidade
}: {
  tipo: TipoInsumo
  unidade: Unidade
  aoMudarTipo(t: TipoInsumo): void
  aoMudarUnidade(u: Unidade): void
}) {
  return (
    <div className="campos linha-2">
      <div className="campo">
        <span className="lb" id="rotulo-tipo">
          É matéria-prima ou insumo?
        </span>
        <div className="opcoes opcoes-2" role="radiogroup" aria-labelledby="rotulo-tipo">
          {TIPOS.map(([v, rotulo, sub]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={tipo === v}
              className={tipo === v ? 'opt on' : 'opt'}
              onClick={() => aoMudarTipo(v)}
            >
              {rotulo}
              <small>{sub}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="campo">
        <span className="lb" id="rotulo-medida">
          Como é medido? <Ajuda texto={AJUDA.comoEMedido} />
        </span>
        <div className="opcoes opcoes-3" role="radiogroup" aria-labelledby="rotulo-medida">
          {MEDIDAS.map(([v, rotulo, sub]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={unidade === v}
              className={unidade === v ? 'opt on' : 'opt'}
              onClick={() => aoMudarUnidade(v)}
            >
              {rotulo}
              <small>{sub}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Lista de fornecedores com a opção "Nenhum" (valor 0). */
export function ListaFornecedor({
  valor,
  aoEscolher
}: {
  valor: number | null
  aoEscolher(id: number | null): void
}) {
  const { data: fornecedores = [] } = useFornecedores()
  return (
    <ListaSuspensa<number>
      rotulo="Fornecedor"
      opcoes={[
        { valor: 0, rotulo: 'Nenhum' },
        ...fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))
      ]}
      valor={valor ?? 0}
      aoEscolher={(v) => aoEscolher(v === 0 ? null : v)}
    />
  )
}
