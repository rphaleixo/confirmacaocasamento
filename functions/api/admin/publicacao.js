import { jsonResponse, resolverEvento, eventoNaoEncontrado, novoSalt } from '../../_lib.js';
import { faltaParaPublicar } from '../../_tipos.js';

// GET: situação do convite { publicado, token } — o token abre o site real enquanto ele está "em breve" para os convidados.
export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  let ev = await env.DB.prepare('SELECT publicado, token_rascunho FROM eventos WHERE id = ?').bind(evento.id).first();
  if (!ev.token_rascunho) {
    const token = novoSalt();
    await env.DB.prepare('UPDATE eventos SET token_rascunho = ? WHERE id = ? AND token_rascunho IS NULL').bind(token, evento.id).run();
    ev = await env.DB.prepare('SELECT publicado, token_rascunho FROM eventos WHERE id = ?').bind(evento.id).first();
  }
  return jsonResponse({ publicado: ev.publicado !== 0, token: ev.token_rascunho });
}

// POST body: { publicado: true | false } — publica o convite ou volta para "Em breve".
// Publicar exige nomes e data (400 com { faltando: [{ id, titulo }] }); voltar para "Em breve" nunca é bloqueado.
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const p = await request.json().catch(() => ({}));
  if (typeof p.publicado !== 'boolean') return jsonResponse({ erro: 'Informe se é para publicar ou não.' }, 400);
  if (p.publicado) {
    // só data e nomes bloqueiam a publicação; a resposta diz qual passo do assistente resolve cada um
    const { results } = await env.DB.prepare("SELECT chave, valor FROM conteudo WHERE evento_id = ? AND chave IN ('hero.noiva', 'hero.noivo', 'hero.data_iso')").bind(evento.id).all();
    const conteudo = Object.fromEntries(results.map((r) => [r.chave, r.valor]));
    const faltando = faltaParaPublicar(conteudo, evento.tipo);
    if (faltando.length) return jsonResponse({ erro: 'Antes de publicar, falta: ' + faltando.map((f) => f.titulo.toLowerCase()).join(' e ') + '.', faltando }, 400);
  }
  await env.DB.prepare('UPDATE eventos SET publicado = ? WHERE id = ?').bind(p.publicado ? 1 : 0, evento.id).run();
  return jsonResponse({ ok: true, publicado: p.publicado });
}
