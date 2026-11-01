-- Fatia 6A · produção registrada (R7; D-032 p.31 a 33; D-065).

CREATE TABLE producao (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  receita_id INTEGER NOT NULL REFERENCES receita (id),
  -- retrato do dia
  nome_receita TEXT NOT NULL,
  -- quantas receitas foram feitas (½ = 500)
  vezes_x1000 INTEGER NOT NULL CHECK (vezes_x1000 > 0),
  unidades_previstas INTEGER NOT NULL CHECK (unidades_previstas >= 0),
  -- quanto saiu de verdade (p.33)
  unidades_feitas INTEGER NOT NULL CHECK (unidades_feitas >= 0),
  custo_de_cada_x10000 INTEGER NOT NULL CHECK (custo_de_cada_x10000 >= 0),
  custo_total_centavos INTEGER NOT NULL CHECK (custo_total_centavos >= 0),
  criado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX producao_data ON producao (data) WHERE excluido_em IS NULL;
CREATE INDEX producao_receita ON producao (receita_id);

-- O que a produção usou de cada item (ingredientes e embalagens), para baixar de novo no Desfazer.
CREATE TABLE producao_item (
  id INTEGER PRIMARY KEY,
  producao_id INTEGER NOT NULL REFERENCES producao (id),
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  quantidade_x1000 INTEGER NOT NULL CHECK (quantidade_x1000 > 0)
) STRICT;

CREATE INDEX producao_item_producao ON producao_item (producao_id);

-- Quanto saiu de cada compra em cada baixa (produção e, na 6B, perda),
-- para o Desfazer devolver às mesmas compras. lote_id NULL = estoque que ficou negativo.
CREATE TABLE saida_estoque (
  id INTEGER PRIMARY KEY,
  origem TEXT NOT NULL CHECK (origem IN ('producao', 'perda')),
  origem_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  lote_id INTEGER REFERENCES lote (id),
  quantidade_x1000 INTEGER NOT NULL CHECK (quantidade_x1000 > 0)
) STRICT;

CREATE INDEX saida_estoque_origem ON saida_estoque (origem, origem_id);
