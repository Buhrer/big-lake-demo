// "Editar insumo": mesmo formulário, com quantidade em estoque, custo e a validade de cada compra (D-036).
import { useState } from 'react'
import type { ItemEstoque } from '../../../compartilhado/contrato'
import {
  centavos,
  custoParaCentavos,
  type Centavos,
  type QuantidadeX1000
} from '../../../dominio/dinheiro'
import { formatarData, type DataISO } from '../../../dominio/datas'
import { custoDeReais, NOME_DA_MEDIDA, rotuloUnidade, type Unidade } from '../../../dominio/estoque'
import { formatarQuantidade } from '../../../dominio/formatar'
import {
  CampoData,
  CampoDinheiro,
  CampoQuantidade,
  CampoTexto,
  numeroErradoNaTela
} from '../../componentes/Campos'
import { Modal } from '../../componentes/Modal'
import { EscolhaTipoEMedida, ListaFornecedor } from './camposInsumo'
import { useUmaVezPorVez } from '../../componentes/umaVezPorVez'

export function ModalEditarInsumo({
  item,
  aoFechar,
  aoSalvar
}: {
  item: ItemEstoque
  aoFechar(): void
  aoSalvar(): void | Promise<void>
}) {
  const [tipo, setTipo] = useState(item.tipo)
  const [unidade, setUnidade] = useState<Unidade>(item.unidade)
  const [nomeUnidade, setNomeUnidade] = useState(item.nomeUnidade ?? '')
  const [nome, setNome] = useState(item.nome)
  const [quantidade, setQuantidade] = useState<QuantidadeX1000 | null>(item.quantidade)
  const [custo, setCusto] = useState<Centavos | null>(custoParaCentavos(item.custo))
  const [fornecedorId, setFornecedorId] = useState(item.fornecedorId)
  const [minimo, setMinimo] = useState<QuantidadeX1000 | null>(item.minimo)
  const [validades, setValidades] = useState<Record<number, DataISO | null>>(
    Object.fromEntries(item.lotes.map((l) => [l.id, l.validade]))
  )
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const rotulo = rotuloUnidade(unidade, nomeUnidade || null)
  // Custo com 4 casas: se não mexeu no valor, mantém as 4 casas originais.
  const custoX10000 =
    custo === null
      ? null
      : custo === custoParaCentavos(item.custo)
        ? item.custo
        : custoDeReais(custo)

  const erros = {
    nome: !nome.trim() ? 'Digite o nome.' : undefined,
    quantidade: quantidade === null ? 'Digite a quantidade em estoque.' : undefined,
    custo: custo === null ? 'Digite o custo.' : undefined,
    minimo: minimo === null ? 'Digite o estoque mínimo (pode ser 0).' : undefined
  }

  const salvarUmaVez = useUmaVezPorVez(salvar)
  async function salvar() {
    const errado = numeroErradoNaTela()
    if (errado) return setErro(errado)
    setTentou(true)
    if (Object.values(erros).some(Boolean) || quantidade === null || custoX10000 === null) return
    const r = await window.api.estoque.editar(item.id, {
      tipo,
      unidade,
      nomeUnidade: unidade === 'un' ? nomeUnidade.trim() || null : null,
      nome,
      quantidade,
      custo: custoX10000,
      fornecedorId,
      minimo: minimo ?? 0,
      validades: item.lotes.map((l) => ({ loteId: l.id, validade: validades[l.id] ?? null }))
    })
    if (!r.ok) return setErro(r.mensagem)
    await aoSalvar()
  }

  const mostrar = (e: string | undefined) => (tentou ? e : undefined)

  return (
    <Modal
      titulo="Editar insumo"
      editando="Editando um cadastro"
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="btn" onClick={() => void salvarUmaVez()}>
            Salvar alterações
          </button>
          <button type="button" className="btn2" onClick={aoFechar}>
            Cancelar
          </button>
        </>
      }
    >
      <EscolhaTipoEMedida
        tipo={tipo}
        unidade={unidade}
        aoMudarTipo={setTipo}
        aoMudarUnidade={setUnidade}
      />
      <div className="campos linha-2">
        <CampoTexto rotulo="Nome" valor={nome} aoMudar={setNome} erro={mostrar(erros.nome)} />
        {unidade === 'un' ? (
          <CampoTexto
            rotulo="Nome da unidade (opcional)"
            valor={nomeUnidade}
            aoMudar={setNomeUnidade}
            placeholder="ex.: lata, pacote"
          />
        ) : (
          <ListaFornecedor valor={fornecedorId} aoEscolher={setFornecedorId} />
        )}
      </div>
      <div className="campos linha-3-iguais">
        <CampoQuantidade
          rotulo={`Quantidade em estoque (${rotulo})`}
          valor={quantidade}
          aoMudar={setQuantidade}
          erro={mostrar(erros.quantidade)}
        />
        <CampoDinheiro
          rotulo={`Custo por ${NOME_DA_MEDIDA[unidade]} (R$)`}
          valor={custo === null ? null : centavos(custo)}
          aoMudar={setCusto}
          erro={mostrar(erros.custo)}
        />
        <CampoQuantidade
          rotulo={`Estoque mínimo (${rotulo})`}
          valor={minimo}
          aoMudar={setMinimo}
          erro={mostrar(erros.minimo)}
        />
      </div>
      {unidade === 'un' && (
        <div className="campos linha-2">
          <ListaFornecedor valor={fornecedorId} aoEscolher={setFornecedorId} />
          <span />
        </div>
      )}

      <h3 className="subtitulo-modal">Validade de cada compra</h3>
      {item.lotes.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Nenhuma compra com saldo no estoque.
        </p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Compra</th>
              <th className="num">Ainda tem</th>
              <th>Validade</th>
            </tr>
          </thead>
          <tbody>
            {item.lotes.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.compradoEm ? `Comprada em ${formatarData(l.compradoEm)}` : 'Ajuste no estoque'}
                </td>
                <td className="num">
                  {formatarQuantidade(l.quantidade)} {item.rotulo}
                </td>
                <td>
                  <CampoData
                    rotulo={`Validade da compra de ${l.compradoEm ? formatarData(l.compradoEm) : 'ajuste'}`}
                    valor={validades[l.id] ?? null}
                    aoMudar={(v) => setValidades((atual) => ({ ...atual, [l.id]: v }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ margin: 0 }}>
        Diminuir a quantidade tira primeiro das compras que vencem antes.
      </p>
      {erro && (
        <div className="faixa erro" role="alert">
          {erro}
        </div>
      )}
    </Modal>
  )
}
