-- Fatia 3 · categorias (preço fixo por categoria) e receitas (custo e lucro).

CREATE TABLE categoria (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  -- como se chama cada unidade: "paleta", "pote"… (D-043)
  nome_unidade TEXT NOT NULL,
  preco_balcao_centavos INTEGER NOT NULL DEFAULT 0 CHECK (preco_balcao_centavos >= 0),
  preco_atacado_centavos INTEGER NOT NULL DEFAULT 0 CHECK (preco_atacado_centavos >= 0),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

-- Toda mudança de preço fica guardada (Gordurinha e histórico).
CREATE TABLE historico_preco_categoria (
  id INTEGER PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categoria (id),
  data_hora TEXT NOT NULL,
  balcao_antes_centavos INTEGER NOT NULL,
  balcao_depois_centavos INTEGER NOT NULL,
  atacado_antes_centavos INTEGER NOT NULL,
  atacado_depois_centavos INTEGER NOT NULL
) STRICT;

CREATE TABLE receita (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  categoria_id INTEGER NOT NULL REFERENCES categoria (id),
  rendimento INTEGER NOT NULL CHECK (rendimento > 0),
  -- gás e energia (D-041): A usa as vezes; C usa o valor próprio
  gas_vezes_x1000 INTEGER CHECK (gas_vezes_x1000 IS NULL OR gas_vezes_x1000 > 0),
  gas_valor_centavos INTEGER CHECK (gas_valor_centavos IS NULL OR gas_valor_centavos >= 0),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX receita_categoria ON receita (categoria_id) WHERE excluido_em IS NULL;

CREATE TABLE receita_ingrediente (
  id INTEGER PRIMARY KEY,
  receita_id INTEGER NOT NULL REFERENCES receita (id),
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  quantidade_x1000 INTEGER NOT NULL CHECK (quantidade_x1000 > 0),
  UNIQUE (receita_id, item_id)
) STRICT;

CREATE INDEX receita_ingrediente_item ON receita_ingrediente (item_id);

-- Embalagem de cada unidade: 1 de cada item marcado (D-032, pergunta 9).
CREATE TABLE receita_embalagem (
  id INTEGER PRIMARY KEY,
  receita_id INTEGER NOT NULL REFERENCES receita (id),
  item_id INTEGER NOT NULL REFERENCES item_estoque (id),
  UNIQUE (receita_id, item_id)
) STRICT;

CREATE INDEX receita_embalagem_item ON receita_embalagem (item_id);
