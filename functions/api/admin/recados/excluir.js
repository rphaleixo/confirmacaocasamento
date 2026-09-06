import { jsonResponse } from '../../../_lib.js';

// body: { id }
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  if (!payload.id) return jsonResponse({ erro: 'Recado não informado.' }, 400);
  await env.DB.prepare('DELETE FROM recados WHERE id = ?').bind(payload.id).run();
  return jsonResponse({ ok: true });
}
