import { jsonResponse } from '../../_lib.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare(
      `SELECT c.id, c.nome, c.codigo_grupo AS grupoAtual, g.nome_grupo AS grupoAtualNome
       FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo
       ORDER BY c.nome`
    )
    .all();
  return jsonResponse(results);
}
