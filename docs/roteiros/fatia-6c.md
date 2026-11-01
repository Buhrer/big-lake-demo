# Roteiro de teste manual · Fatia 6C (Patrimônio)

Preparação: `npm run dev`.

| # | Passo | Esperado |
|---|---|---|
| 1 | Menu › Patrimônio | Aba "Bens da empresa"; cards "0 itens" e "R$ 0,00"; filtros Todos, Veículos, Equipamentos, Móveis, Informática |
| 2 | "+ Cadastrar bem": Furgão de entrega 2019, Tipo Veículo, Data da compra 032022, Valor 68000, Placa ABC-1D23 | A data vira "03/2022"; "✓ Bem cadastrado."; linha "Veículo · ABC-1D23 · 03/2022 · R$ 68.000,00"; Total igual |
| 3 | Data da compra "13/2022" | "Digite mês/ano, ex.: 03/2022." |
| 4 | Lista "Tipo": criar "Ferramenta"; remover "Veículo" | Ferramenta aparece e já fica escolhida (e vira filtro); Veículo mostra "em uso · 1 bem" |
| 5 | Botão "Manutenção" na linha do furgão | Modal "Registrar manutenção" com o furgão escolhido e "Nenhuma manutenção ainda." |
| 6 | O que foi feito "Troca de óleo e filtros", Quem fez "Auto Center Silva", Valor 450, Garantia 90 | "Garantia vale até 14/01/2027." |
| 7 | Salvar sem forma de pagamento | "Escolha como a conta foi paga." |
| 8 | Pix › Salvar manutenção | "✓ Manutenção do Furgão… registrada. Ela já está em Contas a pagar como paga." + "Ver em Contas a pagar" |
| 9 | Ver em Contas a pagar | Conta "Troca de óleo e filtros · Furgão de entrega 2019", tipo Manutenção, R$ 450,00, paga com Pix |
| 10 | Editar essa conta | Aviso "vem de uma manutenção. Corrija em Patrimônio" + "Ir para Patrimônio" (o modal não abre) |
| 11 | Aba Manutenções | Cards: gasto R$ 450,00 em 2026, "1 conserto", bem que mais gastou = furgão; linha no histórico com "feito por Auto Center Silva" e "Conserto" em vermelho |
| 12 | Editar a manutenção, valor 380 | Mostra "A conta já está paga (pago com Pix em 16/10)…" sem "Já está paga?"; depois de salvar, a conta em Contas a pagar fica R$ 380,00 e continua paga |
| 13 | "+ Registrar manutenção", escolher o bem, "Revisão (preventiva)", "Não, vou pagar depois", Vence em 05/11/2026 | Histórico mostra "a pagar · vence 05/11" e "Revisão" em azul; a conta aparece em aberto em Contas a pagar (e na bolinha do menu quando chegar o aviso) |
| 14 | Manutenção com valor 0 | "Sem valor (saiu de graça): não vai para Contas a pagar."; nenhuma conta nova |
| 15 | Excluir uma manutenção paga → Sim | "…foi excluída e a conta saiu de Contas a pagar." + Desfazer; a conta some de Contas a pagar; Desfazer traz as duas |
| 16 | Bens › Editar o furgão | Rodapé "Tem N manutenções: não dá para excluir" |
| 17 | Bem sem manutenção › Editar › Excluir bem › Sim | "O bem … foi excluído." + Desfazer |
| 18 | Filtro "Patrimônio:" no histórico | Só os bens com manutenção; o Total acompanha o filtro |
| 19 | Pagar com cartão pessoal do Carlos | Em Sócios aparece o reembolso para o Carlos |
| 20 | Configurações › Histórico | "Cadastrou o bem…", "Registrou a manutenção: … Conta já paga", "Corrigiu a manutenção…", "Excluiu a manutenção…" |
| 21 | 1366×768 (Normal) e 1280×720 (Muito grande) | Sem rolagem horizontal; na letra normal os botões da linha ficam lado a lado |
