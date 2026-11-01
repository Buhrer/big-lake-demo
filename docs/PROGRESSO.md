# Progresso e retomada (para o Claude Code)

> Leia este arquivo quando o Lucas disser **"Seguir"** numa conversa nova. Depois leia `CLAUDE.md`, `docs/DECISOES.md` (todas as decisões, D-001 a D-076) e `docs/09-arquitetura-e-plano.md`. Atualizado em 29/10/2026.

## Onde estamos

| Fatia | Situação | Commit |
|---|---|---|
| 1A · esqueleto e padrões de interface | ✅ pronta | 965a54a |
| 1B · banco, histórico, cópias, Configurações, instalador | ✅ pronta | c9135a1, aa91fca |
| 2 · cadastros (clientes, fornecedores) e estoque (validade por compra) | ✅ pronta | 890d905, 6893756, 2af131f |
| 3 · categorias, receitas (custo e margem), gás e energia, produtos à venda, aviso "O custo subiu" | ✅ pronta | 88b42f6, 6f98dec, 9e6bc93 |
| Letra Pequena + versão 0.3.1 | ✅ | b1498ea |
| 4 · vendas do balcão, pedidos (comprovante), resumo das vendas | ✅ pronta | 86eadfd |
| 5 · contas a pagar, sócios, "Como contar o lucro", categorias iniciais (D-062) | ✅ pronta | ef5dc56 |
| 6A · produção › planejar, registrar, produções do mês (D-064, D-065, D-068) | ✅ pronta | 907d4f4 |
| 6B · perdas (D-069) | ✅ pronta | c190c71 |
| 6C · patrimônio e manutenções (D-066, D-067, D-070) | ✅ pronta | 62b4340 |
| 7A · Início: atalhos, cards do mês, meta, avisos (D-071, D-072) | ✅ pronta | adc97a0 |
| 7B · relatórios (6, sem a Gordurinha), Imprimir, Salvar em PDF (D-073) | ✅ pronta | c45788f |
| 7C · Gordurinha: cálculo, base e %, contas fixas, "Já reajustei", card no Início (D-074) | ✅ pronta | 7e249ab |
| 8 · entrega: manual, T14, aceitação, versão 0.9.0 (D-075) | ✅ pronta (falta a aceitação na loja) | 4d263a4 |
| 8B · ajustes do teste de uso de 2 meses: número errado, clique duplo, Esc, compra → conta, relógio, cópias, balcão zerado (D-089 a D-095); versão 0.9.1 | ✅ pronta | 271cee0 |
| **Teste na loja e aceitação com o Carlos → 1.0.0** | ⏭️ **com o Lucas** | — |

- Testes agora (Fatia 8B): **413** de unidade/integração (inclui 10 anos de dados) e **80** ponta a ponta, todos verdes (`npm run verificar` com código 0 em 29/10/2026).
- Instalador mais novo gerado: `dist/BigLake-Gestao-Instalador-0.9.1.exe` (todas as fatias e a 8B, com o manual). Lucas instalou a 0.3.0 na loja (D-051).
- Migrações: 0001 a 0012 (`src/main/banco/migracoes/`). A próxima é **0013**.
- Contas a pagar no Início ficam para a Fatia 7 (a bolinha do menu já funciona).

## Próximo passo: teste na loja e aceitação (com o Lucas)

1. O Lucas leva `dist/BigLake-Gestao-Instalador-0.9.1.exe` (suba antes no VirusTotal, D-006) e faz o **teste rápido** (D-051): dados da empresa, cópia no pen drive, um insumo e uma receita, fechar e conferir a cópia; **medir a memória** no PC da loja; depois **apagar `%APPDATA%BigLake` e `DocumentosBigLake`**.
2. Faz com o Carlos o **primeiro dia** (manual, parte 14) e o **roteiro de aceitação** (`docs/roteiros/aceitacao.md`), anotando o que travou.
3. Quando o Lucas voltar com as anotações: corrigir em fatias pequenas (com teste), `npm run manual` se alguma tela mudou, versão **1.0.0** em `package.json`, `npm run verificar`, `npm run instalador`, commit.

## Como trabalhar neste projeto (lições aprendidas)

