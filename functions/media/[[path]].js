// Serve arquivos do bucket R2 — GET /media/<chave>
export async function onRequestGet({ params, env }) {
  const chave = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const objeto = await env.MEDIA.get(chave);
  if (!objeto) return new Response('Não encontrado.', { status: 404 });

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set('etag', objeto.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(objeto.body, { headers });
}
