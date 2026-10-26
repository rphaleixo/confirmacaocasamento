import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';
import { limparAntigos, restaurar, DIAS_NA_LIXEIRA } from '../../_removidos.js';

// GET: o que foi removido nos últimos 30 dias
export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  await limparAntigos(env.DB, evento.id);
  const { results } = await env.DB.prepare("SELECT id, tipo, titulo, detalhe, removido_em AS removidoEm, CAST(julianday('now') - julianday(removido_em) AS INTEGER) AS dias FROM removidos WHERE evento_id = ? ORDER BY id DESC").bind(evento.id).all();
  return jsonResponse({ itens: results.map((r) => ({ ...r, restam: Math.max(0, DIAS_NA_LIXEIRA - r.dias) })), dias: DIAS_NA_LIXEIRA });
}

// POST body: { id } — restaura
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const p = await request.json().catch(() => ({}));
  const r = await restaurar(env.DB, evento.id, Number(p.id));
  return r.ok ? jsonResponse(r) : jsonResponse({ erro: r.erro }, 404);
}

// DELETE body: { id } apaga de vez um item; { todos: true } esvazia
export async function onRequestDelete({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const p = await request.json().catch(() => ({}));
  if (p.todos) await env.DB.prepare('DELETE FROM removidos WHERE evento_id = ?').bind(evento.id).run();
  else await env.DB.prepare('DELETE FROM removidos WHERE id = ? AND evento_id = ?').bind(Number(p.id), evento.id).run();
  return jsonResponse({ ok: true });
}
