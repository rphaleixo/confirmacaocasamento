import { jsonResponse, recalcularStatusGrupo, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB
    .prepare(
      `SELECT c.id, c.nome, c.codigo_grupo AS grupoAtual, g.nome_grupo AS grupoAtualNome
       FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo
       WHERE g.evento_id = ?
       ORDER BY c.nome`
    )
    .bind(evento.id)
    .all();
  return jsonResponse(results);
}

// body: { nome, telefone, codigoGrupo, tipo, responsavel? } — adiciona 1 convidado a um grupo já existente
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const nome = (payload.nome || '').trim();
  const codigoGrupo = (payload.codigoGrupo || '').trim().toUpperCase();
  const tipo = payload.tipo === 'crianca' ? 'crianca' : 'adulto';
  if (!nome) return jsonResponse({ erro: 'Dê um nome pro convidado.' }, 400);
  if (!codigoGrupo) return jsonResponse({ erro: 'Escolha um grupo.' }, 400);

  const db = env.DB;
  const grupo = await db.prepare('SELECT 1 FROM grupos WHERE codigo = ? AND evento_id = ?').bind(codigoGrupo, evento.id).first();
  if (!grupo) return jsonResponse({ erro: 'Grupo não encontrado.' }, 404);

  await db
    .prepare('INSERT INTO convidados (nome, telefone, codigo_grupo, confirmado, tipo) VALUES (?, ?, ?, ?, ?)')
    .bind(nome, payload.telefone || '', codigoGrupo, tipo === 'crianca' ? 1 : 0, tipo)
    .run();

  const responsavel = (payload.responsavel || '').trim();
  if (responsavel) {
    await db.prepare('UPDATE grupos SET responsavel = ? WHERE codigo = ?').bind(responsavel, codigoGrupo).run();
  }

  await recalcularStatusGrupo(db, codigoGrupo);
  return jsonResponse({ ok: true });
}
