// Sessões do painel por "Entrar com Google": o navegador guarda um código aleatório; aqui fica só o hash dele.
const DIAS = 30;
async function hash(token) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sessao:' + token));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function criarSessao(db, { tipo, eventoId, email }) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('');
  await db.prepare("DELETE FROM sessoes WHERE expira_em < datetime('now')").run();
  await db.prepare("INSERT INTO sessoes (token_hash, tipo, evento_id, email, criado_em, expira_em) VALUES (?, ?, ?, ?, datetime('now'), datetime('now', ?))")
    .bind(await hash(token), tipo, eventoId || null, email, '+' + DIAS + ' day').run();
  return token;
}
export async function buscarSessao(db, token) {
  return db.prepare("SELECT tipo, evento_id AS eventoId, email FROM sessoes WHERE token_hash = ? AND expira_em > datetime('now')").bind(await hash(token)).first();
}
export async function encerrarSessao(db, token) {
  await db.prepare('DELETE FROM sessoes WHERE token_hash = ?').bind(await hash(token)).run();
}

// e-mails com acesso: evento_id 0 = administrador geral; outro número = anfitriões daquele evento
export const emailValido = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(String(e || '').trim());
export function emailsDoEnv(env) { return String(env.ADMIN_EMAILS || '').split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean); }
export async function ehMasterGoogle(env, email) {
  if (emailsDoEnv(env).includes(email)) return true;
  return !!(await env.DB.prepare('SELECT 1 AS ok FROM admin_google WHERE email = ? AND evento_id = 0').bind(email).first());
}
