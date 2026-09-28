// Gestão transversal da plataforma — SÓ o admin master. O anfitrião (login do evento) recebe 403.
import { jsonResponse, hashSenha, novoSalt } from '../../_lib.js';
import { TIPOS, tipoDe, padroesIniciais } from '../../_tipos.js';

const SOMENTE_MASTER = () => jsonResponse({ erro: 'Só o administrador master gerencia eventos.' }, 403);

function slugify(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// GET — lista todos os eventos com dados de uso
export async function onRequestGet({ env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const { results } = await env.DB
    .prepare(
      `SELECT e.id, e.slug, e.nome, e.tipo, e.criado_em AS criadoEm, e.admin_usuario AS anfitriaoUsuario,
              (SELECT COUNT(*) FROM grupos g WHERE g.evento_id = e.id) AS grupos,
              (SELECT COUNT(*) FROM grupos g WHERE g.evento_id = e.id AND g.status_abertura = 'Aberto') AS gruposAbertos,
              (SELECT COUNT(*) FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE g.evento_id = e.id) AS convidados,
              (SELECT COUNT(*) FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE g.evento_id = e.id AND c.confirmado = 1) AS confirmados,
              (SELECT COUNT(*) FROM recados r WHERE r.evento_id = e.id AND r.aprovado = 0) AS recadosPendentes,
              (SELECT COALESCE(SUM(visitas), 0) FROM acessos a WHERE a.evento_id = e.id) AS visitas,
              (SELECT COALESCE(SUM(visitas), 0) FROM acessos a WHERE a.evento_id = e.id AND a.dia >= date('now', '-7 day')) AS visitas7d,
              (SELECT MAX(g.data_confirmacao) FROM grupos g WHERE g.evento_id = e.id) AS ultimaConfirmacao
       FROM eventos e ORDER BY e.id`
    )
    .all();
  return jsonResponse(results.map((r) => ({ ...r, tipoNome: TIPOS[tipoDe(r.tipo)].nome })));
}

// POST body: { nome, slug?, tipo?, copiarDe?, anfitriaoUsuario?, anfitriaoSenha? }
// Cria um evento novo em /e/<slug>. O login do anfitrião é opcional na criação (pode ser definido depois).
// copiarDe = slug de outro evento cujas configurações/conteúdo serão copiados como ponto de partida
// (convidados, grupos e recados nunca são copiados).
export async function onRequestPost({ request, env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const payload = await request.json().catch(() => ({}));
  const nome = (payload.nome || '').trim();
  if (!nome) return jsonResponse({ erro: 'Dê um nome ao evento.' }, 400);
  const slug = slugify(payload.slug || nome);
  if (!slug) return jsonResponse({ erro: 'Endereço inválido: use letras e números.' }, 400);

  const db = env.DB;
  const existente = await db.prepare('SELECT 1 FROM eventos WHERE slug = ?').bind(slug).first();
  if (existente) return jsonResponse({ erro: 'Já existe um evento com esse endereço.' }, 400);

  const tipo = tipoDe(payload.tipo);
  const usuario = (payload.anfitriaoUsuario || '').trim();
  const senha = String(payload.anfitriaoSenha || '');
  if ((usuario && senha.length < 6) || (!usuario && senha)) {
    return jsonResponse({ erro: 'Informe usuário e uma senha de pelo menos 6 caracteres.' }, 400);
  }
  const salt = usuario ? novoSalt() : null;
  const hash = usuario ? await hashSenha(senha, salt) : null;

  const res = await db
    .prepare('INSERT INTO eventos (slug, nome, tipo, criado_em, admin_usuario, admin_senha_salt, admin_senha_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(slug, nome, tipo, new Date().toISOString(), usuario || null, salt, hash)
    .run();
  const id = res.meta.last_row_id;

  // textos e configurações iniciais do tipo escolhido
  const padroes = Object.entries(padroesIniciais(tipo));
  if (padroes.length) {
    const ins = db.prepare('INSERT INTO conteudo (evento_id, chave, valor) VALUES (?, ?, ?) ON CONFLICT(evento_id, chave) DO UPDATE SET valor = excluded.valor');
    await db.batch(padroes.map(([chave, valor]) => ins.bind(id, chave, valor)));
  }

  // copiarDe só vale entre eventos do MESMO tipo (senão traria campos que o tipo não usa)
  const origemSlug = (payload.copiarDe || '').trim().toLowerCase();
  if (origemSlug) {
    const origem = await db.prepare('SELECT id, tipo FROM eventos WHERE slug = ?').bind(origemSlug).first();
    if (origem && tipoDe(origem.tipo) === tipo) {
      await db
        .prepare(
          `INSERT INTO conteudo (evento_id, chave, valor) SELECT ?, chave, valor FROM conteudo WHERE evento_id = ?
           ON CONFLICT(evento_id, chave) DO UPDATE SET valor = excluded.valor`
        )
        .bind(id, origem.id)
        .run();
    }
  }

  return jsonResponse({ id, slug, nome, tipo });
}

// PUT body: { slug, anfitriaoUsuario, anfitriaoSenha } — define/troca o login do anfitrião do evento
export async function onRequestPut({ request, env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const payload = await request.json().catch(() => ({}));
  const slug = (payload.slug || '').trim().toLowerCase();
  const usuario = (payload.anfitriaoUsuario || '').trim();
  const senha = String(payload.anfitriaoSenha || '');
  if (!slug || !usuario || senha.length < 6) {
    return jsonResponse({ erro: 'Informe usuário e uma senha de pelo menos 6 caracteres.' }, 400);
  }
  const salt = novoSalt();
  const res = await env.DB
    .prepare('UPDATE eventos SET admin_usuario = ?, admin_senha_salt = ?, admin_senha_hash = ? WHERE slug = ?')
    .bind(usuario, salt, await hashSenha(senha, salt), slug)
    .run();
  if (!res.meta.changes) return jsonResponse({ erro: 'Evento não encontrado.' }, 404);
  return jsonResponse({ ok: true });
}

// PATCH body: { slug, novoNome?, novoSlug?, novoTipo? } — renomeia o evento, troca o endereço (/e/<slug>) e/ou o tipo.
// Os links antigos do endereço anterior deixam de funcionar.
export async function onRequestPatch({ request, env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const payload = await request.json().catch(() => ({}));
  const slug = (payload.slug || '').trim().toLowerCase();
  const db = env.DB;
  const evento = await db.prepare('SELECT id, nome, tipo FROM eventos WHERE slug = ?').bind(slug).first();
  if (!evento) return jsonResponse({ erro: 'Evento não encontrado.' }, 404);

  const novoNome = (payload.novoNome || '').trim() || evento.nome;
  const novoSlug = payload.novoSlug ? slugify(payload.novoSlug) : slug;
  if (!novoSlug) return jsonResponse({ erro: 'Endereço inválido: use letras e números.' }, 400);
  if (novoSlug !== slug) {
    const existente = await db.prepare('SELECT 1 FROM eventos WHERE slug = ?').bind(novoSlug).first();
    if (existente) return jsonResponse({ erro: 'Já existe um evento com esse endereço.' }, 400);
  }

  const novoTipo = payload.novoTipo ? tipoDe(payload.novoTipo) : evento.tipo;
  await db.prepare('UPDATE eventos SET nome = ?, slug = ?, tipo = ? WHERE id = ?').bind(novoNome, novoSlug, novoTipo, evento.id).run();
  return jsonResponse({ ok: true, slug: novoSlug, nome: novoNome, tipo: novoTipo });
}

// DELETE body: { slug } — remove o login do anfitrião (o evento passa a ser acessível só pelo master)
export async function onRequestDelete({ request, env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const payload = await request.json().catch(() => ({}));
  const slug = (payload.slug || '').trim().toLowerCase();
  const res = await env.DB
    .prepare('UPDATE eventos SET admin_usuario = NULL, admin_senha_salt = NULL, admin_senha_hash = NULL WHERE slug = ?')
    .bind(slug)
    .run();
  if (!res.meta.changes) return jsonResponse({ erro: 'Evento não encontrado.' }, 404);
  return jsonResponse({ ok: true });
}
