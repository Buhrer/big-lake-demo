# 02 · Telas e funcionalidades

Referências visuais: `prototipo/telas/NN-Tela.png` (tela inteira) e `prototipo/telas/NN-Tela__*.png` (outras abas e modais). Os textos exatos de cada tela, inclusive todas as explicações dos botões "?", estão em `prototipo/textos-das-telas/NN-Tela.txt`. **Use esses textos como estão**; se precisar mudar algum, pergunte.

Os cálculos citados aqui estão detalhados em `03-regras-de-negocio-e-calculos.md`.

---

## 0. Estrutura comum a todas as telas

**Menu lateral (amarelo)**, sempre visível, nesta ordem: Início · Vendas e Pedidos · Cadastros · Produção e Receitas · Estoque e Insumos · Perdas · Contas a pagar (com **bolinha vermelha** mostrando quantas contas vencem logo) · Sócios · Patrimônio · Relatórios. O item da tela atual fica destacado (fundo escuro, letra amarela).

**Barra do topo**: "✓ Cópia de segurança feita hoje, 08:02" (estado do último backup) · "?" · **A−** · **A+** · **"? Ajuda ligada/desligada"** · **Configurações**.

**Cabeçalho da tela**: uma frase curta acima, o **título** grande com "?", e à direita o **botão vermelho de criar** da tela, quando houver.

> A etiqueta "Simulação · dados de exemplo" existe só no protótipo. **Não vai para o sistema final.**

**Critérios de aceite gerais**
- Sem barra de rolagem horizontal em 1280×720 e 1366×768, com letra de 80% a 130%.
- Toda lista de cadastro tem **Editar**. Quando a lista permite excluir: confirmação "Sim/Não" na própria linha e faixa verde com **Desfazer**.
- Todo botão vermelho de criar abre um **modal**.
- Toda ação que grava dados aparece no **Histórico** (Configurações).

---

## 1. Início (`01-Inicio.png`)

- Saudação com a data por extenso ("Sexta-feira, 16 de outubro de 2026" / "Bom dia, Carlos!"), conforme a hora do dia.
- **Atalhos grandes**: Lançar vendas do dia → Vendas (aba balcão) · Novo pedido de cliente → Vendas (aba pedidos) · Planejar produção · Chegou mercadoria → Estoque (abre o modal de entrada).
- **Cards do mês**: Vendas de ontem (dinheiro, cartão e Pix) · Vendas do mês (balcão + pedidos) · Despesas do mês (contas pagas e taxas; a compra entra pela conta que o "Chegou mercadoria" lança, D-092) · **Lucro até hoje** (destaque escuro; "dividido no fim do mês").
- **Meta para pagar as contas do mês** (ponto de equilíbrio): já vendeu × meta, barra com %, "Faltam R$ X, cerca de N dias de vendas no ritmo atual. Depois disso, o que entrar é lucro." Considera todas as contas previstas do mês, inclusive as que ainda vão vencer.
- **Avisos de hoje** (cards):
  - **Gordurinha**: status (Tranquilo/Atenção/Hora de reajustar), "Restam R$ X de R$ Y por mês (Z%)", barra, o que mais comeu, previsão de quando acaba, botão "Ver em Relatórios › Gordurinha".
  - **Estoque baixo**: itens abaixo do mínimo (nome, mínimo, quantidade atual em vermelho), botão "Ver estoque".
  - **Vencendo em breve**: itens com validade próxima (nome, quantidade, data, etiqueta "em N dias"; vermelho se ≤ 3 dias), com a dica "use primeiro na produção ou faça uma promoção".
  - **Contas para pagar**: as que entraram no período de aviso, com valor; botão "Ver contas a pagar".
  - **O custo subiu**: ingrediente que ficou mais caro (de → para, %), e os produtos afetados com "lucro de cada R$ antes → R$ agora"; botão "Ver detalhes" → Produção.
  - **Últimos pedidos**: os 3 mais recentes (cliente, data, resumo dos itens, valor); "Ver todos os pedidos".
- Um card só aparece quando há algo a mostrar (sem estoque baixo, o card não aparece).

---

## 2. Vendas e Pedidos (`02-Vendas-e-Pedidos*.png`)

Três abas: **Vendas do balcão (fim do dia)** · **Pedidos de clientes** · **Resumo das vendas**.

