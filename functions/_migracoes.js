// Migrações automáticas do banco (D1). Rodam sozinhas na primeira requisição após cada deploy:
// o site confere a tabela _migracoes, aplica as pendentes em ordem e registra cada uma.
// Cada migração roda numa transação única (db.batch) — ou aplica inteira ou não aplica nada.
//
// Para mudar o banco no futuro: acrescente um item NO FIM da lista MIGRACOES (nunca edite os
// antigos) e atualize schema.sql, que continua sendo o retrato do banco para instalações novas.

async function tabelaExiste(db, nome) {
  const row = await db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?").bind(nome).first();
  return !!row;
}

const MIGRACOES = [
  {
    id: '001-multi-evento',
    // Retorna a lista de comandos, ou null se não há nada a fazer (banco já nasceu no formato novo
    // via schema.sql, ou ainda nem foi inicializado).
    async comandos(db) {
      if (await tabelaExiste(db, 'eventos')) return null;
      if (!(await tabelaExiste(db, 'grupos'))) return null;
      return [
        `CREATE TABLE eventos (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           slug TEXT NOT NULL UNIQUE,
           nome TEXT NOT NULL,
           criado_em TEXT,
           admin_usuario TEXT,
           admin_senha_salt TEXT,
           admin_senha_hash TEXT
         )`,
        "INSERT INTO eventos (id, slug, nome, criado_em) VALUES (1, 'casamento', 'Casamento', datetime('now'))",
        'ALTER TABLE grupos ADD COLUMN evento_id INTEGER NOT NULL DEFAULT 1',
        'CREATE INDEX idx_grupos_evento ON grupos(evento_id)',
        'ALTER TABLE recados ADD COLUMN evento_id INTEGER NOT NULL DEFAULT 1',
        'CREATE INDEX idx_recados_evento ON recados(evento_id)',
        `CREATE TABLE conteudo_novo (
           evento_id INTEGER NOT NULL REFERENCES eventos(id),
           chave TEXT NOT NULL,
           valor TEXT,
           PRIMARY KEY (evento_id, chave)
         )`,
        'INSERT INTO conteudo_novo (evento_id, chave, valor) SELECT 1, chave, valor FROM conteudo',
        'DROP TABLE conteudo',
        'ALTER TABLE conteudo_novo RENAME TO conteudo',
      ];
    },
  },
  {
    id: '002-tipos-e-acessos',
    async comandos(db) {
      if (!(await tabelaExiste(db, 'eventos'))) return null;
      const tem = await db.prepare("SELECT 1 AS ok FROM pragma_table_info('eventos') WHERE name = 'tipo'").first();
      if (tem) return null;
      return [
        "ALTER TABLE eventos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'casamento'",
        `CREATE TABLE IF NOT EXISTS acessos (
           evento_id INTEGER NOT NULL REFERENCES eventos(id),
           dia TEXT NOT NULL,
           visitas INTEGER NOT NULL DEFAULT 0,
           PRIMARY KEY (evento_id, dia)
         )`,
      ];
    },
  },
];

let emAndamento = null; // uma verificação por instância do worker

export function garantirMigracoes(db) {
  if (!emAndamento) {
    emAndamento = executar(db).catch((e) => {
      emAndamento = null; // tenta de novo na próxima requisição
      throw e;
    });
  }
  return emAndamento;
}

async function aplicadas(db) {
  const { results } = await db.prepare('SELECT id FROM _migracoes').all();
  return new Set(results.map((r) => r.id));
}

async function executar(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS _migracoes (id TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)').run();
  let feitas = await aplicadas(db);

  for (const m of MIGRACOES) {
    if (feitas.has(m.id)) continue;
    const comandos = await m.comandos(db);
    const registro = db.prepare('INSERT OR IGNORE INTO _migracoes (id, aplicada_em) VALUES (?, ?)').bind(m.id, new Date().toISOString());
    try {
      await db.batch([...(comandos || []).map((c) => db.prepare(c)), registro]);
    } catch (e) {
      // duas requisições simultâneas podem disputar a mesma migração: se a outra já concluiu, segue
      feitas = await aplicadas(db);
      if (!feitas.has(m.id)) throw e;
    }
  }
}
