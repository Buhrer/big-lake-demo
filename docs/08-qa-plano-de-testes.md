# 08 · Plano de testes (QA)

## Estratégia

| Nível | O quê | Quando |
|---|---|---|
| **Unidade** | Todo cálculo de `03-regras-de-negocio-e-calculos.md` (casos abaixo, mais bordas: zero, negativo, arredondamento) | Antes de implementar a tela (testes primeiro) |
| **Integração** | Banco: migrações, transações (produção, pedido, pagamento, manutenção), exclusão lógica + desfazer, auditoria, backup/restauração | Em cada fatia |
| **Ponta a ponta** | Fluxos principais pela interface | A partir da fatia 3 |
| **Visual / acessibilidade** | Comparar com `prototipo/telas/`, 1366×768 e 1280×720, letra 80% e 130%, sem rolagem horizontal, checklist de `05-padroes-de-interface.md` §7 | Em cada tela |
| **Aceitação** | Roteiro manual com o Carlos | Fim de cada marco |

**Definição de pronto de uma fatia**: testes passando, lint e tipos sem erro, tela conferida com o protótipo, histórico gravando, roteiro de teste manual escrito, perguntas pendentes registradas.

## Casos de referência (valores do protótipo)

### T1 · Custo da receita: Paleta de Maracujá (rende 100)
| Entrada | Esperado |
|---|---|
| Polpa de maracujá 5 kg × 14,00; açúcar 3 kg × 4,20; leite condensado 10 latas × 6,90; creme de leite 2,5 L × 21,50; leite 5 L × 4,89; liga neutra 0,12 kg × 32,00; gás e energia 1 × 8,00 | Ingredientes **R$ 241,64** |
| Embalagem por unidade: palito 0,08 + saquinho 0,27 + etiqueta 0,06 | Embalagem **R$ 41,00** |
| Total | **R$ 282,64**; custo de cada **R$ 2,8264** → exibe **R$ 2,83** |
| Preço balcão 10,00 / atacado 7,00 | Lucro **R$ 7,17 (72%)** / **R$ 4,17 (60%)**; lucro da receita no balcão **R$ 717,36** |

### T2 · Custo da receita: Paleta de Morango recheada (rende 100)
| Entrada | Esperado |
|---|---|
| Morango 5 kg × 18,00; açúcar 2,5 kg × 4,20; leite condensado 15 latas × 6,90; creme de leite 2,5 L × 21,50; leite 5 L × 4,89; liga 0,12 kg × 32,00; gás e energia 8,00; embalagem 0,41/un | Ingredientes **R$ 294,04**; total **R$ 335,04**; custo de cada **R$ 3,35**; lucro balcão **R$ 6,65** |

### T3 · Aviso "O custo subiu"
| Entrada | Esperado |
|---|---|
| Morango de R$ 14,00 para R$ 18,00/kg | Aviso "+29%"; Paleta de Morango: custo **3,15 → 3,35**, lucro **6,85 → 6,65**; Sorvete de Morango pote 2 L (rende 10, usa 5 kg): custo **25,92 → 27,92**, lucro **23,08 → 21,08** |

### T4 · Custo do insumo
| Entrada | Esperado |
|---|---|
| 20 kg de morango por R$ 360,00 | **R$ 18,00/kg** |
| 0 kg (divisão por zero) | Bloquear com mensagem "Digite a quantidade." |

### T5 · Fechamento do balcão e taxas
| Entrada | Esperado |
|---|---|
| Dinheiro 412,50; Pix 334,00; débito 218,00; crédito 320,00; taxas 1,5% e 3,2% | Total **R$ 1.284,50**; taxa débito **R$ 3,27**; taxa crédito **R$ 10,24**; fica **R$ 1.270,99** |
| Lançar duas vezes o mesmo dia | Segunda vez abre em modo de correção (não duplica) |

### T6 · Pedido
| Entrada | Esperado |
|---|---|
| 4 potes de Sorvete de Morango + 4 de Chocolate + 2 de Açaí (atacado 45, 45, 52) + 1 caixa de picolés (110,00), pago em Pix | Total **R$ 574,00**; sem taxa |
| O mesmo total pago no crédito (3,2%) | Taxa **R$ 18,37**; fica **R$ 555,63** |
| Mudar o preço da categoria depois | O pedido antigo mantém o preço antigo (retrato) |

