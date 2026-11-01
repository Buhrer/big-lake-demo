# Roteiro de teste manual · Fatia 6B (Perdas)

Preparação: `npm run dev`. Tenha no estoque Morango (R$ 18,00/kg, 7,5 kg) e Manga (R$ 7,50/kg, 5 kg), uma receita (ex.: Paleta de Morango recheada) e um cliente (ex.: Mercado Bom Preço).

| # | Passo | Esperado |
|---|---|---|
| 1 | Menu › Perdas | "Outubro de 2026", quatro cards em R$ 0,00, "Nenhuma troca em clientes neste mês." e "Nenhuma perda neste mês." |
| 2 | "+ Registrar perda" | Modal "Registrar perda"; "Produtos prontos" e "Venceu" já escolhidos; "Quando?" com a data de hoje |
| 3 | "Matéria-prima ou insumo"; tocar em Morango e em Manga | Itens na tabela com 1 kg cada; "Valor da perda (pelo preço pago)" |
| 4 | Digitar 4 no morango e 2 na manga | Morango R$ 72,00, Manga R$ 15,00, **Valor da perda R$ 87,00** |
| 5 | Salvar perda | "✓ Perda anotada…"; linha "4 kg Morango · 2 kg Manga · Matéria-prima · Venceu · R$ 87,00"; em Estoque: morango 3,5 kg e manga 3 kg |
| 6 | "+ Registrar perda" › "Troca em cliente"; tocar 2 vezes na paleta | Quantidade 2 "un"; valor = 2 × custo de fazer; aparece a frase "Os produtos novos entregues na troca…" |
| 7 | Salvar sem escolher cliente | "Escolha o cliente." |
| 8 | Escolher o cliente, motivo "Embalagem com defeito", Salvar | Linha "Troca · Mercado Bom Preço" (etiqueta amarela); o estoque não muda; "Trocas por cliente" mostra o cliente com a barra cheia; card "1 troca em 1 cliente" |
| 9 | Filtros Todas / Produtos / Matéria-prima / Trocas | Cada um mostra só o seu tipo; os números entre parênteses batem |
| 10 | Editar a perda de matéria-prima | "Corrigir perda" com "Editando o registro de 16/10"; remover a manga, morango 5; Salvar alterações | "✓ Alterações salvas."; R$ 90,00; Estoque: morango 2,5 kg e manga 5 kg |
| 11 | Excluir → Sim | "O registro de 16/10 foi excluído." + Desfazer; o estoque volta (morango 7,5 kg) |
| 12 | Desfazer | O registro volta e o estoque baixa de novo |
| 13 | Nova perda de 6 kg de manga com "Quando?" = 30/09/2026 | Pergunta "O estoque de Manga vai ficar negativo. Salvar mesmo assim?"; Sim → a tela vai para "Setembro de 2026" com a perda de 30/09 |
| 14 | "Quando?" com uma data de amanhã | "Essa data ainda não chegou." |
| 15 | Cadastros › Clientes › excluir o cliente da troca | Não deixa: "tem 1 troca em Perdas" |
| 16 | Configurações › Histórico | "Registrou a perda: …", "Corrigiu a perda: … → …. Estoque acertado", "Excluiu a perda…", "Desfez a exclusão da perda…" |
| 17 | 1366×768 (letra Normal) e 1280×720 (letra Muito grande) | Sem rolagem horizontal; na letra normal, Editar e Excluir lado a lado; na letra grande podem ficar um embaixo do outro |
