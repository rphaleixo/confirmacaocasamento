// Conteúdo editável do site — público, é o que o index.html usa pra se montar.
import { jsonResponse } from '../_lib.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT chave, valor FROM conteudo').all();
  const conteudo = {};
  results.forEach((r) => { conteudo[r.chave] = r.valor; });
  return jsonResponse(conteudo);
}
