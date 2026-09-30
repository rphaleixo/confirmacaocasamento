import { jsonResponse, hashSenha, novoSalt, masterConfere } from '../../_lib.js';

const SOMENTE_MASTER = () => jsonResponse({ erro: 'Só o administrador geral altera este login.' }, 403);

async function usuarioAtual(env) {
  const row = await env.DB.prepare('SELECT usuario FROM admin_master WHERE id = 1').first().catch(() => null);
  return row ? { usuario: row.usuario, doPainel: true } : { usuario: env.ADMIN_USER, doPainel: false };
}

// GET: qual é o login atual do administrador geral
export async function onRequestGet({ env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  return jsonResponse(await usuarioAtual(env));
}

// POST body: { senhaAtual, novoUsuario, novaSenha } — troca o login e a senha do administrador geral.
// Exige a senha atual (mesmo com a sessão aberta) e guarda a nova senha só como hash com sal.
export async function onRequestPost({ request, env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const p = await request.json().catch(() => ({}));
  const atual = await usuarioAtual(env);
  if (!(await masterConfere(env, { user: atual.usuario, pass: String(p.senhaAtual || '') }))) return jsonResponse({ erro: 'A senha atual não confere.' }, 400);

  const novoUsuario = String(p.novoUsuario || '').trim();
  const novaSenha = String(p.novaSenha || '');
  if (novoUsuario.length < 3 || novoUsuario.length > 40) return jsonResponse({ erro: 'O usuário precisa ter de 3 a 40 caracteres.' }, 400);
  if (novoUsuario.includes(':')) return jsonResponse({ erro: 'O usuário não pode ter o sinal ":".' }, 400);
  if (novaSenha.length < 8) return jsonResponse({ erro: 'A nova senha precisa ter ao menos 8 caracteres.' }, 400);
  if (novaSenha.length > 100) return jsonResponse({ erro: 'A nova senha pode ter no máximo 100 caracteres.' }, 400);
  if (novaSenha === novoUsuario) return jsonResponse({ erro: 'A senha não pode ser igual ao usuário.' }, 400);

  const salt = novoSalt();
  const hash = await hashSenha(novaSenha, salt);
  await env.DB
    .prepare("INSERT INTO admin_master (id, usuario, senha_salt, senha_hash, atualizado_em) VALUES (1, ?, ?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET usuario = excluded.usuario, senha_salt = excluded.senha_salt, senha_hash = excluded.senha_hash, atualizado_em = excluded.atualizado_em")
    .bind(novoUsuario, salt, hash)
    .run();
  return jsonResponse({ ok: true, usuario: novoUsuario });
}
