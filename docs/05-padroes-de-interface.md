# 05 · Padrões de interface

O usuário principal é **idoso**. Cada decisão visual existe para ele **enxergar bem, entender sem esforço e errar pouco**. O protótipo aprovado (`prototipo/telas/`) é a referência. O CSS completo de cada tela está em `prototipo/fonte/*.dc.html` (bloco `<style>`) e pode ser reaproveitado.

## 1. Princípios

1. **Letra grande e legível**: base de 18px; títulos de tela 44px.
2. **Poucos cliques**: as tarefas do dia ficam a 1 clique do Início. Nada escondido em menu de botão direito, atalho de teclado ou ícone sem texto.
3. **Linguagem do dia a dia**: "Chegou mercadoria", "Quanto cada um recebe", "Fica para a sorveteria". Nada de sigla, jargão contábil ou termo técnico.
4. **Explicar sem atrapalhar**: um "?" vermelho ao lado de cada parte, com uma explicação curta. O botão "Ajuda ligada/desligada" esconde todos.
5. **Errar sem medo**: confirmar antes de excluir e oferecer **Desfazer**. Avisos claros em vez de mensagens de erro técnicas.
6. **Consistência total**: o mesmo padrão de botão, modal e lista em todas as telas.
7. **Sem rolagem horizontal**, nunca. Cards lado a lado, que se reorganizam quando a tela é menor.

## 2. Cores

| Uso | Cor |
|---|---|
| Fundo da aplicação (creme) | `#FFF7DE` |
| Menu lateral (amarelo) | `#FFC93C` (hover `#FFDD70`) |
| Texto principal / item ativo do menu / bordas fortes | `#2A1E10` (marrom-escuro) |
| Texto do item ativo e de abas ativas | `#FFD54F` sobre `#2A1E10` |
| Texto secundário | `#5E4B33` |
| **Ação principal (criar, salvar)** | `#C62828` (hover `#A61B1B`), texto branco |
| Cards / modais | `#FFFFFF`, borda `#F0E2B6` (card) ou `#2A1E10` (modal) |
| Cabeçalho de tabela, destaque suave | `#FFF0C2` |
| Linhas de tabela | `#F0E6CC` |
| Borda de campo | `#CDBF9C` |
| Sucesso / lucro | texto `#14532D`, fundo `#DDF3E3` |
| Erro / atraso / prejuízo | texto `#8E1414`, fundo `#FDE0DE` |
| Atenção | texto `#6B4A00`, fundo `#FFF0C2`; barra `#F2B200` |
| Informação | texto `#1E3A6E`, fundo `#E3ECFA` |
| Opção escolhida | `#FFC93C` |

Contraste mínimo **AA** (4,5:1) em todo texto.

## 3. Tipografia

- **Títulos**: *Baloo 2* (600–800). **Texto**: *Atkinson Hyperlegible* (400/700), fonte criada para baixa visão.
- As duas são Google Fonts com licença OFL. **Embuta os arquivos no aplicativo** (nada de carregar da internet).
- Números de dinheiro com `font-variant-numeric: tabular-nums`, alinhados à direita nas tabelas.
- **Tamanho da letra** ajustável: A−/A+ no topo (80% a 130%, passos de 10%) e padrão em Configurações (Normal 18px · Grande 22px · Muito grande 26px). Todo o layout precisa continuar sem rolagem horizontal em qualquer tamanho.

## 4. Layout

- **Menu lateral** fixo à esquerda com **292px**, parado na tela quando o conteúdo rola (D-084); texto do menu nunca quebra linha. Ícone + texto em cada item (ícones de traço, 26px). Bolinha vermelha no canto do ícone de "Contas a pagar" e de "Produção e Receitas" (D-079, D-080).
- **Área principal** com largura máxima de 1180px, centralizada, com margem de 32px.
- **Barra do topo** (card branco): estado do backup à esquerda; "?", A−, A+, Ajuda e Configurações à direita.
- **Cabeçalho da tela**: subtítulo pequeno, título 44px + "?", e à direita o botão vermelho de criar. **Nunca quebra para baixo do título**: o subtítulo é que se ajusta.
- **Cards em grade** (`auto-fit, minmax(240px, 1fr)`) lado a lado.
- Resoluções-alvo: **1366×768** (principal) e **1280×720** (mínima). Janela abre maximizada.

## 5. Componentes

