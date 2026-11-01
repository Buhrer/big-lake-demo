# 09 · Arquitetura e plano de entregas

> Proposta da Fase 3. **Situação: aguardando aprovação do Lucas.** Base: D-001 a D-011 em `DECISOES.md`.

---

## 1. Arquitetura

### 1.1 Processos e camadas

```
┌──────────────────── Processo da interface (renderer, React) ─────────────────────┐
│  telas/  →  componentes/ (Modal, ListaSuspensa, Ajuda "?", Tabela, Desfazer…)    │
│  Usa dominio/ só para mostrar contas "ao vivo" (ex.: custo da receita no modal)  │
│  Fala com o resto SOMENTE por window.api (sem acesso a Node, arquivo ou banco)   │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │ IPC tipado (preload + contextBridge)
                                   │ entradas validadas com zod no processo principal
┌──────────────────────────────────▼──────────── Processo principal (Node) ───────┐
│  ipc/          recebe o pedido, valida, chama o serviço                          │
│  servicos/     um caso de uso por função: abre a transação, chama dominio/,      │
│                grava pelos repositórios e escreve a auditoria NA MESMA transação │
│  repositorios/ único lugar com SQL (node:sqlite, D-026)                          │
│  banco/        conexão (WAL, foreign_keys, synchronous=FULL), migrações          │
│  backup/  impressao/  log/                                                       │
└──────────────────────────────────────────────────────────────────────────────────┘
        dominio/  ← módulo PURO, sem Electron, sem SQL, sem data do sistema
                    (recebe "hoje" como parâmetro). Todos os cálculos ficam aqui.
```

- **Regras de dinheiro só em `dominio/`.** Serviços e telas não fazem conta de dinheiro por conta própria.
- **Relógio injetado**: o serviço recebe `hoje` de um `Relogio`, e os testes fixam a data (ex.: 16/10/2026, como no protótipo).
- **Para crescer (D-002)**: no futuro, `ipc/` ganha um irmão `http/` (servidor na rede local) que chama os **mesmos serviços**. As telas não mudam: o `window.api` passa a falar por HTTP no computador "cliente".

### 1.2 Representação de números (o ponto mais crítico)

| Grandeza | Como guarda | Exemplo |
|---|---|---|
| Dinheiro (preços, totais, contas) | inteiro em **centavos** (`*_centavos`) | R$ 10,00 → `1000` |
| Custo unitário (insumo, custo de cada) | inteiro × 10.000 (`*_x10000`), 4 casas | R$ 2,8264 → `28264` |
| Quantidade (kg, L, un) | inteiro × 1.000 (`*_x1000`), 3 casas | 0,12 kg → `120` |
| Percentual (taxas, sócios, gordurinha) | inteiro × 100 (`*_pct_x100`) | 1,5% → `150`; 60% → `6000` |
| Data do dia (vencimento, venda) | texto `AAAA-MM-DD` (sem fuso, não "anda" de dia) | `2026-10-16` |
| Data e hora (auditoria, backup) | texto ISO com fuso | `2026-10-16T08:02:00-03:00` |

- Multiplicações intermediárias em `BigInt` dentro de `dominio/dinheiro.ts`. **Arredondamento só nos pontos definidos**, sempre "meio para cima" (para negativos, meio para longe do zero). Exemplo: custo de cada = 28264 (4 casas); lucro de cada balcão = 10,0000 − 2,8264 = 7,1736 → exibe **R$ 7,17**; % = 71,736 → **72%**; lucro da receita = 7,1736 × 100 = **R$ 717,36**.
- Formatação pt-BR (`R$ 1.234,56`, `dd/mm/aaaa`) num só lugar (`dominio/formatar.ts`). Nunca usar `toFixed` nem `float`.

### 1.3 Estrutura de pastas

