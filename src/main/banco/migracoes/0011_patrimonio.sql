-- Fatia 6C · patrimônio: bens da empresa e manutenções (docs/02 §9; D-032 p.19; D-066, D-067, D-070).

CREATE TABLE tipo_bem (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  criado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

INSERT INTO tipo_bem (nome, criado_em)
SELECT nome, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') FROM (
  SELECT 1 AS o, 'Veículo' AS nome
  UNION ALL SELECT 2, 'Equipamento'
  UNION ALL SELECT 3, 'Móvel'
  UNION ALL SELECT 4, 'Informática'
) ORDER BY o;

CREATE TABLE bem (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  tipo_id INTEGER NOT NULL REFERENCES tipo_bem (id),
  -- "AAAA-MM"; NULL = não sabe
  data_compra TEXT CHECK (data_compra IS NULL OR data_compra GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  -- placa ou número de série
  identificacao TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX bem_tipo ON bem (tipo_id);

CREATE TABLE manutencao (
  id INTEGER PRIMARY KEY,
  bem_id INTEGER NOT NULL REFERENCES bem (id),
  data TEXT NOT NULL,
  o_que_foi_feito TEXT NOT NULL CHECK (length(trim(o_que_foi_feito)) > 0),
  quem_fez TEXT NOT NULL DEFAULT '',
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos >= 0),
  garantia_dias INTEGER NOT NULL DEFAULT 0 CHECK (garantia_dias >= 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('revisao', 'conserto')),
  -- conta em Contas a pagar (D-066); NULL quando o serviço saiu de graça (D-070)
  conta_id INTEGER UNIQUE REFERENCES conta_pagar (id),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX manutencao_bem ON manutencao (bem_id);
CREATE INDEX manutencao_data ON manutencao (data) WHERE excluido_em IS NULL;
