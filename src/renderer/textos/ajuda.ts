// Textos dos botões "?" copiados de prototipo/textos-das-telas (não mudar sem perguntar).

export interface TextoAjuda {
  titulo: string
  texto: string
}

export const AJUDA = {
  backup: {
    titulo: 'Cópia de segurança automática',
    texto:
      'Toda vez que o sistema é fechado, ele copia todos os dados para o pen drive e para uma pasta do computador. Se o computador estragar, nada se perde.'
  },
  letra: {
    titulo: 'Tamanho da letra',
    texto:
      'A+ aumenta tudo na tela e A− diminui. Bom para quem enxerga melhor com letra grande. O tamanho padrão fica salvo em Configurações.'
  },
  inicio: {
    titulo: 'Tela inicial',
    texto:
      'É a primeira tela ao abrir o sistema. Mostra o resumo do mês, o que precisa de atenção e atalhos para as tarefas mais comuns.'
  },
  vendas: {
    titulo: 'Vendas e pedidos',
    texto:
      'Duas partes numa tela só. "Vendas do balcão": no fim do dia, anote quanto entrou em dinheiro, cartão e Pix. "Pedidos de clientes": as encomendas de mercados, lanchonetes e festas, pagas em dinheiro, Pix ou cartão.'
  },
  cadastros: {
    titulo: 'Cadastros',
    texto:
      'Tudo o que se cadastra num lugar só. "Clientes" são quem compra por encomenda, "Fornecedores" são quem vende mercadoria para a Big Lake e "Produtos à venda" são as paletas, picolés, potes e açaí. O preço vem da categoria, definido em Receitas. Toque na aba para trocar.'
  },
  producao: {
    titulo: 'Produção e Receitas',
    texto:
      'Em "Planejar produção" você diz o que quer fazer e o sistema confere se tem ingrediente no estoque. Em "Receitas" fica quanto custa fazer cada sorvete ou paleta e quanto sobra de lucro em cada um. Em "Avisos" aparece quando um ingrediente ou embalagem fica mais caro; a bolinha vermelha diz quantos avisos há.'
  },
  estoque: {
    titulo: 'Estoque e insumos',
    texto:
      'Tudo o que é comprado para fabricar: leite, frutas, açúcar, potes, palitos. Mostra quanto tem, quanto custou, a validade e o que está abaixo do mínimo. O que se perdeu fica em Perdas, no menu.'
  },
  perdas: {
    titulo: 'Controle de perdas',
    texto:
      'Anote tudo o que se perdeu: paletas e potes que estragaram aqui, matéria-prima que venceu e produtos que venceram no cliente e foram trocados. No fim do mês você vê quanto dinheiro se perdeu e onde.'
  },
  contas: {
    titulo: 'Contas a pagar',
    texto:
      'Anote cada conta com o valor e o vencimento. O sistema avisa antes de vencer, na tela inicial e no menu (número vermelho), para nada atrasar e não pagar juros.'
  },
  socios: {
    titulo: 'Divisão do lucro',
    texto:
      'No fim do mês o sistema pega o lucro líquido e divide pela porcentagem de cada sócio. Depois devolve o que cada um pagou da empresa no próprio cartão, desconta as retiradas antecipadas e mostra quanto cada um tem a receber.'
  },
  patrimonio: {
    titulo: 'Patrimônio',
    texto:
      'A lista de tudo o que a sorveteria tem: veículos, gerador, máquinas, freezers e móveis. Mostra quanto foi pago em cada um. Para registrar uma revisão ou conserto, toque em "Manutenção" na linha do bem.'
  },
  relatorios: {
    titulo: 'Relatórios',
    texto:
      'Escolha um relatório na lista à esquerda. Todos podem ser impressos ou salvos em PDF para mostrar ao contador ou guardar.'
  },
  copiaAutomatica: {
    titulo: 'Cópia automática',
    texto:
      'Com a opção ligada, toda vez que o sistema é fechado ele salva uma cópia no pen drive e numa pasta do computador. Guarde o pen drive fora da loja. Se precisar, "Restaurar" volta tudo como estava na data escolhida.'
  },
  tamanhoPadrao: {
    titulo: 'Tamanho padrão',
    texto:
      'Escolha o tamanho com que o sistema sempre abre. Dá para ajustar a qualquer momento com A+ e A− no alto da tela.'
  },
  historico: {
    titulo: 'Histórico',
    texto:
      'O sistema anota tudo o que foi alterado e quando: preço mudado, mercadoria que entrou, perda registrada, vendas do dia lançadas. Ajuda a achar e corrigir um erro de digitação. Aparecem os 10 mais novos; "Ver mais" mostra mais 10. Para ver um mês antigo, escolha o mês na lista "Mês".'
  },
  dadosEmpresa: {
    titulo: 'Dados da empresa',
    texto: 'Aparecem nos comprovantes de pedido e nos relatórios impressos.'
  },
  cadastrarOuCorrigir: {
    titulo: 'Cadastrar ou corrigir',
    texto:
      'Preencha os campos e toque em Salvar. Para corrigir alguém que já está na lista, toque em "Editar" na linha dele: os dados aparecem aqui em cima.'
  },
  comoEMedido: {
    titulo: 'Unidade, litro ou quilo',
    texto:
      'Leite é comprado em litro, fruta em quilo e pote em unidade. O sistema calcula sozinho o custo de cada litro, quilo ou unidade, que é usado no custo das receitas.'
  },
  alertaValidade: {
    titulo: 'Alerta de validade',
    texto:
      'Anote a data de validade quando a mercadoria chegar. Alguns dias antes de vencer, o produto aparece em "Vencendo em breve" na tela inicial.'
  },
  ingredientesReceita: {
    titulo: 'Ingredientes da receita',
    texto:
      'Coloque tudo o que vai na receita inteira (a panela toda), não de uma paleta só. O preço de cada ingrediente vem sozinho do último valor pago em Estoque e Insumos.'
  },
  embalagemReceita: {
    titulo: 'Etiqueta, plástico e palito',
    texto:
      'Marque o que vai em cada unidade pronta. O sistema multiplica pela quantidade que a receita rende. Ex.: 100 paletas usam 100 palitos, 100 saquinhos e 100 etiquetas. Receita que não usa, é só deixar desmarcado.'
  },
  rendimentoReceita: {
    titulo: 'Rendimento e lucro',
    texto:
      'Diga quantas unidades saem da receita inteira. O sistema divide o custo por elas e mostra quanto sobra de lucro em cada uma, pelo preço fixo de venda.'
  },
  vendendoBalcao: {
    titulo: 'Vendendo no balcão',
    texto:
      'O preço que o cliente paga na sorveteria. É o mesmo para todos os produtos da categoria, seja qual for o sabor. Se mudar aqui, muda na categoria inteira, aqui e em Cadastros › Produtos à venda.'
  },
  vendendoAtacado: {
    titulo: 'Vendendo no atacado',
    texto:
      'O preço cobrado nos pedidos de clientes (mercados, lanchonetes, buffets). Também é o mesmo para todos os sabores. É este preço que aparece em Vendas e Pedidos.'
  },
  receitasCadastradas: {
    titulo: 'Receitas cadastradas',
    texto:
      'Todas as receitas, do sabor que mais dá lucro para o que menos dá (o preço é o mesmo para todos). Toque em "Editar" para abrir a receita. O sabor que menos dá lucro aparece em vermelho.'
  },
  gasEnergia: {
    titulo: 'Gás e energia da produção',
    texto:
      'O gás do fogão e a energia das máquinas também são custo de cada receita. Escolha como o sistema conta esse custo.'
  },
  custoSubiu: {
    titulo: 'Aviso de custo',
    texto:
      'Aparece quando um ingrediente ou embalagem fica mais caro. Mostra quanto passou a custar cada receita e quanto sobra de lucro agora. Toque em "Entendi" para o aviso sair até o próximo aumento.'
  },
  pesoOuVolume: {
    titulo: 'Peso ou volume',
    texto:
      'Quanto vem em cada um. Paleta e picolé se medem em gramas (g). Pote e copo, em litros (L) ou mililitros (ml).'
  },
  fechamentoDoDia: {
    titulo: 'Fechamento do dia',
    texto:
      'Ao fechar a loja, conte o dinheiro da gaveta, veja o total da maquininha de cartão e o extrato do Pix. Digite os valores e salve. Débito e crédito ficam separados porque têm taxa e prazo diferentes; os dois aparecem assim no relatório do dia da maquininha. Leva menos de um minuto.'
  },
  taxasMaquininha: {
    titulo: 'Taxas e prazos',
    texto:
      'Quanto a maquininha cobra e em quantos dias o dinheiro cai na conta, no débito e no crédito. Só precisa preencher uma vez, ou quando a maquininha mudar a taxa. Valem para o balcão e para os pedidos pagos no cartão. O desconto de cada dia aparece na aba Resumo das vendas.'
  },
  historicoBalcao: {
    titulo: 'Histórico do balcão',
    texto:
      'Todos os fechamentos de fim de dia, do mais novo para o mais antigo. Para corrigir um dia, toque nele e altere os valores. Aparecem os 10 mais novos; "Ver mais" mostra mais 10. Para ver um mês antigo, escolha o mês na lista "Mês".'
  },
  novoPedido: {
    titulo: 'Novo pedido',
    texto:
      'Escolha o cliente, ponha a quantidade de cada produto com + e −, marque como ele pagou e salve. O valor entra nas vendas do dia e o pedido vai para o histórico logo abaixo.'
  },
  adicionarProdutos: {
    titulo: 'Adicionar produtos',
    texto:
      'Escolha o tipo (paletas, potes, picolés) e toque no produto para ele entrar no pedido. Depois digite a quantidade direto no campo (por exemplo, 50), ou use − e + para ajustar. A lista vem de Cadastros, na aba Produtos à venda, com o preço de atacado. Produto novo cadastrado lá aparece aqui sozinho.'
  },
  comprovante: {
    titulo: 'Comprovante do pedido',
    texto: 'Sai pronto para imprimir e ir junto com a entrega. O cliente assina no recebimento.'
  },
  historicoPedidos: {
    titulo: 'Histórico de pedidos',
    texto:
      'Todos os pedidos já feitos, do mais novo para o mais antigo. Toque em "Comprovante" para imprimir de novo. Aparecem os 10 mais novos; "Ver mais" mostra mais 10. Para ver um mês antigo, escolha o mês na lista "Mês".'
  },
  resumoDia: {
    titulo: 'Resumo do dia',
    texto:
      'Como está o dia de hoje comparado com os outros dias do mês, e se algum fechamento do balcão ficou sem lançar.'
  },
  diasLancados: {
    titulo: 'Dias lançados',
    texto:
      'Quantos dias do mês já tiveram as vendas do balcão anotadas. Se um dia ficar sem lançar, o sistema avisa na tela inicial para não esquecer.'
  },
  taxasHoje: {
    titulo: 'Taxas de hoje',
    texto:
      'Quanto a maquininha descontou das vendas no cartão hoje, no balcão e nos pedidos, e quanto realmente fica para a sorveteria. As taxas são alteradas na aba Vendas do balcão.'
  },
  resumoMes: {
    titulo: 'Resumo das vendas',
    texto:
      'Junta as vendas do balcão e os pedidos de clientes num lugar só. Mostra quanto entrou no mês, quanto veio de cada um e o total de cada dia. Só para consulta: os lançamentos são feitos nas outras abas.'
  },
  tipoConta: {
    titulo: 'Tipo de conta',
    texto:
      'Serve para separar os gastos nos relatórios: quanto foi de energia, de fornecedor, de funcionários. Toque para escolher. Na lista também dá para criar um tipo novo ou remover um que não usa mais.'
  },
  jaPaga: {
    titulo: 'Conta que já foi paga',
    texto:
      'Para gastos que não chegam como boleto, como combustível no posto ou compra de emergência. Marque "Sim, já paguei": ao salvar, o sistema pergunta como foi pago. Se foi no cartão pessoal de um sócio, o valor volta para ele em Sócios.'
  },
  contaRepete: {
    titulo: 'Conta que se repete',
    texto:
      'Aluguel, luz e salários vêm todo mês. Marcando "Sim", o sistema cria sozinho a conta do mês seguinte. Não é preciso cadastrar de novo.'
  },
  avisoAntes: {
    titulo: 'Aviso antes de vencer',
    texto:
      'Escolha com quantos dias de antecedência a conta deve aparecer nos avisos da tela inicial.'
  },
  marcarComoPaga: {
    titulo: 'Marcar como paga',
    texto:
      'Depois de pagar, toque em "Marcar como paga" e diga como foi paga (dinheiro, Pix, boleto ou cartão). A conta sai dos avisos e o valor entra nas despesas do mês, que contam para o lucro dos sócios.'
  },
  formaPagamentoConta: {
    titulo: 'Forma de pagamento',
    texto:
      'Escolha como a conta foi paga. Se foi no cartão, diga qual: assim no fim do mês dá para conferir a fatura de cada cartão.'
  },
  qualCartao: {
    titulo: 'Qual cartão',
    texto:
      'Escolha o cartão usado. Se for um cartão novo, escreva o nome dele no fim da lista (por exemplo "Itaú da empresa") e toque em "+ Criar".'
  },
  participacao: {
    titulo: 'Porcentagem de cada sócio',
    texto:
      'Quanto da empresa é de cada um. Use − e + para ajustar; a parte do outro sócio muda sozinha, sempre somando 100%.'
  },
  comoCadaUmRecebe: {
    titulo: 'Como a conta é feita',
    texto:
      'Parte do lucro + o reembolso das contas da empresa que o sócio pagou no cartão pessoal dele − o que ele já pegou adiantado durante o mês.'
  },
  reembolsosRetiradas: {
    titulo: 'Reembolsos e retiradas',
    texto:
      '"Reembolsos" vêm sozinhos de Contas a pagar: toda conta da empresa marcada como paga no cartão pessoal de um sócio aparece aqui e o valor volta para ele. "Retiradas" é o dinheiro que o sócio pegou antes do fechamento; é descontado.'
  },
  regrasLucro: {
    titulo: 'Como contar o lucro',
    texto:
      'Escolha como o sistema calcula o lucro do mês em Sócios e nos relatórios. Já vem marcada a nossa sugestão. Mudar aqui muda a conta de todos os meses, inclusive os que já passaram.'
  },
  quantoProduz: {
    titulo: 'Quanto a receita produz',
    texto:
      'Vem do que foi cadastrado na receita. Se a receita passar a render mais ou menos, é só mudar em Receitas que aqui atualiza sozinho.'
  },
  registrarProducao: {
    titulo: 'Registrar produção',
    texto:
      'Depois de fazer a receita, toque aqui. Os ingredientes e as embalagens usados saem do estoque sozinhos, sem precisar fazer conta.'
  },
  producoesDoMes: {
    titulo: 'Produções do mês',
    texto:
      'Tudo o que foi produzido no mês. Se registrou por engano, toque em "Excluir": os ingredientes e as embalagens voltam para o estoque.'
  },
  registrarPerda: {
    titulo: 'Um registro, vários itens',
    texto:
      'Escolha o tipo de perda, toque em cada item que se perdeu e digite a quantidade. Pode colocar quantos itens quiser no mesmo registro, por exemplo 3 sabores trocados no mesmo cliente. No fim, toque em Salvar perda.'
  },
  trocasPorCliente: {
    titulo: 'Trocas por cliente',
    texto:
      'Mostra em quais clientes os produtos mais vencem. Se um cliente troca muito, vale entregar menos de cada vez para ele.'
  },
  tipoBem: {
    titulo: 'Tipo',
    texto:
      'O tipo do bem: veículo, equipamento, móvel. Se precisar de um tipo que não existe, como "Ferramenta", escreva no fim da lista e toque em "+ Criar". Ele aparece também nos filtros.'
  },
  manutencoes: {
    titulo: 'Manutenções dos bens',
    texto:
      'Toque em "+ Registrar manutenção", no alto da tela, escolha o patrimônio e preencha. Também dá para registrar pela aba "Bens da empresa", no botão "Manutenção" de cada bem. O valor vai sozinho para Contas a pagar.'
  },
  compraNaConta: {
    titulo: 'Compra em Contas a pagar',
    texto:
      'Para o lucro ficar certo, o que você paga pela mercadoria precisa estar em Contas a pagar. "Sim, já paguei" lança a conta já paga; "Sim, vou pagar depois" deixa a conta para pagar no dia que vence. Marque "Não" só se você já lançou esta conta lá, ou se está só cadastrando o que já tinha no estoque.'
  },
  manutencaoPaga: {
    titulo: 'Manutenção já paga',
    texto:
      'Conserto costuma ser pago na hora. Marcando "Sim", a manutenção entra em Contas a pagar já como paga. Se foi no cartão pessoal de um sócio, o valor volta para ele em Sócios. Marcando "Não", ela fica em Contas a pagar para pagar depois.'
  },
  atalhos: {
    titulo: 'Atalhos',
    texto: 'Botões grandes para as tarefas do dia a dia. Um clique e você já está na tela certa.'
  },
  lucroAteHoje: {
    titulo: 'Lucro líquido',
    texto:
      'É o que sobra: tudo o que entrou menos tudo o que saiu no mês até hoje. No fim do mês, esse valor é dividido entre os sócios.'
  },
  metaDoMes: {
    titulo: 'Ponto de equilíbrio',
    texto:
      'Quanto a sorveteria precisa vender no mês para pagar todas as contas: aluguel, luz, salários e mercadoria. Quando a barra chega a 100%, tudo o que vender a mais é lucro.'
  },
  avisosDeHoje: {
    titulo: 'Avisos',
    texto:
      'O sistema confere sozinho estoque, validades, contas e custos, e mostra aqui só o que precisa de atenção. Não é preciso ficar procurando.'
  },
  vencendoEmBreve: {
    titulo: 'Alerta de validade',
    texto:
      'Quando a mercadoria chega, anota-se a validade. O sistema avisa antes de vencer, para usar primeiro ou fazer uma promoção. Fruta vencida é dinheiro jogado fora.'
  },
  contasParaPagar: {
    titulo: 'Contas a pagar',
    texto:
      'Mostra as contas que vencem nos próximos dias, para pagar em dia e não pagar juros. O aviso aparece com a antecedência escolhida em cada conta.'
  },
  custoSubiuInicio: {
    titulo: 'Aviso de aumento de custo',
    texto:
      'Quando um ingrediente fica mais caro, o sistema recalcula o custo de tudo que usa ele, e mostra quanto o lucro de cada um caiu, já que o preço de venda é fixo.'
  },
  relResultado: {
    titulo: 'Resultado do mês',
    texto:
      'Tudo o que entrou menos tudo o que saiu, item por item. A última linha é o lucro líquido, que vai para a divisão entre os sócios.'
  },
  relMaisVendidos: {
    titulo: 'Mais vendidos nos pedidos',
    texto:
      'Soma tudo o que os clientes encomendaram no período, produto por produto. Como os pedidos são lançados item a item, este número é exato. Ajuda a saber quais sabores deixar sempre prontos no freezer.'
  },
  relFormas: {
    titulo: 'Dinheiro, cartão e Pix',
    texto:
      'Soma dos lançamentos de fim de dia do mês. Mostra quanto entrou em cada forma e quanto foi pago de taxa da maquininha.'
  },
  relComparar: {
    titulo: 'Comparar com o ano passado',
    texto:
      'Sorvete vende muito mais no calor. Comparar o mês com o mesmo mês do ano anterior mostra se a sorveteria está crescendo de verdade e ajuda a planejar compras para o verão.'
  },
  relLucroProduto: {
    titulo: 'Ranking de lucro',
    texto:
      'Mostra quais produtos deixam mais dinheiro no bolso: a quantidade que saiu vezes o lucro de cada um. Às vezes o que mais sai não é o que mais rende.'
  },
  relPerdas: {
    titulo: 'Relatório de perdas',
    texto:
      'Junta tudo o que foi anotado na tela Perdas: produtos prontos, matéria-prima e trocas feitas nos clientes. Se as trocas pesarem muito, vale entregar menos de cada vez para quem mais troca.'
  },
  gordurinhaInicio: {
    titulo: 'Gordurinha',
    texto:
      'A sobra de 10% em cima do lucro que foi colocada nos preços no último reajuste. Cada aumento de custo come um pedaço. Quando acabar, é hora de reajustar os preços.'
  },
  gordurinha: {
    titulo: 'O que é a gordurinha',
    texto:
      'No último reajuste, os preços foram feitos para sobrar uma porcentagem a mais em cima do lucro líquido (normalmente 10%). Cada vez que um ingrediente, embalagem ou conta sobe, ele come um pedaço dessa sobra. Quando ela chega a zero, é hora de reajustar os preços.'
  },
  gordurinhaBase: {
    titulo: 'Base e porcentagem',
    texto:
      'A base é o lucro líquido de um mês normal da Big Lake. Enquanto o sistema não tem 12 meses de vendas, digite aqui o valor que o contador passar. Depois ele calcula sozinho a cada reajuste. A porcentagem é o tamanho da gordurinha: 10% é o que o Carlos usa.'
  },
  gordurinhaComeu: {
    titulo: 'Como é a conta',
    texto:
      'Para cada coisa que subiu, o sistema multiplica o aumento pela quantidade que a Big Lake usa num mês normal (média do ano). Assim, um mês fraco de inverno não engana: só aumento de preço come a gordurinha.'
  },
  gordurinhaReajuste: {
    titulo: 'Quanto subir',
    texto:
      'Mostra quanto os preços precisam subir para devolver o que já foi comido e a gordurinha voltar a ficar cheia. Depois de mudar os preços, toque em "Já reajustei os preços" para começar a contar de novo.'
  },
  gordurinhaContas: {
    titulo: 'Contas fixas',
    texto:
      'As contas que repetem todo mês (energia, gás, internet…). Marque as que entram na conta da gordurinha: se o valor delas subir desde o último reajuste, o aumento come a gordurinha. O aluguel começa desmarcado.'
  },
  apagarDados: {
    titulo: 'Apagar todos os dados',
    texto:
      'Para começar do zero, por exemplo depois dos testes. Antes de apagar, o sistema guarda uma cópia de segurança: se foi engano, é só restaurar essa cópia.'
  },
  configuracoes: {
    titulo: 'Configurações',
    texto:
      'Abre pelo botão "Configurações" no alto de qualquer tela. Aqui ficam as cópias de segurança, o histórico do que foi feito, o tamanho da letra e os dados da empresa.'
  }
} satisfies Record<string, TextoAjuda>
