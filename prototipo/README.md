# Protótipo aprovado

Referência visual e funcional do sistema. **O protótipo é a fonte da verdade para telas, textos e comportamento.** Onde a especificação (`docs/`) e o protótipo divergirem, pergunte ao Lucas.

## Pastas

| Pasta | O que tem | Como usar |
|---|---|---|
| `telas/` | Imagem de cada tela em 1440px de largura (`NN-Tela.png`) e das outras abas e modais (`NN-Tela__*.png`) | Comparar layout, ordem dos campos, textos e estados |
| `textos-das-telas/` | Todo o texto visível de cada tela, inclusive as explicações dos botões "?" (trechos `[AJUDA: título texto]`). `{{…}}` são valores dinâmicos | Copiar os textos exatos para a interface |
| `fonte/` | Código-fonte de cada tela do protótipo (HTML + CSS + JavaScript de demonstração) | Ver o **CSS** (cores, tamanhos, componentes), os **dados de exemplo** (clientes, insumos, receitas, contas…) e a lógica de demonstração dos cálculos |

## Observações importantes

- Os arquivos de `fonte/` **não rodam sozinhos**: dependem do ambiente de design onde o protótipo foi feito. Use-os como referência de leitura, não como base de código.
- Os **dados de exemplo** do protótipo (nomes de clientes, insumos com preços, receitas com ingredientes e rendimento, contas, bens) servem para montar uma **carga de dados de desenvolvimento** (seed) e para os testes. Não vão para a instalação do cliente sem perguntar.
- A etiqueta **"Simulação · dados de exemplo"** e o bloco **"Só no protótipo / Apagar dados de teste"** (Configurações) **não fazem parte** do sistema final.
- No protótipo, algumas telas guardam dados no navegador só para demonstrar as ligações entre elas (contas pagas no cartão pessoal → Sócios; manutenção → Contas). No sistema real, isso vem do banco de dados.
- Mapa das telas:

| Nº | Tela | Arquivos |
|---|---|---|
| 01 | Início | `01-Inicio` |
| 02 | Vendas e Pedidos (balcão, pedidos, resumo) | `02-Vendas-e-Pedidos` |
| 03–05 | Cadastros (clientes, fornecedores, produtos à venda) | `03-…`, `04-…`, `05-…` |
| 06–07 | Produção e Receitas (planejar, receitas) | `06-…`, `07-…` |
| 08 | Estoque e Insumos | `08-…` |
| 09 | Perdas | `09-…` |
| 10 | Contas a pagar | `10-…` |
| 11 | Sócios | `11-…` |
| 12 | Patrimônio (bens, manutenções) | `12-…` |
| 13 | Relatórios (7 relatórios) | `13-…` |
| 14 | Configurações | `14-…` |
