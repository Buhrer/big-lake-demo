-- Fatia 7C · Gordurinha (R14, T9; D-032 p.34 e p.37; D-071, D-074).
-- Cada "Já reajustei os preços" (e a primeira configuração) cria uma linha; vale a mais nova.

CREATE TABLE gordurinha_reajuste (
  id INTEGER PRIMARY KEY,
  -- "Desde o último reajuste, em …"
  data TEXT NOT NULL,
  base_centavos INTEGER NOT NULL CHECK (base_centavos > 0),
  -- 10% = 1000
  pct_x100 INTEGER NOT NULL CHECK (pct_x100 BETWEEN 1 AND 10000),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL
) STRICT;

-- Retrato do dia: custo de cada insumo e valor de cada conta fixa (série de contas que repetem).
CREATE TABLE gordurinha_retrato_item (
  reajuste_id INTEGER NOT NULL REFERENCES gordurinha_reajuste (id),
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  custo_x10000 INTEGER NOT NULL CHECK (custo_x10000 >= 0),
  PRIMARY KEY (reajuste_id, item_id)
) STRICT;

CREATE TABLE gordurinha_retrato_conta (
  reajuste_id INTEGER NOT NULL REFERENCES gordurinha_reajuste (id),
  -- a primeira conta da série (as do mês seguinte apontam para ela por anterior_id)
  serie_id INTEGER NOT NULL REFERENCES conta_pagar (id),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  PRIMARY KEY (reajuste_id, serie_id)
) STRICT;

-- Contas fixas marcadas ou desmarcadas no relatório; sem linha = marcada (menos o aluguel).
CREATE TABLE gordurinha_conta (
  serie_id INTEGER PRIMARY KEY REFERENCES conta_pagar (id),
  entra INTEGER NOT NULL CHECK (entra IN (0, 1))
) STRICT;
