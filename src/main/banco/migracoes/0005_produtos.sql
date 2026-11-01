-- Fatia 3 · produtos à venda e o "Entendi" do aviso "O custo subiu" (D-045, D-046).

CREATE TABLE produto (
  id INTEGER PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categoria (id),
  receita_id INTEGER REFERENCES receita (id),
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  vendido_como TEXT NOT NULL CHECK (vendido_como IN ('unidade', 'pote', 'copo', 'caixa')),
  medida_x1000 INTEGER CHECK (medida_x1000 IS NULL OR medida_x1000 > 0),
  medida_unidade TEXT CHECK (medida_unidade IS NULL OR medida_unidade IN ('g', 'kg', 'ml', 'L')),
  unidades_por_caixa INTEGER CHECK (unidades_por_caixa IS NULL OR unidades_por_caixa > 0),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX produto_categoria ON produto (categoria_id) WHERE excluido_em IS NULL;
CREATE INDEX produto_receita ON produto (receita_id) WHERE excluido_em IS NULL;

-- Quando alguém toca em "Entendi" no aviso do custo que subiu.
ALTER TABLE historico_custo ADD COLUMN visto_em TEXT;
