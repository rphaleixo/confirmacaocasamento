import { jsonResponse } from '../../_lib.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT id, nome, mensagem, aprovado, criado_em FROM recados ORDER BY id DESC')
    .all();
  return jsonResponse(results.map((r) => ({ ...r, aprovado: r.aprovado === 1 })));
}
