# Roteiro de teste manual · Fatia 1A (esqueleto e padrões de interface)

Preparação: `npm install` e depois `npm run dev`. A janela abre maximizada.

| # | Passo | Esperado |
|---|---|---|
| 1 | Olhar a tela inicial | Menu amarelo à esquerda com 10 itens (na ordem do protótipo), "Início" destacado em escuro com letra amarela. Data de hoje por extenso e "Bem-vindo!" |
| 2 | Clicar em cada item do menu | Abre a tela com subtítulo, título grande e "?" vermelho; o item clicado fica destacado |
| 3 | Clicar em "Configurações" no alto | Abre a tela Configurações |
| 4 | Passar o mouse num "?" | Abre um balão escuro com título amarelo e texto curto, sem sair da janela |
| 5 | Clicar em "? Ajuda ligada" | Todos os "?" somem e o botão vira "? Ajuda desligada" (branco). Clicar de novo traz de volta |
| 6 | Clicar A+ três vezes | Tudo cresce (menos o menu); A+ fica apagado em 130%. Nenhuma barra de rolagem para o lado |
| 7 | Clicar A− até apagar | Letra em 80%. Nenhuma barra para o lado |
| 8 | Fechar e abrir de novo | Volta com o mesmo tamanho de letra e a ajuda como estava |
| 9 | Em Configurações, clicar "Vitrine de componentes (só em desenvolvimento)" | Tela "Vitrine de componentes" (o botão não existe no programa instalado) |
| 10 | Clicar "+ Cadastrar produto" | Abre o modal: título à esquerda e "✕ Fechar" à direita na mesma linha; Salvar vermelho e Cancelar no rodapé |
| 11 | Clicar Salvar com o nome vazio | "Digite o nome." em vermelho embaixo do campo |
| 12 | Digitar "1234,5" no valor e sair do campo | Mostra "1.234,50" |
| 13 | Digitar "16102026" na validade | Vira "16/10/2026" sozinho |
| 14 | Abrir "Categoria" | Lista por cima do modal, "Paleta" com ✓ e fundo amarelo, "em uso · 8 produtos" nas usadas, "Remover" só no Açaí, campo "Nome novo" + "+ Criar" no fim |
| 15 | Criar "Açaí no copo"; tentar criar "paleta" | A nova aparece escolhida; a repetida mostra "Já existe uma categoria com esse nome." |
| 16 | Remover "Açaí" → Não → Remover → Sim | Pergunta "Remover “Açaí”?"; no Sim, some da lista |
| 17 | Clicar fora da lista | A lista fecha e o modal continua aberto |
| 18 | Na tabela, Excluir → Sim → Desfazer | Linha fica vermelho-clara com "Excluir este produto? Sim / Não"; depois faixa verde "✓ … foi excluído da lista." e Desfazer devolve a linha no mesmo lugar |
| 19 | Repetir 6, 10 e 14 com a janela em 1280×720 | Nada corta e não aparece barra de rolagem para o lado |
