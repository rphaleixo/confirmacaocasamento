// Cada evento vive em /e/<slug>. O HTML é o mesmo pra todos — o index.html lê o slug da URL
// e busca o conteúdo daquele evento em /api/conteudo?e=<slug>. Se o slug não existir, 404.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const slug = url.pathname.split('/')[2] || '';
  const evento = slug ? await env.DB.prepare('SELECT 1 FROM eventos WHERE slug = ?').bind(slug.toLowerCase()).first() : null;
  if (!evento) return new Response('Evento não encontrado.', { status: 404 });
  return env.ASSETS.fetch(new URL('/', url));
}
