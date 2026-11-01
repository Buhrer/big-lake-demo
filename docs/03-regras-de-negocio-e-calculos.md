# 03 · Regras de negócio e cálculos

> Todos os cálculos de dinheiro devem ficar num **módulo puro, separado da interface e testado**. Valores em centavos ou decimal exato; nunca `float`. Custos unitários com 4 casas; exibição com 2 casas (arredondamento "meio para cima"). Os números de exemplo abaixo também estão em `08-qa-plano-de-testes.md`.
>
> Onde estiver escrito **[DECIDIR]**, a regra ainda precisa ser confirmada (ver `07-perguntas-em-aberto.md`).

---

## R1. Preço fixo por categoria

- Cada **categoria** tem **preço de balcão** e **preço de atacado**. Todos os produtos da categoria usam esses preços, seja qual for o sabor.
- Preços do protótipo (dados iniciais):

| Categoria | Balcão | Atacado |
|---|---|---|
| Paleta | R$ 10,00 | R$ 7,00 |
| Picolé | R$ 7,00 | R$ 5,50 |
| Sorvete de pote (2 L) | R$ 49,00 | R$ 45,00 |
| Açaí (pote 2 L) | R$ 56,00 | R$ 52,00 |
| Açaí no copo | R$ 22,00 | R$ 18,00 |
| Balcão (casquinha etc.) | R$ 9,00 | R$ 7,00 |

- O preço é alterado na **Receita** (quadros "Vendendo no balcão/atacado") e vale para a categoria inteira. A tela de Produtos mostra o preço só para leitura.
- No pedido, o produto é vendido pelo **preço de atacado** da categoria. Itens vendidos em caixa (ex.: "Caixa 20 picolés") **[DECIDIR]**: preço = 20 × atacado do picolé (R$ 110,00 no protótipo) ou preço próprio.
- Categoria nova pode ser criada pelo usuário; categoria **com produtos não pode ser removida**.
- Toda mudança de preço é registrada com data (é necessária para a Gordurinha e para o histórico).

## R2. Custo do insumo

- Cada item de estoque tem uma **unidade de medida** (un, L, kg; a receita também usa "lata" e "vez").
- **Custo por unidade = valor pago ÷ quantidade comprada.** Ex.: 20 kg de morango por R$ 360,00 → R$ 18,00/kg.
- A receita usa o **último preço pago** (é o que o protótipo mostra). **[DECIDIR]**: último preço ou custo médio ponderado.
- Quando uma entrada de mercadoria chega com custo maior que o anterior, o sistema gera o aviso **"O custo subiu"** (R5).

## R3. Custo da receita

```
custo_ingredientes = Σ (quantidade_na_receita × custo_por_unidade_do_insumo)
custo_embalagem    = (Σ preço_de_cada_item_de_embalagem_por_unidade) × rendimento
custo_total        = custo_ingredientes + custo_embalagem
custo_de_cada      = custo_total ÷ rendimento
```

- "Gás e energia da produção" entra como um ingrediente cobrado **por vez** (R$ 8,00 por receita no protótipo).
- **Exemplo (Paleta de Maracujá, rende 100):**
  - Polpa de maracujá 5 kg × 14,00 = 70,00 · Açúcar 3 kg × 4,20 = 12,60 · Leite condensado 10 latas × 6,90 = 69,00 · Creme de leite 2,5 L × 21,50 = 53,75 · Leite 5 L × 4,89 = 24,45 · Liga neutra 0,12 kg × 32,00 = 3,84 · Gás e energia 1 × 8,00 = 8,00 → **ingredientes R$ 241,64**
  - Embalagem por paleta: palito 0,08 + saquinho 0,27 + etiqueta 0,06 = 0,41 × 100 = **R$ 41,00**
  - **Custo total R$ 282,64 → custo de cada R$ 2,8264 (exibe R$ 2,83)**

## R4. Lucro e margem

