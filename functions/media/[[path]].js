// Serve arquivos do bucket R2 — GET /media/<chave>
// Suporta "Range" (trechos do arquivo): sem isso o Safari/iPhone não reproduz vídeo e nenhum navegador consegue avançar.
export async function onRequestGet({ request, params, env }) {
  const chave = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const pedidoRange = request.headers.get('range');
  const objeto = await env.MEDIA.get(chave, pedidoRange ? { range: request.headers } : undefined);
  if (!objeto) return new Response('Não encontrado.', { status: 404 });

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('etag', objeto.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  if (pedidoRange && objeto.range) {
    const total = objeto.size;
    const r = objeto.range;
    const inicio = r.offset !== undefined ? r.offset : (r.suffix !== undefined ? Math.max(0, total - r.suffix) : 0);
    const tamanho = r.length !== undefined ? r.length : (r.suffix !== undefined ? Math.min(r.suffix, total) : total - inicio);
    headers.set('content-range', `bytes ${inicio}-${inicio + tamanho - 1}/${total}`);
    headers.set('content-length', String(tamanho));
    return new Response(objeto.body, { status: 206, headers });
  }

  headers.set('content-length', String(objeto.size));
  return new Response(objeto.body, { headers });
}
