-- Fatia 1B · base do sistema: preferências, histórico (auditoria) e registro das cópias.

CREATE TABLE config (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL CHECK (json_valid(valor)),
  alterado_em TEXT NOT NULL
) STRICT;

CREATE TABLE auditoria (
  id INTEGER PRIMARY KEY,
  data_hora TEXT NOT NULL,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('criar', 'alterar', 'excluir', 'desfazer', 'sistema')),
  entidade TEXT,
  entidade_id INTEGER,
  descricao TEXT NOT NULL,
  antes_json TEXT CHECK (antes_json IS NULL OR json_valid(antes_json)),
  depois_json TEXT CHECK (depois_json IS NULL OR json_valid(depois_json))
) STRICT;

CREATE INDEX auditoria_data_hora ON auditoria (data_hora DESC);
CREATE INDEX auditoria_entidade ON auditoria (entidade, entidade_id);

CREATE TABLE registro_backup (
  id INTEGER PRIMARY KEY,
  data_hora TEXT NOT NULL,
  destino TEXT NOT NULL CHECK (destino IN ('pasta', 'pen_drive')),
  motivo TEXT NOT NULL CHECK (motivo IN ('abrir', 'periodico', 'fechar', 'manual', 'migracao', 'restaurar')),
  arquivo TEXT,
  status TEXT NOT NULL CHECK (status IN ('ok', 'erro')),
  mensagem TEXT
) STRICT;

CREATE INDEX registro_backup_data_hora ON registro_backup (destino, status, data_hora DESC);
