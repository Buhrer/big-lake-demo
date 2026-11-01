# Roteiro de teste manual · Fatia 7B (Relatórios)

Preparação: `npm run dev`, com alguns dias de balcão (com débito e crédito), pedidos, contas pagas, uma produção e uma perda no mês; se possível, um balcão do mesmo mês do ano passado.

| # | Passo | Esperado |
|---|---|---|
| 1 | Menu › Relatórios | "Período: <mês de hoje>", lista com os 6 relatórios, "Resultado do mês (lucro)" escolhido |
| 2 | Resultado do mês | Vendas no balcão, Pedidos de clientes, Total que entrou (amarelo), "− <tipo de conta>" de cada grupo, "− Taxas da maquininha", Lucro líquido (escuro) igual ao de Sócios; frase "Sobraram R$ …" ou "fechou com prejuízo"; "Ver divisão entre os sócios" leva a Sócios |
| 3 | Mais vendidos nos pedidos | Ranking com barras vermelhas ("27 potes · R$ …"), frase "<1º> é o que mais sai…", clientes que mais compraram e o total dos pedidos |
| 4 | Dinheiro, cartão e Pix | 4 formas com R$ e % (somam 100%), total do balcão, taxas da maquininha com as % de hoje, "teve N dias de loja aberta: média de R$ …" |
| 5 | Comparar com o ano passado | Tabela Mês/ano passado × Mês/este ano com a diferença (verde quando é bom, vermelho quando é ruim, "—" sem ano passado); frase do lucro; gráfico dos 6 meses em mil reais |
| 6 | Sem dados do ano passado | "Ainda não há <mês> de <ano> no sistema para comparar…" |
| 7 | Lucro por produto | Aviso de estimativa em amarelo; ranking "N saíram × R$ lucro de cada = R$ total" com barras verdes |
| 8 | Perdas | Produtos prontos, matéria-prima, trocas e Total perdido; "Quem mais trocou…", "O maior motivo foi…"; "Ver detalhes em Perdas" |
| 9 | Trocar o Período para o mês passado | O título e os números mudam; Perdas sem "(até hoje)" |
| 10 | Imprimir | Abre a janela de impressão do Windows com o relatório (nome da empresa e período no alto, sem "?") |
| 11 | Salvar em PDF | Abre "Salvar como" em Documentos\BigLake\Relatórios com o nome "Resultado de <mês> de <ano>.pdf"; depois "✓ Salvo em …" e "Abrir pasta" abre o Explorer com o arquivo selecionado; Cancelar não mostra nada |
| 12 | Abrir o PDF | Página A4 legível, igual à tela |
| 13 | 1280×720 com letra 130% | Lista de relatórios em cima, botões lado a lado; tabela do "Comparar" dentro do quadro; sem rolagem horizontal |
