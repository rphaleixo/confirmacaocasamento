-- Cada evento (casamento, aniversário, etc.) tem seu próprio endereço (/e/<slug>),
-- conteúdo, grupos, convidados e recados.
CREATE TABLE eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  criado_em TEXT,
  -- template do evento (ver functions/_tipos.js): define módulos e padrões
  tipo TEXT NOT NULL DEFAULT 'casamento',
  -- login próprio do painel do evento (senha guardada só como hash)
  admin_usuario TEXT,
  admin_senha_salt TEXT,
  admin_senha_hash TEXT
);

CREATE TABLE grupos (
  codigo TEXT PRIMARY KEY,
  evento_id INTEGER NOT NULL REFERENCES eventos(id),
  nome_grupo TEXT NOT NULL,
  status_abertura TEXT NOT NULL DEFAULT 'Não aberto',
  data_abertura TEXT,
  status_confirmacao TEXT NOT NULL DEFAULT 'Pendente',
  data_confirmacao TEXT,
  responsavel TEXT,
  contato_responsavel TEXT
);

CREATE INDEX idx_grupos_evento ON grupos(evento_id);

CREATE TABLE convidados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  telefone TEXT,
  codigo_grupo TEXT NOT NULL REFERENCES grupos(codigo),
  confirmado INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'adulto' CHECK (tipo IN ('adulto','crianca')),
  resposta TEXT,            -- 'sim' | 'nao_sei' | 'nao' | NULL (ainda não respondeu); confirmado = 1 só quando 'sim'
  como_chamar TEXT,         -- como a pessoa prefere ser chamada (opcional)
  tratamento TEXT,          -- pronome de tratamento que antecede o nome (Sr., Sra., Tio...)
  codigo_individual TEXT    -- código do link individual (opcional, criado sob demanda)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_convidados_codigo_ind ON convidados(codigo_individual) WHERE codigo_individual IS NOT NULL;

CREATE INDEX idx_convidados_grupo ON convidados(codigo_grupo);

-- Conteúdo editável do site (textos, fotos, toggles de seção, configurações) por evento —
-- chave-valor livre, assim cada campo novo do front não exige migração de schema.
CREATE TABLE conteudo (
  evento_id INTEGER NOT NULL REFERENCES eventos(id),
  chave TEXT NOT NULL,
  valor TEXT,
  PRIMARY KEY (evento_id, chave)
);

-- Mural de recados dos convidados — moderado antes de aparecer publicamente.
CREATE TABLE recados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id INTEGER NOT NULL REFERENCES eventos(id),
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  aprovado INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT
);

CREATE INDEX idx_recados_evento ON recados(evento_id);

-- Visitas ao site de cada evento, agregadas por dia (UTC) — alimenta os dados de uso do admin master.
CREATE TABLE acessos (
  evento_id INTEGER NOT NULL REFERENCES eventos(id),
  dia TEXT NOT NULL,
  visitas INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (evento_id, dia)
);
