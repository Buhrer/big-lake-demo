# Roteiro de teste manual · Fatia 6A (Produção › Planejar)

Preparação: `npm run dev`. Tenha uma receita com ingredientes e embalagem (ex.: Paleta de Morango recheada, rende 100) e deixe um ingrediente com menos do que a receita usa (ex.: Morango 3,5 kg; a receita usa 5 kg).

| # | Passo | Esperado |
|---|---|---|
| 1 | Produção e Receitas › aba "Planejar produção" | "Qual receita vai fazer?" com um botão por receita; a primeira já escolhida; "Esta receita produz 100 paletas" e "Mudar na receita" |
| 2 | Conferir a tabela | Cada ingrediente e embalagem com "A receita usa", "Tem no estoque" e "Tem" (verde) ou "Falta 1,5 kg" (vermelho); "Gás e energia" não aparece |
| 3 | Embaixo da tabela | "Falta comprar: Morango 1,5 kg · Custo estimado: R$ 27,00" |
| 4 | "−" em "Quantas receitas vai fazer?" | Mostra "½"; as quantidades caem pela metade; "= 50 paletas"; "✓ Tem tudo no estoque. Pode produzir!" |
| 5 | Digitar 2 | Quantidades em dobro; a falta e o custo estimado sobem |
| 6 | Voltar para 1; "Quantas paletas saíram?" = 98; Registrar produção | Pergunta "Falta estoque. Registrar mesmo assim? O estoque vai ficar negativo." |
| 7 | Sim | "✓ Produção registrada! 98 paletas de … anotadas…"; em Estoque, o morango fica −1,5 kg (vermelho) e palito, saquinho e etiqueta −100 |
| 8 | "Planejar outra produção" | Volta ao planejamento, já com o estoque novo |
| 9 | "Produções do mês" | Linha com a data, a receita, "1 receita", "98 paletas" e o custo |
| 10 | Excluir → Sim | "A produção … foi excluída e o estoque voltou." + Desfazer; em Estoque tudo volta ao que era, com as mesmas validades |
| 11 | Desfazer | A produção volta e o estoque baixa de novo |
| 12 | "Mudar na receita" | Abre a receita no modal "Editar receita" |
| 13 | Configurações › Histórico | "Registrou a produção: 1 receita de …, 98 paletas (a receita previa 100)…", "Excluiu a produção…", "Desfez a exclusão da produção…" |
| 14 | 1280×720 com letra 130% | Sem rolagem horizontal |
