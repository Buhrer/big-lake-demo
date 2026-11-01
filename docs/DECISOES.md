# Registro de decisões

Cada decisão tomada com o Lucas (ou com o cliente, via Lucas) fica registrada aqui. **Não perguntar de novo o que já está aqui.** Para mudar uma decisão, crie uma nova entrada que a substitui e marque a antiga como "Substituída por D-NNN".

- **Origem**: Lucas · Cliente (Carlos/Paulo) · Contador · Técnica (decisão interna de baixo impacto do Claude, registrada para transparência)
- **Pergunta**: número em `07-perguntas-em-aberto.md`, quando houver.
- **Situação**: Valendo · Substituída por D-NNN · Provisória (aguardando o cliente)

## Modelo

```markdown
### D-NNN · Título curto
- **Data**: dd/mm/aaaa
- **Origem**: Lucas | Cliente | Contador | Técnica
- **Pergunta**: Q-NN (se houver)
- **Decisão**: o que foi decidido, em uma ou duas frases.
- **Motivo**: por que (opções consideradas, se relevante).
- **Impacto**: telas, regras, tabelas ou testes afetados.
- **Situação**: Valendo
```

## Decisões

### D-001 · Computador da loja
- **Data**: 27/10/2026
- **Origem**: Lucas/Cliente
- **Pergunta**: Q-01
- **Decisão**: Windows 10 64 bits, 4 GB de RAM ou mais, com SSD.
- **Motivo**: Informação do ambiente real da loja.
- **Impacto**: Build só x64 (sem 32 bits). Meta de desempenho continua sendo 4 GB de RAM. Pendente: confirmar a versão do Windows (ex.: 22H2), se o WebView2 já está instalado e se há internet.
- **Situação**: Valendo

### D-002 · Um computador agora, talvez dois no futuro
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-02
- **Decisão**: Começa com um computador. Pode haver um segundo (balcão + escritório) no futuro.
- **Motivo**: Necessidade atual é um só; deixar a porta aberta sem custo agora.
- **Impacto**: Banco local (SQLite) agora. Todo acesso a dados passa por uma camada de repositórios/serviços, para trocar por um servidor local no futuro sem reescrever. Não usar SQLite compartilhado em pasta de rede.
- **Situação**: Valendo

### D-003 · Sem celular e sem nuvem
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-03
- **Decisão**: Não há planos de consulta pelo celular nem de backup na nuvem.
- **Motivo**: Decisão do cliente.
- **Impacto**: Nada de nuvem no escopo nem na arquitetura de agora. Mantém-se só o mínimo exigido por `06-requisitos-nao-funcionais.md` (regras isoladas, identificadores estáveis), que já serve a D-002.
- **Situação**: Valendo

### D-004 · Impressora comum A4
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-05
- **Decisão**: Impressão em impressora comum A4, pelo driver padrão do Windows.
- **Motivo**: É a impressora da loja.
- **Impacto**: Comprovante e relatórios impressos como página (HTML/CSS de impressão → impressora ou PDF). Sem ESC/POS. O layout do comprovante fica estreito o bastante para caber em 80 mm, caso troquem de impressora.
- **Situação**: Valendo

### D-005 · Experiência do Lucas: TypeScript/React
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Q-04
- **Decisão**: O Lucas domina e quer manter TypeScript/React.
- **Motivo**: Manutenção de longo prazo pelo próprio Lucas; reaproveita o HTML/CSS do protótipo.
- **Impacto**: As opções de stack com interface web (Tauri ou Electron + React/TS) ganham peso na comparação da Fase 2.
- **Situação**: Valendo

### D-006 · Sem certificado de assinatura de código
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Q-06
- **Decisão**: Não comprar certificado. O Lucas instala pessoalmente e passa pelo aviso do SmartScreen.
- **Motivo**: Evitar custo anual; a instalação é feita pelo próprio desenvolvedor.
- **Impacto**: Instalador sem assinatura. Manual de instalação para o Lucas deve explicar "Mais informações › Executar assim mesmo" e, se preciso, como liberar no antivírus. Risco de falso positivo de antivírus fica registrado no plano.
- **Situação**: Valendo

### D-007 · Atualização por instalador levado pelo Lucas
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Q-41
- **Decisão**: Atualizações chegam por um instalador novo levado pelo Lucas (pen drive ou acesso remoto). Sem atualização automática pela internet.
- **Motivo**: Coerente com D-003 (sem nuvem) e com o uso offline.
- **Impacto**: O instalador novo deve preservar os dados (pasta do usuário, fora da pasta do programa), fazer backup automático e rodar as migrações ao abrir.
- **Situação**: Valendo

### D-008 · Carlos e Paulo usam o mesmo computador
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-07
- **Decisão**: Os dois sócios usam o sistema, no mesmo computador. Funcionários não usam.
- **Motivo**: Informação do cliente.
- **Impacto**: Reabre a Q-09 (saudação fixa "Bom dia, Carlos!" ou escolher quem está usando) e dá mais peso à Q-08 (PIN para ações sensíveis). Perguntar num próximo lote.
- **Situação**: Valendo

### D-009 · Entrega completa (fatias 1 a 8) antes do uso
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Q-42
- **Decisão**: O Carlos começa a usar o sistema só com todas as fatias prontas.
- **Motivo**: Escolha do Lucas.
- **Impacto**: As fatias continuam pequenas e testáveis, mas a aceitação com o cliente é feita no fim. Sugerir demonstrações intermediárias ao Carlos para pegar erros de entendimento cedo. Prazo ainda não informado.
- **Situação**: Valendo

### D-010 · Relatórios só em PDF e impressão
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-38
- **Decisão**: Relatórios apenas impressos e em PDF, como no protótipo. Sem Excel/CSV.
- **Motivo**: Fiel ao protótipo aprovado.
- **Impacto**: Nenhuma exportação de planilha. Pode ser acrescentada depois, se o contador pedir.
- **Situação**: Valendo

### D-011 · ADR: Stack Electron + React + TypeScript + SQLite
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Fase 2 (proposta de stack)
- **Decisão**: Electron + React + TypeScript (strict) + SQLite via better-sqlite3 (Kysely para consultas tipadas). Ferramentas: electron-vite, Vitest, Playwright (Electron), ESLint + Prettier, electron-builder (NSIS, pt-BR, x64).
- **Motivo**: Nota 44 contra 40 (Tauri), 37 (.NET WPF) e 35 (Flutter). Tudo em TypeScript, que o Lucas domina (D-005). Transações síncronas reais, backup a quente, impressão e PDF nativos (`print`/`printToPDF`), Chromium embutido (offline sem depender do WebView2), Playwright com suporte oficial. O CSS do protótipo é reaproveitado.
- **Impacto**: Instalador de ≈90 MB e ≈250 MB de RAM, aceitável no PC da loja (D-001). Módulo nativo precisa ser recompilado para a versão do Electron. Para crescer (D-002), o processo principal pode expor um servidor na rede local.
- **Alternativas descartadas**: Tauri 2 (WebView2, Rust para banco e PDF, testes ponta a ponta frágeis); .NET WPF (C# desconhecido, refazer a interface em XAML); Flutter (Dart, impressão menos madura).
- **Situação**: Valendo

### D-012 · Cópia de segurança também ao abrir e a cada 2 horas
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-52
- **Decisão**: Além da cópia ao fechar (pasta + pen drive), fazer cópia ao abrir e a cada 2 horas com o sistema aberto, só na pasta `Documentos\BigLake\Backups`.
- **Motivo**: Proteger o dia quando o PC é desligado direto ou falta luz.
- **Impacto**: Fatia 1B. A barra do topo mostra a última cópia feita, de qualquer tipo.
- **Situação**: Valendo

### D-013 · Guardar 30 cópias na pasta e 10 no pen drive, sem senha
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-40
- **Decisão**: Manter as 30 cópias mais recentes na pasta e as 10 mais recentes no pen drive. Sem criptografia.
- **Motivo**: Senha esquecida tornaria a cópia inútil. Risco aceito: pen drive perdido expõe dados de clientes (orientar guardar em lugar seguro).
- **Impacto**: Fatia 1B (limpeza das cópias antigas).
- **Situação**: Substituída por D-094 (quantas cópias guardar; a parte "sem senha" continua valendo)

### D-014 · Saudação "Bem-vindo!" no Início
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-09
- **Decisão**: O título do Início é uma mensagem de boas-vindas sem nome ("Bem-vindo!"), no lugar de "Bom dia, Carlos!". A data por extenso continua acima.
- **Motivo**: Carlos e Paulo usam o mesmo computador (D-008).
- **Impacto**: Fatias 1A e 7. Sem escolha de usuário ao abrir; o histórico não mostra "quem".
- **Situação**: Valendo

### D-015 · Sem PIN
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)
- **Pergunta**: Q-08
- **Decisão**: Nenhum PIN. Ações sensíveis (restaurar cópia, mudar a porcentagem dos sócios) só pedem confirmação "Sim / Não".
- **Motivo**: Fiel à decisão "sem login". Restaurar já faz uma cópia do estado atual antes.
- **Impacto**: Fatias 1B e 5.
- **Situação**: Valendo

