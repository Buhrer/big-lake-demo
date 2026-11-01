# Roteiro de teste manual · Fatia 5 (contas a pagar e sócios)

Preparação: `npm run dev`. Para ter o que dividir, lance antes as vendas de um dia em Vendas e Pedidos (ex.: R$ 5.000,00 em dinheiro).

## A. Contas a pagar

| # | Passo | Esperado |
|---|---|---|
| 1 | Menu › Contas a pagar | Cards "Vencem nos próximos 7 dias", "Atrasadas · nenhuma conta atrasada", "Pagas em <mês>"; filtros A pagar · Pagas · Todas |
| 2 | + Nova conta → Salvar conta sem nada | "Digite o que é a conta.", "Digite o valor.", "Escolha o tipo de conta." |
| 3 | Energia elétrica · 2.950 · vencimento amanhã · Energia · Repete "Sim, todo mês" · Salvar conta | Linha com a data, etiqueta "Amanhã" (vermelha), "Todo mês", R$ 2.950,00; bolinha vermelha "1" no menu; card dos 7 dias com R$ 2.950,00 |
| 4 | Nova conta para daqui a 5 dias, aviso 3 dias | Etiqueta "Em 5 dias" (amarela); a bolinha continua "1" |
| 5 | Tipo de conta › lista | 8 tipos + "Fatura do cartão da empresa" (sem Remover); "Energia" mostra "em uso · 1"; criar "Impostos" e remover (Sim) funciona |
| 6 | Marcar como paga → Cartão de crédito → Qual cartão? → "Carlos" → "Crédito final 4421" → + Criar | A lista fecha; cartão escolhido "· pessoal do Carlos"; aviso "Este cartão é pessoal do Carlos…" |
| 7 | Confirmar pagamento | "✓ Conta … marcada como paga."; some de "A pagar"; bolinha some; em "Pagas": "pago com cartão de crédito (Crédito final 4421 · pessoal do Carlos · reembolso) em 16/10" |
| 8 | Pagas › Desfazer | "✓ A conta … voltou para “A pagar”." |
| 9 | Nova conta "Combustível" · "Sim, já paguei" · "Salvar e dizer como paguei" → Pix → Confirmar | "✓ Conta Combustível salva como paga."; "Pagas em <mês>" soma |
| 10 | Editar uma conta | Mesmo modal, "Editando uma conta", "Salvar alterações"; não mostra "Já está paga?"; Histórico: "Corrigiu a conta …: valor … → …" |
| 11 | Editar › Excluir conta › Sim | "A conta … foi excluída." + Desfazer volta a conta |
| 12 | Conta que vence ontem | Etiqueta "Atrasada"; card "Atrasadas" em vermelho |
| 13 | Conta que repete com vencimento dia 31 (para testar a virada do mês, rode com `BIGLAKE_HOJE=01/11/2026`) | Aparece sozinha a conta de novembro vencendo 30/11; Histórico: "Criou sozinho a conta do mês…" |

## B. Sócios

| # | Passo | Esperado |
|---|---|---|
| 14 | Menu › Sócios | "‹ Outubro de 2026 ›" ("›" desligado no mês atual); Faturamento, Despesas ("inclui contas pagas nos cartões dos sócios" e as taxas, se houver), Lucro líquido para dividir |
| 15 | Pague uma conta no cartão pessoal do Carlos e volte | "Reembolsos do mês" com a conta, o cartão e "Volta para R$ … Carlos"; no card do Carlos "+ Reembolso"; Despesas inclui a conta |
| 16 | + Registrar retirada → Paulo · 1.200 · Dinheiro do caixa · Salvar | Aba "Retiradas do mês" com a linha; card do Paulo "− Retiradas R$ 1.200,00" e total menor |
| 17 | Retirada › Editar › Excluir retirada › Sim → Desfazer | Some e volta |
| 18 | Carlos "+" | 61% / Paulo 39%; barra e cards mudam; Histórico "Mudou a participação a partir de outubro de 2026: Carlos 60% → 61%, Paulo 40% → 39%" |
| 19 | "‹" (setembro) | Continua 60% / 40% (a mudança vale do mês em diante) |
| 20 | "Ver em Contas a pagar" | Abre Contas a pagar no filtro "Pagas" |
| 21 | Conferir T7: faturamento 52.300 e despesas 33.850 | Lucro R$ 18.450,00; Carlos R$ 11.070,00; Paulo R$ 7.380,00 |

## C. Configurações › Como contar o lucro

| # | Passo | Esperado |
|---|---|---|
| 22 | Configurações | Card "Como contar o lucro" com 4 perguntas; a "nossa sugestão" marcada em cada uma |
| 23 | "Levar para o mês seguinte" | Fica marcado; Histórico "Mudou como contar o lucro: mês com prejuízo: …" |
| 24 | Com um mês de prejuízo: "Mostrar e não dividir" × "Dividir" × "Levar" | Sócios: "Prejuízo do mês · não é dividido" / partes negativas / no mês seguinte "desconta R$ … de prejuízo dos meses anteriores" |
| 25 | "As vendas já contam sem as taxas" | Faturamento "já sem as taxas"; Despesas sem a linha das taxas |

## D. Categorias iniciais (D-062)

| # | Passo | Esperado |
|---|---|---|
| 26 | Banco novo › Produção › Receitas › Nova receita › Categoria | Paleta, Picolé e Pote já existem; dá para remover (Sim) uma que não está em uso |

## E. Tela e letra

| # | Passo | Esperado |
|---|---|---|
| 27 | 1280×720, letra 130%: Contas, Sócios, modais Nova conta, pagamento e retirada | Sem barra de rolagem horizontal; "Pix da conta da …" cortado com reticências |
