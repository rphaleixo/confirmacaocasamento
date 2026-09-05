import { jsonResponse } from '../../_lib.js';

// POST /api/admin/upload?nome=arquivo.jpg — corpo = bytes do arquivo (fetch(url, {body: file}))
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const nomeOriginal = url.searchParams.get('nome') || 'arquivo';
  const extensao = (nomeOriginal.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const contentType = request.headers.get('content-type') || 'application/octet-stream';

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return jsonResponse({ erro: 'Arquivo vazio.' }, 400);
  if (bytes.byteLength > 8 * 1024 * 1024) return jsonResponse({ erro: 'Arquivo maior que 8MB.' }, 400);

  const chave = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;
  await env.MEDIA.put(chave, bytes, { httpMetadata: { contentType } });

  return jsonResponse({ url: `/media/${chave}` });
}
