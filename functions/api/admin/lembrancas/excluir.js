import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../../_lib.js';

// body: { id } — apaga a lembrança e tudo o que foi anotado sobre ela
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const p = await request.json().catch(() => ({}));
  if (!p.id) return jsonResponse({ erro: 'Lembrança não informada.' }, 400);
  const existe = await env.DB.prepare('SELECT id FROM lembrancas WHERE id = ? AND evento_id = ?').bind(p.id, evento.id).first();
  if (!existe) return jsonResponse({ erro: 'Lembrança não encontrada.' }, 404);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM lembranca_itens WHERE lembranca_id = ? AND evento_id = ?').bind(p.id, evento.id),
    env.DB.prepare('DELETE FROM lembrancas WHERE id = ? AND evento_id = ?').bind(p.id, evento.id),
  ]);
  return jsonResponse({ ok: true });
}
