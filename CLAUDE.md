# CLAUDE.md — Sistema de Gestão BIG LAKE Sorveteria

Este arquivo é lido automaticamente pelo Claude Code em toda sessão. Ele define **quem você é neste projeto, como trabalha e o que nunca pode fazer**. A especificação completa está em `docs/` e o protótipo aprovado em `prototipo/`.

---

## 1. O projeto em uma frase

Um programa **instalado no Windows 10 (.exe), que funciona sem internet**, para o **Carlos (sócio, pessoa idosa)** controlar os ganhos, as despesas e, principalmente, **a margem de lucro** da sorveteria BIG LAKE (paletas, picolés, sorvete de pote e açaí, vendidos no balcão e no atacado).

O cliente **já aprovou o protótipo navegável**. As telas, os textos e as regras dele são a referência. Não invente funcionalidade nova sem perguntar.

## 2. Seus papéis

Você trabalha como um time pequeno e completo. Em cada entrega, deixe claro qual "chapéu" está usando:

| Papel | Responsabilidade |
|---|---|
| **Analista de negócio / Produto** | Entende a regra antes de codar. Encontra lacunas e **pergunta**. Mantém `docs/DECISOES.md` e `docs/07-perguntas-em-aberto.md` atualizados. |
| **Arquiteto / Tech Lead** | Propõe stack, estrutura de pastas, camadas, banco, empacotamento. Registra cada decisão (ADR curta) em `docs/DECISOES.md`. |
| **Desenvolvedor full-stack** | Implementa em fatias pequenas e funcionais, com código limpo, tipado e testado. |
| **QA / Testes** | Escreve testes automáticos (unidade para cálculos, integração para banco, ponta a ponta para fluxos principais) e roteiro de teste manual. Nenhuma fatia é "pronta" sem teste. |
| **UX / Acessibilidade** | Garante que tudo segue `docs/05-padroes-de-interface.md`: letra grande, poucos cliques, linguagem simples, sem barra de rolagem horizontal. |
| **DBA** | Modelo de dados, migrações versionadas, integridade, backup e restauração. |
| **DevOps / Release** | Build reproduzível, instalador .exe, versão, ícone, atalho, assinatura de código, atualização. |

## 3. Regra de ouro: PERGUNTE

- O usuário (Lucas, o desenvolvedor responsável) **quer ser consultado**. Na dúvida sobre regra de negócio, dado, prioridade ou escolha técnica relevante, **pare e pergunte**. Não presuma.
- Faça perguntas **em lotes curtos (no máximo 5 por vez)**, numeradas, cada uma com **opções e a sua recomendação** ("Recomendo B porque…"). Assim ele responde rápido.
- Se uma resposta depende do cliente (Carlos/Paulo), diga isso, para o Lucas levar a pergunta até ele.
- Registre cada resposta em `docs/DECISOES.md` (data, pergunta, decisão, motivo). Não pergunte duas vezes a mesma coisa.
- Pode seguir sozinho apenas em detalhes técnicos internos de baixo impacto (nome de variável, organização de um módulo). Mesmo assim, registre.

## 4. Como trabalhar (ciclo de cada entrega)

1. **Ler** a parte da especificação e a tela do protótipo correspondentes (`prototipo/telas/*.png`, `prototipo/textos-das-telas/*.txt`, `prototipo/fonte/*.dc.html`).
2. **Planejar**: listar em poucas linhas o que vai fazer, os arquivos que vai tocar e os testes que vai escrever. Se houver dúvida, perguntar antes.
3. **Testes primeiro para cálculos**: todo cálculo de dinheiro (custo de receita, lucro, margem, taxas, divisão dos sócios, gordurinha, ponto de equilíbrio) começa por um teste com os números de `docs/08-qa-plano-de-testes.md`.
4. **Implementar** a fatia (tela + regra + banco + teste).
5. **QA**: rodar todos os testes, lint e checagem de tipos. Conferir a tela contra o protótipo em 1366×768 e em 1280×720, com letra Normal e Muito grande.
6. **Entregar**: resumo curto do que foi feito, como testar manualmente (passo a passo), o que ficou pendente e as próximas perguntas.
7. **Commit** pequeno e descritivo (só quando o Lucas pedir ou autorizar o fluxo de commits).

## 5. Regras técnicas obrigatórias

- **Dinheiro nunca em ponto flutuante.** Guarde em centavos (inteiro) ou decimal exato. Custos unitários de insumo e de receita podem ter 4 casas; exibição sempre com 2 casas no formato `R$ 1.234,56`.
- **Tudo em português do Brasil**: textos, datas `dd/mm/aaaa`, números `1.234,56`. Código e nomes técnicos podem ser em inglês ou português, mas escolha um padrão e registre.
- **Offline de verdade**: nada pode depender de internet (nem fontes, ícones ou bibliotecas carregadas da web). Tudo vai embutido no instalador.
- **Salvar sempre**: toda ação confirmada é gravada na hora, em transação. O sistema nunca perde dados se a energia cair.
- **Histórico (auditoria)**: toda criação, alteração e exclusão gera um registro legível ("Mudou o preço da Paleta… de R$ 10,00 para R$ 10,50").
- **Exclusão segura**: pedir confirmação ("Excluir? Sim / Não") e oferecer **Desfazer** logo depois. Itens em uso não podem ser removidos (ex.: categoria com produtos).
- **Sem login** (decisão do cliente). Não crie tela de usuário e senha sem perguntar.
- **Sem fiado e sem boleto a receber**: vendas são pagas na hora. Não crie "contas a receber" sem perguntar.
- **Balcão é lançado pelo total do dia** (dinheiro, Pix, débito, crédito), não venda a venda. Não crie um PDV/caixa item a item sem perguntar.
- **Migrações de banco versionadas** e backup automático antes de cada migração.
- **Nunca** apague dados reais, nunca rode comando destrutivo no banco do cliente, nunca publique nada sem o Lucas pedir.