### D-016 · Telas de 1366 até 1920 de largura
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Fase 3, pergunta 5a
- **Decisão**: Os monitores vão de 1366×768 a 1920×1080.
- **Motivo**: Informação do ambiente.
- **Impacto**: Testes visuais em 1280×720 (= 1920 a 150%), 1366×768 e 1920×1080. A escala do Windows na loja ainda não foi informada: 1366 a 125% dá ≈1093 px úteis (risco 9 do plano).
- **Situação**: Valendo

### D-017 · Plano da Fase 3 aprovado; prazo desejado
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Fase 3
- **Decisão**: Aprovados a arquitetura, o modelo de dados ajustado, o plano de fatias e os riscos de `09-arquitetura-e-plano.md`. Prazo desejado: entrega completa até a semana seguinte (≈03/11/2026), se possível.
- **Motivo**: Aprovação do Lucas.
- **Impacto**: O gargalo do prazo são as ≈35 perguntas que dependem do cliente. Elas precisam ir ao Carlos de uma vez, já nesta semana.
- **Situação**: Valendo

### D-018 · Nomes no código em português
- **Data**: 27/10/2026
- **Origem**: Técnica
- **Decisão**: Domínio em português sem acento (`custoDeCada`, `TelaInicio`, `conta_pagar`); palavras do framework continuam em inglês. Testes descritos em português.
- **Motivo**: Mesmo vocabulário da especificação e do protótipo.
- **Situação**: Valendo

### D-019 · Números de dinheiro e arredondamento
- **Data**: 27/10/2026
- **Origem**: Técnica (aprovada com o plano, D-017)
- **Decisão**: Centavos inteiros; custo ×10.000; quantidade ×1.000; percentual ×100. Contas em BigInt e arredondamento "meio para cima" (negativos: meio para longe do zero) em `src/dominio/dinheiro.ts`. Formatação própria (sem Intl): negativo com "−" (U+2212), como no protótipo ("− R$ 33.850,00"). Leitura do que se digita: vírgula é decimal; sem vírgula, ponto com 1–2 casas no fim é decimal, senão é milhar.
- **Motivo**: Nunca ponto flutuante (CLAUDE.md §5); resultado idêntico em qualquer computador.
- **Situação**: Valendo

### D-020 · Tamanho da letra por escala da raiz
- **Data**: 27/10/2026
- **Origem**: Técnica
- **Decisão**: O CSS é escrito em px (copiado do protótipo) e o build converte para rem (`postcss-pxtorem`, 1rem = 18px × escala). A−/A+ mudam a escala de 80% a 130%, de 10 em 10. O menu lateral não muda de tamanho (igual ao protótipo). Até a Fatia 1B a escala fica guardada no navegador; depois, no banco.
- **Motivo**: Fidelidade ao protótipo sem usar `zoom` (que atrapalha o posicionamento das listas suspensas).
- **Situação**: Valendo

### D-021 · Versões fixadas
- **Data**: 27/10/2026
- **Origem**: Técnica
- **Decisão**: Electron 44 (uma versão abaixo da mais nova, para o better-sqlite3 ter suporte garantido), React 19, Vite 8, TypeScript 6.0 (o typescript-eslint ainda não aceita o 7), Vitest 5, Playwright 1.64. Todas as versões exatas no `package.json`.
- **Situação**: Valendo

### D-023 · Tamanho padrão da letra
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Pergunta**: Fatia 1A, pergunta 1
- **Decisão**: Em Configurações: Normal = 100% (18px), Grande = 115%, Muito grande = 130%. A−/A+ continuam de 80% a 130%, de 10 em 10. Substitui os 22px/26px de `05-padroes-de-interface.md`.
- **Motivo**: Mantém o limite de 130%, já garantido pelo teste "sem rolagem horizontal".
- **Situação**: Valendo

### D-024 · Commits ao fim de cada fatia
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Decisão**: Autorizado um commit pequeno e descritivo ao fim de cada fatia (e da sua conferência pelo `npm run verificar`). Sem push para repositório remoto sem pedido.
- **Situação**: Valendo

### D-025 · Escala do Windows na loja: 100%
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Decisão**: O computador da loja usa escala de 100%. A área útil mínima é 1366×768 (os testes continuam também em 1280×720).
- **Impacto**: O risco 9 do plano fica controlado.
- **Situação**: Valendo

### D-022 · Comportamento do modal e da lista suspensa
- **Data**: 27/10/2026
- **Origem**: Técnica (UX)
- **Decisão**: Clicar no fundo escurecido **não fecha** o modal (para não perder o que foi digitado); "✕ Fechar", Cancelar e Esc fecham. Com uma lista suspensa aberta, Esc e o clique fora fecham só a lista. A lista usa painel flutuante (sai por cima do modal, abre para cima quando falta espaço, largura mínima de 400px).
- **Situação**: Valendo

### D-026 · Banco pelo SQLite embutido no Node (`node:sqlite`), no lugar do better-sqlite3
- **Data**: 27/10/2026
- **Origem**: Técnica. **Situação: Provisória, aguardando o Lucas confirmar.**
- **Decisão**: Usar `node:sqlite` (SQLite 3.53 embutido no Electron 44 / Node 24): transações síncronas, `backup()` a quente. Sem Kysely: o SQL fica nos repositórios e serviços de `src/main/`, com tipos escritos à mão.
- **Motivo**: O better-sqlite3 não tem binário pronto para o Electron 44; compilar exigiria o Visual Studio Build Tools (≈6 GB) e recompilar a cada versão do Electron. O `node:sqlite` não precisa de nada disso, e os testes de integração rodam no Node comum.
- **Risco**: A API do `node:sqlite` ainda está em evolução no Node. Mitigação: todo o acesso fica em `src/main/banco/` e nos serviços; trocar de volta é local.
- **Substitui**: parte de D-011 (better-sqlite3 + Kysely).

### D-027 · Avisos de cópia de segurança na barra do topo
- **Data**: 27/10/2026
- **Origem**: Técnica (UX)
- **Decisão**: Verde: "Cópia de segurança feita hoje, 08:02". Amarelo: nenhuma cópia no pen drive ou a última tem mais de 7 dias ("Conecte o pen drive e toque em 'Fazer cópia agora'"). Vermelho: nenhuma cópia ainda.
- **Situação**: Valendo (o prazo de 7 dias pode ser ajustado com o cliente)

### D-028 · A−/A+ valem até fechar; ajuda não vai para o histórico
- **Data**: 27/10/2026
- **Origem**: Técnica (UX), conforme o texto de ajuda do protótipo ("O tamanho padrão fica salvo em Configurações")
- **Decisão**: O sistema sempre abre no tamanho padrão de Configurações; A−/A+ mudam só até fechar. "Ajuda ligada/desligada" é lembrada, mas não aparece no Histórico (é preferência de tela, não dado).
- **Situação**: Valendo

### D-029 · Proteções das cópias e do programa
- **Data**: 27/10/2026
- **Origem**: Técnica (DBA/DevOps), a partir de falhas encontradas nos testes
- **Decisão**: (1) Cada cópia vira um arquivo único (modo DELETE, sem -wal/-shm) e só ganha o nome final depois de conferida. (2) Cópias no mesmo segundo ganham sufixo `_2`, `_3` e entram numa fila; uma nunca sobrescreve outra. (3) Só um programa aberto por vez (o segundo clique traz a janela para a frente). (4) Arquivo de banco com defeito nunca é apagado: é renomeado para `biglake.db.danificado-<data>` e a última cópia boa entra no lugar. (5) Banco gravado por versão mais nova do programa não é aberto. (6) Arquivos internos do navegador ficam em `%APPDATA%\BigLake\interno`, separados do banco.
- **Situação**: Valendo

### D-030 · Números medidos do instalador
- **Data**: 27/10/2026
- **Origem**: Técnica (medição no computador do Lucas)
- **Decisão/registro**: Instalador de 116 MB; abre em 1,5 s; ≈470 MB de memória somando todos os processos (o plano estimava 250 MB). Cabe em 4 GB, mas medir de novo no computador da loja (risco 8 do plano).
- **Situação**: Valendo

### D-031 · Lucas confirma D-026 e a unidade "lata"; "Gás e energia" fica para depois
- **Data**: 27/10/2026
- **Origem**: Lucas
- **Decisão**: D-026 (`node:sqlite`) passa a **Valendo**. Q-45: "lata" é só o nome de exibição de uma unidade comum (un), sem conversão. Q-46 ("Gás e energia da produção"): **pendente**, decidir antes da Fatia 3.
- **Situação**: Valendo

### D-032 · Respostas do Carlos e do Paulo (docs/10-perguntas-para-o-carlos.md)
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas)

