# Prompt inicial — cole isto no chat do Claude Code (VS Code)

> Copie tudo o que está entre as linhas `=====` e cole como primeira mensagem no Claude Code, com esta pasta aberta no VS Code.

=====

Você vai construir, comigo, o **Sistema de Gestão da BIG LAKE Sorveteria** do zero até o instalador final. Antes de qualquer coisa, leia o `CLAUDE.md` da raiz: ele define seus papéis (Analista de negócio, Arquiteto/Tech Lead, Desenvolvedor full-stack, QA, UX/Acessibilidade, DBA e DevOps/Release), suas regras e o seu jeito de trabalhar. Siga-o em toda a conversa.

## Contexto rápido

- É um programa **instalado no Windows 10 (um .exe com instalador)** que funciona **sem internet**, em um computador da loja.
- O usuário principal é o **Carlos, sócio e pessoa idosa**. O sistema é para controle interno de **ganhos, despesas e, acima de tudo, margem de lucro** de uma sorveteria que fabrica e vende paletas, picolés, sorvete de pote e açaí, no balcão e no atacado (pedidos de mercados, lanchonetes e buffets). O outro sócio é o Paulo (divisão 60/40).
- O cliente **já aprovou um protótipo navegável**. Ele está em `prototipo/` (imagens de todas as telas e modais, os textos de cada tela e o código-fonte do protótipo). A especificação completa está em `docs/`.
- Eu sou o Lucas, o desenvolvedor responsável. Você vai programar o sistema inteiro comigo, mas **as decisões são minhas e do cliente**. Por isso, **me pergunte** sempre que houver dúvida.

## O que eu quero que você faça agora (Fase 0 a 3). Não escreva código do sistema ainda.

### Fase 0 — Leitura
1. Leia `CLAUDE.md`, todos os arquivos de `docs/` e `prototipo/README.md`. Olhe as imagens em `prototipo/telas/`.
2. Me devolva um **resumo de no máximo 15 linhas** do que entendeu: módulos, regras críticas de dinheiro e o que mais te preocupa.
3. Crie `docs/DECISOES.md` (vazio, com um modelo de registro) para anotarmos as decisões.

### Fase 1 — Perguntas de descoberta
4. Use `docs/07-perguntas-em-aberto.md` como ponto de partida e acrescente o que você notar de lacunas ou contradições na especificação.
5. Me faça as perguntas **em lotes de no máximo 5**, numeradas, **cada uma com opções e a sua recomendação**. Comece pelas que mudam a escolha da stack e a arquitetura (computador da loja, impressora, um ou mais computadores, planos de acesso pelo celular ou nuvem no futuro, minha experiência com linguagens).
6. Espere as minhas respostas antes de seguir. Registre cada resposta em `docs/DECISOES.md`.

### Fase 2 — Proposta de stack (eu escolho)
7. Apresente **pelo menos 3 opções de stack** para um app desktop Windows 10 offline. Considere, por exemplo:
   - Tauri 2 + React/TypeScript + SQLite
   - Electron + React/TypeScript + SQLite
   - .NET 8 (WPF ou WinUI 3) + C# + SQLite (EF Core)
   - Flutter (Windows) + Dart + SQLite
   - Qualquer outra que você julgue melhor, explicando o porquê.
8. Compare as opções numa **tabela com notas de 1 a 5** em cada critério:
   - funciona bem no Windows 10 (inclusive em computador simples, com 4 GB de RAM)
   - 100% offline
   - tamanho do instalador e consumo de memória
   - facilidade de fazer a interface do protótipo (letra grande, componentes personalizados, A+/A−)
   - impressão (comprovante de pedido e relatórios) e geração de PDF
   - banco local confiável, backup e restauração simples (pen drive e pasta)
   - testes automáticos (unidade, integração e ponta a ponta)
   - instalador .exe, assinatura de código (evitar alerta do SmartScreen) e atualização de versão
   - **escalabilidade futura**: mais de um computador na loja (rede local), sincronizar com a nuvem, app ou página para o Carlos consultar pelo celular
   - curva de aprendizado e manutenção para mim (Lucas), custo e licenças
9. Dê a **sua recomendação**, os riscos de cada opção e o que mudaria se o projeto crescer. **Espere eu aprovar.**

### Fase 3 — Plano (depois que eu aprovar a stack)
10. Proponha a **arquitetura**: camadas (interface, regras de negócio, acesso a dados), onde ficam os cálculos (num módulo puro e testável, separado da interface), estrutura de pastas, modelo de dados (a partir de `docs/04-modelo-de-dados.md`), estratégia de migrações, backup e auditoria.
11. Proponha o **plano de entregas em fatias pequenas**, cada uma usável e testável. Sugestão de ordem (pode melhorar):
    1. Base do app: janela, menu lateral, barra do topo (ajuda, A−/A+, configurações), padrões de interface (modal, lista suspensa, Editar/Excluir/Desfazer), banco, auditoria e backup.
    2. Cadastros: clientes, fornecedores, estoque/insumos (com entrada de mercadoria).
    3. Receitas e custo (o coração da margem de lucro), categorias com preço fixo e produtos à venda.
    4. Vendas do balcão (fechamento do dia, taxas da maquininha) e pedidos de clientes (com comprovante).
    5. Contas a pagar (com forma de pagamento e cartões) e Sócios (divisão do lucro, reembolsos e retiradas).
    6. Produção (planejar e baixar estoque), Perdas e Patrimônio/Manutenções.
    7. Tela inicial (resumo e avisos), Relatórios (incluindo a Gordurinha) e impressão/PDF.
    8. Instalador, dados iniciais, manual curto para o Carlos e testes de aceitação com o cliente.
12. Para cada fatia: objetivo, telas, regras, testes e critério de pronto.
13. Inclua uma **lista de riscos** (por exemplo: arredondamento de dinheiro, perda de dados, PC fraco, impressora, alerta do antivírus ou SmartScreen) com como mitigar cada um.
14. **Espere eu aprovar o plano** antes de começar a Fatia 1.

## Regras para toda a conversa

- Responda em **português do Brasil**, de forma direta.
- **Pergunte em vez de presumir**: regra de negócio, dado do cliente, prioridade e escolha técnica relevante.
- Não adicione funcionalidade fora do protótipo sem perguntar, e não remova nada que está nele sem perguntar.
- Antes de cada fatia, me mostre o plano curto. Depois de cada fatia, me mostre: o que foi feito, como testar passo a passo, resultado dos testes e as próximas perguntas.
- Trabalhe como um time: o Dev implementa, o QA tenta quebrar, o UX confere contra o protótipo, e o Tech Lead revisa a qualidade antes de me entregar.

Pode começar pela Fase 0.

=====

## Dicas para o Lucas

- Deixe esta pasta como raiz do projeto no VS Code. O Claude Code lê o `CLAUDE.md` sozinho em toda sessão nova.
- Se uma conversa ficar longa, comece outra e diga: "Leia o CLAUDE.md, o docs/DECISOES.md e continue da Fatia X". O registro de decisões evita que ele esqueça o que já foi combinado.
- As perguntas que dependem do Carlos estão marcadas como **[Cliente]** em `docs/07-perguntas-em-aberto.md`. Vale levar essa lista para uma conversa com ele antes de começar.
