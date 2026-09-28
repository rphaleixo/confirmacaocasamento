// Cada evento vive em /e/<slug> (site) e /e/<slug>/admin (painel próprio do evento).
// O HTML é o mesmo pra todos — a página lê o slug da URL e usa só os dados daquele evento.
// Se o slug não existir, 404.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const partes = url.pathname.split('/').filter(Boolean); // ['e', slug, 'admin'?]
  const slug = (partes[1] || '').toLowerCase();
  const evento = slug ? await env.DB.prepare('SELECT 1 FROM eventos WHERE slug = ?').bind(slug).first() : null;
  if (!evento) return new Response('Evento não encontrado.', { status: 404 });
  const destino = partes[2] === 'admin' ? '/admin/' : '/';
  return env.ASSETS.fetch(new URL(destino, url));
}
