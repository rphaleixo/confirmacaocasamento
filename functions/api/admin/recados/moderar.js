import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../../_lib.js';

// body: { id, aprovado }
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  if (!payload.id) return jsonResponse({ erro: 'Recado não informado.' }, 400);
  await env.DB
    .prepare('UPDATE recados SET aprovado = ? WHERE id = ? AND evento_id = ?')
    .bind(payload.aprovado ? 1 : 0, payload.id, evento.id)
    .run();
  return jsonResponse({ ok: true });
}
