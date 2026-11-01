# 07 · Perguntas em aberto

> **27/10/2026:** as respostas do Lucas e do cliente estão em `DECISOES.md` (D-001 a D-034). Pendentes: D-034.

Lista inicial para o Claude Code fazer ao Lucas **em lotes de até 5, com opções e recomendação**. **[Cliente]** = o Lucas precisa confirmar com o Carlos/Paulo. **[Lucas]** = decisão técnica ou de projeto. Ao responder, mover para `DECISOES.md`.

## A. Ambiente e futuro (decidem a stack — perguntar primeiro)
1. **[Lucas/Cliente]** Qual o computador da loja? (Windows 10 de 32 ou 64 bits, memória RAM, disco SSD ou HD.) Tem internet, mesmo que instável?
2. **[Cliente]** Haverá **mais de um computador** usando o sistema (ex.: balcão e escritório)? Agora ou no futuro?
3. **[Cliente]** Os sócios querem, no futuro, **ver o resumo pelo celular** ou ter backup na nuvem?
4. **[Lucas]** Quais linguagens e frameworks você domina e quer manter no longo prazo? (Influencia a recomendação de stack.)
5. **[Cliente]** Qual **impressora** será usada para o comprovante de pedido: comum (A4) ou térmica (58/80mm)? Modelo?
6. **[Lucas]** Haverá orçamento para **certificado de assinatura de código**? (Evita o alerta do SmartScreen.)

## B. Pessoas e acesso
7. **[Cliente]** Só o Carlos usa, ou o Paulo e funcionários também? No mesmo computador?
8. **[Cliente]** Sem login, confirmado. Querem ao menos um **PIN** para ações sensíveis (restaurar backup, mudar a % dos sócios, excluir)?
9. **[Cliente]** A saudação "Bom dia, Carlos!" fica fixa ou escolhe-se quem está usando ao abrir?

## C. Vendas
10. **[Cliente]** Quais dias a loja abre? (Para o aviso de "dia sem lançamento".)
11. **[Cliente]** Existem outras formas de receber no balcão (vale, voucher, iFood, transferência)?
12. **[Cliente]** Pedido: pode ser **cancelado ou alterado** depois de salvo? Tem **taxa de entrega** ou **desconto**?
13. **[Cliente]** Os pedidos são sempre pagos na hora? (Sem fiado e sem boleto a receber, confirmar.)
14. **[Cliente]** "Caixa com 20 picolés": preço = 20 × atacado do picolé ou tem preço próprio?
15. **[Cliente]** A numeração dos pedidos começa de qual número?

## D. Estoque e custos
16. **[Cliente]** Custo do ingrediente na receita: **último preço pago** (como no protótipo) ou **média** das compras?
17. **[Cliente]** "Chegou mercadoria" deve **criar sozinha a conta a pagar** do fornecedor? Com qual vencimento?
18. **[Cliente]** Compra em embalagem diferente do uso (caixa com 12 latas, fardo com 6 L): precisa de conversão de unidade?
19. **[Cliente]** Controlar estoque de **produto pronto** (freezer)? (Foi tirado do protótipo; confirmar.)
20. **[Cliente]** Quantos dias antes da validade avisar? (Protótipo: até 7 dias, vermelho com 3 ou menos.)

## E. Produção
21. **[Cliente]** Pode registrar produção **sem ingrediente suficiente** no estoque (estoque fica negativo)?
22. **[Cliente]** Produzir **meia receita** ou **várias receitas** de uma vez?
23. **[Cliente]** O rendimento real às vezes é diferente do planejado (ex.: saiu 96 em vez de 100)? Anotar o real?

## F. Financeiro (impactam o lucro, então são importantes)
24. **[Cliente/contador]** Lucro do mês por **regime de caixa** (data do pagamento; mais simples, recomendado) ou **competência**?
25. **[Cliente]** As **taxas da maquininha** entram como despesa no resultado do mês? (Recomendado: sim, numa linha própria.)
26. **[Cliente]** O crédito que cai em 30 dias conta como venda do mês em que foi vendido? (Recomendado: sim.)
27. **[Cliente]** **Impostos** (Simples Nacional / DAS), **pró-labore** e salários entram como contas a pagar normais?
28. **[Cliente]** As **perdas** entram como despesa no resultado? (Recomendado: não, para não contar duas vezes a matéria-prima já paga; mostrar só no relatório de perdas.)
29. **[Cliente]** Quando uma conta repete todo mês, a próxima é criada **ao pagar** a atual ou **no primeiro dia do mês**?
30. **[Cliente]** Manutenção registrada como "não paga": qual o vencimento da conta criada?