| Pergunta | Decisão |
|---|---|
| 1 · Q-43 Entrada de item já cadastrado | Escolhe o item na lista, digita quanto chegou e quanto pagou; soma ao estoque e atualiza o preço |
| 2 · Q-17/Q-49 Conta a pagar automática | **Não.** A conta do fornecedor é lançada à parte, em Contas a pagar. ⚠ A compra só entra nas despesas quando a conta for lançada. **Mudada por D-092**: o "Chegou mercadoria" pergunta se lança a conta |
| 3 · Q-44 Validade | **Por compra (lote).** O sistema mostra quanto vence em cada dia |
| 4 · Q-18 Caixa/fardo | Sem conversão: lança sempre na unidade que usa |
| 5 · Q-20 Aviso de validade | 7 dias antes; vermelho com 3 dias ou menos |
| 6 · Q-19/Q-48 Estoque de produto pronto | Não. A frase da troca em cliente fica só como explicação |
| 7 · Q-16 Custo na receita | Último preço pago |
| 8 · Q-14 Caixa de 20 picolés | 20 × preço de atacado do picolé |
| 9 · Q-54 Embalagem extra | Não; 1 de cada item marcado por unidade |
| 10 · R5 Aviso "O custo subiu" | Fica até tocar em "Entendi" |
| 11 · R17 Apagar ingrediente usado em receita | **Pode**, e ele sai das receitas, mas antes abre um modal com a lista das receitas que vão mudar e pede confirmação |
| 12 · Q-10 Dias de loja aberta | Todos os dias |
| 13 · Q-11 Outras formas no balcão | Não |
| 14 · Q-12 Pedido salvo | Pode corrigir e cancelar, com histórico |
| 15 · Q-12 Taxa de entrega/desconto | Nenhum |
| 16 · Q-13 Pagamento dos pedidos | Sempre na hora |
| 17 · Q-15 Primeiro pedido | Nº 1 |
| 18 · Q-29 Conta que repete | Criada no dia 1º de cada mês |
| 19 · Q-30 Manutenção não paga | Vencimento digitado na hora |
| 20 · Q-27 Impostos, pró-labore, salários | Contas a pagar normais |
| 24 · Q-50 Cartão de crédito da empresa | Despesa no dia da compra |
| 25 · Q-28 Perdas no lucro | Não entram; só no relatório de Perdas |
| 26 · Q-47 Grupos do Resultado do mês | Os tipos de conta. Conta paga no cartão pessoal fica no grupo do tipo dela e aparece separada só em Sócios |
| 28 · Q-31 Fechar o mês | Não fecha; corrige depois, com histórico |
| 29 · Q-53 Passo da participação | **1 em 1%** (o protótipo tinha 5 em 5%) |
| 30 · Q-34 Formas de retirada | Só as duas do protótipo |
| 31 · Q-21 Produção sem estoque | Pode, com aviso; estoque fica negativo |
| 32 · Q-22 Meia receita / várias | Digita quantas receitas fez (½, 1, 2…) |
| 33 · Q-23 Rendimento real | Sim, anota quanto saiu |
| 34 · Q-35 Base e data da Gordurinha | Preenchidas no próprio sistema, na hora de usar |
| 37 · Q-51 "Já reajustei os preços" | Só zera a conta; preços mudados à mão em Receitas |
| 38 · Q-39 Dados antigos | Começa do zero |
| 39 · Dados da empresa | Preenchidos em Configurações (já existe) |

- **Situação**: Valendo

### D-033 · Regras do lucro escolhidas em Configurações
- **Data**: 27/10/2026
- **Origem**: Cliente (via Lucas), perguntas 21, 22, 23, 27, 35 e 36
- **Decisão**: Viram opções em Configurações (card novo, "Como contar o lucro"), cada uma com a "nossa sugestão" como padrão: (21) despesa no mês em que foi **paga** [padrão] × no mês a que se refere; (22) crédito conta no mês da **venda** [padrão] × quando cai; (23) taxas da maquininha como **despesa** em linha própria [padrão] × vendas já sem as taxas; (27) mês de prejuízo: **mostrar e não dividir** [padrão] × dividir o prejuízo × levar para o mês seguinte; (35) consumo médio por **produções registradas** (estimativa pelas receitas no começo) [padrão] × digitado; (36) lista de contas fixas que entram na Gordurinha, marcadas pelo usuário.
- **Impacto**: Funcionalidade nova pedida pelo cliente (não existe no protótipo). Os cálculos das Fatias 5 e 7 recebem essas opções como parâmetro e cada combinação ganha teste. Mudar uma opção vai para o Histórico. Entra junto com as fatias que usam cada regra (5 e 7).
- **Situação**: Valendo

### D-034 · Pendentes da rodada com o cliente
- **Data**: 27/10/2026
- **Decisão**: Sem resposta, perguntar de novo antes da fatia que usa (a: D-058; b: D-071; c: resolvida na Fatia 3): (a) pergunta 29: a mudança da porcentagem vale do mês da mudança em diante? (Fatia 5); (b) pergunta 37: o reajuste sugerido vale também para o atacado? (Fatia 7); (c) Q-46 "Gás e energia" (Lucas, Fatia 3).
- **Situação**: Resolvida (D-058, D-071)

### D-035 · Entrada de mercadoria no mesmo modal, com duas opções
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: O modal "Cadastrar insumo / entrada de mercadoria" começa com dois botões grandes: "Já está cadastrado" (escolhe o item, digita quantidade, valor pago e validade) e "Item novo" (o formulário do protótipo). Um só botão vermelho na tela. A entrada é registrada com a data de hoje.

### D-036 · Validade de cada compra no "Editar"
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: O Editar mostra as compras que ainda têm saldo (quantidade e validade, com a data corrigível). Diminuir a "Quantidade em estoque" tira primeiro das compras que vencem antes; aumentar cria um saldo sem validade. Toda baixa (produção, perda, ajuste) segue a mesma ordem: vence antes, sai antes; sem validade, sai por último.
- **Detalhe técnico**: a soma dos saldos das compras é sempre igual ao estoque quando ele é positivo; com estoque negativo (D-032, pergunta 31) não sobra saldo em nenhuma compra.

### D-037 · Excluir insumo na linha
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: Botão "Excluir" na linha da lista de estoque, com confirmação na linha e Desfazer. Se o insumo estiver em receitas, abre antes o modal da pergunta 11 (D-032) com a lista das receitas (a partir da Fatia 3).

### D-038 · Excluir cliente e fornecedor só quando não usados
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: Botão "Excluir" (confirmação + Desfazer) em Clientes e Fornecedores. Cliente com pedido e fornecedor ligado a insumo ou compra não podem ser excluídos: aparece "em uso" com o motivo. Funcionalidade acrescentada ao protótipo, a pedido do Lucas.

### D-039 · Nome da unidade (ex.: "lata")
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: Quando o insumo é medido por "Unidade", aparece o campo opcional "Nome da unidade (ex.: lata, pacote)". Esse nome aparece no lugar de "un" no estoque e nas receitas ("8 lata", "R$ 6,90 /lata"), como o protótipo mostra nas receitas.

### D-040 · Como a validade aparece na lista
- **Data**: 27/10/2026 · **Origem**: Técnica (UX), a partir do protótipo · **Situação**: Valendo
- **Decisão**: A lista mostra a validade da compra que vence primeiro: "25/10" se faltam até 31 dias (ou já venceu), senão "03/2027". Se essa compra não é o estoque todo, mostra a quantidade dela: "20/10 (6 L)". Etiqueta "vence em N dias" (amarela até 7 dias, vermelha até 3), "vence hoje", "venceu". O filtro "Vencendo" junta as de até 7 dias e as vencidas.

### D-041 · "Gás e energia da produção" escolhido em Configurações
- **Data**: 27/10/2026 · **Origem**: Lucas (Q-46) · **Situação**: Valendo
- **Decisão**: Configurações ganha a opção "Gás e energia da produção", com três jeitos:
  - **A (padrão)**: item especial que aparece em Estoque e Insumos ("Gás e energia da produção", custo **por vez**, sem quantidade nem validade, não pode ser excluído). Entra na receita como ingrediente ("1 vez × R$ 8,00"), como no protótipo.
  - **B**: valor fixo digitado em Configurações, somado sozinho em toda receita (aparece como linha fixa na parte 1 da receita).
  - **C**: cada receita tem o campo "Gás e energia desta receita (R$)".
- **Detalhe técnico**: o preço por vez (A) e o valor fixo (B) ficam na configuração; a receita guarda as vezes (A) e o valor próprio (C). Os três valores ficam guardados, então trocar de jeito e voltar não perde nada. O cálculo do custo recebe o jeito escolhido como parâmetro e cada jeito tem teste. Mudar o jeito ou o valor vai para o Histórico. O valor começa em R$ 0,00 (o cliente começa do zero, D-044).

### D-042 · Embalagem: todos os insumos
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: A parte 2 da receita ("Embalagem de cada unidade") lista todos os itens do tipo **Insumo**, cada um com o seu preço; marcado = 1 por unidade (D-032, pergunta 9).

