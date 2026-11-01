# Roteiro de teste manual · Fatia 8B (ajustes do teste de uso de 2 meses)

Preparação: `npm run dev`, com um insumo cadastrado (ex.: Morango) e um dia de balcão já lançado (ex.: ontem). Decisões D-089 a D-095.

| # | Passo | Esperado |
|---|---|---|
| 1 | Vendas › Dia = ontem › Dinheiro "-50" › sair da caixa | Caixa vermelha: "Não use o sinal de menos." |
| 2 | Salvar correção | Faixa "Há um número digitado errado (marcado em vermelho). Corrija antes de salvar."; Histórico do balcão continua com o valor antigo |
| 3 | Dinheiro "abc", depois "99999999999" | "Número com erro. Use só algarismos e vírgula, como 1.234,56." / "Número grande demais. Confira."; nada de rolagem horizontal |
| 4 | Dia de 3 dias atrás, tudo vazio › Salvar | "Está tudo zerado. A loja não abriu neste dia?" › "Sim, a loja não abriu" → "Dia … marcado como loja fechada." |
| 5 | Chegou mercadoria › Morango, 10 kg, R$ 180 › Salvar | "Diga se vai lançar esta compra em Contas a pagar." (nada vem marcado) |
| 6 | "Sim, já paguei" › Pix › Salvar | Faixas "Entrada registrada…" e "A compra também foi para Contas a pagar, já paga."; Contas a pagar › Pagas: "Morango 10 kg · <fornecedor>", tipo Fornecedor, R$ 180,00 |
| 7 | Chegou mercadoria de novo › "Sim, vou pagar depois" › Salvar sem data | "Digite quando a conta vence."; com a data, a conta aparece em "A pagar" |
| 8 | Chegou mercadoria com valor 0 | A pergunta da conta não aparece |
| 9 | + Nova conta › digitar "Internet" › Esc | "Fechar sem salvar? O que você digitou vai se perder."; "Não, continuar" mantém o texto; Esc de novo também continua; "Sim, fechar" fecha |
| 10 | + Nova conta sem digitar nada › Esc | Fecha direto |
| 11 | Conta, perda e retirada com clique duplo rápido em Salvar | Grava uma vez só |
| 12 | Fechar o programa; mudar a data do Windows para 1 mês antes; abrir | Faixa vermelha embaixo da barra do topo, em todas as telas: "A data do computador parece errada: hoje está …, mas o programa já foi usado em …"; voltar a data → a faixa some ao abrir de novo |
| 13 | Configurações › Restaurar uma cópia (depois de alguns dias de uso) | Uma cópia por dia dos últimos 30 dias, além das 10 mais novas |
| 14 | 1280×720 com letra 130%: modal de entrada com "Sim, já paguei" e Cartão de crédito | Sem rolagem horizontal |