### 2.1 Vendas do balcão (fim do dia)
- **Lançar as vendas de hoje**: data do dia e quatro campos em R$: **Dinheiro, Pix, Cartão débito, Cartão crédito**. O **Total do dia** é calculado na hora. Botão **Salvar vendas de hoje** → mensagem "Vendas de dd/mm lançadas! Total de R$ X." e botão "Corrigir valores".
- Só **um fechamento por dia**. Se o dia já foi lançado, a tela abre em modo de correção.
- **Taxas da maquininha** (área recolhível): débito (taxa % e "cai na conta em N dias") e crédito (taxa % e dias). Preenche uma vez; vale para o balcão e para os pedidos pagos no cartão.
- **Histórico do balcão**: Dia · Dinheiro · Débito · Crédito · Pix · Total, do mais novo para o mais antigo. Tocar num dia abre para corrigir.

### 2.2 Pedidos de clientes
- **Novo pedido**:
  - **Cliente** (lista suspensa dos clientes cadastrados) e **Data** (padrão: hoje).
  - **1. Toque no produto para adicionar**: abas de categoria; cada produto mostra nome e **preço de atacado**. A lista vem de Cadastros › Produtos à venda; produto novo aparece sozinho.
  - **2. Itens do pedido**: cada item com quantidade digitável e botões −/+, valor do item e "Remover". Mensagem quando vazio.
  - **Como o cliente pagou**: Dinheiro · Pix · Cartão débito · Cartão crédito.
  - **Total do pedido**. Se for cartão: "Taxa da maquininha (x%) − R$" e "Fica para a sorveteria R$".
  - **Salvar pedido** → "Pedido nº N salvo! Total de R$ X em <forma>." com **Imprimir comprovante** e **Fazer outro pedido**.
- **Comprovante** (para imprimir e ir com a entrega): nome da empresa, nº e data do pedido, cliente, itens (qtd × nome = valor), TOTAL, forma de pagamento e "Recebido por: ____".
- **Histórico de pedidos**: "Mês: N pedidos · R$ total"; colunas Nº · Data · Cliente (com resumo dos itens) · Pagamento · Total · **Comprovante** (reimprimir).
- Numeração **sequencial** e sem repetição.

### 2.3 Resumo das vendas (só consulta)
- **Dia**: Vendas de hoje · Média por dia (balcão + pedidos) · Melhor dia do mês · **Dias lançados** (avisa se algum dia ficou sem fechamento) · **Taxas da maquininha de hoje** (débito do balcão, crédito do balcão, pedidos no cartão, total, "Fica para a sorveteria hoje", quando o crédito cai na conta).
- **Mês**: Total vendido · Balcão (% do total) · Pedidos (% e quantidade) · Dias com venda · barra Balcão × Pedidos · tabela "Vendas por dia" (Dia · Balcão · Pedidos · Total).

---

## 3. Cadastros (`03-*`, `04-*`, `05-*`)

Uma tela com três abas: **Clientes (N)** · **Fornecedores (N)** · **Produtos à venda**. O botão vermelho muda conforme a aba: "+ Cadastrar cliente" / "+ Cadastrar fornecedor" / "+ Cadastrar produto".

### 3.1 Clientes
- **Modal**: Nome · Telefone/WhatsApp · CPF ou CNPJ (os três na mesma linha) · **Endereço de entrega**: Rua · Número (linha 1) e Bairro · Cidade (linha 2). Botões "Salvar cliente" e "Cancelar".
- **Lista**: busca por nome ou telefone. Colunas: Cliente (nome; telefone; CPF/CNPJ embaixo) · Endereço de entrega (rua, nº / bairro · cidade) · Pedidos ("24 pedidos", "último 16/10 · R$ 540,00") · botões **Novo pedido** (abre o pedido já com o cliente) e **Editar**.

### 3.2 Fornecedores
- **Modal**: Nome / Razão social · Telefone/WhatsApp · CNPJ ou CPF · Pessoa de contato · O que fornece.
- **Lista**: Fornecedor (nome + o que fornece) · Contato (pessoa + telefone) · Comprado no mês (R$) · **Editar**.

### 3.3 Produtos à venda
- **Filtros** por categoria (Todos + categorias existentes; mudam sozinhos quando se cria ou remove uma).
- **Modal** ("Cadastrar produto à venda" / "Editar produto"):
  - **Categoria**: lista suspensa com criar e remover (só remove categoria sem produtos; mostra "em uso · N produtos").
  - Nome / sabor · **Vendido como** (Unidade, Pote, Copo, Caixa) · **Peso ou volume** (número + unidade g, kg, ml, L) · **Receita usada** (lista das receitas).
  - Quadro **Preço de venda · fixo da categoria X**: Balcão e Atacado (só leitura) + botão "Mudar em Receitas".
  - **Custo de cada um** (vem da receita) · **Lucro no balcão** · **Lucro no atacado**.
