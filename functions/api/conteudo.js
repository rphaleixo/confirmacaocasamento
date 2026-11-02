// Conteúdo editável do site — público, é o que o index.html usa pra se montar.
// Além das chaves gravadas, devolve _tipo, _nome e _modulos (módulos que o tipo do evento oferece).
import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../_lib.js';
import { TIPOS, tipoDe } from '../_tipos.js';
import { acessoCompleto, removerRestritas, ehAnfitriao, esconderQuemEscolheu } from '../_acesso.js';

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB.prepare('SELECT chave, valor FROM conteudo WHERE evento_id = ?').bind(evento.id).all();
  const conteudo = {};
  results.forEach((r) => { conteudo[r.chave] = r.valor; });
  const completo = await acessoCompleto(request, env, evento, conteudo);
  if (!completo) { removerRestritas(conteudo); conteudo._restrito = '1'; }
  if (!(await ehAnfitriao(request, env, evento))) esconderQuemEscolheu(conteudo);
  const tipo = tipoDe(evento.tipo);
  conteudo._tipo = tipo;
  conteudo._nome = evento.nome;
  conteudo._modulos = JSON.stringify(TIPOS[tipo].modulos);
  const resp = jsonResponse(conteudo);
  resp.headers.set('cache-control', 'no-store');
  return resp;
}
