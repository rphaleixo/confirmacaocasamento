import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

// body: { "chave1": "valor1", "chave2": "valor2", ... } — upsert em lote
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') return jsonResponse({ erro: 'Dados inválidos.' }, 400);

  const entradas = Object.entries(payload);
  if (entradas.length === 0) return jsonResponse({ ok: true, atualizados: 0 });

  const stmt = env.DB.prepare(
    'INSERT INTO conteudo (evento_id, chave, valor) VALUES (?, ?, ?) ON CONFLICT(evento_id, chave) DO UPDATE SET valor = excluded.valor'
  );
  await env.DB.batch(entradas.map(([chave, valor]) => stmt.bind(evento.id, chave, String(valor))));

  return jsonResponse({ ok: true, atualizados: entradas.length });
}