### D-043 · Nome de cada unidade, por categoria
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: Cada categoria guarda "como se chama cada unidade" (paleta, picolé, pote, copo…), usado em "Quantas paletas essa receita rende?", "rende 100 paletas", "Custo de cada paleta". Ao criar a categoria, começa com o nome dela em minúsculas; é corrigido na parte 3 da receita, junto com os preços (vale para a categoria inteira). O plural é automático (paleta → paletas, picolé → picolés, pão → pães, …).

### D-044 · Sem categorias iniciais
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Substituída em parte por D-062
- **Decisão**: O sistema começa sem nenhuma categoria. O Carlos cria cada uma (na lista suspensa de Produtos ou de Receitas) e define os preços de balcão e atacado na receita. As categorias e preços do protótipo ficam só nos dados de desenvolvimento e testes.

### D-045 · Produtos à venda: caixa, receita em uso e custo
- **Data**: 27/10/2026 · **Origem**: Técnica (a partir das perguntas 8 e 9 de D-032) · **Situação**: Valendo
- **Decisão**: "Vendido como" Unidade, Pote, Copo ou Caixa. Na Caixa aparece "Quantas unidades na caixa?"; preço de balcão e de atacado = quantidade × preço da categoria e custo = quantidade × custo de cada da receita (T6: caixa de 20 picolés = R$ 110,00). O produto herda o custo da receita escolhida (só receitas da mesma categoria). Produto sem receita mostra "—" no custo e no lucro. Receita usada em produto não pode ser excluída ("usada em N produtos"); categoria em uso conta receitas e produtos.

### D-046 · Aviso "O custo subiu" e "Entendi"
- **Data**: 27/10/2026 · **Origem**: Técnica (R5 e pergunta 10 de D-032) · **Situação**: Valendo
- **Decisão**: Cada aumento de custo de um insumo (entrada ou Editar) gera um aviso até alguém tocar em "Entendi". Vários aumentos do mesmo insumo ainda não vistos aparecem juntos: do custo antes do primeiro até o de agora. O aviso mostra, para cada receita que usa o insumo, custo de cada e lucro de cada no balcão (antes → agora). Aparece no alto de Produção e Receitas (como no protótipo) e, na Fatia 7, no Início.

### D-047 · Apagar ingrediente usado em receitas (pergunta 11)
- **Data**: 27/10/2026 · **Origem**: Técnica · **Situação**: Valendo
- **Decisão**: O modal mostra as receitas que usam o item (como ingrediente ou embalagem) e o que acontece com elas. Confirmado, o item sai do estoque e deixa de contar no custo das receitas; o Histórico anota "tirou <item> da receita <nome>" para cada uma. As linhas ficam guardadas por baixo, então "Desfazer" devolve o item ao estoque e às receitas.

### D-048 · Fechamento do balcão de qualquer dia
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: "Lançar as vendas" tem o campo Data (hoje já preenchido) e aceita dias passados. Um fechamento por dia: se o dia escolhido já tem lançamento, abre em modo de correção.

### D-049 · Taxas da maquininha começam em 0%
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: Débito e crédito começam com 0% e 0 dias; o Carlos preenche uma vez em "Taxas da maquininha". Os valores do protótipo (1,5%/1 dia e 3,2%/30 dias) ficam só nos testes.

### D-050 · Pedido cancelado continua no histórico
- **Data**: 27/10/2026 · **Origem**: Lucas (pergunta 14 de D-032) · **Situação**: Valendo
- **Decisão**: Cancelar não apaga: o pedido fica com o mesmo número e a etiqueta "Cancelado" (motivo opcional), não soma nas vendas, e o cancelamento vai para o Histórico. Pode ser desfeito ("Desfazer cancelamento"). Corrigir um pedido salvo também fica no Histórico.

### D-051 · Primeiro teste de instalação na loja (versão 0.3.0)
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Resultado**: sem aviso do SmartScreen, antivírus não reclamou, abre em menos de 5 s, não abre duplicado. Memória ainda não medida no PC da loja (risco 8).
- **Lembrete para a versão final (pedido do Lucas)**: antes da entrega, fazer o teste rápido na loja (dados da empresa, "Fazer cópia agora" com o pen drive, cadastrar um insumo e uma receita, fechar e conferir a cópia no pen drive) e depois apagar `%APPDATA%\BigLake` e `Documentos\BigLake` para o Carlos começar do zero. Está na lista da Fatia 8 (`09-arquitetura-e-plano.md`).

### D-052 · Gás e energia: opção "Não contar nas receitas"
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo (complementa D-041)
- **Decisão**: Quarto jeito em Configurações: **"Não contar"**. As receitas não somam gás e energia (o item especial some do Estoque e da receita); o gás e a luz entram só como contas a pagar, nas despesas do mês. Os valores dos outros jeitos ficam guardados, e voltar para A, B ou C traz tudo de volta. O padrão continua sendo A.

### D-053 · Alinhamento dos campos
- **Data**: 27/10/2026 · **Origem**: Técnica (UX), a partir do print do Lucas · **Situação**: Valendo
- **Decisão**: Em toda linha de campos (`.campos`), cada campo ocupa 3 linhas da grade (rótulo, caixa, aviso de erro) divididas com os vizinhos (CSS subgrid): se um rótulo quebra em duas linhas, as caixas continuam alinhadas. "Peso ou volume" passou a ter um rótulo só, com o número e a medida lado a lado, como no protótipo.

### D-054 · Letra "Pequena" em Configurações
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo (complementa D-023)
- **Decisão**: Tamanho padrão da letra com quatro opções: **Pequena 90%**, Normal 100%, Grande 115%, Muito grande 130%. O A− continua indo até 80%, então tudo segue dentro da faixa testada contra rolagem horizontal.

### D-055 · "A loja não abriu neste dia"
- **Data**: 27/10/2026 · **Origem**: Técnica, a partir do protótipo (linha "Loja fechada" no histórico do balcão) · **Situação**: Valendo
- **Decisão**: No lançamento do balcão há o botão "A loja não abriu neste dia": grava o dia como fechado (sem valores). Dia fechado conta como lançado, não gera aviso de "dia sem lançamento" e aparece como "Loja fechada". A loja abre todos os dias (D-032, pergunta 12); este botão é para feriado ou imprevisto. Os dias antes do primeiro lançamento no sistema não são cobrados.

### D-056 · Pedidos: número, retrato e correção
- **Data**: 27/10/2026 · **Origem**: Técnica (R9, D-032 perguntas 14 a 17, D-050) · **Situação**: Valendo
- **Decisão**: Número sequencial começando em 1, nunca reaproveitado (cancelado continua com o número). Cada item guarda o nome e o preço de atacado do dia; o pedido guarda a taxa da maquininha do dia. "Corrigir" abre o pedido no próprio quadro "Novo pedido" (título "Corrigindo o pedido nº N"); itens que já estavam no pedido mantêm o preço do dia do pedido, itens novos entram com o preço de hoje. Cliente com pedido (não cancelado ou cancelado) não pode ser excluído.

### D-057 · Impressão do comprovante
- **Data**: 27/10/2026 · **Origem**: Técnica (D-004) · **Situação**: Valendo
- **Decisão**: "Imprimir comprovante" abre a janela de impressão do Windows com o comprovante (texto em letra de máquina, cabe em A4 e em 80 mm). A página do comprovante é uma rota própria (`#/imprimir/pedido/N`) aberta numa janela escondida. Nos testes, em vez da janela de impressão, o comprovante é salvo em PDF na pasta de dados, para conferir o conteúdo.

### D-058 · Porcentagem dos sócios vale do mês da mudança em diante
- **Data**: 27/10/2026 · **Origem**: Lucas (pendente "a" de D-034) · **Situação**: Valendo
- **Decisão**: Mudar a participação (de 1 em 1%, D-032 pergunta 29) vale para o mês aberto e os seguintes; meses anteriores mantêm a porcentagem que tinham (tabela de participação por mês).

### D-059 · Sócios iniciais: Carlos 60% e Paulo 40%
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: O sistema já vem com os dois sócios e a divisão 60/40 (docs/01). Ajustável em Sócios.

### D-060 · Lucro "pelo mês a que a conta se refere" usa o mês do vencimento
- **Data**: 27/10/2026 · **Origem**: Lucas (opção de D-033, pergunta 21) · **Situação**: Valendo
- **Decisão**: Quando a opção "despesa no mês a que se refere" (competência) estiver escolhida em Configurações, a conta conta no mês do **vencimento**. Sem campo novo de "mês de referência". No padrão (caixa), conta no mês em que foi **paga**.

### D-061 · Tipo de conta "Fatura do cartão da empresa"
- **Data**: 27/10/2026 · **Origem**: Lucas (pergunta 24 de D-032) · **Situação**: Valendo
- **Decisão**: Tipo de conta especial, já criado e que não pode ser removido: aparece em Contas a pagar (avisos de vencimento, pagar), mas **não entra nas despesas** do mês nem na meta, porque cada gasto pago no cartão da empresa já virou despesa no dia da compra. A ajuda do tipo explica isso.

