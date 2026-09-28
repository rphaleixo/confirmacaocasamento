// Conteúdo editável do site — público, é o que o index.html usa pra se montar.
// Além das chaves gravadas, devolve _tipo, _nome e _modulos (módulos que o tipo do evento oferece).
import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../_lib.js';
import { TIPOS, tipoDe } from '../_tipos.js';

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB.prepare('SELECT chave, valor FROM conteudo WHERE evento_id = ?').bind(evento.id).all();
  const conteudo = {};
  results.forEach((r) => { conteudo[r.chave] = r.valor; });
  const tipo = tipoDe(evento.tipo);
  conteudo._tipo = tipo;
  conteudo._nome = evento.nome;
  conteudo._modulos = JSON.stringify(TIPOS[tipo].modulos);
  return jsonResponse(conteudo);
}
