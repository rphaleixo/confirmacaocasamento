// Helpers compartilhados pelas rotas de /functions/api. Prefixo "_" faz a Cloudflare Pages
// ignorar este arquivo como rota — só é importado pelos outros.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0 e I/1, pra evitar confusão

export function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function checkBasicAuth(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded;
  try {
    decoded = atob(header.slice(6));
  } catch (e) {
    return false;
  }
  const idx = decoded.indexOf(':');
  if (idx === -1) return false;
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  return user === env.ADMIN_USER && pass === env.ADMIN_PASSWORD;
}

function lerBasicAuth(request) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return null;
  let decoded;
  try { decoded = atob(header.slice(6)); } catch (e) { return null; }
  const idx = decoded.indexOf(':');
  if (idx === -1) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

export async function hashSenha(senha, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + senha));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function novoSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Quem é o solicitante do admin? 'master' (secrets ADMIN_USER/ADMIN_PASSWORD: gerencia todos os
// eventos) ou 'evento' (login próprio do evento: só enxerga e altera o evento do parâmetro ?e=).
export async function identificarAdmin(request, env) {
  const cred = lerBasicAuth(request);
  if (!cred) return null;
  if (checkBasicAuth(request, env)) return { tipo: 'master' };
  const slug = (new URL(request.url).searchParams.get('e') || '').trim().toLowerCase();
  if (!slug) return null;
  const ev = await env.DB.prepare('SELECT id, admin_usuario, admin_senha_salt, admin_senha_hash FROM eventos WHERE slug = ?').bind(slug).first();
  if (!ev || !ev.admin_usuario || !ev.admin_senha_hash) return null;
  if (cred.user !== ev.admin_usuario) return null;
  if ((await hashSenha(cred.pass, ev.admin_senha_salt)) !== ev.admin_senha_hash) return null;
  return { tipo: 'evento', eventoId: ev.id };
}

export async function gerarCodigoUnico(db) {
  let codigo;
  let existe = true;
  while (existe) {
    codigo = '';
    for (let i = 0; i < 6; i++) codigo += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    const row = await db.prepare('SELECT 1 FROM grupos WHERE codigo = ?').bind(codigo).first();
    existe = !!row;
  }
  return codigo;
}

export async function recalcularStatusGrupo(db, codigo) {
  const { results } = await db
    .prepare('SELECT confirmado FROM convidados WHERE codigo_grupo = ?')
    .bind(codigo)
    .all();
  const total = results.length;
  const confirmados = results.filter((r) => r.confirmado === 1).length;
  const grupo = await db.prepare('SELECT status_abertura FROM grupos WHERE codigo = ?').bind(codigo).first();

  let status;
  if (total === 0) status = 'Pendente';
  else if (confirmados === 0) status = grupo && grupo.status_abertura === 'Aberto' ? 'Aguardando resposta' : 'Pendente';
  else if (confirmados === total) status = 'Confirmado';
  else status = `Parcial (${confirmados}/${total})`;

  await db.prepare('UPDATE grupos SET status_confirmacao = ? WHERE codigo = ?').bind(status, codigo).run();
  return status;
}

// Descobre o evento da requisição pelo parâmetro ?e=<slug>. Sem parâmetro, usa o primeiro
// evento cadastrado — mantém funcionando os links antigos (/?c=CODIGO) do casamento original.
export async function resolverEvento(db, request) {
  const slug = (new URL(request.url).searchParams.get('e') || '').trim().toLowerCase();
  if (slug) return db.prepare('SELECT id, slug, nome, tipo FROM eventos WHERE slug = ?').bind(slug).first();
  return db.prepare('SELECT id, slug, nome, tipo FROM eventos ORDER BY id LIMIT 1').first();
}

export function eventoNaoEncontrado() {
  return jsonResponse({ erro: 'Evento não encontrado.' }, 404);
}