- **Todo botão que grava** (D-089, D-090): `const salvarUmaVez = useUmaVezPorVez(salvar)` (antes de qualquer `return` antecipado, senão o ESLint reclama) e, no começo do `salvar`, `const errado = numeroErradoNaTela(); if (errado) return setErro(errado)`. Sem isso, clique duplo grava duas vezes e texto errado num campo de número vira zero.
- **Teste de uso de verdade** (29/10/2026): um roteiro Playwright que abre o programa dia após dia com `BIGLAKE_HOJE` e as mesmas pastas achou o que os testes por tela não acham (clique duplo, número errado, compra fora do lucro). Vale repetir antes de cada versão grande. Para simular falta de luz, mate o processo principal pelo número (`taskkill /F /T /PID`); o `kill` do Playwright não fecha o Electron no Windows.
- **Ciclo de cada fatia**: plano curto → testes do `dominio/` primeiro (números do `docs/08`) → migração → serviço + IPC (`src/compartilhado/contrato.ts`, `src/preload/index.ts`, `src/main/ipc.ts`) → tela → testes de integração e ponta a ponta → capturas de tela comparando com o protótipo (1366×768 e 1280×720 a 130%) → `docs/roteiros/fatia-N.md` → `npm run verificar` → commit **só se `verificar` terminar com código 0** (D-024).
- **Commit**: `git -c core.safecrlf=false commit`, mensagem em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nunca push.
- **Não use crases (template literals) dentro de `node -e "..."` ou heredoc com aspas duplas no bash**: o bash executa as crases e estraga o código. Para editar TypeScript com `${...}`, use a ferramenta Edit/Write.
- A ferramenta Edit/Write transforma ` ` (e outros escapes `\u`) no caractere literal; para gravar o escape, use script node com `String.fromCharCode(92) + 'u00a0'`.
- O VS Code define `ELECTRON_RUN_AS_NODE`; os testes e scripts que abrem o Electron removem essa variável (`testes/e2e/app.ts`).
- Banco: `node:sqlite` (D-026), sem módulo nativo. Testes de integração rodam no Node comum (pasta temporária, `testes/integracao/ajuda.ts`). Nos E2E, o app usa `BIGLAKE_DADOS`, `BIGLAKE_COPIAS`, `BIGLAKE_PENDRIVE` e `BIGLAKE_HOJE=16/10/2026`.
- Ao criar tabela nova, atualizar a lista de tabelas em `testes/integracao/banco.test.ts`.
- Banco novo já vem com as categorias Paleta, Picolé e Pote (D-062): testes de integração que precisam começar sem categorias chamam `semCategoriasIniciais(s.db)`; os E2E usam a categoria que já existe.
- **Não rode `npm run formatar` sem conferir**: ele reformata CLAUDE.md, PROMPT_INICIAL.md e outros arquivos fora da fatia; desfaça esses antes do commit.
- Os testes E2E "ao abrir faz cópia…" e "dados da empresa…" (configuracoes.spec) já falharam uma vez cada no `verificar` e passam sozinhos: se falharem, repita antes de mexer.
- Perdas (6B) usam a troca de mês como Sócios e uma *container query* em rem para Editar/Excluir lado a lado só quando cabe (`.lista-perdas`); bom modelo para listas largas.
- Conta criada por outro módulo (manutenção): `salvarConta`/`excluirConta`/`desfazerExclusaoConta` recebem `{ daManutencao: true }`; sem isso, a conta ligada fica travada (D-070). `CamposPagamento` e `Escolha` (de `telas/contas`) servem para outros modais.
- Relatórios (7B): um componente `ConteudoRelatorio` serve à tela e à página de impressão (`#/imprimir/relatorio/:id/:anoMes`); PDF por `gerarPdf` (impressao.ts) e "Salvar como" em index.ts; nos testes vai para `<dados>/Relatórios`.
- Cabeçalho com muitos controles: `CabecalhoTela quebra`. Grade que troca de 2 para 4 colunas ou lista que sobe: *container query* em rem (acompanha o A+/A−).
- Manual (Fatia 8): `npm run manual` monta uma loja de exemplo, tira as capturas e gera o PDF por `printToPDF`; fica fora do `verificar` (`playwright.manual.config.ts`). O PDF vai no instalador por `extraResources`.
- **`npm run dev` e processo principal**: a tela recarrega sozinha, mas o processo principal e o preload (IPC novo, serviço novo) só mudam reiniciando o `npm run dev`. Sem isso, a chamada nova falha; os históricos mostram "Não deu para carregar esta lista" (D-086).
- **Campo de quantidade (`EntradaNumero`)**: nunca ponha o valor na `key` (o campo é recriado a cada tecla e perde o cursor: "20" vira "2"); ele já se atualiza sozinho quando não está em edição. Nos E2E, além de `fill`, digite com `pressSequentially` e confira `toBeFocused`.
- Lista suspensa nos E2E: `getByRole('combobox', { name: '<rótulo>' })`.
- Labels repetidos nos testes: use `{ exact: true }` (o "?" de ajuda tem aria-label "Ajuda: …").
- Campos de formulário em `.campos` usam subgrid (D-053); a lista suspensa aceita `rotuloOculto`.
- Mensagens ao usuário em linguagem simples; frases do Histórico legíveis ("Mudou … de X → Y"); dinheiro sempre com `dominio/dinheiro.ts` e `dominio/formatar.ts` (nunca float).