```
biglake-sistema/
├─ docs/  prototipo/
├─ src/
│  ├─ dominio/              # puro + testes ao lado (*.test.ts)
│  │  ├─ dinheiro.ts  formatar.ts  datas.ts
│  │  ├─ receita.ts  insumo.ts  estoque.ts  producao.ts
│  │  ├─ balcao.ts  pedido.ts  perdas.ts  contas.ts
│  │  ├─ socios.ts  meta.ts  gordurinha.ts  patrimonio.ts
│  │  └─ auditoria-textos.ts   # frases "Mudou o preço da … de R$ X para R$ Y"
│  ├─ compartilhado/        # contrato do IPC: tipos + esquemas zod
│  ├─ main/
│  │  ├─ index.ts           # janela (maximizada), ciclo de vida, backup ao fechar
│  │  ├─ banco/  (conexao.ts, migrador.ts, migracoes/0001_base.sql …)
│  │  ├─ repositorios/  servicos/  ipc/
│  │  ├─ backup/  impressao/  log/
│  ├─ preload/index.ts      # expõe window.api tipado
│  └─ renderer/
│     ├─ estilos/ (tokens.css a partir do protótipo, base.css, impressao.css)
│     ├─ layout/ (MenuLateral, BarraTopo, CabecalhoTela)
│     ├─ componentes/ (Botao, Modal, ListaSuspensa, Ajuda, Tabela, Abas, Etiqueta,
│     │               ConfirmarNaLinha, FaixaDesfazer, CampoDinheiro, CampoQuantidade,
│     │               CampoData, Cartao)
│     ├─ telas/ (inicio, vendas, cadastros, producao, estoque, perdas, contas,
│     │          socios, patrimonio, relatorios, configuracoes)
│     ├─ impressao/ (Comprovante, RelatorioImpresso)
│     └─ textos/ajuda.ts    # textos dos "?" copiados de prototipo/textos-das-telas
├─ testes/  integracao/  e2e/  visual/
├─ scripts/seed-dev.ts      # dados do protótipo, SÓ para desenvolvimento e testes
└─ recursos/                # ícone, fontes (Baloo 2, Atkinson Hyperlegible) embutidas
```

**Nomes**: domínio em **português sem acento** (`custoDeCada`, `ClienteRepositorio`, tabelas `snake_case` como `conta_pagar`). Palavras do framework continuam em inglês (`useState`, `onClick`).

### 1.4 Bibliotecas da interface (todas embutidas, nada da internet)
- React + React Router (rotas por hash) + TanStack Query (cache e atualização após salvar).
- `@floating-ui/react` para a lista suspensa (flutuar por cima no modal, abrir para cima).
- `@fontsource` para as fontes, `lucide-react` para os ícones de traço.
- Tamanho da letra: tudo em `rem`, e A−/A+ mudam o `font-size` da raiz (80% a 130%).
- Gráfico de barras (Comparar com o ano passado) em SVG próprio, sem biblioteca.

### 1.5 Modelo de dados

Parte de `04-modelo-de-dados.md`, com estes ajustes:

| Ajuste | Motivo |
|---|---|
| Colunas comuns `id`, `criado_em`, `alterado_em`, `excluido_em` | Exclusão lógica para **Desfazer** e itens "em uso" |
| Unidades de número conforme §1.2 (`_centavos`, `_x10000`, `_x1000`, `_pct_x100`) | Nunca ponto flutuante |
| Pagamento **dentro** de `conta_pagar` (`pago_em`, `forma_pagamento`, `cartao_id`) em vez de uma tabela separada | É sempre 1 para 1; "Desfazer" só limpa os campos |
| `auditoria` ganha `entidade` e `entidade_id` | Achar o histórico de um registro |
| `config_maquininha` com `vigente_desde`; `fechamento_balcao` e `pedido` guardam a taxa do dia | Retrato: o passado não muda |
| `participacao_socio(ano_mes, socio_id, pct_x100)` | Mudar 60/40 não reescreve meses antigos (depende da Q-53) |
| `config(chave, valor)` para preferências, empresa e gordurinha | Simples e sem migração para cada nova preferência |
| **Pendentes**: `entrada_mercadoria` × `lote` (Q-43, Q-44), unidade "lata" (Q-45), produto "caixa" (Q-14, Q-54), gás e energia (Q-46) | Decidir antes da fatia 2/3 |

