CREATE TABLE grupos (
  codigo TEXT PRIMARY KEY,
  nome_grupo TEXT NOT NULL,
  status_abertura TEXT NOT NULL DEFAULT 'Não aberto',
  data_abertura TEXT,
  status_confirmacao TEXT NOT NULL DEFAULT 'Pendente',
  data_confirmacao TEXT,
  responsavel TEXT,
  contato_responsavel TEXT
);

CREATE TABLE convidados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  telefone TEXT,
  codigo_grupo TEXT NOT NULL REFERENCES grupos(codigo),
  confirmado INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'adulto' CHECK (tipo IN ('adulto','crianca'))
);

CREATE INDEX idx_convidados_grupo ON convidados(codigo_grupo);

-- Conteúdo editável do site (textos, fotos, toggles de seção) — chave-valor livre,
-- assim cada campo novo do front não exige migração de schema.
CREATE TABLE conteudo (
  chave TEXT PRIMARY KEY,
  valor TEXT
);