```
lucro_de_cada_balcao  = preço_balcão  − custo_de_cada
lucro_de_cada_atacado = preço_atacado − custo_de_cada
%_do_preco            = lucro_de_cada ÷ preço          (exibir inteiro: "72% do preço")
lucro_da_receita      = lucro_de_cada × rendimento
```

- Exemplo (Paleta de Maracujá): balcão 10,00 − 2,83 = **R$ 7,17 (72%)**; atacado 7,00 − 2,83 = **R$ 4,17 (60%)**; receita inteira no balcão = R$ 717,36.
- Na lista de receitas: ordenar do maior para o menor lucro de balcão e destacar a de **menor lucro** da categoria.
- O produto à venda herda o custo da **receita usada**.

## R5. Aviso "O custo subiu"

- Gatilho: o custo por unidade de um insumo aumenta (nova entrada ou edição).
- O sistema recalcula todas as receitas que usam o insumo e mostra, para cada uma: custo de cada (antes → agora) e lucro de cada (antes → agora).
- Exemplo: morango R$ 14,00 → R$ 18,00/kg (+29%). Paleta de Morango recheada usa 5 kg: custo de cada 3,15 → 3,35 e lucro 6,85 → 6,65. Sorvete de Morango (pote 2 L, rende 10) usa 5 kg: custo 25,92 → 27,92 e lucro 23,08 → 21,08.
- Aparece no Início e no topo de "Planejar produção". **[DECIDIR]**: por quanto tempo o aviso fica visível e se há botão "Entendi".

## R6. Estoque

- **Situação**: "Comprar" quando quantidade < estoque mínimo; senão "OK".
- **Vencendo**: validade em até 7 dias **[DECIDIR o prazo]**; etiqueta vermelha se ≤ 3 dias, amarela se ≤ 7.
- Entradas: somam quantidade e atualizam o último preço. **[DECIDIR]**: entrada de mercadoria gera automaticamente uma conta a pagar ao fornecedor?
- Saídas: **registrar produção** (R7), **perda de matéria-prima** (R9) e **ajuste manual** por Editar (gera histórico).
- Produto pronto (freezer) **não tem controle de estoque** no protótipo. **[DECIDIR]** se deve ter.

## R7. Planejar e registrar produção

- Necessidade = quantidade de cada ingrediente da receita + (embalagem por unidade × rendimento).
- Falta = necessidade − estoque (se positivo). Custo estimado da falta = falta × custo por unidade.
- **Registrar produção** baixa do estoque tudo o que a receita usa e grava a produção (data, receita, quantidade produzida, custo total no dia), usada no relatório "Lucro por produto (estimado)".
- **[DECIDIR]**: permitir registrar com estoque insuficiente (estoque negativo)? Produzir meia receita ou várias de uma vez?

## R8. Vendas do balcão e taxas da maquininha

```
total_dia_balcao = dinheiro + pix + debito + credito
taxa_debito  = debito  × taxa_debito_%     (protótipo: 1,5%)
taxa_credito = credito × taxa_credito_%    (protótipo: 3,2%)
fica_para_a_sorveteria = total − taxas
data_que_cai = data da venda + dias do prazo (débito: 1 dia; crédito: 30 dias)
```

- Um fechamento por dia; pode ser corrigido (gera histórico).
- **Dias sem lançamento**: o Início avisa se algum dia (de loja aberta) ficou sem fechamento. **[DECIDIR]**: quais dias a loja abre.
- As taxas valem também para os **pedidos pagos no cartão**.
- **[DECIDIR]**: as taxas entram como despesa no Resultado do mês (recomendado) ou o faturamento já é líquido?

## R9. Pedidos de clientes

- Valor do item = quantidade × preço de atacado da categoria. Total = soma dos itens.
- Formas: Dinheiro, Pix, Cartão débito, Cartão crédito; pago na hora (sem fiado).
- Numeração sequencial. Pedido salvo entra nas vendas do dia/mês.
- **[DECIDIR]**: cancelar/editar pedido já salvo, taxa de entrega e desconto.

