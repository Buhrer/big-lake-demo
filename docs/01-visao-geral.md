# 01 · Visão geral

## O negócio

A **BIG LAKE** é uma sorveteria que **fabrica** o que vende: paletas, picolés, sorvete de pote (2 L), creme de açaí e açaí no copo, além de produtos de balcão (casquinha).

Ela vende de dois jeitos:

- **Balcão**: o consumidor compra na loja. O preço é o **preço de balcão**.
- **Atacado / pedidos de clientes**: mercados, lanchonetes, padarias, escolas e buffets encomendam. O preço é o **preço de atacado**, menor que o de balcão.

**O preço é fixo por categoria.** Toda paleta custa R$ 10,00 no balcão e R$ 7,00 no atacado, seja qual for o sabor. Como cada sabor tem um custo de fabricação diferente, **o lucro muda de sabor para sabor**. Por isso o centro do sistema é: **quanto custa fazer cada receita e quanto sobra de lucro em cada produto**.

## As pessoas

| Pessoa | Papel | O que precisa |
|---|---|---|
| **Carlos** | Sócio (60%), **pessoa idosa**, usuário principal | Lançar o dia, ver se está ganhando dinheiro, saber quando reajustar preço. Telas simples, letra grande, poucos cliques. |
| **Paulo** | Sócio (40%) | Ver a divisão do lucro, os reembolsos e as retiradas. |
| **Lucas** | Desenvolvedor | Construir, instalar e manter. |
| **Contador** | Externo | Receber relatórios impressos ou em PDF. |

## Objetivos (em ordem de importância)

1. **Margem de lucro clara**: o custo real de cada receita (ingredientes, embalagem, gás e energia da produção), o lucro de cada produto no balcão e no atacado e o aviso quando um custo sobe.
2. **Ganhos e despesas do mês**: vendas do balcão e pedidos, contas a pagar e lucro líquido.
3. **Divisão do lucro entre os sócios**, com reembolso do que cada um pagou no cartão pessoal e desconto das retiradas antecipadas.
4. **"Gordurinha"**: uma tese do Carlos. No último reajuste, os preços foram feitos para sobrar 10% a mais em cima do lucro líquido. Cada aumento de custo come um pedaço dessa sobra, e o sistema avisa quando é hora de reajustar.
5. **Controles de apoio**: estoque de insumos com validade e mínimo, planejamento de produção, perdas (inclusive trocas feitas nos clientes), patrimônio e manutenções, relatórios.
6. **Não perder dados**: backup automático no pen drive e numa pasta do computador.

## Escopo — o que entra

Os módulos abaixo estão aprovados no protótipo:

1. **Início**: resumo do mês, meta do mês (ponto de equilíbrio), avisos e atalhos.
2. **Vendas e Pedidos**: fechamento do balcão no fim do dia (dinheiro, Pix, débito e crédito), taxas da maquininha, pedidos de clientes com comprovante e resumo das vendas.
3. **Cadastros**: clientes, fornecedores e produtos à venda.
4. **Produção e Receitas**: planejar a produção (conferir estoque e baixar ingredientes) e receitas (custo e lucro).
5. **Estoque e Insumos**: matéria-prima e insumos, entrada de mercadoria, mínimo e validade.
6. **Perdas**: produtos prontos, matéria-prima e trocas em clientes.
7. **Contas a pagar**: vencimentos, avisos, forma de pagamento e cartões (da empresa ou pessoal de um sócio).
8. **Sócios**: divisão do lucro do mês, reembolsos e retiradas.
9. **Patrimônio**: bens da empresa e manutenções (que geram contas a pagar).
10. **Relatórios**: resultado do mês, Gordurinha, mais vendidos, formas de pagamento, comparação com o ano passado, lucro por produto e perdas. Todos imprimíveis e em PDF.
11. **Configurações**: backup, tamanho da letra, histórico do que foi feito e dados da empresa.

## Fora do escopo (decisões do cliente; não implementar sem perguntar)

- **Login e senha** (decidido: sem login).
- **PDV / caixa venda a venda** no balcão (o balcão é lançado pelo total do dia).
- **Fiado, boleto a receber ou contas a receber** (todas as vendas são pagas na hora).
- **Lista de compras** automática (removida do protótipo).
- **Acerto de contagem do freezer** / estoque de produto pronto (removido do protótipo).
- **Próximas manutenções** agendadas (removido; no lugar entrou a **garantia** em dias).
- Emissão de nota fiscal, integração bancária e integração com a maquininha.

## Glossário

| Termo | Significado |
|---|---|
| **Balcão** | Venda direta na loja, ao preço de balcão. |
| **Atacado / Pedido** | Venda por encomenda para clientes cadastrados, ao preço de atacado. |
| **Categoria** | Tipo do produto (Paleta, Picolé, Sorvete de pote, Açaí, Açaí no copo, Balcão). Define o preço de balcão e de atacado. Pode ser criada ou removida pelo usuário. |
| **Receita** | A "panela inteira": ingredientes, embalagem por unidade e rendimento (ex.: 100 paletas). |
| **Rendimento** | Quantas unidades a receita produz. |
| **Insumo / matéria-prima** | Matéria-prima é o que vai na receita (leite, fruta, açúcar). Insumo é a embalagem e os acessórios (pote, palito, saquinho, etiqueta, casquinha). |
| **Custo de cada** | Custo total da receita ÷ rendimento. |
| **Lucro de cada** | Preço da categoria − custo de cada. |
| **% do preço** | Lucro de cada ÷ preço. É a parte do preço que vira lucro (margem). |
| **Taxa da maquininha** | Percentual cobrado no débito e no crédito, com prazo em dias para o dinheiro cair na conta. |
| **Lucro líquido do mês** | Tudo o que entrou menos tudo o que saiu no mês. |
| **Reembolso** | Conta da empresa paga no cartão pessoal de um sócio; o valor volta para ele no fechamento. |
| **Retirada** | Dinheiro que o sócio pegou antes do fechamento; é descontado da parte dele. |
| **Gordurinha** | Folga de X% (padrão 10%) sobre o lucro líquido base, embutida no último reajuste de preços. É consumida pelos aumentos de custo. |
| **Ponto de equilíbrio / Meta do mês** | Quanto vender no mês para pagar todas as contas previstas. |
| **Troca em cliente** | Produto que venceu ou estragou no cliente e foi trocado por um novo. Conta como perda. |
