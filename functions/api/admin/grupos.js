import { jsonResponse, gerarCodigoUnico, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB
    .prepare('SELECT codigo, nome_grupo AS nome, status_confirmacao AS status FROM grupos WHERE evento_id = ? ORDER BY nome_grupo')
    .bind(evento.id)
    .all();
  return jsonResponse(results);
}

// body: { nomeGrupo, codigo?, responsavel? } — cria o grupo vazio; convidados entram depois por /api/admin/convidados
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const nomeGrupo = (payload.nomeGrupo || '').trim();
  if (!nomeGrupo) return jsonResponse({ erro: 'Dê um nome pro grupo.' }, 400);

  const db = env.DB;
  let codigo = (payload.codigo || '').trim().toUpperCase();
  if (codigo) {
    const existente = await db.prepare('SELECT 1 FROM grupos WHERE codigo = ?').bind(codigo).first();
    if (existente) return jsonResponse({ erro: 'Esse código já está em uso por outro grupo.' }, 400);
  } else {
    codigo = await gerarCodigoUnico(db);
  }

  await db
    .prepare(
      "INSERT INTO grupos (codigo, evento_id, nome_grupo, status_abertura, status_confirmacao, responsavel) VALUES (?, ?, ?, 'Não aberto', 'Pendente', ?)"
    )
    .bind(codigo, evento.id, nomeGrupo, (payload.responsavel || '').trim() || null)
    .run();

  return jsonResponse({ codigo });
}
