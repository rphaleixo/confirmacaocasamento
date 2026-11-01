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

// ---- convite de acesso do anfitrião: link de uso único (guardamos só o hash) ----
const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n))).map((b) => b.toString(16).padStart(2, '0')).join('');
async function hashDe(prefixo, valor) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prefixo + ':' + valor));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function criarConviteAcesso(db, eventoId, dias = 7) {
  const token = hex(24); // 48 caracteres
  await db.prepare("DELETE FROM convites_acesso WHERE expira_em < datetime('now', '-30 day')").run();
  await db.prepare("INSERT INTO convites_acesso (token_hash, evento_id, criado_em, expira_em) VALUES (?, ?, datetime('now'), datetime('now', ?))")
    .bind(await hashDe('convite', token), eventoId, '+' + dias + ' day').run();
  return token;
}
// devolve { eventoId, slug, nome, tipo } ou null (inexistente, usado ou vencido)
export async function buscarConviteAcesso(db, token) {
  if (!/^[a-f0-9]{48}$/i.test(String(token || ''))) return null;
  return db.prepare("SELECT c.evento_id AS eventoId, e.slug, e.nome, e.tipo FROM convites_acesso c JOIN eventos e ON e.id = c.evento_id WHERE c.token_hash = ? AND c.usado_em IS NULL AND c.expira_em > datetime('now')")
    .bind(await hashDe('convite', String(token).toLowerCase())).first();
}
export async function usarConviteAcesso(db, token) {
  await db.prepare("UPDATE convites_acesso SET usado_em = datetime('now') WHERE token_hash = ?").bind(await hashDe('convite', String(token).toLowerCase())).run();
}

// ---- código de troca (vale 2 minutos, uma vez): leva o login feito em vemnafesta.com para o subdomínio do evento ----
export async function criarCodigoTroca(db, { tipo, eventoId, email }) {
  const codigo = hex(32);
  await db.prepare("DELETE FROM codigos_troca WHERE expira_em < datetime('now')").run();
  await db.prepare("INSERT INTO codigos_troca (codigo_hash, tipo, evento_id, email, expira_em) VALUES (?, ?, ?, ?, datetime('now', '+2 minute'))")
    .bind(await hashDe('troca', codigo), tipo, eventoId || null, email || null).run();
  return codigo;
}
export async function consumirCodigoTroca(db, codigo) {
  if (!/^[a-f0-9]{64}$/i.test(String(codigo || ''))) return null;
  const h = await hashDe('troca', String(codigo).toLowerCase());
  const linha = await db.prepare("SELECT tipo, evento_id AS eventoId, email FROM codigos_troca WHERE codigo_hash = ? AND expira_em > datetime('now')").bind(h).first();
  await db.prepare('DELETE FROM codigos_troca WHERE codigo_hash = ?').bind(h).run();
  return linha || null;
}
