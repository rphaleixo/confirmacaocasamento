-- Migração do banco já existente (1 evento só) para o modelo multi-evento.
-- Rodar UMA vez: wrangler d1 execute confirmacaocasamento --remote --file=migracao-multi-evento.sql
-- Tudo que já existe passa a pertencer ao evento 1 (slug "casamento", acessível em /e/casamento).
CREATE TABLE eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  criado_em TEXT,
  admin_usuario TEXT,
  admin_senha_salt TEXT,
  admin_senha_hash TEXT
);
INSERT INTO eventos (id, slug, nome, criado_em) VALUES (1, 'casamento', 'Casamento', datetime('now'));

ALTER TABLE grupos ADD COLUMN evento_id INTEGER NOT NULL DEFAULT 1 REFERENCES eventos(id);
CREATE INDEX idx_grupos_evento ON grupos(evento_id);

ALTER TABLE recados ADD COLUMN evento_id INTEGER NOT NULL DEFAULT 1 REFERENCES eventos(id);
CREATE INDEX idx_recados_evento ON recados(evento_id);

CREATE TABLE conteudo_novo (
  evento_id INTEGER NOT NULL REFERENCES eventos(id),
  chave TEXT NOT NULL,
  valor TEXT,
  PRIMARY KEY (evento_id, chave)
);
INSERT INTO conteudo_novo (evento_id, chave, valor) SELECT 1, chave, valor FROM conteudo;
DROP TABLE conteudo;
ALTER TABLE conteudo_novo RENAME TO conteudo;
