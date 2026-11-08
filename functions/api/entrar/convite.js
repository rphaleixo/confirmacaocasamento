import { jsonResponse, hashSenha, novoSalt } from '../../_lib.js';
import { verificarIdToken } from '../../_google.js';
import { buscarConviteAcesso, usarConviteAcesso, criarCodigoTroca, emailValido } from '../../_sessao.js';
import { destinoDoPainel } from '../../_destino.js';

const invalido = () => jsonResponse({ erro: 'Este convite não vale mais (já foi usado ou venceu). Peça um novo a quem criou a sua festa.' }, 410);

// GET ?t=<convite> — mostra para quem é o convite (e se o Google está ligado)
export async function onRequestGet({ request, env }) {
  const c = await buscarConviteAcesso(env.DB, new URL(request.url).searchParams.get('t'));
  if (!c) return invalido();
  return jsonResponse({ evento: { nome: c.nome, slug: c.slug, tipo: c.tipo }, clientId: env.GOOGLE_CLIENT_ID || null });
}

// POST body: { t, acao: 'senha', usuario, senha }  ou  { t, acao: 'google', credential }
// Conclui o primeiro acesso: define o usuário e a senha, ou liga a conta Google ao evento. O convite só vale uma vez.
// Ordem fixa: validar os dados → reivindicar o convite (atômico) → gravar o acesso. Dados inválidos não gastam o convite.
export async function onRequestPost({ request, env }) {
  const p = await request.json().catch(() => ({}));
  const c = await buscarConviteAcesso(env.DB, p.t);
  if (!c) return invalido();
  const url = new URL(request.url);

  if (p.acao === 'google') {
    if (!env.GOOGLE_CLIENT_ID) return jsonResponse({ erro: 'O "Entrar com Google" ainda não está ligado. Use usuário e senha.' }, 503);
    let quem;
    try { quem = await verificarIdToken(p.credential, env.GOOGLE_CLIENT_ID); } catch (e) { return jsonResponse({ erro: e.message }, 401); }
    if (!(await usarConviteAcesso(env.DB, p.t))) return invalido(); // quem usa primeiro leva; o outro pedido simultâneo recebe "não vale mais"
    await env.DB.prepare("INSERT OR IGNORE INTO admin_google (email, evento_id, criado_em) VALUES (?, ?, datetime('now'))").bind(quem.email, c.eventoId).run();
    const codigo = await criarCodigoTroca(env.DB, { tipo: 'evento', eventoId: c.eventoId, email: quem.email });
    return jsonResponse({ ok: true, destino: destinoDoPainel(url, c.slug, codigo) });
  }

  if (p.acao === 'senha') {
    const usuario = String(p.usuario || '').trim();
    const senha = String(p.senha || '');
    if (usuario.length < 3 || usuario.length > 40 || usuario.includes(':')) return jsonResponse({ erro: 'O usuário precisa ter de 3 a 40 caracteres, sem o sinal ":".' }, 400);
    if (senha.length < 8 || senha.length > 100) return jsonResponse({ erro: 'A senha precisa ter de 8 a 100 caracteres.' }, 400);
    if (senha.toLowerCase() === usuario.toLowerCase()) return jsonResponse({ erro: 'A senha não pode ser igual ao usuário.' }, 400);
    const salt = novoSalt();
    const hash = await hashSenha(senha, salt);
    if (!(await usarConviteAcesso(env.DB, p.t))) return invalido(); // reivindica o convite ANTES de gravar a senha (senão o segundo a chegar sobrescreve o primeiro)
    await env.DB.prepare('UPDATE eventos SET admin_usuario = ?, admin_senha_salt = ?, admin_senha_hash = ? WHERE id = ?').bind(usuario, salt, hash, c.eventoId).run();
    const codigo = await criarCodigoTroca(env.DB, { tipo: 'evento', eventoId: c.eventoId, email: null });
    return jsonResponse({ ok: true, destino: destinoDoPainel(url, c.slug, codigo) });
  }
  return jsonResponse({ erro: 'Escolha como quer entrar.' }, 400);
}