### D-062 · Categorias Paleta, Picolé e Pote já vêm no sistema
- **Data**: 27/10/2026 · **Origem**: Lucas · **Situação**: Valendo (substitui em parte a D-044)
- **Decisão**: O sistema já vem com as categorias **Paleta**, **Picolé** e **Pote** (unidade "paleta", "picolé", "pote"), com preços em R$ 0,00 para o Carlos definir na receita. Podem ser removidas como qualquer categoria (só se não estiverem em uso). Migração 0008: não cria a categoria se já existir uma com o mesmo nome (computador da loja com a 0.3.0).

### D-063 · Detalhes da Fatia 5 (contas a pagar e sócios)
- **Data**: 27/10/2026 · **Origem**: Técnica (item 3 confirmado pelo Lucas em 28/10/2026) · **Situação**: Valendo
1. **Conta que repete**: cada conta do mês guarda a conta que a gerou. A conta do mês nasce sozinha (dia 1º) copiando a **última** da sequência (valor, tipo, aviso; correções no valor passam para os meses seguintes). Excluir a última conta da sequência ou marcar "Não, só uma vez" **para** a repetição. Se o programa ficou fechado por meses, cria os meses que faltaram.
2. **Excluir conta**: botão "Excluir conta" dentro do modal Editar (confirmação + Desfazer na tela), para não apertar a linha da lista em 1280×720. Retiradas ganharam Editar e Excluir (regra "toda lista tem Editar" e "exclusão segura"); o protótipo não mostrava.
3. **Competência (D-060)**: com "no mês do vencimento", entram nas despesas **todas** as contas que vencem no mês, **pagas ou não** (é o que "mês a que se refere" quer dizer). Confirmado pelo Lucas (opção A) em 28/10/2026.
4. **Crédito "quando cai" nos pedidos**: o pedido guarda a taxa do dia, mas não o prazo; usa o prazo de crédito atual da maquininha. O balcão usa o prazo guardado no dia.
5. **Mudar a porcentagem** num mês grava aquele mês; vale até a próxima mudança já gravada num mês seguinte (D-058).
6. A **Fatura do cartão da empresa** aparece em Contas a pagar (avisos, pagar), mas nunca nas despesas; na lista de tipos não tem "Remover".
7. Lista suspensa de cartões e de tipos fecha sozinha depois de "+ Criar" (o item novo já fica escolhido).
8. Reembolso vale no mês em que a conta foi **paga**, qualquer que seja a regra de despesa.
9. **Topo da tela e a cópia ao abrir**: quando a cópia feita sozinha (ao abrir e a cada 2 horas) termina, o processo principal avisa a tela e o aviso do topo atualiza na hora. Antes ele podia mostrar "nenhuma cópia" por até 1 minuto (achado num teste que falhava às vezes).

### D-064 · Fatia 6 em três entregas
- **Data**: 28/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: A Fatia 6 sai em três partes, cada uma com testes, roteiro e commit: **6A** Produção › Planejar, **6B** Perdas, **6C** Patrimônio.

### D-065 · Produções do mês, com Excluir
- **Data**: 28/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: A aba "Planejar produção" ganha, embaixo, a lista "Produções do mês" com **Excluir** (confirmação + Desfazer). Excluir devolve o estoque para as mesmas compras de onde saiu (validade certa). Funcionalidade acrescentada ao protótipo, a pedido do Lucas; a lista também serve ao relatório "Lucro por produto" (Fatia 7).

### D-066 · Manutenção com Editar e Excluir
- **Data**: 28/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: O histórico de manutenções tem **Editar** e **Excluir** (confirmação + Desfazer). Corrigir ou excluir a manutenção mexe junto na conta ligada em Contas a pagar.

### D-067 · Excluir bem só sem manutenção
- **Data**: 28/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- **Decisão**: Bens da empresa ganham **Excluir** (confirmação + Desfazer). Bem com manutenção não pode ser excluído e mostra "em uso", como cliente com pedido (D-038).

### D-068 · Detalhes da Fatia 6A (produção)
- **Data**: 28/10/2026 · **Origem**: Técnica · **Situação**: Valendo
1. A produção é registrada com a data de **hoje** (o protótipo não tem campo de data).
2. "Quantas receitas vai fazer?" começa em 1; − e + andam de ½ em ½; também dá para digitar (1,5; 3…). "Quantas <paletas> saíram?" começa no que a receita prevê e pode ser corrigido (D-032 p.33).
3. Faltando estoque, "Registrar produção" pede confirmação na hora ("O estoque vai ficar negativo") e registra (D-032 p.31).
4. A produção guarda o retrato do dia: nome da receita, custo de cada e custo total (custo de cada × unidades previstas), para o relatório da Fatia 7.
5. Cada baixa guarda de que compra saiu (tabela saida_estoque); excluir a produção devolve às mesmas compras, e o Desfazer baixa de novo (vence antes, sai antes). As perdas (6B) usam o mesmo caminho.

### D-069 · Detalhes da Fatia 6B (perdas)
- **Data**: 28/10/2026 · **Origem**: Lucas (itens 1 a 3) e Técnica (4 a 8) · **Situação**: Valendo
1. **Campo "Quando?"** no modal, começa em hoje e não aceita data futura (acréscimo ao protótipo, a pedido do Lucas). Por isso a tela ganhou a troca de mês (‹ Outubro de 2026 ›), como em Sócios; ao salvar, a tela vai para o mês da perda.
2. Perda de matéria-prima maior do que o estoque **pede confirmação** ("O estoque de … vai ficar negativo. Salvar mesmo assim?") e registra, como na produção (D-068 item 3).
3. Ao editar, os itens que já estavam no registro **guardam o valor do dia** da perda; só itens novos entram com o preço de hoje.
4. Produto pronto e troca: quantidade só em unidades inteiras; a lista mostra "un" quando o nome da receita já diz o que é ("8 un Paleta de Morango") e o nome da unidade nos outros ("2 potes Sorvete de Morango · pote 2 L").
5. Editar uma perda de matéria-prima devolve tudo às mesmas compras e baixa de novo (vence antes, sai antes). Mudar o tipo de matéria-prima para produto (ou o contrário) apaga os itens no modal.
6. Cliente com troca em Perdas fica "em uso" e não pode ser excluído (como cliente com pedido, D-038).
7. Lista de matéria-prima: todos os itens do estoque (ingredientes e embalagens), em ordem alfabética, com o preço pago por unidade.
8. Etiqueta do motivo: amarela na troca e vermelha nas outras, como no protótipo; a observação aparece embaixo do item na lista.

### D-070 · Detalhes da Fatia 6C (patrimônio)
- **Data**: 28/10/2026 · **Origem**: Lucas (itens 1 a 4) e Técnica (5 a 10) · **Situação**: Valendo
1. Ao **editar** uma manutenção, o modal não pergunta "Já está paga?": mostra a situação da conta ("já está paga (pago com Pix em 16/10)" ou "em aberto" com o campo "Vence em"). Pagar ou desfazer o pagamento é em Contas a pagar, como no modal de conta.
2. Em **Contas a pagar**, a conta que veio de uma manutenção só se paga e se desfaz o pagamento. "Editar" mostra "A conta … vem de uma manutenção. Corrija em Patrimônio" com o botão "Ir para Patrimônio"; o serviço também recusa editar e excluir essa conta por fora.
3. Valor dos bens **com centavos** (R$ 68.000,00), seguindo a regra do projeto (o protótipo mostrava sem centavos).
4. Manutenção de **R$ 0,00** (serviço de graça, na garantia) fica no histórico do bem e **não cria conta**. Corrigir para R$ 0,00 tira a conta; voltar a ter valor cria de novo (pergunta se já está paga).
5. Conta da manutenção: nome "<o que foi feito> · <bem>", tipo "Manutenção" (se tiver sido removido, volta sozinho), não repete, aviso 3 dias antes. Paga: vence no dia do serviço. Corrigir a manutenção muda nome, valor e (se em aberto) o vencimento da conta.
6. Excluir manutenção (confirmação + Desfazer, D-066) exclui junto a conta; o Desfazer traz as duas de volta.
7. Bem: "O que é", "Tipo" e "Valor pago" obrigatórios; "Data da compra" (mês/ano) e "Placa / nº de série" opcionais. Excluir bem fica no modal "Editar bem"; com manutenção, mostra "Tem N manutenções: não dá para excluir" (D-067).
8. Tipos de bem que vêm com o sistema: Veículo, Equipamento, Móvel, Informática (filtros "Veículos", "Equipamentos", "Móveis", "Informática"); tipo criado aparece no filtro como foi escrito.
9. Cards da aba Manutenções contam o **ano de hoje**; o histórico mostra todas, com filtro "Patrimônio" (só bens com manutenção), Editar e Excluir em cada linha. Conta em aberto aparece como "a pagar · vence dd/mm".
10. Garantia em dias (começa em 90; 0 = sem garantia), contada em dias corridos a partir da data do serviço (T12).

