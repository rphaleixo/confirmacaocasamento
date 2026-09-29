import { jsonResponse, gerarCodigoIndividual, resolverEvento, eventoNaoEncontrado } from '../../../_lib.js';

// body: { id } — devolve o código do link individual do convidado, criando um se ainda não existir
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const id = Number(payload.id);
  if (!id) return jsonResponse({ erro: 'Convidado não informado.' }, 400);
  const db = env.DB;
  const c = await db.prepare('SELECT c.id, c.codigo_individual FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.id = ? AND g.evento_id = ?').bind(id, evento.id).first();
  if (!c) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);
  if (c.codigo_individual) return jsonResponse({ codigo: c.codigo_individual });
  const codigo = await gerarCodigoIndividual(db);
  await db.prepare('UPDATE convidados SET codigo_individual = ? WHERE id = ?').bind(codigo, id).run();
  return jsonResponse({ codigo });
}