### Botões
| Tipo | Uso | Visual |
|---|---|---|
| **Principal** | Criar, Salvar, Confirmar | vermelho, texto branco, altura 52px, cantos 12px |
| **Secundário** | Cancelar, Ver…, Imprimir, Fechar | branco, borda escura 2px, altura 52px |
| **Pequeno** | Ações na linha (Editar, Excluir, Manutenção) | branco, borda escura, altura 46px |
| **Opção** | Escolhas grandes (forma de pagamento, tipo) | branco; escolhida = amarelo `#FFC93C`, altura 56px |
| **Aba / filtro** | Filtros de lista | pílula; ativa = fundo escuro e texto amarelo |
| **Segmento** | Troca de parte da tela (ex.: Bens / Manutenções) | grupo com borda; ativo escuro |

### Botão vermelho de criar → Modal
- Fica no cabeçalho, à direita do título. Texto com "+": "+ Cadastrar cliente", "+ Nova conta", "+ Registrar perda".
- **Sempre abre um modal.** O texto do botão não muda quando o modal abre.

### Modal (padrão único)
- Fundo escurecido; quadro **branco com borda escura de 2px**, cantos 18px, sombra; largura até 980px (pagamento: 640px; manutenção: 760px); altura máxima da tela − 32px com rolagem vertical interna.
- **Cabeçalho**: título à esquerda (28px) e **"✕ Fechar"** à direita, **na mesma linha**. No modo edição: título "Editar …" + etiqueta amarela "Editando …".
- **Rodapé**: botão principal (Salvar / "Salvar alterações" / Confirmar) + "Cancelar".
- Rótulos dos campos com **altura uniforme** (34px) para os campos ficarem alinhados, mesmo quando o rótulo tem "?".

### Lista suspensa (padrão único; nunca o select nativo do Windows)
- Botão com o mesmo visual de campo, texto escolhido em negrito e seta ▼/▲. Texto longo vira "…" (não quebra linha).
- Painel com borda escura; opção escolhida com **✓** e fundo amarelo; largura mínima 400px, alinhada para não sair da tela.
- **Fecha ao clicar fora.**
- **Dentro de modal**: o painel **flutua por cima** (não aumenta o modal nem cria rolagem nele) e **abre para cima** quando não há espaço embaixo; a lista rola por dentro e o rodapé de "criar" fica sempre visível.
- **Listas de categorias/tipos** (categoria do produto, tipo de conta, tipo do bem, cartões): no fim, campo "Nome novo" + **"+ Criar"**. Em cada linha, botão **Remover** com ícone de lixeira (pílula vermelha clara) → "Remover? **Sim** / Não". Item usado mostra "em uso · N" no lugar do Remover. Nota: "Só dá para remover … que não tem/usa …".

### Tabelas
- Cabeçalho amarelo-claro; linhas com divisória suave; textos secundários abaixo do principal (menores, cor secundária).
- Valores à direita; ações à direita (Editar, Excluir…). **Nunca** colunas demais: informação secundária vai embaixo da principal (ex.: telefone e CPF embaixo do nome).

### Editar / Excluir / Desfazer
- **Editar** abre o mesmo modal de cadastro, já preenchido.
- **Excluir**: a linha fica vermelho-clara com "Excluir este …?" e os botões **Sim** (vermelho) / **Não**.
- Depois de excluir: faixa verde "✓ "X" foi excluído da lista." com **Desfazer**.

### Mensagens
- Sucesso: faixa verde com ✓ ("Pedido nº 1053 salvo! …").
- Validação: texto vermelho embaixo do campo, em linguagem simples ("Escolha como foi paga.").
- Avisos do sistema (backup atrasado, pen drive ausente): na barra do topo, em amarelo/vermelho, com o que fazer.

### Ajuda "?"
- Círculo vermelho de 34px; ao passar o mouse ou focar, abre um balão escuro (330px) com **título em amarelo** e texto curto. Os textos de cada tela estão em `prototipo/textos-das-telas/` (trechos `[AJUDA: …]`).

### Etiquetas (tags)
- OK/Pago (verde), Comprar/Atrasada/≤3 dias (vermelho), Atenção/≤7 dias (amarelo), Informação (azul).

## 6. Impressão

- **Comprovante do pedido**: formato simples, monoespaçado, cabe em papel A4 e em impressora térmica de 80mm **[DECIDIR a impressora]**.
- **Relatórios**: versão de impressão limpa (sem menu, botões e "?"), com cabeçalho da empresa e período; "Salvar em PDF".

## 7. Acessibilidade (checklist do QA)

- [ ] Todo botão de ícone tem nome acessível; todo campo tem rótulo.
- [ ] Navegação por teclado (Tab) em ordem lógica; foco visível.
- [ ] Contraste AA; nenhum texto menor que 15px no tamanho Normal.
- [ ] Alvos de clique ≥ 44×44px.
- [ ] Sem rolagem horizontal em 1280×720 com letra a 130%.
- [ ] Mensagens não dependem só da cor (sempre com texto ou ícone).
