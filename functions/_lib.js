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

export function lerBasicAuth(request) {
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

// Quem é o solicitante do admin? 'master' (login do administrador geral: gerencia todos os
// eventos) ou 'evento' (login próprio do evento: só enxerga e altera o evento do parâmetro ?e=).
// Login do administrador master: se ele já foi trocado pelo painel (tabela admin_master), vale o do painel e os secrets
// ADMIN_USER/ADMIN_PASSWORD deixam de servir; enquanto não foi trocado, valem os secrets.
export async function masterConfere(env, cred) {
  if (!cred) return false;
  try {
    const row = await env.DB.prepare('SELECT usuario, senha_salt, senha_hash FROM admin_master WHERE id = 1').first();
    if (row) return cred.user === row.usuario && (await hashSenha(cred.pass, row.senha_salt)) === row.senha_hash;
  } catch (e) { /* tabela ainda não existe: vale o acesso dos secrets */ }
  return cred.user === env.ADMIN_USER && cred.pass === env.ADMIN_PASSWORD;
}

export async function identificarAdmin(request, env) {
  const cred = lerBasicAuth(request);
  if (!cred) return null;
  if (await masterConfere(env, cred)) return { tipo: 'master' };
  const slug = (new URL(request.url).searchParams.get('e') || '').trim().toLowerCase();
  if (!slug) return null;
  const ev = await env.DB.prepare('SELECT id, admin_usuario, admin_senha_salt, admin_senha_hash FROM eventos WHERE slug = ?').bind(slug).first();
  if (!ev || !ev.admin_usuario || !ev.admin_senha_hash) return null;
  if (cred.user !== ev.admin_usuario) return null;
  if ((await hashSenha(cred.pass, ev.admin_senha_salt)) !== ev.admin_senha_hash) return null;
  return { tipo: 'evento', eventoId: ev.id };
}

// Código de link (do grupo ou individual): nunca repete entre grupos e convidados
async function codigoLivre(db) {
  let codigo;
  let existe = true;
  while (existe) {
    codigo = '';
    for (let i = 0; i < 6; i++) codigo += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    const g = await db.prepare('SELECT 1 FROM grupos WHERE codigo = ?').bind(codigo).first();
    const c = g ? null : await db.prepare('SELECT 1 FROM convidados WHERE codigo_individual = ?').bind(codigo).first();
    existe = !!(g || c);
  }
  return codigo;
}
export async function gerarCodigoUnico(db) { return codigoLivre(db); }
export async function gerarCodigoIndividual(db) { return codigoLivre(db); }

// Como a pessoa é chamada nas comunicações: [tratamento] + (como chamar || primeiro nome)
export function nomeParaChamar(c) {
  const primeiro = String(c.nome || '').trim().split(/\s+/)[0] || '';
  const base = String(c.como_chamar || c.comoChamar || '').trim() || primeiro;
  const trat = String(c.tratamento || '').trim();
  return (trat ? trat + ' ' : '') + base;
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

// Texto formatado dos campos de exibição: só algumas tags passam (mesma lista do site). É uma segunda barreira; o site também limpa ao exibir.
const CHAVE_RICA = /(^|\.)(eyebrow|titulo|texto|sucesso_texto|sem_codigo_texto|infos_titulo|externa_titulo|externa_texto|lista_opcao_titulo|lista_opcao_texto|pix_titulo|pix_texto|lista_texto)$|^timeline\.node\d+\.(ano|titulo|texto)$/;
const TAGS_OK = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'br', 'a', 'span', 'small', 'mark', 'sub', 'sup', 'font', 'div', 'p']);
export function ehChaveRica(chave) { return CHAVE_RICA.test(String(chave || '')); }
export function limparHtml(valor) {
  return String(valor == null ? '' : valor)
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (m, tag, attrs) => {
      tag = tag.toLowerCase();
      if (!TAGS_OK.has(tag)) return '';
      if (m.startsWith('</')) return '</' + tag + '>';
      let out = '<' + tag;
      if (tag === 'a') {
        const h = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
        const href = h ? (h[1] !== undefined ? h[1] : h[2]) : '';
        if (/^\s*(https?:|mailto:|tel:|\/|#)/i.test(href)) out += ' href="' + href.replace(/"/g, '&quot;') + '"';
      } else if (tag === 'span') {
        const st = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
        const cor = st ? /color\s*:\s*(#[0-9a-f]{3,8}|rgba?\([\d\s,.]*\))/i.exec(st[1] !== undefined ? st[1] : st[2]) : null;
        if (cor) out += ' style="color: ' + cor[1] + '"';
      } else if (tag === 'font') {
        const c = /color\s*=\s*"?(#[0-9a-f]{3,8})/i.exec(attrs);
        if (c) out += ' color="' + c[1] + '"';
      }
      return out + '>';
    });
}
