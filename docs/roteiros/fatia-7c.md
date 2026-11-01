# Roteiro de teste manual · Fatia 7C (Gordurinha)

Preparação: `npm run dev`, com uma receita que usa morango, uma produção registrada, uma conta que repete todo mês (ex.: Energia) e vendas no mês passado.

| # | Passo | Esperado |
|---|---|---|
| 1 | Relatórios › "Gordurinha (hora de reajustar?)" | Subtítulo "A Gordurinha é sempre a de hoje", sem a lista de meses; quadro "Para começar…" com base, % (10) e data do último reajuste |
| 2 | "Ligar a Gordurinha" vazio | "Digite o lucro líquido de um mês normal." e "Digite a data do último reajuste." |
| 3 | Base 15.000, 10%, data 10/03/2026 › Ligar | "Tranquilo", "Desde o último reajuste, em 10/03/2026", "Ainda restam R$ 1.500,00 por mês", barra cheia; "Nada subiu desde o último reajuste…" |
| 4 | Lançar entrada de morango mais caro e corrigir a conta de energia para mais | "O que comeu a gordurinha": cada item com antes → agora, "usa ~N kg por mês" ou "conta do mês", "+ R$ …" e barra; Total comido; "Ainda restam" diminui; frase "No ritmo de agora, acaba por volta de …" |
| 5 | Reajuste de preços | "precisam subir cerca de N%"; cada categoria com preço: Balcão e Atacado, antes → novo e "arredondando" a R$ 0,50 |
| 6 | Conferir T9 (base 15.000; 10%; comido 930; faturamento médio 40.000) | Resta R$ 570,00 (38%), Atenção; reajuste 2,3%; Paleta 10,00 → 10,23 → R$ 10,50; Picolé 7,00 → 7,16 → R$ 7,50; Pote 49,00 → 50,14 → R$ 50,50 |
| 7 | "Mudar base ou porcentagem": base 20.000 › Pronto | "= gordurinha de R$ 2.000,00 por mês" enquanto digita; os números mudam; Histórico "Mudou a Gordurinha…" |
| 8 | "Contas fixas que entram na conta": desmarcar a energia | A energia sai do "O que comeu"; o aluguel começa desmarcado |
| 9 | Início | Card "Gordurinha" (borda amarela) com o status, "Restam R$ … de R$ … por mês (N%)", barra, "Mais comeram: …" e a previsão; "Ver em Relatórios › Gordurinha" |
| 10 | "Já reajustei os preços" › "Ainda não" | Nada muda |
| 11 | "Já reajustei os preços" › "Sim, zerar a conta" | "✓ Pronto! A gordurinha voltou a ficar cheia…"; "Desde … em <hoje>"; resta cheia; nada comido |
| 12 | Imprimir / Salvar em PDF | "Gordurinha de <mês> de <ano>.pdf", sem os botões de mudar |
| 13 | 1280×720 com letra 130% | As 3 caixinhas uma embaixo da outra; sem rolagem horizontal |