## R10. Perdas

- Valor da perda:
  - **Produto pronto** e **Troca em cliente**: quantidade × **custo de fazer** (custo de cada da receita).
  - **Matéria-prima/insumo**: quantidade × **preço pago** (custo por unidade).
- Motivos: Produto pronto (Venceu, Derreteu, Quebrou ou amassou, Outro); Matéria-prima (Venceu, Estragou, Quebrou, Outro); Troca (Venceu no cliente, Derreteu no cliente, Embalagem com defeito, Outro).
- Perda de matéria-prima **baixa o estoque**.
- Resumo do mês por tipo e "trocas por cliente".
- **[DECIDIR]**: a perda entra como despesa no Resultado do mês? Cuidado com **contagem dupla**: a matéria-prima já foi despesa quando foi comprada/paga. Recomendação: mostrar perdas como **informação** (relatório), sem somar de novo nas despesas.

## R11. Contas a pagar

- Situação: **Atrasada** (vencimento < hoje e não paga), **Vence hoje/amanhã/em N dias**, **Paga**.
- **Aviso**: aparece no Início e na bolinha do menu quando `hoje ≥ vencimento − dias_de_aviso` e não está paga.
- **Repete todo mês**: ao virar o mês (ou ao pagar), cria a conta do mês seguinte com o mesmo valor, tipo e dia de vencimento **[DECIDIR o momento exato]**. Se o dia não existir no mês (31), usa o último dia.
- **Pagamento**: forma, cartão (se cartão), data. "Desfazer" volta a conta para em aberto.
- **Cartões**: cada cartão tem nome e **dono** (Empresa, Carlos ou Paulo). Cartão em uso não pode ser removido.
- **Cartão pessoal de sócio** → gera **reembolso** para aquele sócio no mês do pagamento (R12).
- Manutenções do Patrimônio criam contas do tipo "Manutenção" (pagas ou em aberto).

## R12. Lucro líquido e divisão entre os sócios

```
faturamento_mes = Σ vendas do balcão do mês + Σ pedidos do mês
despesas_mes    = Σ contas pagas no mês (inclusive as pagas em cartão pessoal de sócio)
lucro_liquido   = faturamento_mes − despesas_mes
parte_socio     = lucro_liquido × %_socio            (Carlos 60%, Paulo 40%; soma sempre 100%)
reembolso_socio = Σ contas pagas no mês com cartão pessoal do sócio
retiradas_socio = Σ retiradas do sócio no mês
total_a_receber = parte_socio + reembolso_socio − retiradas_socio
```

- Exemplo (setembro do protótipo): faturamento R$ 52.300,00 − despesas R$ 33.850,00 = **lucro R$ 18.450,00** → Carlos 60% = R$ 11.070,00; Paulo 40% = R$ 7.380,00. Some os reembolsos e desconte as retiradas de cada um.
- **[DECIDIR]**: regime de **caixa** (data em que foi pago, recomendado pela simplicidade) ou de **competência**; o crédito que só cai em 30 dias conta no mês da venda?; o mês "fecha" e trava alterações?; o que fazer quando o lucro é negativo.

## R13. Meta do mês (ponto de equilíbrio) no Início

```
meta        = Σ contas do mês (pagas + a vencer no mês)
vendido     = faturamento do mês até hoje
percentual  = vendido ÷ meta
falta       = max(0, meta − vendido)
media_dia   = vendido ÷ dias com venda no mês
dias_faltam = arredondar_para_cima(falta ÷ media_dia)
```

- Exemplo: vendido R$ 32.870,00, meta R$ 38.500,00 → **85%**, faltam **R$ 5.630,00**; média R$ 2.054,38/dia em 16 dias → **cerca de 3 dias**.

## R14. Gordurinha (tese do Carlos)

**Ideia**: no último reajuste, os preços foram feitos para sobrar **X%** (padrão 10%) a mais em cima do **lucro líquido**. Cada aumento de custo depois disso come um pedaço dessa folga. Quando ela acaba, é hora de reajustar.

