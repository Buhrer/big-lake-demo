-- Fatia 2 · estoque de matéria-prima e insumos, com validade por compra (D-036).
-- Quantidades ×1.000, custos ×10.000, dinheiro em centavos (docs/09 §1.2).

CREATE TABLE item_estoque (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('materia_prima', 'insumo')),
  unidade TEXT NOT NULL CHECK (unidade IN ('un', 'L', 'kg')),
  nome_unidade TEXT,
  fornecedor_id INTEGER REFERENCES fornecedor (id),
  -- pode ficar negativo: produção registrada antes de lançar a compra (pergunta 31)
  quantidade_x1000 INTEGER NOT NULL DEFAULT 0,
  estoque_minimo_x1000 INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo_x1000 >= 0),
  custo_unitario_x10000 INTEGER NOT NULL DEFAULT 0 CHECK (custo_unitario_x10000 >= 0),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX item_estoque_fornecedor ON item_estoque (fornecedor_id);

CREATE TABLE entrada_mercadoria (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  fornecedor_id INTEGER REFERENCES fornecedor (id),
  quantidade_x1000 INTEGER NOT NULL CHECK (quantidade_x1000 > 0),
  valor_pago_centavos INTEGER NOT NULL CHECK (valor_pago_centavos >= 0),
  custo_unitario_x10000 INTEGER NOT NULL CHECK (custo_unitario_x10000 >= 0),
  validade TEXT,
  criado_em TEXT NOT NULL
) STRICT;

CREATE INDEX entrada_data ON entrada_mercadoria (data);
CREATE INDEX entrada_fornecedor ON entrada_mercadoria (fornecedor_id, data);

-- Saldo de cada compra, para a validade. Soma dos saldos = estoque (quando positivo).
CREATE TABLE lote (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  entrada_id INTEGER REFERENCES entrada_mercadoria (id),
  validade TEXT,
  quantidade_x1000 INTEGER NOT NULL CHECK (quantidade_x1000 >= 0),
  criado_em TEXT NOT NULL
) STRICT;

CREATE INDEX lote_item ON lote (item_id) WHERE quantidade_x1000 > 0;

CREATE TABLE historico_custo (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  data_hora TEXT NOT NULL,
  custo_antes_x10000 INTEGER NOT NULL,
  custo_depois_x10000 INTEGER NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('cadastro', 'entrada', 'edicao'))
) STRICT;

CREATE INDEX historico_custo_item ON historico_custo (item_id, data_hora);

CREATE TABLE movimento_estoque (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  data_hora TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'ajuste', 'producao', 'perda')),
  quantidade_x1000 INTEGER NOT NULL,
  referencia_id INTEGER
) STRICT;

CREATE INDEX movimento_item ON movimento_estoque (item_id, data_hora);