- **Lista**: Produto (nome; categoria · tamanho) · Custo · Balcão · Atacado · Lucro no balcão · **Editar** · **Excluir** (confirmação + Desfazer).

---

## 4. Produção e Receitas

Duas abas: **Planejar produção** · **Receitas**.

### 4.1 Planejar produção (`06-Producao-Planejar.png`)
- **Alerta de custo** (quando algum ingrediente subiu): "Em dd/mm o X passou de R$ a R$ (+%). Estas receitas ficaram mais caras:"; para cada receita afetada: nome, preço no balcão, custo de cada (antes → agora), lucro de cada (antes → agora, em vermelho) e "Ver receita".
- **Qual receita vai fazer?**: botões com as receitas.
- "Esta receita produz **N unidades**" (vem da receita) + "Mudar na receita".
- **Ingrediente e embalagem**: A receita usa · Tem no estoque · Situação (OK / Falta). Resultado: "Tem tudo no estoque. Pode produzir!" ou "Falta comprar: … · Custo estimado R$".
- **Registrar produção**: baixa do estoque os ingredientes e as embalagens da receita → "Produção registrada! N unidades de X anotadas. Os ingredientes e as embalagens foram baixados do estoque." + "Planejar outra produção".

### 4.2 Receitas (`07-Producao-Receitas*.png`)
- Botão vermelho **+ Nova receita** (modal). Na lista, **Editar** abre o mesmo modal ("Editar receita").
- **Modal em 3 partes**:
  1. **Nome e ingredientes**: Nome da receita · **Categoria do produto** · tabela Ingrediente · Quantidade na receita (unidade do insumo) · Preço pago (vem do Estoque, último valor pago) · Custo · Remover. "+ Adicionar ingrediente" abre uma lista dos itens de estoque com o preço; "Falta algum? Cadastre primeiro em Estoque e Insumos". **Custo dos ingredientes** no rodapé. Existe um item especial "Gás e energia da produção" (por vez).
  2. **Embalagem de cada unidade**: marcar os itens usados por unidade (palito, saquinho, etiqueta, pote 2 L, pote 1 L, copo…), com o preço de cada. Tabela Item · Preço de cada · Quantidade (= rendimento) · Custo. "Esta receita não usa embalagem" quando nada marcado.
  3. **Quanto rende e quanto sobra**: "Quantas <unidades> essa receita rende?" (−/+ e campo) · Ingredientes · Embalagem · **Custo da receita inteira** · **Custo de cada**. Dois quadros:
     - **Vendendo no balcão**: Preço de cada (editável; **muda para a categoria inteira**) · Lucro em cada (com "% do preço vira lucro") · Lucro da receita inteira.
     - **Vendendo no atacado**: o mesmo, com o preço de atacado.
  - Botões **Salvar receita** e **Fechar sem salvar**.
- **Receitas cadastradas**: abas por categoria; colunas Receita (nome; "rende 100 paletas"; etiqueta "menor lucro" na pior) · Custo de cada · Lucro no balcão (+ % do preço) · Lucro no atacado (+ %) · **Editar** · **Excluir** (confirmação + Desfazer). Ordenadas do maior para o menor lucro; a de menor lucro fica destacada.

---

## 5. Estoque e Insumos (`08-Estoque-e-Insumos*.png`)

- Botão **+ Cadastrar insumo** (modal "Cadastrar insumo / entrada de mercadoria"). O atalho "Chegou mercadoria" do Início abre este modal.
- **Modal**: É matéria-prima ou insumo? (dois botões grandes) · Como é medido? (Unidade / Litro / Quilo) · Nome · Quantidade · Valor pago (R$) · Fornecedor (lista) · Estoque mínimo · Validade. Mostra **Custo por unidade/litro/quilo** calculado. **Editar** abre o mesmo modal com "Quantidade em estoque" e "Custo por … (R$)".
- **Filtros**: Todos · Matéria-prima · Insumos · Estoque baixo · Vencendo.
- **Lista**: Produto (nome; fornecedor) · Em estoque (qtd; "mín. X") · Custo (R$/unidade) · Validade (+ etiqueta "vence em N dias") · Situação (OK / Comprar) · **Editar**.

---

## 6. Perdas (`09-Perdas*.png`)