```
base                = lucro líquido mensal de referência
                      (manual enquanto não houver 12 meses de dados; depois, média dos 12 meses
                       anteriores à data do reajuste, calculada no dia do reajuste)
gordurinha_total    = base × X%
comido_por_mes      = Σ itens que subiram desde o último reajuste:
                        insumos: (custo_agora − custo_no_reajuste) × consumo_médio_mensal
                        contas fixas (energia, gás, internet…): valor_mensal_agora − valor_no_reajuste
resta               = max(0, gordurinha_total − comido_por_mes)
percentual_resta    = resta ÷ gordurinha_total
status              = > 50% "Tranquilo" · 20–50% "Atenção" · < 20% "Hora de reajustar"
ritmo               = comido_por_mes ÷ meses desde o reajuste
previsao_acaba      = hoje + (resta ÷ ritmo) meses
reajuste_sugerido_% = comido_por_mes ÷ faturamento médio mensal
novo_preco          = preço × (1 + reajuste_sugerido_%) arredondado para cima ao R$ 0,50
```

- O consumo médio mensal usa a **média do ano** (assim um mês fraco de inverno não engana; só aumento de preço come a gordurinha).
- Botão **"Já reajustei os preços"** (com confirmação): grava a data do reajuste, tira um retrato dos custos e das contas fixas daquele dia e zera o "comido".
- Base e porcentagem são editáveis ("Mudar base ou porcentagem").
- **Exemplo do protótipo**: último reajuste 10/03/2026; base R$ 15.000,00; 10% → **R$ 1.500,00/mês**. Comeram: morango +320,00 · leite +241,50 · energia +110,00 · creme de leite +100,00 · pote 2 L +64,00 · saquinho +51,00 · gás +33,50 · internet +10,00 = **R$ 930,00**. Resta **R$ 570,00 (38%) → "Atenção"**. Reajuste ≈ 930 ÷ 40.000 = **2,3%** → Paleta 10,00 → 10,23 → **10,50**.
- **[DECIDIR]**: de onde vem o "consumo médio mensal" antes de existir 1 ano de histórico (estimar pelas receitas e produção, ou digitar).

## R15. Lucro por produto (estimado)

- Como o balcão é lançado pelo total, o lucro por produto é **estimado**: `(unidades produzidas − unidades perdidas) × lucro de cada`. Para a parte vendida em pedidos, usar o número exato dos pedidos.

## R16. Patrimônio e manutenção

- Garantia: `garantia_até = data_do_serviço + dias_de_garantia`.
- Manutenção cria uma **conta a pagar** do tipo "Manutenção" com o nome "<o que foi feito> · <bem>": paga (com forma/cartão/data) ou em aberto **[DECIDIR o vencimento de quando não foi paga]**.
- Resumo do ano: total gasto, nº de revisões e consertos, bem que mais gastou.

## R17. Histórico (auditoria) e exclusões

- Tudo o que muda dados gera uma linha legível com data e hora: "Mudou o preço da Paleta de Morango recheada: R$ 10,00 → R$ 10,50".
- Exclusão: confirmação na linha e **Desfazer** logo depois (por exemplo, exclusão lógica). Itens em uso não podem ser removidos: categoria com produtos, tipo de conta usado, cartão usado, tipo de bem usado, insumo usado em receita **[DECIDIR o comportamento deste último]**.

## R18. Backup

- Ao fechar o sistema (se ligado): copiar o banco para a **pasta Documentos\BigLake** e para o **pen drive** (se conectado). Mostrar o estado no topo ("Cópia de segurança feita hoje, 08:02").
- Guardar as N últimas cópias com data e hora **[DECIDIR N]**. "Restaurar uma cópia" pede confirmação e faz um backup do estado atual antes.
- Avisar no topo se o último backup completo tiver mais de X dias ou se o pen drive não estiver conectado.
