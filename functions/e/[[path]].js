// Cada evento vive em /e/<slug> (site), /e/<slug>/presentes (lista de presentes) e /e/<slug>/admin (painel do anfitrião).
// O HTML é o mesmo pra todos — a página lê o slug da URL e usa só os dados daquele evento.
// Se o slug não existir, 404. Cada abertura do site conta uma visita (agregada por dia).
export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const partes = url.pathname.split('/').filter(Boolean); // ['e', slug, 'admin'?]
  const slug = (partes[1] || '').toLowerCase();
  const evento = slug ? await env.DB.prepare('SELECT id FROM eventos WHERE slug = ?').bind(slug).first() : null;
  if (!evento) return new Response('Evento não encontrado.', { status: 404 });

  if (partes[2] !== 'admin' && partes[2] !== 'presentes' && url.searchParams.get('previa') !== '1') { // a prévia do painel não conta como visita
    waitUntil(
      env.DB
        .prepare("INSERT INTO acessos (evento_id, dia, visitas) VALUES (?, date('now'), 1) ON CONFLICT(evento_id, dia) DO UPDATE SET visitas = visitas + 1")
        .bind(evento.id)
        .run()
        .catch(() => {})
    );
  }

  const destino = partes[2] === 'admin' ? '/admin/' : partes[2] === 'presentes' ? '/presentes/' : '/';
  return env.ASSETS.fetch(new URL(destino, url));
}