### D-071 · Fatia 7 em duas entregas; reajuste no atacado; PDF
- **Data**: 28/10/2026 · **Origem**: Lucas · **Situação**: Valendo
1. A Fatia 7 sai em duas partes, cada uma com testes, roteiro e commit: **7A** Início (atalhos, cards do mês, meta, avisos); **7B** Relatórios (os 7, inclusive a Gordurinha e o card dela no Início), Imprimir e Salvar em PDF.
2. Pendente "b" de D-034 (pergunta 37): o **reajuste sugerido vale também para o atacado**, com o mesmo %, os dois arredondados para cima a R$ 0,50. Os preços continuam sendo mudados à mão em Receitas (D-032 p.37).
3. "Salvar em PDF" abre a janela **"Salvar como"** do Windows já em `Documentos\BigLake\Relatórios`, com o nome pronto (ex.: "Resultado de setembro de 2026.pdf"); depois mostra "Salvo em …" com "Abrir pasta".

### D-072 · Detalhes da Fatia 7A (Início)
- **Data**: 28/10/2026 · **Origem**: Técnica · **Situação**: Valendo
1. **Meta do mês** (R13): meta = soma das contas que **vencem no mês** (pagas ou não), sem a "Fatura do cartão da empresa" (D-061); vendido = balcão + pedidos do mês até hoje, pelo dia da venda; ritmo = vendido ÷ dias com venda. Sem contas no mês, o card pede para lançar as contas; meta batida mostra "Meta batida!".
2. **Cards do mês**: "Vendas de outubro" = balcão + pedidos pelo dia da venda (igual ao Resumo das vendas); "Despesas" e "Lucro até hoje" vêm do mesmo cálculo de Sócios, com as regras de "Como contar o lucro" (D-033). O texto embaixo das despesas diz "contas pagas" (ou "contas pagas e taxas"), porque a compra de mercadoria só vira despesa quando a conta é lançada (D-032 p.2).
3. "Vendas de ontem" mostra "balcão não lançado" ou "loja fechada" quando for o caso.
4. **Avisos**: cada card só aparece quando tem algo; sem nenhum, aparece "✓ Nada precisa de atenção hoje." Até 5 linhas por card ("e mais N itens"). Estoque baixo: só itens com mínimo, o que mais falta primeiro. Vencendo: cada compra com saldo que vence em até 7 dias ou já venceu, vermelho com 3 dias ou menos (D-032 p.5). Contas: as que estão no aviso (a mesma regra da bolinha do menu), inclusive atrasadas. Últimos pedidos: os 3 mais novos do mês.
5. Atalho "Chegou mercadoria" abre o Estoque já com o modal de entrada; "Novo pedido de cliente" abre a aba Pedidos.
6. Atalhos e cards ficam 4 lado a lado quando cabem e 2 + 2 com a letra grande (nunca 3 + 1).
7. O card da Gordurinha chega na 7B, junto com o relatório.
8. Ao abrir o Estoque pelo atalho "Chegou mercadoria", o modal espera a lista nova do estoque antes de escolher entre "Já está cadastrado" e "Item novo" (o Início pode ter deixado uma lista antiga em memória).

### D-073 · Detalhes da Fatia 7B (relatórios) e Fatia 7C
- **Data**: 28/10/2026 · **Origem**: Lucas (itens 1 e 2) e Técnica (3 a 10) · **Situação**: Valendo
1. A **Gordurinha sai numa entrega própria (7C)**: cálculo (T9), base e %, contas fixas, consumo médio, "Já reajustei os preços" e o card no Início. A 7B traz os outros 6 relatórios, Imprimir e Salvar em PDF; a Gordurinha não aparece na lista até a 7C.
2. **Lucro por produto (R15)**: o que saiu nos pedidos usa o valor real do pedido (caixa = unidades por caixa); o resto do que foi produzido, menos as perdas (produto pronto e troca), conta como vendido no balcão, com o preço de balcão de hoje. Se os pedidos passam da produção do mês, conta o que foi vendido. Produto sem receita fica de fora.
3. **Resultado do mês**: balcão e pedidos pelo dia da venda (ou quando cai, na regra do crédito), grupos de despesa = tipos de conta, e as taxas da maquininha numa linha própria em qualquer regra (o lucro é o mesmo nas duas). Frase de conclusão: quanto sobrou e que % do que entrou, ou o prejuízo.
4. **Dinheiro, cartão e Pix**: porcentagens inteiras que somam 100; a taxa de cada dia é a daquele dia; o texto mostra as taxas de hoje; "dias de loja aberta" = dias com o balcão lançado e a loja aberta.
5. **Comparar com o ano passado**: faturamento, despesas, lucro, unidades produzidas (todas as receitas, no lugar de "Paletas produzidas") e média de vendas por dia (faturamento ÷ dias com venda). Diferença com 1 casa; sem ano passado aparece "—". A % do lucro só aparece quando os dois anos tiveram lucro; senão, a frase diz o lucro ou prejuízo de cada ano. Gráfico: vendas dos 6 meses até o mês escolhido, dos dois anos, em mil reais. A frase do protótipo sobre a tendência de outubro a dezembro ficou de fora.
6. **Mais vendidos nos pedidos**: ranking pelo valor; quantidade como o produto é vendido ("27 potes", "7 caixas de 20", "40 un").
7. **Perdas**: maior motivo = o que mais custou (empate: o que mais aparece); "(até hoje)" no mês atual.
8. **Período**: do primeiro mês com algum lançamento até o mês de hoje.
9. **Impressão e PDF**: página própria com o nome da empresa e o período no alto, sem os "?" e sem os botões que levam a outras telas; PDF em A4 gerado pelo próprio programa. O nome do arquivo é "<relatório> de <mês> de <ano>.pdf".
10. Com a letra grande, a lista de relatórios fica em cima, com os botões lado a lado, e os controles do alto descem para baixo do título.

### D-074 · Detalhes da Fatia 7C (Gordurinha)
- **Data**: 29/10/2026 · **Origem**: Lucas (itens 1 a 3) e Técnica (4 a 10) · **Situação**: Valendo
1. **Uso médio por mês** de cada insumo (opção 35): só pelas produções registradas, média dos últimos 12 meses (meses desde a primeira produção nesse período, até 12). Sem produção ainda, o aumento aparece com "ainda sem produção registrada" e não come nada. Perdas não contam como uso.
2. **Contas fixas** (opção 36): marcadas no próprio relatório, na lista "Contas fixas que entram na conta", com todas as contas que repetem todo mês. Todas começam marcadas, menos o aluguel. Compara o valor da conta no dia do reajuste com o da conta mais nova da série; a "Fatura do cartão da empresa" fica de fora.
3. **Primeira vez** (p.34): o Carlos digita a base, a % (começa em 10) e a data do último reajuste; a data vale para o "Desde…", o ritmo e a previsão, e os preços de partida são os do dia em que a Gordurinha foi ligada.
4. Só o que **subiu** come a gordurinha (o que baixou não devolve). Insumo cadastrado depois do reajuste parte do primeiro preço que teve.
5. Status: mais de 50% Tranquilo; de 20% a 50% Atenção; menos de 20% Hora de reajustar (T9).
6. **Previsão**: ritmo = comido ÷ meses desde o reajuste (pelo menos 1 mês); mostra mês e ano.
7. **Reajuste**: comido ÷ faturamento médio dos meses com venda nos 12 meses antes deste (sem nenhum, o deste mês); o preço novo de cada categoria com preço, no balcão e no atacado, arredondado para cima a R$ 0,50 (D-071).
8. **"Já reajustei os preços"** (p.37): pede "Os preços novos já estão valendo? Sim, zerar a conta / Ainda não"; grava a data de hoje e um retrato novo; com 12 meses completos de vendas, a base vira a média do lucro líquido dos 12 meses anteriores (se for positiva); senão continua a mesma. Os preços continuam sendo mudados à mão em Produção e Receitas.
9. A Gordurinha é o 2º item da lista de Relatórios, sempre "a de hoje" (sem escolher período), e pode ser impressa e salva em PDF como os outros. No Início, é o primeiro card de "Avisos de hoje" (borda amarela) quando está ligada.
10. "Mudar base ou porcentagem" corrige o reajuste atual (vai para o Histórico); marcar ou desmarcar conta fixa também.

### D-075 · Fatia 8 (entrega): dados iniciais, manual e versão
- **Data**: 29/10/2026 · **Origem**: Lucas (itens 1 a 3) e Técnica (4 a 6) · **Situação**: Valendo
1. **Dados iniciais**: nada além do que o sistema já traz (categorias Paleta, Picolé e Pote, tipos de conta, tipos de bem, sócios 60/40). Preços, taxas, insumos, receitas, produtos, clientes, contas fixas e Gordurinha são preenchidos na loja, no primeiro dia, pelo Lucas com o Carlos, seguindo a parte 14 do manual (D-032 p.38: começa do zero).
2. **Manual do Carlos**: PDF A4 ilustrado, letra grande, com capturas reais (`recursos/manual/Manual-BIG-LAKE.pdf`, gerado por `npm run manual` a partir de `manual.html`). Vai junto no instalador e abre pelo botão **"Abrir o manual"** em Configurações.
3. **Versão**: 0.9.0 para o teste rápido na loja e a aceitação com o Carlos (`docs/roteiros/aceitacao.md`); corrigido o que aparecer, 1.0.0 como versão oficial.
4. **T14 (desempenho)**: teste de integração com 10 anos de dados simulados (`testes/integracao/desempenho.test.ts`), dentro do `npm run teste`: cada relatório em até 3 s, 12 meses de Resultado em até 3 s e o que cada tela lê ao abrir em menos de 1 s. No computador de desenvolvimento: o relatório mais lento levou 47 ms.
5. As capturas do manual vêm de uma loja de exemplo montada pelo próprio script, com a data fixa 16/10/2026; mudou uma tela, roda-se `npm run manual` de novo.
6. README reescrito como README do projeto (o antigo era do pacote inicial), com todos os comandos.