- Botão **+ Registrar perda** (modal). Um registro pode ter **vários itens**.
- **Modal**:
  - **O que se perdeu?**: Produtos prontos (estragaram aqui) · Matéria-prima ou insumo · **Troca em cliente** (venceu no cliente e foi trocado; pede **Qual cliente?**).
  - Botões com os itens possíveis (produtos com o custo de fazer; matéria-prima com o preço pago). Tocar adiciona ao registro.
  - **Itens deste registro**: Item · Quantidade (digitável) · Valor · Remover. **Valor da perda** (pelo custo de fazer / pelo preço pago).
  - **Por quê?** (motivos conforme o tipo) · Observação.
  - Na troca: "Os produtos novos entregues na troca saem do estoque. O cliente não paga por eles, por isso entram como perda."
- **Resumo do mês**: Perdido no mês (total e nº de registros) · Produtos prontos · Matéria-prima e insumos · Trocas em clientes.
- **Trocas por cliente** no mês (cliente · itens · valor).
- **Lista**: filtros; colunas Data · O que se perdeu (itens) · Motivo · Valor · **Editar** · **Excluir** (confirmação + Desfazer).

---

## 7. Contas a pagar (`10-Contas-a-pagar*.png`)

- Botão **+ Nova conta** (modal).
- **Cards**: Vencem nos próximos 7 dias (R$, quantidade) · Atrasadas (R$; "nenhuma conta atrasada") · Pagas no mês (R$, quantidade).
- **Modal Nova conta / Editar conta**: O que é · Valor (R$) · Vencimento · **Tipo de conta** (lista com criar e remover; padrão: Fornecedor, Energia, Contas fixas, Aluguel, Funcionários, Serviços, Manutenção, Outros) · **Já está paga?** (Sim/Não; não aparece ao editar) · **Repete todo mês?** (Sim/Não) · **Avisar quantos dias antes?** (1, 3, 5, 7 dias). Botão "Salvar e dizer como paguei" (se já paga) ou "Salvar conta"; na edição, "Salvar alterações".
- **Modal de pagamento** ("Como esta conta foi paga?", nome e valor da conta):
  - **Forma de pagamento**: Dinheiro · Pix · Boleto · Transferência · Cartão de débito · Cartão de crédito.
  - Se for cartão: **Qual cartão?** (lista: "Cartão da empresa (Bradesco) · da empresa", "Crédito final 4421 · pessoal do Carlos"…). No fim da lista: "Cartão novo é de quem? Empresa / Carlos / Paulo" + nome + "+ Criar". Remover só se nenhuma conta usa ("em uso · N contas"). Aviso: cartão pessoal de sócio → o valor volta para ele em Sócios (reembolso).
  - **Pago em** (data). Botões **Confirmar pagamento** / **Cancelar**.
- **Filtros**: A pagar · Pagas · Todas.
- **Lista**: Vencimento (data + etiqueta: Hoje, Amanhã, Em N dias, Paga) · Conta (nome; tipo; "pago com …" quando paga) · Repete · Valor · **Editar** · **Marcar como paga** / **Desfazer**.
- Conta que repete: ao chegar o mês seguinte, o sistema cria a conta do mês sozinho.

---

## 8. Sócios e divisão do lucro (`11-Socios*.png`)

- Navegação por mês (‹ Outubro de 2026 ›). Botão **+ Registrar retirada** (modal).
- **Faturamento** (balcão + pedidos) · **Despesas** (inclui contas pagas nos cartões dos sócios) · **Lucro líquido para dividir**.
- **Participação de cada sócio**: Carlos −/+ (o Paulo se ajusta para somar 100%); barra com as duas partes.
- **Quanto cada um recebe** (um card por sócio): Parte do lucro (x%) · + Reembolso (contas pagas no cartão pessoal) · − Retiradas durante o mês · **Total a receber**.
- **Reembolsos e retiradas** (abas):
  - **Reembolsos do mês** (só leitura, vem de Contas a pagar): Data · Conta paga · Cartão · Volta para (valor e sócio). "Vem sozinho de Contas a pagar. Para corrigir, mude a forma de pagamento lá." + "Ver em Contas a pagar".
  - **Retiradas do mês**: Data · Sócio · Motivo · Como pegou · Valor.
- **Modal Registrar retirada**: Quem retirou? (Carlos/Paulo) · Valor · Como pegou (Pix da conta da empresa, Dinheiro do caixa) · Data · Motivo.

---

## 9. Patrimônio (`12-Patrimonio*.png`)