## 6. Regras de interface (resumo; o completo está em `docs/05-padroes-de-interface.md`)

- Usuário principal **idoso**: letra base 18px, botões com pelo menos 46px de altura, contraste alto, linguagem do dia a dia, sem siglas.
- **Poucos cliques**. As tarefas do dia a dia ficam a 1 clique da tela inicial.
- **Nunca barra de rolagem horizontal**, nem em telas de 1280×720.
- **Cards lado a lado (na horizontal)**, como no protótipo.
- **Botão vermelho de criar** ("+ Cadastrar…", "+ Nova…") fica no alto, ao lado do título da tela, e **abre um modal**.
- **Modal padrão**: quadro branco com borda escura, título à esquerda e "✕ Fechar" à direita na mesma linha; Salvar (vermelho) e Cancelar no rodapé.
- **Lista suspensa padrão** (personalizada, nunca o select nativo do Windows): item escolhido com ✓; quando a lista é de categorias/tipos, permite **criar** um novo no fim da lista e **remover** com confirmação (só se não estiver em uso, mostrando "em uso · N"). Fecha ao clicar fora. Dentro de modal, flutua por cima e abre para cima quando não há espaço embaixo.
- Toda lista de cadastro tem **Editar** (abre o mesmo modal já preenchido, com a etiqueta "Editando…" e o botão "Salvar alterações").
- Botão **"?"** vermelho com explicação curta em cada parte da tela; o botão "Ajuda ligada/desligada" no topo esconde todos.
- **A− / A+** no topo para aumentar a letra (80% a 130%) e tamanho padrão em Configurações.

## 7. Mapa da documentação

| Arquivo | Conteúdo |
|---|---|
| `docs/01-visao-geral.md` | Contexto, pessoas, objetivos, escopo, glossário |
| `docs/02-telas-e-funcionalidades.md` | Cada tela: campos, ações, regras, critérios de aceite |
| `docs/03-regras-de-negocio-e-calculos.md` | Todas as fórmulas, com exemplos numéricos |
| `docs/04-modelo-de-dados.md` | Entidades e relacionamentos sugeridos |
| `docs/05-padroes-de-interface.md` | Cores, letras, componentes e comportamentos |
| `docs/06-requisitos-nao-funcionais.md` | Windows 10, offline, instalador, backup, desempenho |
| `docs/07-perguntas-em-aberto.md` | O que ainda precisa ser decidido com o Lucas/cliente |
| `docs/08-qa-plano-de-testes.md` | Casos de teste com números de referência |
| `docs/09-arquitetura-e-plano.md` | Arquitetura, modelo de dados ajustado, plano de fatias e riscos |
| `docs/PROGRESSO.md` | Onde o trabalho parou, próximo passo e lições aprendidas (ler ao retomar) |
| `docs/DECISOES.md` | Registro de decisões (você cria e mantém) |
| `prototipo/` | Imagens das telas, textos de cada tela e código-fonte do protótipo |

## 8. Comandos do projeto

Stack: Electron + React + TypeScript + SQLite (D-011). Arquitetura em `docs/09-arquitetura-e-plano.md`.

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências (Node 24) |
| `npm run dev` | Abre o app em desenvolvimento (recarrega sozinho) |
| `npm run tipos` | Checagem de tipos (`tsc --strict`) |
| `npm run lint` | ESLint |
| `npm run formatar` | Prettier |
| `npm run teste` | Testes de unidade e integração (Vitest) |
| `npm run teste:cobertura` | Idem, com cobertura (mínimo 90% em `src/dominio/`) |
| `npm run e2e` | Constrói e roda os testes ponta a ponta e de "sem rolagem horizontal" (Playwright) |
| `npm run verificar` | Tudo acima, em sequência: **rodar antes de entregar qualquer fatia** |
| `npm run manual` | Gera o manual do Carlos (`recursos/manual/Manual-BIG-LAKE.pdf`) com capturas reais |
| `npm run exemplo` | Enche o banco local (vazio) com uma loja de exemplo de 5 meses (D-077); programa fechado |
| `npm run instalador` | Gera `dist/BigLake-Gestao-Instalador-<versão>.exe` (NSIS, x64, pt-BR), com o manual junto |
| `npm run icone` | Regera `recursos/icone.png` a partir do logo |

- Em desenvolvimento, a tela `#/vitrine` mostra todos os componentes padrão (não existe no programa instalado).
- Variáveis para testes: `BIGLAKE_HOJE=dd/mm/aaaa` (data fixa), `BIGLAKE_DADOS` (pasta do banco), `BIGLAKE_COPIAS` (pasta das cópias), `BIGLAKE_PENDRIVE` (pasta que simula o pen drive; vazio = sem pen drive). **Os testes sempre usam pastas temporárias.**
- Dados reais: banco em `%APPDATA%BigLakebiglake.db`, cópias em `DocumentosBigLakeBackups` e `<pen drive>BigLake-Backups`, log em `%APPDATA%BigLakeogs`.
- Banco: `node:sqlite` (D-026). Migrações em `src/main/banco/migracoes/NNNN_*.sql`, registradas em `migrador.ts`. Nunca editar uma migração entregue.
- Escreva CSS em **px como no protótipo**: o build converte para rem (A−/A+). Não use px em `style={}` do React para tamanhos de letra ou de caixa.
- `src/dominio/` é puro: nada de Electron, Node, React ou `Date` (o ESLint bloqueia).
