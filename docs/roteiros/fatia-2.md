# Roteiro de teste manual · Fatia 2 (cadastros e estoque)

Preparação: `npm run dev`.

## A. Clientes e fornecedores

| # | Passo | Esperado |
|---|---|---|
| 1 | Cadastros › "+ Cadastrar cliente" | Modal "Cadastrar novo cliente" com "?" e "✕ Fechar"; Nome · Telefone · CPF/CNPJ numa linha; Rua · Número; Bairro · Cidade |
| 2 | Salvar sem nome | "Digite o nome." embaixo do campo |
| 3 | CPF "123.456.789-00" e salvar | "CPF ou CNPJ com algum número errado. Confira." |
| 4 | Mercado Bom Preço, 1134567788, 12345678000195, endereço; salvar | "✓ Cliente Mercado Bom Preço cadastrado."; na lista: (11) 3456-7788 e 12.345.678/0001-95; aba "Clientes (1)" |
| 5 | Procurar "preco" e depois "3456" | Acha o cliente nos dois casos |
| 6 | Editar → mudar a cidade → Salvar alterações | Etiqueta "Editando um cadastro"; lista atualizada; em Configurações › Histórico: "Mudou o cadastro do cliente …: cidade … → …" |
| 7 | Excluir o cliente → Sim → Desfazer | Linha vermelho-clara com "Excluir este cliente? Sim / Não"; depois faixa verde com Desfazer; o cliente volta |
| 8 | Aba Fornecedores › cadastrar "Hortifruti São José" | Botão vermelho vira "+ Cadastrar fornecedor"; coluna "Comprado em outubro" com R$ 0,00 |

## B. Estoque

| # | Passo | Esperado |
|---|---|---|
| 9 | Estoque › "+ Cadastrar insumo" (estoque vazio) | Modal com "Item novo" escolhido ("Já está cadastrado" apagado) |
| 10 | Matéria-prima · Quilo · Morango · fornecedor Hortifruti · 20 · 360 · validade 22/10 · mínimo 10 | "Custo por quilo R$ 18,00" aparece antes de salvar |
| 11 | Salvar | "✓ Morango cadastrado no estoque."; linha: 20 kg, mín. 10 kg, R$ 18,00 /kg, validade com etiqueta amarela se faltam até 7 dias, "OK" |
| 12 | "+ Cadastrar insumo" de novo | Abre em "Já está cadastrado" |
| 13 | Escolher "Morango · kg", 10 kg por R$ 210,00 | O fornecedor vem preenchido; aviso amarelo "O custo subiu: era R$ 18,00, agora fica R$ 21,00 o quilo (+17%)." |
| 14 | Salvar | "✓ Entrada registrada: Morango 10 kg." e o aviso de custo; estoque 30 kg; em Fornecedores, "Comprado em outubro" R$ 570,00 |
| 15 | Item novo: Unidade · "Leite condensado" · nome da unidade "lata" · 12 · 82,80 · mínimo 24 | Linha: "12 lata", "R$ 6,90 /lata", "Comprar" |
| 16 | Filtros | Contadores certos em Matéria-prima, Insumos, Estoque baixo e Vencendo |
| 17 | Editar Morango | Mostra "Quantidade em estoque", "Custo por quilo" e a tabela "Validade de cada compra" (uma linha por compra) |
| 18 | Diminuir para 25 kg e salvar | Sai primeiro da compra que vence antes; Histórico: "Mudou o insumo Morango: quantidade em estoque 30 kg → 25 kg" |
| 19 | Excluir Morango → Sim → Desfazer | Some e volta |
| 20 | Cadastros › Fornecedores › Excluir Hortifruti | "Não dá para excluir: fornece 1 item do estoque." + Entendi |
| 21 | A+ até 130% com a janela em 1280×720 | A lista do estoque não cria barra para o lado; os botões da linha ficam um embaixo do outro |
