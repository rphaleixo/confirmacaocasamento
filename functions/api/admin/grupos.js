import { jsonResponse, gerarCodigoUnico } from '../../_lib.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT codigo, nome_grupo AS nome, status_confirmacao AS status FROM grupos ORDER BY nome_grupo')
    .all();
  return jsonResponse(results);
}

// body: { nomeGrupo, adultosTexto, criancasTexto } — um nome por linha em cada textarea
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const nomeGrupo = (payload.nomeGrupo || '').trim();
  if (!nomeGrupo) return jsonResponse({ erro: 'Dê um nome pro grupo.' }, 400);

  const adultos = (payload.adultosTexto || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const criancas = (payload.criancasTexto || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (adultos.length + criancas.length === 0) return jsonResponse({ erro: 'Adicione ao menos um convidado.' }, 400);

  const db = env.DB;
  const codigo = await gerarCodigoUnico(db);

  await db
    .prepare(
      "INSERT INTO grupos (codigo, nome_grupo, status_abertura, status_confirmacao) VALUES (?, ?, 'Não aberto', 'Pendente')"
    )
    .bind(codigo, nomeGrupo)
    .run();

  const stmt = db.prepare(
    'INSERT INTO convidados (nome, codigo_grupo, confirmado, tipo) VALUES (?, ?, ?, ?)'
  );
  const inserts = [
    ...adultos.map((nome) => stmt.bind(nome, codigo, 0, 'adulto')),
    ...criancas.map((nome) => stmt.bind(nome, codigo, 1, 'crianca')),
  ];
  await db.batch(inserts);

  return jsonResponse({ codigo, total: adultos.length + criancas.length });
}
