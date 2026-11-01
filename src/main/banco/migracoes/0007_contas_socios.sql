-- Fatia 5 · contas a pagar, cartões, sócios, participação por mês e retiradas (R11, R12).

CREATE TABLE socio (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  ordem INTEGER NOT NULL
) STRICT;

-- D-059: Carlos e Paulo já vêm cadastrados.
INSERT INTO socio (id, nome, ordem) VALUES (1, 'Carlos', 1), (2, 'Paulo', 2);

-- D-058: a porcentagem vale do mês da mudança em diante; vale a linha de maior ano_mes ≤ o mês.
CREATE TABLE participacao_socio (
  ano_mes TEXT NOT NULL,
  socio_id INTEGER NOT NULL REFERENCES socio (id),
  pct_x100 INTEGER NOT NULL CHECK (pct_x100 BETWEEN 0 AND 10000),
  alterado_em TEXT NOT NULL,
  PRIMARY KEY (ano_mes, socio_id)
) STRICT;

INSERT INTO participacao_socio (ano_mes, socio_id, pct_x100, alterado_em) VALUES
  ('0000-00', 1, 6000, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')),
  ('0000-00', 2, 4000, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'));

CREATE TABLE tipo_conta (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  -- 'fatura_empresa' (D-061): não entra nas despesas nem na meta, não pode ser removido
  especial TEXT CHECK (especial IS NULL OR especial = 'fatura_empresa'),
  criado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

INSERT INTO tipo_conta (nome, especial, criado_em)
SELECT nome, especial, strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') FROM (
  SELECT 1 AS o, 'Fornecedor' AS nome, NULL AS especial
  UNION ALL SELECT 2, 'Energia', NULL
  UNION ALL SELECT 3, 'Contas fixas', NULL
  UNION ALL SELECT 4, 'Aluguel', NULL
  UNION ALL SELECT 5, 'Funcionários', NULL
  UNION ALL SELECT 6, 'Serviços', NULL
  UNION ALL SELECT 7, 'Manutenção', NULL
  UNION ALL SELECT 8, 'Outros', NULL
  UNION ALL SELECT 9, 'Fatura do cartão da empresa', 'fatura_empresa'
) ORDER BY o;

CREATE TABLE cartao (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  -- dono: NULL = da empresa; senão, cartão pessoal do sócio (gera reembolso)
  socio_id INTEGER REFERENCES socio (id),
  criado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE TABLE conta_pagar (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  vencimento TEXT NOT NULL,
  tipo_id INTEGER NOT NULL REFERENCES tipo_conta (id),
  repete INTEGER NOT NULL DEFAULT 0 CHECK (repete IN (0, 1)),
  -- dia do vencimento digitado (31 continua 31 depois de um mês de 30 dias)
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  avisar_dias INTEGER NOT NULL DEFAULT 3 CHECK (avisar_dias IN (1, 3, 5, 7)),
  -- conta do mês anterior que gerou esta (conta que repete)
  anterior_id INTEGER REFERENCES conta_pagar (id),
  -- pagamento (1 para 1, docs/09 §1.6): "Desfazer" só limpa estes campos
  pago_em TEXT,
  forma_pagamento TEXT CHECK (
    forma_pagamento IS NULL
    OR forma_pagamento IN ('dinheiro', 'pix', 'boleto', 'transferencia', 'debito', 'credito')
  ),
  cartao_id INTEGER REFERENCES cartao (id),
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT,
  CHECK ((pago_em IS NULL) = (forma_pagamento IS NULL)),
  CHECK (cartao_id IS NULL OR forma_pagamento IN ('debito', 'credito'))
) STRICT;

CREATE INDEX conta_pagar_vencimento ON conta_pagar (vencimento) WHERE excluido_em IS NULL;
CREATE INDEX conta_pagar_pago_em ON conta_pagar (pago_em) WHERE excluido_em IS NULL;
CREATE INDEX conta_pagar_tipo ON conta_pagar (tipo_id);
CREATE INDEX conta_pagar_cartao ON conta_pagar (cartao_id);
CREATE UNIQUE INDEX conta_pagar_anterior ON conta_pagar (anterior_id);

CREATE TABLE retirada (
  id INTEGER PRIMARY KEY,
  socio_id INTEGER NOT NULL REFERENCES socio (id),
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  data TEXT NOT NULL,
  -- D-032 p.30: só as duas do protótipo
  como TEXT NOT NULL CHECK (como IN ('pix_empresa', 'dinheiro_caixa')),
  motivo TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX retirada_data ON retirada (data) WHERE excluido_em IS NULL;