- Restrições no banco: `CHECK` em valores (centavos ≥ 0, percentuais entre 0 e 10000), `UNIQUE` em `fechamento_balcao.data` e `pedido.numero`, chaves estrangeiras ligadas.
- Índices nas datas (`data`, `vencimento`, `pago_em`) para os relatórios de 10 anos.

### 1.6 Migrações
- Arquivos SQL numerados (`0001_base.sql`, `0002_cadastros.sql` …), **um por fatia**, nunca editados depois de entregues.
- Versão no `PRAGMA user_version`. Ao abrir: se há migração pendente → **backup automático** → aplica cada migração **numa transação** → se falhar, volta atrás, restaura e mostra um aviso simples.
- Ao abrir, roda `PRAGMA quick_check`. Se o banco estiver danificado, oferece "Restaurar a última cópia boa".
- Testes de integração rodam todas as migrações num banco vazio e num banco com dados da versão anterior.

### 1.7 Backup e restauração
- Banco em `%APPDATA%\BigLake\biglake.db`, fora da pasta do programa (D-007).
- Cópia **a quente** com a API de backup do SQLite (`backup()` do node:sqlite), conferida com `quick_check` e gravada como `biglake_AAAA-MM-DD_HHMM.db`.
- Destinos: `Documentos\BigLake\Backups` e **pen drive** (detecta unidades removíveis e grava em `<pen drive>\BigLake-Backups`).
- Quando: ao fechar (se ligado), "Fazer cópia agora", antes de migrar, antes de restaurar. Proposta extra (Q-52): também ao abrir e a cada 2 horas, só na pasta.
- Guarda as N últimas cópias em cada destino (Q-40). A barra do topo mostra o estado e avisa se o pen drive faltou ou se a cópia está atrasada.
- **Restaurar**: confirmação → cópia do estado atual → troca o arquivo → reabre o banco → roda migrações (a cópia pode ser de uma versão antiga) → registra no histórico.

### 1.8 Auditoria e exclusão segura
- Todo serviço que grava chama `auditar({modulo, acao, entidade, id, antes, depois})` **na mesma transação**. A frase legível vem de `dominio/auditoria-textos.ts` ("Mudou o preço da Paleta: R$ 10,00 → R$ 10,50").
- Excluir = preencher `excluido_em`. Desfazer = limpar `excluido_em` e registrar "Desfez a exclusão de …". Desfazer que mexe em estoque (perda, produção) reverte os movimentos na mesma transação.
- "Em uso · N": o repositório conta as referências ativas e o serviço bloqueia a remoção.
- O histórico mostra data/hora e o que mudou. Não mostra "quem", porque não há login (ver Q-09).

### 1.9 Impressão e PDF
- Comprovante e relatórios são **rotas de impressão** em React com `impressao.css` (sem menu, botões ou "?", cabeçalho com os dados da empresa).
- O processo principal abre uma janela invisível com essa rota. "Imprimir" usa `webContents.print()` (janela do Windows para escolher a impressora). "Salvar em PDF" usa `printToPDF()` com sugestão em `Documentos\BigLake\Relatórios`.
- Comprovante com largura que cabe em A4 e em 80 mm (D-004).

