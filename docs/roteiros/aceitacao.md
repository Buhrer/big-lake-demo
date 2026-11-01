# Roteiro de aceitação com o Carlos (versão 0.9.1)

Fazer **no computador da loja**, com o Carlos usando o mouse e o Lucas só olhando. Anotar ao lado de cada passo o que travou ou confundiu. Base: `docs/08-qa-plano-de-testes.md` (Roteiro de aceitação).

**Antes (Lucas, sozinho)**: o teste rápido da versão (lembrete D-051) — instalar a 0.9.1, preencher os dados da empresa, fazer a cópia no pen drive, cadastrar um insumo e uma receita, fechar e conferir a cópia; medir a memória no Gerenciador de Tarefas com o programa aberto (meta: funcionar bem com 4 GB). Depois, **apagar `%APPDATA%\BigLake` e `Documentos\BigLake`** para o Carlos começar do zero, e fazer com ele o **primeiro dia** (manual, parte 14).

| # | O Carlos faz | Esperado | Ok? |
|---|---|---|---|
| 1 | Abre o sistema pelo atalho BIG LAKE da área de trabalho | Abre em até 5 s, na tela inicial, com a data de hoje | |
| 2 | Lança as vendas de hoje do balcão (dinheiro, Pix, débito, crédito) | Total do dia e taxas certos; aparece em "Vendas de ontem" no dia seguinte | |
| 3 | Faz um pedido para um cliente e imprime o comprovante | Comprovante sai na impressora com os dados da empresa | |
| 4 | Registra a chegada de morango mais caro | Aviso "O custo subiu" no Início e em Produção | |
| 5 | Abre a receita da Paleta de Morango | Custo e lucro de cada já com o preço novo | |
| 6 | Paga a conta de energia no cartão pessoal | Reembolso aparece para ele em Sócios | |
| 7 | Vê a Gordurinha e o Resultado do mês; imprime e salva em PDF | Impressão sai; PDF fica em Documentos\BigLake\Relatórios | |
| 8 | Aumenta a letra com A+ e navega por três telas | Tudo maior, sem barra de rolagem para o lado | |
| 9 | Registra uma perda e uma produção | Estoque baixa; perda aparece no relatório | |
| 10 | Abre o manual em Configurações | O PDF abre | |
| 11 | Fecha o sistema e o Lucas confere o pen drive | Cópia nova em `<pen drive>\BigLake-Backups` | |

**Pronto quando**: os 11 passos deram certo e o backup no pen drive foi conferido. O que aparecer vira correção; depois, gerar a **1.0.0** (D-075).
