import { jsonResponse } from '../../_lib.js';
import { consumirCodigoTroca, criarSessao } from '../../_sessao.js';

// POST body: { codigo } ; ?e=<evento> — troca o código de uso único (vindo de vemnafesta.com) por uma sessão neste endereço
export async function onRequestPost({ request, env }) {
  const p = await request.json().catch(() => ({}));
  const c = await consumirCodigoTroca(env.DB, p.codigo);
  if (!c) return jsonResponse({ erro: 'O código de entrada venceu. Entre de novo.' }, 401);
  if (c.tipo === 'evento') {
    const slug = (new URL(request.url).searchParams.get('e') || '').trim().toLowerCase();
    const ev = slug ? await env.DB.prepare('SELECT id FROM eventos WHERE slug = ?').bind(slug).first() : null;
    if (!ev || ev.id !== c.eventoId) return jsonResponse({ erro: 'Esse código é de outro evento.' }, 403);
  }
  return jsonResponse({ ok: true, tipo: c.tipo, token: await criarSessao(env.DB, { tipo: c.tipo, eventoId: c.eventoId, email: c.email || null }) });
}
