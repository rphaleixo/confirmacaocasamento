// Conteúdo editável do site — público, é o que o index.html usa pra se montar.
import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB.prepare('SELECT chave, valor FROM conteudo WHERE evento_id = ?').bind(evento.id).all();
  const conteudo = {};
  results.forEach((r) => { conteudo[r.chave] = r.valor; });
  return jsonResponse(conteudo);
}