### D-076 · Configurações em abas e "Apagar todos os dados"
- **Data**: 29/10/2026 · **Origem**: Lucas · **Situação**: Valendo
1. Configurações em **abas no alto** (como Produção e Patrimônio): Cópia de segurança, Tamanho da letra, Como contar o lucro, Gás e energia, Dados da empresa, Histórico e Apagar dados. Uma aba por vez; o endereço guarda a aba (`#/configuracoes?aba=historico`). "Abrir o manual" continua no alto.
2. **Apagar todos os dados** (aba própria, borda vermelha): o botão abre um modal que só libera "Apagar tudo" com **APAGAR** digitado (maiúsculas ou minúsculas); o processo principal também recusa sem "APAGAR".
3. **Antes de apagar, sempre uma cópia de segurança** na pasta e no pen drive (se estiver ligado); sem conseguir a cópia na pasta, nada é apagado. Para voltar: Cópia de segurança › Restaurar uma cópia.
4. Apaga **tudo, menos as preferências** (tamanho da letra, ajuda, cópia ao fechar): o banco volta a ser o do primeiro dia, com o que o sistema já traz (categorias, tipos de conta e de bem, sócios 60/40). As cópias de segurança nunca são apagadas. O Histórico novo começa com "Apagou todos os dados…" e o programa recarrega.

### D-077 · Loja de exemplo com 5 meses de dados (`npm run exemplo`)
- **Data**: 29/10/2026 · **Origem**: Lucas (pediu os dados) e Técnica (como) · **Situação**: Valendo
1. `npm run exemplo` (`testes/exemplo/dados-exemplo.ts`) monta uma loja de exemplo de **01/06 a 29/10/2026**, para mostrar e testar o programa com movimento. Não faz parte do `verificar`.
2. Tudo entra **pelos próprios serviços**, com um relógio que anda dia a dia: Histórico, estoque (lotes e validades), contas que repetem e avisos ficam como no uso real. Sorteio com semente fixa: rodar de novo dá os mesmos números.
3. Conteúdo: 5 fornecedores, 17 itens de estoque, 12 receitas (Paleta, Picolé, Pote e a categoria nova **Açaí**), 15 produtos (com caixas de 20 picolés), 7 clientes de atacado, 6 bens, balcão todo dia (fechado às segundas em junho e julho), pedidos semanais, produção às terças e sextas (e quartas na primavera), compras quando o estoque não dá, 10 contas fixas que repetem, boletos mensais dos fornecedores (compras do mês anterior, vencem dia 10), Simples Nacional (6% das vendas do mês anterior), gás, retiradas dos sócios nos dias 6 e 21, perdas, 3 manutenções, reajuste de Paleta e Pote em 01/08, morango e chocolate mais caros na primavera ("O custo subiu") e Gordurinha ligada em 01/10.
4. De propósito ficam abertas: a **Água de outubro** (atrasada) e o **conserto do freezer** (vence 05/11). O balcão de 29/10 fica para lançar.
5. **Segurança**: grava em `BIGLAKE_DADOS` (ou `%APPDATA%\BigLake`), só com o programa fechado; **só roda num banco sem movimento** e sempre copia o banco antes (`biglake.antes-do-exemplo-<data>.db`, na mesma pasta). Para voltar ao zero: Configurações › Apagar dados. Nunca rodar no computador da loja.

### D-078 · Avisos "O custo subiu" numa aba própria em Produção
- **Data**: 29/10/2026 · **Origem**: Lucas · **Situação**: Valendo (muda o lugar do aviso de D-046)
1. Produção e Receitas tem a 3ª aba **Avisos**, depois de "Receitas". Os cards "O custo subiu" saem do alto de Planejar e Receitas e ficam só nela (`#/producao?aba=avisos`).
2. Com aviso, a aba mostra uma **bolinha vermelha com o número** (como Contas a pagar no menu). Sem aviso, a aba continua e diz "Nenhum aviso agora…".
3. "Ver receita" continua levando para a aba Receitas com a receita aberta; "Ver detalhes" do card do Início agora abre a aba Avisos.

### D-079 · Bolinha de "O custo subiu" no menu e avisos do Início um por linha
- **Data**: 29/10/2026 · **Origem**: Lucas (opção 1 proposta pelo Claude) · **Situação**: Valendo
1. O item **Produção e Receitas** do menu ganha uma bolinha vermelha com o número de avisos "O custo subiu" (some no "Entendi"). Com aviso, o item abre direto na aba **Avisos** (D-078); sem aviso, abre em "Planejar produção". Não há item "Avisos" no menu: o Início já junta todos os avisos.
2. A bolinha fica **no canto do ícone**, não à direita do texto como a de Contas a pagar: "Produção e Receitas" com a bolinha ao lado não cabe nos 292 px e alargaria o menu. Contas a pagar continua como no protótipo.
3. **Início › Avisos de hoje**: um card por linha, na largura toda (antes, dois por linha). Dentro do card, as listas ficam em colunas lado a lado (a partir de 300 px cada) e, em "O custo subiu", cada insumo é uma coluna.

### D-080 · Bolinha de Contas a pagar também no canto do ícone
- **Data**: 29/10/2026 · **Origem**: Lucas · **Situação**: Valendo (muda o item 2 de D-079)
- A bolinha de "Contas a pagar" (contas que vencem logo) sai da direita do texto e vai para o canto do ícone, igual à de Produção e Receitas. As duas bolinhas do menu ficam no mesmo lugar.

### D-081 · Perdas: produtos separados por categoria (abas)
- **Data**: 29/10/2026 · **Origem**: Lucas (abas, opção recomendada) · **Situação**: Valendo
1. No modal **Registrar perda** (Produtos prontos e Troca em cliente), a grade "Toque nos produtos…" ganha as abas **Todos** + uma por categoria que tem receita, igual ao **Novo pedido** (que já tinha desde a Fatia 4). Começa em "Todos"; os itens já escolhidos continuam na lista "Itens deste registro" ao trocar de aba.
2. Com uma categoria só, as abas não aparecem. Matéria-prima ou insumo continua sem abas (itens do estoque não têm categoria).

### D-082 · Perdas de matéria-prima: abas Matéria-prima / Insumos
- **Data**: 29/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- Em "Matéria-prima ou insumo", a grade "Toque no que se perdeu" ganha as abas **Todos · Matéria-prima · Insumos**, com os mesmos nomes do filtro da tela de Estoque. Começa em "Todos"; com um tipo só, as abas não aparecem. Mesmo comportamento das abas de categoria (D-081).

### D-083 · Modal de conta (e de manutenção) mais espaçado
- **Data**: 29/10/2026 · **Origem**: Lucas ("os dados estão muito juntos") · **Situação**: Valendo
- As perguntas de botões ("Já está paga?", "Repete todo mês?", "Avisar quantos dias antes?"; em Manutenção, "Tipo" e "Já está paga?") ficam **uma por linha**, separadas por um traço fino: pergunta à esquerda (coluna de 300 px) e botões à direita, cada botão numa linha só. Sem largura (modal estreito ou letra grande), a pergunta sobe para cima dos botões. Os quatro campos de cima ganham mais espaço entre si (24 px).

### D-084 · Menu lateral fixo na rolagem
- **Data**: 29/10/2026 · **Origem**: Lucas · **Situação**: Valendo
- O menu amarelo fica parado na tela quando o conteúdo rola (`position: sticky`, altura da janela), sempre a 1 clique. Se um dia não couber na altura da janela, o próprio menu ganha rolagem. A largura continua 292 px.

### D-085 · Históricos: últimos 15, "Ver mais" (+16) e filtro por mês
- **Data**: 29/10/2026 · **Origem**: Lucas (os três históricos; lista "Últimos" + meses, opções recomendadas) · **Situação**: Valendo
1. Vale para o **Histórico do balcão** e o **Histórico de pedidos** (Vendas) e o **Histórico do que foi feito** (Configurações).
2. Mostram os **15 mais novos**; o botão **"Ver mais 16"** traz mais 16 de cada vez (15 + 16 = um mês de 31 dias), com "Mostrando 15 de 150" ao lado. O botão diz quantos ainda vêm ("Ver mais 5") e some quando já mostra tudo.
3. **"Mês: [Últimos ▼]"** no alto de cada histórico. "Últimos" = os mais novos, passando de um mês para o outro; escolhendo um mês, só ele. Na lista só aparecem os meses que têm lançamento. Trocar de mês volta para 15.
4. Antes: o balcão mostrava só 60 dias, os pedidos só o mês atual (meses passados não apareciam) e Configurações as últimas 200 alterações.
5. Pedidos: o resumo do cabeçalho ("Outubro de 2026: 20 pedidos · R$ …") é do mês escolhido; em "Últimos", do mês de hoje.
6. A paginação é feita no banco (`servicos/historico.ts`), para continuar rápida com anos de dados.

