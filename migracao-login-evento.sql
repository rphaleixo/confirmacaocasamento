-- Só para quem JÁ rodou a primeira versão de migracao-multi-evento.sql (sem login por evento).
-- Quem ainda não migrou deve rodar apenas migracao-multi-evento.sql, que já inclui estas colunas.
ALTER TABLE eventos ADD COLUMN admin_usuario TEXT;
ALTER TABLE eventos ADD COLUMN admin_senha_salt TEXT;
ALTER TABLE eventos ADD COLUMN admin_senha_hash TEXT;
