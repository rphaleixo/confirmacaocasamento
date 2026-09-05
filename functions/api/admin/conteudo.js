import { jsonResponse } from '../../_lib.js';

// body: { "chave1": "valor1", "chave2": "valor2", ... } — upsert em lote
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') return jsonResponse({ erro: 'Dados inválidos.' }, 400);

  const entradas = Object.entries(payload);
  if (entradas.length === 0) return jsonResponse({ ok: true, atualizados: 0 });

  const stmt = env.DB.prepare(
    'INSERT INTO conteudo (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor'
  );
  await env.DB.batch(entradas.map(([chave, valor]) => stmt.bind(chave, String(valor))));

  return jsonResponse({ ok: true, atualizados: entradas.length });
}
