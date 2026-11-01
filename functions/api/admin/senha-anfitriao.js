import { jsonResponse, resolverEvento, eventoNaoEncontrado, hashSenha, novoSalt } from '../../_lib.js';

// GET: usuário atual do anfitrião do evento (sem a senha). POST { usuario, senha }: cria ou troca o usuário e a senha.
export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const e = await env.DB.prepare('SELECT admin_usuario AS usuario FROM eventos WHERE id = ?').bind(evento.id).first();
  return jsonResponse({ usuario: (e && e.usuario) || '' });
}
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento || !new URL(request.url).searchParams.get('e')) return eventoNaoEncontrado();
  const p = await request.json().catch(() => ({}));
  const usuario = String(p.usuario || '').trim(), senha = String(p.senha || '');
  if (usuario.length < 3 || usuario.length > 40 || usuario.includes(':')) return jsonResponse({ erro: 'O usuário precisa ter de 3 a 40 caracteres, sem o sinal ":".' }, 400);
  if (senha.length < 8 || senha.length > 100) return jsonResponse({ erro: 'A senha precisa ter de 8 a 100 caracteres.' }, 400);
  if (senha.toLowerCase() === usuario.toLowerCase()) return jsonResponse({ erro: 'A senha não pode ser igual ao usuário.' }, 400);
  const salt = novoSalt();
  await env.DB.prepare('UPDATE eventos SET admin_usuario = ?, admin_senha_salt = ?, admin_senha_hash = ? WHERE id = ?').bind(usuario, salt, await hashSenha(senha, salt), evento.id).run();
  return jsonResponse({ ok: true, usuario });
}
