import { jsonResponse } from '../../_lib.js';
import { emailValido, emailsDoEnv } from '../../_sessao.js';

// E-mails Google com acesso. Sem ?e=: administrador geral (só o master mexe). Com ?e=<evento>: anfitriões daquele evento
// (o master ou um anfitrião daquele evento mexem).
async function escopo(request, env, data) {
  const slug = (new URL(request.url).searchParams.get('e') || '').trim().toLowerCase();
  if (!slug) return data.admin.tipo === 'master' ? { id: 0, geral: true } : { erro: jsonResponse({ erro: 'Só o administrador geral gerencia estes e-mails.' }, 403) };
  const ev = await env.DB.prepare('SELECT id FROM eventos WHERE slug = ?').bind(slug).first();
  if (!ev) return { erro: jsonResponse({ erro: 'Evento não encontrado.' }, 404) };
  if (data.admin.tipo === 'evento' && data.admin.eventoId !== ev.id) return { erro: jsonResponse({ erro: 'Sem acesso a este evento.' }, 403) };
  return { id: ev.id, geral: false };
}

export async function onRequestGet({ request, env, data }) {
  const e = await escopo(request, env, data); if (e.erro) return e.erro;
  const { results } = await env.DB.prepare('SELECT email FROM admin_google WHERE evento_id = ? ORDER BY email').bind(e.id).all();
  return jsonResponse({ emails: results.map((r) => r.email), fixos: e.geral ? emailsDoEnv(env) : [], ativo: !!env.GOOGLE_CLIENT_ID });
}

// body: { email }
export async function onRequestPost({ request, env, data }) {
  const e = await escopo(request, env, data); if (e.erro) return e.erro;
  const p = await request.json().catch(() => ({}));
  const email = String(p.email || '').trim().toLowerCase();
  if (!emailValido(email)) return jsonResponse({ erro: 'Digite um e-mail válido (a conta Google da pessoa).' }, 400);
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_google WHERE evento_id = ?').bind(e.id).first();
  if (n >= 20) return jsonResponse({ erro: 'Limite de 20 e-mails atingido.' }, 400);
  await env.DB.prepare("INSERT OR IGNORE INTO admin_google (email, evento_id, criado_em) VALUES (?, ?, datetime('now'))").bind(email, e.id).run();
  return jsonResponse({ ok: true });
}

// body: { email }
export async function onRequestDelete({ request, env, data }) {
  const e = await escopo(request, env, data); if (e.erro) return e.erro;
  const p = await request.json().catch(() => ({}));
  const email = String(p.email || '').trim().toLowerCase();
  await env.DB.prepare('DELETE FROM admin_google WHERE email = ? AND evento_id = ?').bind(email, e.id).run();
  // quem perdeu o acesso sai na hora (sessões abertas por Google desse e-mail neste escopo)
  await env.DB.prepare("DELETE FROM sessoes WHERE email = ? AND ((? = 0 AND tipo = 'master') OR (tipo = 'evento' AND evento_id = ?))").bind(email, e.id, e.id).run();
  return jsonResponse({ ok: true });
}