## G. Sócios
31. **[Cliente]** O mês "fecha" e trava alterações depois da divisão? Quem fecha?
32. **[Cliente]** Se o lucro do mês for **negativo**, o que fazer (dividir o prejuízo, levar para o mês seguinte)?
33. **[Cliente]** A porcentagem (60/40) muda com frequência? Precisa de histórico por mês?
34. **[Cliente]** Outras formas de retirada além de "Pix da conta da empresa" e "Dinheiro do caixa"?

## H. Gordurinha
35. **[Cliente]** Qual o **lucro líquido base** inicial (valor do contador) e a data do último reajuste real?
36. **[Cliente]** Antes de haver 1 ano de dados, o **consumo médio mensal** de cada insumo é estimado pelas receitas/produção ou digitado?
37. **[Cliente]** Quais contas fixas entram na Gordurinha (energia, gás, internet, aluguel, salários…)?

## I. Relatórios, dados e suporte
38. **[Cliente]** O contador precisa de **Excel/CSV** além do PDF?
39. **[Cliente]** Há dados atuais (planilhas, caderno) para **importar** no início? Quais?
40. **[Cliente]** Quantas cópias de backup guardar? Criptografar o backup do pen drive?
41. **[Lucas]** Como serão as **atualizações** (instalador novo levado por você, ou atualização automática pela internet)?
42. **[Lucas]** Prazo, prioridade das fatias e o que é o **MVP** que o Carlos começa a usar primeiro?

## J. Lacunas e contradições encontradas na leitura (Claude, 27/10/2026)
43. **[Cliente]** **Entrada de mercadoria de um insumo já cadastrado**: o modal do protótipo só cadastra item novo ou edita (sobrescreve quantidade e custo). Como lançar "chegaram mais 20 kg de morango"? Proposta: no modal, escolher "item que já existe" ou "item novo"; a entrada **soma** a quantidade, atualiza o preço e gera o aviso "O custo subiu".
44. **[Cliente]** **Validade por lote**: a tela de estoque mostra "Creme de leite 18 L · validade 20/10 (6 L)", ou seja, só parte do estoque vence. A validade é uma por item (mais simples) ou uma por entrada/lote?
45. **[Lucas]** **Unidade "lata"**: a receita usa "10 latas" de leite condensado, mas o estoque só oferece Unidade/Litro/Quilo e o Início mostra "8 un". Proposta: "lata" é só o nome de exibição de uma unidade (un), sem conversão.
46. **[Lucas]** **"Gás e energia da produção"**: entra na receita como item "por vez", mas o modal de estoque não tem esse tipo. Onde é cadastrado e alterado o valor (R$ 8,00)?
47. **[Cliente/contador]** **Grupos do "Resultado do mês"** (Matéria-prima e insumos, Salários e encargos, Aluguel, Energia elétrica, Água e gás, Combustível e manutenção, Gastos nos cartões dos sócios) **não batem** com os tipos de conta (Fornecedor, Energia, Contas fixas, Aluguel, Funcionários, Serviços, Manutenção, Outros). Agrupar por tipo de conta? E "Gastos nos cartões dos sócios" é um grupo à parte (sai do tipo original) ou só informação?
48. **[Cliente]** **Troca em cliente**: o modal diz "os produtos novos entregues na troca saem do estoque", mas não existe estoque de produto pronto (ver Q19). A frase fica só como explicação?
49. **[Cliente]** **"Despesas do mês: compras e contas pagas"** (Início): se a entrada de mercadoria não gerar conta a pagar (Q17), a compra não entra em despesa nenhuma e o lucro fica maior do que é. Liga-se diretamente à Q17.
50. **[Cliente/contador]** **Conta paga no cartão de crédito da empresa**: vira despesa na data em que foi paga no cartão ou quando a fatura do cartão é paga? (Se for na fatura, a fatura não pode virar uma segunda despesa.)
51. **[Cliente]** **Gordurinha, reajuste**: o % sugerido também vale para o preço de atacado (e arredonda para R$ 0,50)? "Já reajustei os preços" só zera a conta (preços mudados à mão em Receitas) ou aplica os preços novos sozinho?
52. **[Cliente]** **Backup só ao fechar**: se o computador for desligado direto ou faltar luz, não há cópia do dia. Pode fazer também uma cópia automática na pasta ao abrir o sistema e a cada poucas horas?
53. **[Cliente]** **Participação dos sócios**: o protótipo ajusta de 5 em 5% (60 → 65). Confirmar o passo. A mudança vale para o mês aberto ou também para meses passados?
54. **[Cliente]** **Embalagem por unidade**: o protótipo só marca/desmarca (quantidade 1 por unidade). Existe produto que usa 2 do mesmo item? E a "Caixa 20 picolés" usa 20 saquinhos + 1 caixa? Como fica o custo dela (liga com Q14)?
