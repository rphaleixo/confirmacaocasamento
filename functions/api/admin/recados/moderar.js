import { jsonResponse } from '../../../_lib.js';

// body: { id, aprovado }
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  if (!payload.id) return jsonResponse({ erro: 'Recado não informado.' }, 400);
  await env.DB
    .prepare('UPDATE recados SET aprovado = ? WHERE id = ?')
    .bind(payload.aprovado ? 1 : 0, payload.id)
    .run();
  return jsonResponse({ ok: true });
}
