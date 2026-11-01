# Roteiro de teste manual · Fatia 3 (receitas, margem e produtos à venda)

Preparação: `npm run dev`. Em Estoque, cadastre com quantidade 1 e o valor pago igual ao preço do protótipo: Polpa de maracujá (kg, 14,00), Açúcar refinado (kg, 4,20), Leite condensado (Unidade, nome "lata", 6,90), Creme de leite (L, 21,50), Leite integral (L, 4,89), Liga neutra (kg, 32,00) e os insumos Palito (0,08), Saquinho plástico (0,27), Etiqueta (0,06).

## A. Gás e energia (D-041)

| # | Passo | Esperado |
|---|---|---|
| 1 | Estoque e Insumos | Primeira linha "Gás e energia da produção · R$ 0,00 /vez", sem quantidade nem validade, só com Editar |
| 2 | Editar → 8,00 → Salvar alterações | "R$ 8,00 /vez"; no Histórico: "Mudou o custo do gás e energia da produção: R$ 0,00 → R$ 8,00 por vez" |
| 3 | Configurações › Gás e energia da produção | Três opções; "Item no estoque" escolhida |

## B. Receita (T1)

| # | Passo | Esperado |
|---|---|---|
| 4 | Produção e Receitas › Receitas › "+ Nova receita" | Modal com 3 partes numeradas; "Gás e energia da produção · 1 vez · R$ 8,00" já na lista |
| 5 | Nome "Paleta de Maracujá"; em Categoria, criar "Paleta" | A categoria nova fica escolhida |
| 6 | "+ Adicionar ingrediente" e colocar os 6 ingredientes com 5 · 3 · 10 · 2,5 · 5 · 0,12 | Cada linha mostra o custo; "Custo dos ingredientes R$ 241,64" |
| 7 | Marcar Palito, Saquinho e Etiqueta; rende 100 | Parte 2: 100 un de cada; "Custo da embalagem R$ 41,00" |
| 8 | Parte 3 | "Quantas paletas essa receita rende?"; "Custo da receita inteira R$ 282,64"; "Custo de cada paleta R$ 2,83" |
| 9 | Balcão 10,00 e atacado 7,00 | Balcão: lucro R$ 7,17, "72% do preço vira lucro", receita inteira R$ 717,36. Atacado: R$ 4,17 (60%) |
| 10 | Salvar receita | Lista: aba "Paleta", "rende 100 paletas", R$ 2,83, R$ 7,17 (72%), R$ 4,17 (60%) |
| 11 | Criar outra receita mais cara na mesma categoria | Ordem do maior para o menor lucro; a última com "menor lucro" em vermelho |
| 12 | Configurações › Gás e energia › "Valor fixo" › 12,00 › Salvar valor | O item some do Estoque; o custo das receitas muda na hora |

## C. O custo subiu (T3, D-046)

| # | Passo | Esperado |
|---|---|---|
| 13 | Estoque › chegar mais Polpa de maracujá: 1 kg por R$ 18,00 | Aviso no modal "O custo subiu… (+29%)" |
| 14 | Produção e Receitas | Card vermelho "O custo subiu: Polpa de maracujá", com cada receita: custo de cada e lucro de cada (antes → agora) |
| 15 | "Ver receita" | Abre a receita |
| 16 | "Entendi" | O aviso some; volta só no próximo aumento |

## D. Produtos à venda (D-045)

| # | Passo | Esperado |
|---|---|---|
| 17 | Cadastros › Produtos à venda › "+ Cadastrar produto" | Modal com Categoria, Nome/sabor, Vendido como, Peso ou volume, Receita usada |
| 18 | Paleta · "Paleta de Maracujá" · 110 g · receita Paleta de Maracujá | Quadro "Preço de venda · fixo da categoria Paleta" (R$ 10,00 / R$ 7,00, só leitura); custo, lucro no balcão e no atacado |
| 19 | Salvar | Lista: "Paleta · 1 unidade · 110 g", custo, preços e lucro; filtro "Paleta" aparece |
| 20 | Vendido como "Caixa", 20 unidades | Preços × 20 |
| 21 | Produção › Receitas › Excluir a receita usada no produto | "Não dá para excluir: é usada em 1 produto à venda." |

## E. Apagar ingrediente usado (pergunta 11, D-047)

| # | Passo | Esperado |
|---|---|---|
| 22 | Estoque › Excluir Liga neutra | Modal "Apagar Liga neutra?" com a lista das receitas; "Não apagar" não muda nada |
| 23 | "Sim, apagar e tirar das receitas" | Some do estoque; o custo da receita cai R$ 0,04 por paleta; Histórico "Tirou Liga neutra da receita …" |
| 24 | "Desfazer" | Volta para o estoque e para a receita |