### 1.10 Qualidade
- `tsc --strict`, ESLint, Prettier. Um comando `npm run verificar` roda tudo + testes.
- **Unidade** (Vitest): `dominio/` com cobertura ≥ 90%, casos de `08-qa-plano-de-testes.md` escritos **antes** do código.
- **Integração** (Vitest no Node 24, que tem o mesmo node:sqlite do Electron): migrações, transações, auditoria, desfazer, backup e restauração, em banco temporário.
- **Ponta a ponta** (Playwright + Electron): pasta de dados temporária, data fixa, carga de dados do protótipo.
- **Visual e acessibilidade** (Playwright): toda tela em 1366×768 e 1280×720 com letra 80% e 130%. Teste automático de **"sem rolagem horizontal"** (`scrollWidth ≤ clientWidth`), capturas para comparar com `prototipo/telas/` e verificação de contraste com axe-core.
- Log de erros em arquivo rotativo (`%APPDATA%\BigLake\logs`), sem dados de clientes.

---

## 2. Plano de entregas

Cada fatia termina com: **testes passando, lint e tipos sem erro, tela conferida com o protótipo nas 4 combinações de tela e letra, histórico gravando, roteiro de teste manual e perguntas pendentes registradas** (definição de pronto de `08`). Cada fatia traz sua migração.

Mudanças em relação à sua sugestão:
1. A Fatia 1 foi dividida em **1A (interface)** e **1B (banco, auditoria, backup)**, porque era grande demais para uma entrega só.
2. O **instalador sai já na Fatia 1B**, para ser testado **no computador da loja** (SmartScreen sem assinatura, antivírus, desempenho com 4 GB) logo no começo e não no fim.
3. Mesmo com o uso só no final (D-009), proponho **duas demonstrações ao Carlos** (depois das Fatias 3 e 5), para pegar erros de entendimento enquanto é barato corrigir.

### Fatia 1A · Esqueleto e padrões de interface
- **Objetivo**: janela do app com a cara do protótipo e todos os componentes padrão prontos para reutilizar.
- **Telas**: menu lateral (todas as entradas, telas vazias com título), barra do topo (A−/A+, Ajuda ligada/desligada, Configurações), cabeçalho de tela. Uma tela interna "Vitrine" (só em desenvolvimento) com todos os componentes.
- **Componentes**: Botão (4 tipos), Modal padrão, Lista suspensa (com criar/remover/"em uso · N", flutuando e abrindo para cima no modal), Ajuda "?", Tabela, Abas/filtros, Etiquetas, Confirmar na linha, Faixa Desfazer, Campo dinheiro, Campo quantidade, Campo data `dd/mm/aaaa`.
- **Regras**: `dominio/dinheiro.ts`, `formatar.ts`, `datas.ts`.
- **Testes**: unidade de arredondamento e formatação (bordas: 0, negativo, meio centavo); ponta a ponta de lista suspensa, modal e A−/A+; visual "sem rolagem horizontal" em todas as combinações.
- **Pronto quando**: navegar por todas as entradas do menu, A+ até 130% sem rolagem horizontal em 1280×720, componentes iguais ao protótipo.

### Fatia 1B · Banco, auditoria, backup, Configurações e instalador
- **Objetivo**: base de dados confiável e a primeira instalação real.
- **Telas**: Configurações (cópia de segurança, tamanho da letra padrão, histórico, dados da empresa); estado do backup na barra do topo.
- **Regras**: R17, R18; migrador; preferências.
- **Testes**: integração de migração (vazio e com dados), transação desfeita em erro, auditoria, backup, restauração com cópia prévia, pen drive ausente; robustez T14 (matar o processo no meio de um salvamento).
- **Pronto quando**: o instalador `.exe` instala no computador da loja, abre em até 5 s, faz cópia na pasta e no pen drive ao fechar, e restaura.

