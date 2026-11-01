-- Fatia 6B · perdas (R10; D-032 p.6 e p.25; D-069).
-- Perda não é despesa (D-032 p.25): fica só como informação.

CREATE TABLE perda (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('produto', 'materia_prima', 'troca')),
  -- só na troca
  cliente_id INTEGER REFERENCES cliente (id),
  nome_cliente TEXT,
  motivo TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
  observacao TEXT NOT NULL DEFAULT '',
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT,
  CHECK ((tipo = 'troca') = (cliente_id IS NOT NULL))
) STRICT;

CREATE INDEX perda_data ON perda (data) WHERE excluido_em IS NULL;
CREATE INDEX perda_cliente ON perda (cliente_id) WHERE cliente_id IS NOT NULL;

-- Cada item do registro, com o retrato do dia (nome e custo de cada).
-- Produto pronto e troca: receita_id e o custo de fazer; matéria-prima: item_id e o preço pago.
CREATE TABLE perda_item (
  id INTEGER PRIMARY KEY,
  perda_id INTEGER NOT NULL REFERENCES perda (id),
  receita_id INTEGER REFERENCES receita (id),
  item_id INTEGER REFERENCES item_estoque (id),
  nome TEXT NOT NULL,
  -- "kg", "L", "un", "pote"… como aparece na lista
  rotulo TEXT NOT NULL,
  quantidade_x1000 INTEGER NOT NULL CHECK (quantidade_x1000 > 0),
  custo_x10000 INTEGER NOT NULL CHECK (custo_x10000 >= 0),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  CHECK ((receita_id IS NULL) <> (item_id IS NULL))
) STRICT;

CREATE INDEX perda_item_perda ON perda_item (perda_id);
