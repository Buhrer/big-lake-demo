# Roteiro de teste manual · Fatia 7A (Início)

Preparação: `npm run dev`, banco novo.

| # | Passo | Esperado |
|---|---|---|
| 1 | Abrir o programa | Início com a data por extenso, "Bem-vindo!", 4 atalhos, 4 cards em R$ 0,00, meta "Nenhuma conta lançada para outubro…" e "✓ Nada precisa de atenção hoje." |
| 2 | Cada atalho | "Lançar vendas do dia" → Vendas (balcão); "Novo pedido de cliente" → aba Pedidos; "Planejar produção" → Produção; "Chegou mercadoria" → Estoque com o modal de entrada aberto |
| 3 | Lançar o balcão de ontem (ex.: R$ 1.382,50) e voltar ao Início | "Vendas de ontem R$ 1.382,50"; "Vendas de outubro" soma balcão + pedidos |
| 4 | Lançar contas do mês (uma paga, uma vencendo amanhã com aviso 3 dias) | "Despesas" = só a paga; "Lucro até hoje" = vendas − despesas (negativo aparece com "−"); meta = soma das duas contas |
| 5 | Conferir a meta (T8: vendido 32.870,00 em 16 dias, contas 38.500,00) | 85%, "Faltam R$ 5.630,00, cerca de 3 dias de vendas…", etiqueta "Faltam uns 3 dias de vendas" |
| 6 | Vender mais do que a meta | Barra em 100%, "Meta batida!" |
| 7 | Item com mínimo maior que o estoque | Card "Estoque baixo" com o mínimo e a quantidade em vermelho; "Ver estoque" |
| 8 | Entrada com validade daqui a 2 dias e outra daqui a 5 | Card "Vencendo em breve": "em 2 dias" vermelho, "em 5 dias" amarelo; a dica embaixo |
| 9 | Conta no período de aviso | Card "Contas para pagar": "vence amanhã, 17/10" e o valor; conta atrasada aparece como "atrasada, venceu…" |
| 10 | Entrada de um ingrediente usado em receita, mais cara | Card "O custo subiu" (borda vermelha): "O morango passou de … para … o quilo (+N%)" e "lucro de cada … → …"; "Ver detalhes" → Produção. "Entendi" lá tira o aviso daqui também |
| 11 | Salvar um pedido | Card "Últimos pedidos" com cliente, data, itens e valor; "N em outubro" |
| 12 | 1366×768 (Normal) | Atalhos e cards 4 lado a lado; avisos em 2 colunas |
| 13 | 1280×720 (Muito grande) | Atalhos e cards 2 + 2; avisos um embaixo do outro; sem rolagem horizontal |