### T7 · Divisão dos sócios
| Entrada | Esperado |
|---|---|
| Faturamento 52.300,00; despesas 33.850,00; Carlos 60%, Paulo 40% | Lucro **R$ 18.450,00**; Carlos **R$ 11.070,00**; Paulo **R$ 7.380,00** |
| + reembolso Carlos 1.000,00; retirada Carlos 500,00 | Carlos a receber **R$ 11.570,00** |
| Carlos 65% | Paulo passa a **35%** sozinho (sempre soma 100) |
| Conta paga no cartão pessoal do Paulo (R$ 320,00) | Aparece em "Reembolsos do mês" do Paulo e soma **+R$ 320,00** no total dele; também entra nas despesas |

### T8 · Meta do mês (ponto de equilíbrio)
| Entrada | Esperado |
|---|---|
| Vendido 32.870,00 em 16 dias; contas do mês 38.500,00 | **85%**; faltam **R$ 5.630,00**; "cerca de **3 dias**" |
| Vendido ≥ meta | 100% e mensagem de que o que entrar é lucro |

### T9 · Gordurinha
| Entrada | Esperado |
|---|---|
| Base 15.000,00; 10%; comido 930,00 | Total **R$ 1.500,00**; resta **R$ 570,00 (38%)**; status **Atenção** |
| Comido 1.600,00 | Resta **R$ 0,00 (0%)**; **Hora de reajustar** |
| Comido 500,00 | Resta 1.000,00 (67%); **Tranquilo** |
| Faturamento médio 40.000,00; comido 930,00 | Reajuste **2,3%**; Paleta 10,00 → 10,23 → **R$ 10,50**; Picolé 7,00 → 7,16 → **R$ 7,50**; Pote 49,00 → 50,14 → **R$ 50,50** |
| "Já reajustei os preços" → Sim | Comido volta a 0, data do reajuste = hoje, retrato dos custos gravado |

### T10 · Perdas
| Entrada | Esperado |
|---|---|
| Matéria-prima: morango 4 kg (18,00) + manga 2 kg (7,50), motivo Venceu | Valor **R$ 87,00**; estoque de morango −4 e de manga −2 |
| Troca em cliente: 2 paletas de morango (custo 3,35) | Valor **R$ 6,70** (custo de fazer), ligado ao cliente |
| Excluir → Desfazer | Registro e estoque voltam ao que eram |

### T11 · Contas a pagar
| Entrada | Esperado |
|---|---|
| Vencimento amanhã, aviso 3 dias | Aparece no Início e na bolinha do menu; etiqueta "Amanhã" |
| Vencimento ontem, não paga | "Atrasada", vermelho |
| Conta mensal, dia 31 → mês com 30 dias | Próxima vence dia 30 |
| Pagar com cartão pessoal do Carlos → Desfazer | Reembolso aparece e depois some em Sócios |
| Remover tipo de conta em uso | Bloqueado, mostra "em uso · N" |

### T12 · Patrimônio
| Entrada | Esperado |
|---|---|
| Manutenção em 16/10/2026, garantia 90 dias, paga no Pix, R$ 450,00 | "Garantia vale até **14/01/2027**"; conta "Manutenção" paga de R$ 450,00 em Contas |

### T13 · Produção
| Entrada | Esperado |
|---|---|
| Registrar 1 receita de Paleta de Morango | Estoque baixa: morango 5 kg, açúcar 2,5 kg, leite condensado 15, creme 2,5 L, leite 5 L, liga 0,12 kg, palito 100, saquinho 100, etiqueta 100; "Gás e energia" não baixa estoque |
| Faltando 1,5 kg de morango | "Falta comprar: Morango 1,5 kg · Custo estimado R$ 27,00" |

### T14 · Robustez
- Fechar o programa no meio de um salvamento (simular queda de energia) → ao abrir, dados íntegros (transação completa ou nenhuma).
- Restaurar um backup → o sistema faz uma cópia do estado atual antes e volta ao estado do backup.
- Pen drive ausente ao fechar → backup na pasta e aviso no topo; nada trava.
- Banco com 10 anos de dados simulados → telas e relatórios dentro dos tempos de `06-requisitos-nao-funcionais.md`.

## Roteiro de aceitação com o Carlos (manual)
1. Abrir o sistema pelo atalho da área de trabalho.
2. Lançar as vendas de hoje do balcão.
3. Fazer um pedido para o Mercado Bom Preço e imprimir o comprovante.
4. Registrar a chegada de 20 kg de morango mais caro e ver o aviso "O custo subiu".
5. Abrir a receita da Paleta de Morango e ver o lucro novo.
6. Pagar a conta de energia no cartão pessoal e ver o reembolso em Sócios.
7. Ver a Gordurinha e o Resultado do mês; imprimir.
8. Aumentar a letra com A+ e navegar por três telas.
9. Fechar o sistema e conferir o backup no pen drive.