### Fatia 2 · Cadastros e estoque
- **Objetivo**: clientes, fornecedores e insumos com entrada de mercadoria.
- **Telas**: Cadastros › Clientes e Fornecedores (lista, busca, modal, Editar); Estoque e Insumos (filtros, lista, modal de cadastro/entrada/edição); atalho "Chegou mercadoria".
- **Regras**: R2, R6 (situação, vencendo), histórico de custo (base do R5).
- **Testes**: T4; situação Comprar/OK; etiquetas de validade (3 e 7 dias); entrada soma estoque e atualiza custo; auditoria de cada alteração.
- **Antes de começar, responder**: Q-43, Q-44, Q-45, Q-46, Q-17, Q-18, Q-20.

### Fatia 3 · Receitas, custo e produtos à venda (coração da margem)
- **Objetivo**: saber quanto custa e quanto sobra de cada sabor.
- **Telas**: Produção › Receitas (lista por categoria, "menor lucro", modal em 3 partes); Cadastros › Produtos à venda; categorias com preço (lista suspensa com criar/remover).
- **Regras**: R1, R3, R4, R5 (aviso "O custo subiu", recalculado a partir do histórico de custo); histórico de preço da categoria.
- **Testes**: T1, T2, T3 (unidade, escritos primeiro); preço mudado na receita vale para a categoria inteira; categoria em uso não pode ser removida; ponta a ponta "cadastrar receita".
- **Antes de começar, responder**: Q-14, Q-54, R5 (tempo do aviso / botão "Entendi"), insumo usado em receita (R17).
- **Demonstração 1 ao Carlos** no fim desta fatia.

### Fatia 4 · Vendas do balcão e pedidos
- **Objetivo**: lançar o dia e os pedidos, com comprovante.
- **Telas**: Vendas e Pedidos (3 abas), comprovante impresso e em PDF; "Novo pedido" a partir do cliente.
- **Regras**: R8, R9; um fechamento por dia; numeração sequencial; retrato de preço e taxa.
- **Testes**: T5, T6; não duplicar dia; pedido antigo mantém o preço; ponta a ponta "lançar o dia" e "fazer pedido e imprimir".
- **Antes de começar, responder**: Q-10, Q-11, Q-12, Q-15, Q-25, Q-26.

### Fatia 5 · Contas a pagar e Sócios
- **Objetivo**: despesas, cartões e a divisão do lucro.
- **Telas**: Contas a pagar (cards, filtros, modais de conta e pagamento, cartões); Sócios (mês, participação, quanto cada um recebe, reembolsos, retiradas, modal de retirada).
- **Regras**: R11, R12; conta que repete (dia 31 → último dia do mês); reembolso de cartão pessoal; ligação com a entrada de mercadoria (se Q-17 = sim).
- **Testes**: T7, T11; desfazer pagamento remove o reembolso; ponta a ponta "pagar conta com cartão pessoal e ver em Sócios".
- **Antes de começar, responder**: Q-24, Q-27, Q-29, Q-31, Q-32, Q-33/53, Q-34, Q-47, Q-49, Q-50.
- **Demonstração 2 ao Carlos** no fim desta fatia.

### Fatia 6 · Produção, Perdas e Patrimônio
- **Objetivo**: baixar estoque pela produção, anotar perdas e cuidar dos bens.
- **Telas**: Produção › Planejar; Perdas (modal com vários itens, resumo, trocas por cliente); Patrimônio (bens, manutenções, modal com pagamento).
- **Regras**: R7, R10, R16; manutenção gera conta a pagar; "Gás e energia" não baixa estoque.
- **Testes**: T10, T12, T13; desfazer perda devolve o estoque; transação completa em produção e manutenção.
- **Antes de começar, responder**: Q-19, Q-21, Q-22, Q-23, Q-28, Q-30, Q-48.

### Fatia 7 · Início, Relatórios e Gordurinha
- **Objetivo**: o resumo do dia e os 7 relatórios, impressos e em PDF.
- **Telas**: Início (atalhos, cards, meta, avisos); Relatórios (7), versão de impressão.
- **Regras**: R13, R14, R15; avisos (estoque baixo, vencendo, contas, custo subiu, dia sem lançamento); frases de conclusão.
- **Testes**: T8, T9 (todos os casos); relatórios de 1 ano em até 3 s com 10 anos de dados simulados; PDF gerado sem programa externo.
- **Antes de começar, responder**: Q-35, Q-36, Q-37, Q-51.

