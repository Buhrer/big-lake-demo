# 04 · Modelo de dados (sugestão)

> Este é um **ponto de partida** para o DBA/Arquiteto. Ajuste nomes e tipos à stack escolhida e registre as mudanças em `DECISOES.md`. Convenções sugeridas: `id` inteiro autoincremento; `criado_em`/`alterado_em` (data e hora); `excluido_em` para exclusão lógica (permite **Desfazer**); dinheiro em **centavos (inteiro)**; custos unitários com 4 casas (inteiro em décimos de milésimo, ou decimal exato).

## Diagrama (resumo)

```
categoria 1─N produto N─1 receita 1─N receita_ingrediente N─1 item_estoque N─1 fornecedor
                               receita 1─N receita_embalagem  N─1 item_estoque
item_estoque 1─N movimento_estoque (entrada | producao | perda | ajuste)
item_estoque 1─N historico_custo
cliente 1─N pedido 1─N pedido_item N─1 produto
fechamento_balcao (1 por dia)
conta_pagar N─1 tipo_conta ; conta_pagar N─1 cartao (opcional) ; cartao N─1 socio (dono, opcional = empresa)
socio 1─N retirada
perda 1─N perda_item ; perda N─1 cliente (só troca)
producao N─1 receita
bem N─1 tipo_bem ; bem 1─N manutencao 1─1 conta_pagar
reajuste_precos (snapshots para a Gordurinha)
config, auditoria, backup_registro
```

## Tabelas

### Cadastros
| Tabela | Campos principais |
|---|---|
| `cliente` | nome, telefone, documento (CPF/CNPJ), rua, numero, bairro, cidade, observacao |
| `fornecedor` | nome (razão social), telefone, documento, contato, o_que_fornece |
| `categoria` | nome, preco_balcao_centavos, preco_atacado_centavos, ordem, ativa |
| `historico_preco_categoria` | categoria_id, data, preco_balcao_antes/depois, preco_atacado_antes/depois |
| `produto` | categoria_id, nome, vendido_como (unidade/pote/copo/caixa), medida_qtd, medida_unidade (g/kg/ml/L), receita_id, unidades_por_embalagem (ex.: caixa com 20) |

### Estoque e receitas
| Tabela | Campos principais |
|---|---|
| `item_estoque` | nome, tipo (materia_prima/insumo/custo_indireto), unidade (un/L/kg/lata/vez), fornecedor_id, quantidade_atual, estoque_minimo, custo_unitario_atual, validade (opcional), controla_estoque (falso para "Gás e energia") |
| `historico_custo` | item_estoque_id, data, custo_antes, custo_depois, origem (entrada/edição) |
| `movimento_estoque` | item_estoque_id, data, tipo (entrada/producao/perda/ajuste), quantidade (+/−), valor_total, referencia (id da produção/perda/entrada) |
| `entrada_mercadoria` | data, fornecedor_id, item_estoque_id, quantidade, valor_pago, validade, conta_pagar_id (opcional) |
| `receita` | nome, categoria_id, rendimento, unidade_rendimento (paleta, pote…) |
| `receita_ingrediente` | receita_id, item_estoque_id, quantidade |
| `receita_embalagem` | receita_id, item_estoque_id, quantidade_por_unidade (normalmente 1) |
| `producao` | data, receita_id, quantidade_produzida, custo_total_centavos (retrato do dia) |

### Vendas
| Tabela | Campos principais |
|---|---|
| `fechamento_balcao` | data (única), dinheiro, pix, debito, credito, taxa_debito_pct, taxa_credito_pct (retrato das taxas do dia) |
| `config_maquininha` | taxa_debito_pct, dias_debito, taxa_credito_pct, dias_credito, vigente_desde |
| `pedido` | numero (sequencial, único), data, cliente_id, forma_pagamento, total_centavos, taxa_centavos |
| `pedido_item` | pedido_id, produto_id, quantidade, preco_unitario_centavos (retrato do preço de atacado) |

### Financeiro
| Tabela | Campos principais |
|---|---|
| `tipo_conta` | nome, ativo |
| `conta_pagar` | descricao, valor_centavos, vencimento, tipo_conta_id, repete_mensal, dias_aviso, origem (manual/manutencao/entrada), conta_origem_id (da recorrência) |
| `pagamento_conta` | conta_pagar_id, data, forma (dinheiro/pix/boleto/transferencia/debito/credito), cartao_id |
| `cartao` | nome, dono_socio_id (nulo = empresa), ativo |
| `socio` | nome, percentual (somando 100) |
| `historico_percentual` | data, percentuais (para recalcular meses antigos corretamente) |
| `retirada` | socio_id, data, valor_centavos, como (pix_empresa/dinheiro_caixa), motivo |

### Perdas e patrimônio
| Tabela | Campos principais |
|---|---|
| `perda` | data, tipo (produto/materia_prima/troca), cliente_id (troca), motivo, observacao |
| `perda_item` | perda_id, produto_id ou item_estoque_id, quantidade, valor_unitario_centavos (retrato do custo) |
| `tipo_bem` | nome |
| `bem` | nome, tipo_bem_id, data_compra (mês/ano), valor_pago_centavos, identificacao (placa/série) |
| `manutencao` | bem_id, data, o_que_foi_feito, quem_fez, valor_centavos, garantia_dias, tipo (revisao/conserto), conta_pagar_id |

### Gordurinha
| Tabela | Campos principais |
|---|---|
| `config_gordurinha` | base_centavos, percentual, base_automatica (sim/não) |
| `reajuste_precos` | data, base_usada, percentual_usado, observacao |
| `reajuste_snapshot_custo` | reajuste_id, item_estoque_id, custo_unitario, consumo_medio_mensal |
| `reajuste_snapshot_conta_fixa` | reajuste_id, tipo_conta_id ou descrição, valor_mensal |

### Sistema
| Tabela | Campos principais |
|---|---|
| `empresa` | nome, cnpj, telefone, endereco |
| `preferencias` | tamanho_letra (normal/grande/muito_grande), ajuda_ligada, backup_automatico, pasta_backup |
| `auditoria` | data_hora, modulo, acao (criar/alterar/excluir/desfazer), descricao_legivel, dados_antes (JSON), dados_depois (JSON) |
| `backup_registro` | data_hora, destino, arquivo, status |
| `versao_esquema` | controle de migrações |

## Regras de integridade importantes

- Pedido, fechamento, perda e produção guardam **retratos** (preço ou custo do dia). Mudar preço ou custo depois **não altera o passado**.
- Itens usados não podem ser excluídos fisicamente: usar `excluido_em` e bloquear a remoção com a mensagem "em uso · N".
- `fechamento_balcao.data` é única; `pedido.numero` é único e sequencial.
- Toda operação que mexe em mais de uma tabela (registrar produção, salvar pedido, pagar conta, salvar manutenção) roda **em uma transação**.
