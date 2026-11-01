# Roteiro de teste manual · Fatia 4 (vendas do balcão e pedidos de clientes)

Preparação: `npm run dev`. Tenha 1 cliente (Cadastros) e alguns produtos à venda com preço de atacado (Receitas + Produtos à venda).

## A. Balcão (fim do dia)

| # | Passo | Esperado |
|---|---|---|
| 1 | Vendas e Pedidos | Aba "Vendas do balcão (fim do dia)"; título "Lançar as vendas de hoje"; dia de hoje preenchido; "Taxas da maquininha · ainda não preenchidas" |
| 2 | "Ver ou alterar taxas" → débito 1,5 / 1 dia, crédito 3,2 / 30 dias → Pronto | "débito 1,5% · crédito 3,2%"; Histórico: "Mudou as taxas da maquininha…" |
| 3 | Dinheiro 412,50 · Pix 334 · Débito 218 · Crédito 320 | "Total do dia R$ 1.284,50" enquanto digita |
| 4 | Salvar vendas de hoje | "✓ Vendas de 16/10 lançadas! Total de R$ 1.284,50…"; o título vira "Corrigir as vendas de 16/10"; a linha aparece no histórico |
| 5 | Mudar o Dia para ontem | Título "Lançar as vendas do dia" (ou "Corrigir…" se já lançado) |
| 6 | Dia de anteontem → "A loja não abriu neste dia" | "✓ Dia … marcado como loja fechada."; no histórico: "Loja fechada" |
| 7 | Tocar num dia do histórico | Abre os valores daquele dia para corrigir; "Salvar correção"; Histórico: "Corrigiu as vendas do dia …: dinheiro … → …" |
| 8 | Tentar um dia que ainda não chegou | "Não dá para lançar um dia que ainda não chegou." |

## B. Pedidos de clientes

| # | Passo | Esperado |
|---|---|---|
| 9 | Aba "Pedidos de clientes" → Salvar pedido sem nada | "Escolha o cliente.", "Toque nos produtos…", "Escolha como o cliente pagou." |
| 10 | Escolher o cliente; tocar nos produtos; digitar 4 no campo; usar − e + | Cada item mostra "R$ x cada · R$ total"; "Total do pedido" atualiza na hora |
| 11 | Pagamento "Cartão crédito" | Aparecem "Taxa da maquininha (3,2%) − R$" e "Fica para a sorveteria R$" |
| 12 | Salvar pedido | "✓ Pedido nº 1 salvo! Total de … em Cartão crédito."; prévia do comprovante (cliente, itens, TOTAL, pagamento, "Recebido por") |
| 13 | Imprimir comprovante | Abre a janela de impressão do Windows com o comprovante; Cancelar não dá erro |
| 14 | Fazer outro pedido | Quadro limpo, número seguinte |
| 15 | Histórico de pedidos › Corrigir | "Corrigindo o pedido nº 1"; mudar a quantidade → "Salvar alterações"; total muda; Histórico: "Corrigiu o pedido nº 1: …" |
| 16 | Cancelar → Sim | Etiqueta "Cancelado"; some do total do mês; "Desfazer cancelamento" volta |
| 17 | Mudar o preço da categoria em Receitas e voltar | O pedido antigo continua com o preço do dia dele |
| 18 | Cadastros › Clientes › "Novo pedido" | Abre o pedido já com o cliente escolhido |
| 19 | Cadastros › Clientes › Excluir o cliente que tem pedido | "Não dá para excluir: tem 1 pedido." |

## C. Resumo das vendas

| # | Passo | Esperado |
|---|---|---|
| 20 | Aba "Resumo das vendas" | Vendas de hoje (balcão + pedidos), média por dia, melhor dia, "Dias lançados N de M" ("falta lançar hoje" se faltar) |
| 21 | Taxas da maquininha · hoje | Débito e crédito do balcão, pedidos no cartão, total de taxas e "Fica para a sorveteria hoje"; dia em que o crédito cai |
| 22 | Mês | Total vendido, Balcão (% do total), Pedidos (% e quantidade), dias com venda, barra Balcão × Pedidos e "Vendas por dia" (com "falta lançar" e "loja fechada") |
| 23 | A+ até 130% com a janela em 1280×720, nas três abas | Sem barra de rolagem para o lado |
