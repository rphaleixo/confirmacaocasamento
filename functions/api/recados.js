// Mural de recados — público. GET só devolve os aprovados; POST grava pendente de moderação.
import { jsonResponse } from '../_lib.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT id, nome, mensagem FROM recados WHERE aprovado = 1 ORDER BY id DESC LIMIT 100')
    .all();
  return jsonResponse(results);
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const nome = (payload.nome || '').trim();
  const mensagem = (payload.mensagem || '').trim();
  if (!nome || !mensagem) return jsonResponse({ erro: 'Preencha nome e mensagem.' }, 400);
  if (nome.length > 100 || mensagem.length > 1000) return jsonResponse({ erro: 'Texto muito longo.' }, 400);

  await env.DB
    .prepare('INSERT INTO recados (nome, mensagem, aprovado, criado_em) VALUES (?, ?, 0, ?)')
    .bind(nome, mensagem, new Date().toISOString())
    .run();

  return jsonResponse({ ok: true });
}
