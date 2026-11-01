-- Fatia 2 · cadastros: clientes e fornecedores.
-- Telefone e CPF/CNPJ guardados como digitados (já formatados); a busca usa só os números.

CREATE TABLE cliente (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  telefone TEXT NOT NULL DEFAULT '',
  documento TEXT NOT NULL DEFAULT '',
  rua TEXT NOT NULL DEFAULT '',
  numero TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX cliente_nome ON cliente (nome COLLATE NOCASE) WHERE excluido_em IS NULL;

CREATE TABLE fornecedor (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  telefone TEXT NOT NULL DEFAULT '',
  documento TEXT NOT NULL DEFAULT '',
  contato TEXT NOT NULL DEFAULT '',
  o_que_fornece TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL,
  alterado_em TEXT NOT NULL,
  excluido_em TEXT
) STRICT;

CREATE INDEX fornecedor_nome ON fornecedor (nome COLLATE NOCASE) WHERE excluido_em IS NULL;
