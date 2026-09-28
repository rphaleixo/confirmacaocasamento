import { jsonResponse, hashSenha, novoSalt } from '../../_lib.js';

const SOMENTE_MASTER = () => jsonResponse({ erro: 'Só o administrador geral gerencia eventos.' }, 403);

// GET — lista os eventos cadastrados
export async function onRequestGet({ env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const { results } = await env.DB.prepare('SELECT id, slug, nome, admin_usuario AS adminUsuario FROM eventos ORDER BY id').all();
  return jsonResponse(results);
}

function slugify(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// body: { nome, slug?, copiarDe?, adminUsuario?, adminSenha? } — login próprio do evento (opcional; sem ele só o admin geral acessa)
//  — cria um evento novo (endereço /e/<slug>).
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

  const adminUsuario = (payload.adminUsuario || '').trim();
  const adminSenha = String(payload.adminSenha || '');
  if ((adminUsuario && adminSenha.length < 6) || (!adminUsuario && adminSenha)) {
    return jsonResponse({ erro: 'Informe usuário e uma senha de pelo menos 6 caracteres.' }, 400);
  }
  const salt = adminUsuario ? novoSalt() : null;
  const hash = adminUsuario ? await hashSenha(adminSenha, salt) : null;

  const res = await db
    .prepare('INSERT INTO eventos (slug, nome, criado_em, admin_usuario, admin_senha_salt, admin_senha_hash) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(slug, nome, new Date().toISOString(), adminUsuario || null, salt, hash)
    .run();
  const id = res.meta.last_row_id;

  const origemSlug = (payload.copiarDe || '').trim().toLowerCase();
  if (origemSlug) {
    const origem = await db.prepare('SELECT id FROM eventos WHERE slug = ?').bind(origemSlug).first();
    if (origem) {
      // não copia estado de presentes já escolhidos; o resto do conteúdo/configuração vai igual
      await db
        .prepare('INSERT INTO conteudo (evento_id, chave, valor) SELECT ?, chave, valor FROM conteudo WHERE evento_id = ?')
        .bind(id, origem.id)
        .run();
    }
  }

  return jsonResponse({ id, slug, nome });
}

// PUT body: { slug, adminUsuario, adminSenha } — define/troca o login do evento (só admin geral)
export async function onRequestPut({ request, env, data }) {
  if (data.admin.tipo !== 'master') return SOMENTE_MASTER();
  const payload = await request.json().catch(() => ({}));
  const slug = (payload.slug || '').trim().toLowerCase();
  const adminUsuario = (payload.adminUsuario || '').trim();
  const adminSenha = String(payload.adminSenha || '');
  if (!slug || !adminUsuario || adminSenha.length < 6) {
    return jsonResponse({ erro: 'Informe usuário e uma senha de pelo menos 6 caracteres.' }, 400);
  }
  const salt = novoSalt();
  const res = await env.DB
    .prepare('UPDATE eventos SET admin_usuario = ?, admin_senha_salt = ?, admin_senha_hash = ? WHERE slug = ?')
    .bind(adminUsuario, salt, await hashSenha(adminSenha, salt), slug)
    .run();
  if (!res.meta.changes) return jsonResponse({ erro: 'Evento não encontrado.' }, 404);
  return jsonResponse({ ok: true });
}
