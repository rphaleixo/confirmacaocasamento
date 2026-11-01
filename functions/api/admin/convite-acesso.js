import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';
import { criarConviteAcesso } from '../../_sessao.js';

// POST ?e=<evento> — gera o link de primeiro acesso do anfitrião (uso único, vale 7 dias). Só o administrador geral.
export async function onRequestPost({ request, env, data }) {
  if (data.admin.tipo !== 'master') return jsonResponse({ erro: 'Só o administrador geral gera convites de acesso.' }, 403);
  const evento = await resolverEvento(env.DB, request);
  if (!evento || !new URL(request.url).searchParams.get('e')) return eventoNaoEncontrado();
  const token = await criarConviteAcesso(env.DB, evento.id, 7);
  const origem = new URL(request.url).origin;
  return jsonResponse({ ok: true, url: origem + '/entrar/' + token, dias: 7, evento: { nome: evento.nome, slug: evento.slug } });
}