Duas abas: **Bens da empresa** · **Manutenções**. O botão vermelho muda: "+ Cadastrar bem" / "+ Registrar manutenção".

### 9.1 Bens da empresa
- Cards: Bens cadastrados (quantidade) · Valor pago (total).
- Filtros por tipo (Todos, Veículos, Equipamentos, Móveis, Informática + tipos criados).
- **Modal bem** ("Novo bem da empresa" / "Editar bem"): O que é · **Tipo** (lista com criar e remover) · Data da compra (mês/ano) · Valor pago · Placa / nº de série.
- **Lista**: Bem (nome; tipo) · Data da compra · Valor pago · **Editar** · **Manutenção** (abre o modal de manutenção já com o bem). Rodapé: Total.

### 9.2 Manutenções
- Resumo do ano: Gasto com manutenção · Serviços feitos (N revisões e N consertos) · Bem que mais gastou.
- **Histórico de manutenções** com filtro "Patrimônio: Todos / <bem>": Data · Patrimônio · O que foi feito ("feito por X") · Tipo (Revisão em azul / Conserto em vermelho) · Valor; Total.
- **Modal Registrar manutenção**: Qual patrimônio? (lista) · "Já feitas neste bem" (lista com total) · O que foi feito · Quem fez · Data · Valor · **Garantia** (dias; mostra "Garantia vale até dd/mm/aaaa") · Tipo (Revisão preventiva / Conserto) · **Já está paga?** (Sim → Como foi paga? + cartão, igual a Contas; Não → vai para Contas a pagar em aberto). "Ao salvar, a manutenção entra em Contas a pagar já como paga."
- Ao salvar: mensagem "✓ … · Ver em Contas a pagar".

---

## 10. Relatórios (`13-Relatorios*.png`)

- Período (lista de meses), **Imprimir**, **Salvar em PDF**. Lista de relatórios à esquerda:
  1. **Resultado do mês (lucro)**: Vendas no balcão · Pedidos · **Total que entrou** · − cada grupo de despesa (Matéria-prima e insumos, Salários e encargos, Aluguel, Energia, Água e gás, Combustível e manutenção, Gastos da empresa nos cartões dos sócios…) · **Lucro líquido** · "Ver divisão entre os sócios".
  2. **Gordurinha (hora de reajustar?)**: status, desde quando, "Ainda restam R$ X por mês", barra, Lucro líquido base · Gordurinha (x%) · Já foi comido; "Mudar base ou porcentagem"; previsão; **O que comeu a gordurinha** (o que subiu, uso, antes → agora, a mais por mês, total); **Reajuste de preços** (% sugerido e exemplos: Paleta, Picolé, Pote 2 L, antes → novo → arredondado); **Já reajustei os preços** (confirmação "Os preços novos já estão valendo? Sim, zerar a conta / Ainda não").
  3. **Mais vendidos nos pedidos**: ranking de produtos (qtd e R$), clientes que mais compraram, total dos pedidos.
  4. **Dinheiro, cartão e Pix**: balcão por forma (R$ e %), total, taxas da maquininha, dias de loja aberta e média por dia.
  5. **Comparar com o ano passado**: mês × mesmo mês do ano anterior (linhas e diferença) e vendas mês a mês dos dois anos (gráfico de barras).
  6. **Lucro por produto (estimado)**: produzido − perdas × lucro de cada; ranking; aviso de que é estimativa porque o balcão é lançado pelo total.
  7. **Perdas**: por tipo, total, quem mais trocou, maior motivo, "Ver detalhes em Perdas".
- Cada relatório tem uma frase de conclusão em linguagem simples (ex.: "O morango é o sabor que mais sai nas encomendas: vale ter sempre potes prontos no freezer.").

---

## 11. Configurações (`14-Configuracoes.png`)

- **Cópia de segurança**: Copiar sozinho ao fechar o sistema (Ligado/Desligado) · destinos (Pen drive E:, pasta Documentos\BigLake) com o estado de cada · Últimas cópias (data/hora, Completa) · **Fazer cópia agora** · **Restaurar uma cópia**.
- **Tamanho da letra**: Normal · Grande · Muito grande, com uma prévia.
- **Histórico do que foi feito**: Quando · O que foi feito.
- **Dados da empresa**: Nome · CNPJ · Telefone · Endereço (usados em comprovantes e relatórios) · Salvar dados.
- O bloco "Só no protótipo / Apagar dados de teste" **não vai para o sistema final**.