### Fatia 8 · Entrega
- **Objetivo**: instalar para valer.
- **Conteúdo**: dados iniciais reais (categorias e preços, tipos de conta, tipos de bem, sócios, taxas, empresa) e importação, se houver (Q-39); manual curto e ilustrado para o Carlos; manual de instalação e atualização para o Lucas; roteiro de aceitação de `08`; README com todos os comandos e `CLAUDE.md` §8 preenchido.
- **Lembrete do Lucas (D-051)**: fazer o teste rápido na loja com a versão final (dados da empresa, cópia no pen drive, um insumo e uma receita, fechar e conferir a cópia) e depois apagar `%APPDATA%\BigLake` e `Documentos\BigLake` para o Carlos começar do zero. Medir a memória no PC da loja.
- **Pronto quando**: o roteiro de aceitação foi feito com o Carlos no computador da loja e o backup no pen drive foi conferido.

---

## 3. Riscos

| # | Risco | Mitigação |
|---|---|---|
| 1 | **Erro de arredondamento** no dinheiro | Inteiros (§1.2), arredondamento só em pontos definidos, testes com os números de `08` + bordas, cobertura ≥ 90% em `dominio/` |
| 2 | **Perda de dados** por queda de luz | SQLite em WAL + `synchronous=FULL`, cada ação numa transação, teste matando o processo no meio |
| 3 | **Sem cópia do dia** porque o PC foi desligado direto | Cópia também ao abrir e periódica (Q-52); aviso no topo quando a cópia está atrasada |
| 4 | **Disco do PC morre** ou pen drive esquecido | Dois destinos; aviso quando o pen drive não estava conectado; orientar guardar o pen drive fora da loja |
| 5 | **Pen drive perdido** com dados de clientes (LGPD) | Decidir criptografia (Q-40); guardar no pen drive só o banco, sem exportações soltas |
| 6 | **Atualização estraga os dados** | Backup automático antes de migrar, migração em transação, teste com banco da versão anterior |
| 7 | **SmartScreen / antivírus** sem assinatura (D-006) | Instalador testado no PC da loja já na Fatia 1B; teste no VirusTotal; instrução para liberar. Se o antivírus bloquear de forma recorrente, rever D-006 (Azure Trusted Signing, ≈US$ 10/mês) |
| 8 | **PC fraco / lento** | Medir abertura e trocas de tela no próprio PC desde a 1B; consultas com índice; uma janela só |
| 9 | **Escala do Windows (125%/150%)**: num monitor 1366×768 a 125%, a área útil cai para ≈1093×614 e pode aparecer rolagem horizontal | Conferir a escala do PC da loja; testar o visual também nessa área; se preciso, compensar o zoom da janela |
| 10 | **Relógio do PC errado** (data errada nas vendas e contas) | Ao abrir, avisar se a data de hoje é anterior ao último lançamento |
| 11 | **Impressora / driver** | Impressão pela janela padrão do Windows (D-004); testar no PC da loja na Fatia 4; PDF como alternativa |
| 12 | **Banco e versão do Electron** | Resolvido com node:sqlite (D-026): sem módulo nativo para recompilar |
| 13 | **Entendimento errado das regras** (sobretudo lucro, sócios e gordurinha) | Perguntas antes de cada fatia, demonstrações após as Fatias 3 e 5, frases e números do protótipo como teste |
| 14 | **Escopo crescendo** | Nada fora do protótipo sem pergunta registrada em `DECISOES.md` |
| 15 | **Dias sem lançamento do balcão** (lucro do mês errado sem ninguém perceber) | Aviso no Início com os dias de loja aberta sem fechamento (Q-10) |