### D-086 · Históricos: 10 + "Ver mais" de 10 em 10; também em Resumo › Vendas por dia
- **Data**: 29/10/2026 · **Origem**: Lucas · **Situação**: Valendo (muda os números de D-085)
1. Os históricos mostram os **10** mais novos (antes 15) e o **"Ver mais"** traz mais **10** de cada vez (antes 16).
2. A tabela **Vendas por dia** (Vendas › Resumo das vendas) ganha o mesmo padrão: "Mês: [Últimos ▼]", 10 dias e "Ver mais". Um dia por linha, do mais novo para trás, desde o primeiro dia de uso, com os dias sem balcão como "falta lançar" (como já era no mês). Antes mostrava só o mês atual. Os cartões do Resumo (dia e mês) continuam sendo de hoje e do mês atual.

### D-087 · Linha fina entre as abas
- **Data**: 29/10/2026 · **Origem**: Lucas ("parece um blocão") · **Situação**: Valendo
- Nas abas no alto das telas (Vendas, Produção, Patrimônio, Configurações…), uma **linha vertical fina e clara** separa uma aba da outra. Ela some dos dois lados da aba escolhida, que já se destaca pelo fundo escuro.

### D-088 · Imprimir com prévia no programa e direto na impressora
- **Data**: 29/10/2026 · **Origem**: Lucas (opção recomendada) · **Situação**: Valendo (muda D-057)
1. Motivo: a janela de impressão do Windows 11 não mostra prévia para o programa ("Este aplicativo não dá suporte à visualização de impressão"), e a do Windows 10 (loja) também não tem prévia. O título "Electron - Imprimir" só aparece no `npm run dev`; o instalado se chama "BIG LAKE Gestão".
2. **"Imprimir"** (relatórios) e **"Imprimir comprovante" / "Comprovante"** (pedidos) abrem o modal **Imprimir**: à esquerda, a folha A4 exatamente como vai sair (o mesmo PDF do "Salvar em PDF", no visualizador do próprio programa, sem a barra dele); à direita, o nome do que vai imprimir, "Vai imprimir N folhas por cópia", a **Impressora** (lista; "Impressora padrão" primeiro) e **Quantas cópias?** (− 1 +, de 1 a 20). Rodapé: **Imprimir** (vermelho) e Cancelar.
3. "Imprimir" manda **direto para a impressora**, sem a janela do Windows. Depois, faixa verde: "Resultado de outubro de 2026 enviado para a impressora (2 cópias)."
4. Sem impressora instalada: avisa "Nenhuma impressora instalada neste computador" e o botão fica desligado. Impressora que sumiu entre a prévia e o imprimir: "Essa impressora não está mais ligada ao computador. Escolha outra."
5. Técnica: a CSP passa a aceitar `frame-src blob:` (só o PDF gerado pelo próprio programa). Nos testes, o PDF e as opções escolhidas (.json) vão para `<dados>/impressoes`.
6. **Falta testar numa impressora de verdade** (na loja): margens, papel A4 e cópias.

### D-089 · Número digitado errado: mostra o motivo e não salva
- **Data**: 29/10/2026 · **Origem**: Lucas (teste de uso de 2 meses, item 1) · **Situação**: Valendo
1. Antes, um texto que não vira número ("-50", "abc", "1,2,3") ficava na caixa, mas valia como vazio: no balcão, vazio é zero, e uma correção gravava o dinheiro como R$ 0,00 sem avisar.
2. Agora a caixa fica vermelha com o motivo, ao sair dela: "Não use o sinal de menos.", "Número grande demais. Confira." ou "Número com erro. Use só algarismos e vírgula, como 1.234,56.". Ao tocar em Salvar, aparece "Há um número digitado errado (marcado em vermelho). Corrija antes de salvar." e nada é gravado. Vale para todos os campos de número (dinheiro, quantidade e as caixas pequenas das tabelas).
3. Dinheiro acima de R$ 100.000.000,00 (o limite do banco) é número errado. Antes aparecia a mensagem técnica em inglês do zod e o total estourava a tela (rolagem horizontal).
4. Regra sem mensagem própria no processo principal agora responde em português ("Esse valor é grande demais. Confira os números.").

### D-090 · Clique duplo não grava duas vezes
- **Data**: 29/10/2026 · **Origem**: Lucas (item 1) · **Situação**: Valendo
- No teste, o clique duplo em Salvar gravou 2 contas e 2 perdas. Os botões que gravam (conta, pagamento, perda, retirada, balcão, taxas, pedido, produto, bem, manutenção, insumo, entrada, produção, receita, cliente, fornecedor, Gordurinha) agora rodam uma vez por vez (`useUmaVezPorVez`): o segundo clique, enquanto a gravação corre, é ignorado.

### D-091 · Esc depois de digitar pergunta antes de fechar o modal
- **Data**: 29/10/2026 · **Origem**: Lucas (item 1) · **Situação**: Valendo
- Sem ter mexido em nada, Esc fecha o modal (como antes). Depois de digitar ou tocar em algo do conteúdo, Esc mostra no rodapé "Fechar sem salvar? O que você digitou vai se perder. [Sim, fechar] [Não, continuar]". Esc de novo = continuar (nunca perde por acidente). "✕ Fechar" e Cancelar continuam fechando direto (são de propósito).

### D-092 · A compra do "Chegou mercadoria" pode ir para Contas a pagar
- **Data**: 29/10/2026 · **Origem**: Lucas (item 2, opção B; muda o item 2 de D-032) · **Situação**: Valendo
1. Motivo: no teste de 2 meses, o lucro mostrado foi R$ 50.186; descontando os R$ 8.429 de compras feitas pelo Estoque, seria R$ 41.757 (17% a menos). Lançar a compra duas vezes (Estoque e Contas) é fácil de esquecer.
2. No modal, quando o valor pago é maior que zero: **"Lançar esta compra em Contas a pagar?"** com **Sim, já paguei** (pede como pagou e quando, como em "Marcar como paga"), **Sim, vou pagar depois** (pede "Vence em") e **Não**. **Nada vem marcado** (Lucas): sem escolher, aparece "Diga se vai lançar esta compra em Contas a pagar."
3. A conta nasce com o nome "Morango 10 kg · Hortifruti São José", o valor pago, o tipo **Fornecedor** (criado de novo se tiver sido removido), sem repetir e com aviso 3 dias antes. É uma **conta independente** (Lucas): corrige-se ou exclui-se em Contas a pagar, como qualquer outra.
4. A entrada e a conta são gravadas na mesma transação: uma não fica sem a outra.
5. "Não" serve para conta já lançada à parte ou para o estoque que já existia no primeiro dia. Faixa verde depois de salvar: "A compra também foi para Contas a pagar, já paga." ou "…, para pagar até 30/10/2026."

### D-093 · Aviso quando a data do computador parece atrasada
- **Data**: 29/10/2026 · **Origem**: Lucas (item 3) · **Situação**: Valendo
- Se hoje (data do Windows) é antes da cópia de segurança mais nova registrada (cada abertura e fechamento faz uma), aparece uma faixa vermelha embaixo da barra do topo, em todas as telas: "A data do computador parece errada: hoje está 01/10/2026, mas o programa já foi usado em 29/10/2026. Confira o dia no relógio do Windows (no canto de baixo da tela) antes de lançar as vendas." Some sozinha quando a data volta a ficar certa. Não bloqueia nada.

### D-094 · Cópias: as 10 mais novas + 1 por dia dos últimos 30 dias
- **Data**: 29/10/2026 · **Origem**: Lucas (item 4, opção B; substitui a quantidade de D-013) · **Situação**: Valendo
- Antes: 30 na pasta e 10 no pen drive. Como abrir e fechar fazem cópia, com uma abertura por dia a pasta guardava só 16 dias e o pen drive 11. Agora, na pasta e no pen drive: ficam sempre as **10 cópias mais novas** e, além delas, a **mais nova de cada dia dos últimos 30 dias**. Cópias com data depois de hoje (relógio atrasado) não são apagadas.

### D-095 · Balcão todo zerado pergunta se a loja abriu
- **Data**: 29/10/2026 · **Origem**: Lucas (item 5) · **Situação**: Valendo
- Salvar o balcão com os quatro valores zerados mostra "Está tudo zerado. A loja não abriu neste dia? [Sim, a loja não abriu] [Não, salvar com R$ 0,00]". Antes, gravava um dia aberto com R$ 0,00, o que baixava a média por dia.
