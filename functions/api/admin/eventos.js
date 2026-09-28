import { jsonResponse } from '../../_lib.js';

// GET — lista os eventos cadastrados
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT id, slug, nome FROM eventos ORDER BY id').all();
  return jsonResponse(results);
}

function slugify(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// body: { nome, slug?, copiarDe? } — cria um evento novo (endereço /e/<slug>).
// copiarDe = slug de outro evento cujas configurações/conteúdo serão copiados como ponto de partida
// (convidados, grupos e recados nunca são copiados).
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const nome = (payload.nome || '').trim();
  if (!nome) return jsonResponse({ erro: 'Dê um nome ao evento.' }, 400);
  const slug = slugify(payload.slug || nome);
  if (!slug) return jsonResponse({ erro: 'Endereço inválido: use letras e números.' }, 400);

  const db = env.DB;
  const existente = await db.prepare('SELECT 1 FROM eventos WHERE slug = ?').bind(slug).first();
  if (existente) return jsonResponse({ erro: 'Já existe um evento com esse endereço.' }, 400);

  const res = await db
    .prepare('INSERT INTO eventos (slug, nome, criado_em) VALUES (?, ?, ?)')
    .bind(slug, nome, new Date().toISOString())
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
