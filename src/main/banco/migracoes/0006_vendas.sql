-- Fatia 4 · vendas do balcão (fechamento do dia) e pedidos de clientes (R8, R9).

CREATE TABLE fechamento_balcao (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL UNIQUE,
  -- "A loja não abriu neste dia" (D-055)
  loja_fechada INTEGER NOT NULL DEFAULT 0 CHECK (loja_fechada IN (0, 1)),
  dinheiro_centavos INTEGER NOT NULL DEFAULT 0 CHECK (dinheiro_centavos >= 0),
  pix_centavos INTEGER NOT NULL DEFAULT 0 CHECK (pix_centavos >= 0),
  debito_centavos INTEGER NOT NULL DEFAULT 0 CHECK (debito_centavos >= 0),
  credito_centavos INTEGER NOT NULL DEFAULT 0 CHECK (credito_centavos >= 0),
  -- retrato das taxas do dia
  taxa_debito_pct_x100 INTEGER NOT NULL DEFAULT 0,
  taxa_credito_pct_x100 INTEGER NOT NULL DEFAULT 0,
  dias_debito INTEGER NOT NULL DEFAULT 0,
  dias_credito INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL
) STRICT;

CREATE TABLE pedido (
  id INTEGER PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE CHECK (numero > 0),
  data TEXT NOT NULL,
  cliente_id INTEGER NOT NULL REFERENCES cliente (id),
  forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'pix', 'debito', 'credito')),
  total_centavos INTEGER NOT NULL CHECK (total_centavos >= 0),
  -- retrato da taxa da maquininha do dia (só no cartão)
  taxa_pct_x100 INTEGER NOT NULL DEFAULT 0,
  taxa_centavos INTEGER NOT NULL DEFAULT 0 CHECK (taxa_centavos >= 0),
  cancelado_em TEXT,
  motivo_cancelamento TEXT,
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL
) STRICT;

CREATE INDEX pedido_data ON pedido (data);
CREATE INDEX pedido_cliente ON pedido (cliente_id, data);

CREATE TABLE pedido_item (
  id INTEGER PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedido (id),
  produto_id INTEGER NOT NULL REFERENCES produto (id),
  -- retrato do produto no dia do pedido
  nome_produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario_centavos INTEGER NOT NULL CHECK (preco_unitario_centavos >= 0)
) STRICT;

CREATE INDEX pedido_item_pedido ON pedido_item (pedido_id);
CREATE INDEX pedido_item_produto ON pedido_item (produto_id);
