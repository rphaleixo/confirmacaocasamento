import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB
    .prepare('SELECT id, nome, mensagem, aprovado, criado_em FROM recados WHERE evento_id = ? ORDER BY id DESC')
    .bind(evento.id)
    .all();
  return jsonResponse(results.map((r) => ({ ...r, aprovado: r.aprovado === 1 })));
}
