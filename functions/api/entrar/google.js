import { jsonResponse } from '../../_lib.js';
import { verificarIdToken } from '../../_google.js';
import { criarSessao, ehMasterGoogle } from '../../_sessao.js';

// POST body: { credential } (ID token do Google); ?e=<slug> quando o login é de um evento.
// Administrador geral (e-mail liberado no sistema) entra em qualquer lugar; anfitrião só no evento ao qual o e-mail foi ligado.
export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID) return jsonResponse({ erro: 'O "Entrar com Google" ainda não foi configurado neste site.' }, 503);
  const corpo = await request.json().catch(() => ({}));
  let quem;
  try { quem = await verificarIdToken(corpo.credential, env.GOOGLE_CLIENT_ID); } catch (e) { return jsonResponse({ erro: e.message }, 401); }

  const slug = (new URL(request.url).searchParams.get('e') || '').trim().toLowerCase();
  if (await ehMasterGoogle(env, quem.email)) {
    return jsonResponse({ ok: true, tipo: 'master', email: quem.email, token: await criarSessao(env.DB, { tipo: 'master', email: quem.email }) });
  }
  if (slug) {
    const ev = await env.DB.prepare('SELECT id FROM eventos WHERE slug = ?').bind(slug).first();
    const liberado = ev ? await env.DB.prepare('SELECT 1 AS ok FROM admin_google WHERE email = ? AND evento_id = ?').bind(quem.email, ev.id).first() : null;
    if (liberado) return jsonResponse({ ok: true, tipo: 'evento', email: quem.email, token: await criarSessao(env.DB, { tipo: 'evento', eventoId: ev.id, email: quem.email }) });
  }
  return jsonResponse({ erro: 'A conta ' + quem.email + ' não tem acesso a este painel. Peça para liberarem esse e-mail.' }, 403);
}
