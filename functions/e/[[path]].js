import { dadosDeCompartilhamento, tagsDeCompartilhamento } from '../_compartilhar.js';
import { paginaEmBreve } from '../_embreve.js';

// Cada evento vive em /e/<slug> (site), /e/<slug>/presentes (lista de presentes) e /e/<slug>/admin (painel do anfitrião).
// O HTML é o mesmo pra todos — a página lê o slug da URL e usa só os dados daquele evento.
// Se o slug não existir, 404. Cada abertura do site conta uma visita (agregada por dia).
export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const partes = url.pathname.split('/').filter(Boolean); // ['e', slug, 'admin'?]
  const slug = (partes[1] || '').toLowerCase();
  const evento = slug ? await env.DB.prepare('SELECT id, slug, nome, tipo, publicado, token_rascunho FROM eventos WHERE slug = ?').bind(slug).first() : null;
  if (!evento) return new Response('Evento não encontrado.', { status: 404 });

  // Convite ainda em preparação: o convidado vê "Em breve". O anfitrião vê o site real pelo link com o token do rascunho
  // (o painel monta esse link sozinho). O painel de administração não é afetado.
  if (partes[2] !== 'admin' && evento.publicado === 0) {
    const token = url.searchParams.get('rascunho') || '';
    if (!evento.token_rascunho || token !== evento.token_rascunho) {
      return new Response(await paginaEmBreve(env.DB, evento), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
    }
  }

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
  const pagina = await env.ASSETS.fetch(new URL(destino, url));
  if (partes[2]) return pagina;

  // Site do convite: injeta título, descrição e imagem de compartilhamento (miniatura do WhatsApp) já no HTML,
  // porque quem gera a prévia do link não executa JavaScript. Se algo falhar, a página segue sem as tags.
  try {
    const d = await dadosDeCompartilhamento(env.DB, evento, url.origin);
    const tags = tagsDeCompartilhamento(d);
    const saida = new HTMLRewriter()
      .on('head', { element(el) { el.prepend(tags, { html: true }); } })
      .on('title', { element(el) { el.setInnerContent(d.titulo); } })
      .transform(pagina);
    const cab = new Headers(saida.headers);
    cab.delete('etag'); cab.set('cache-control', 'no-cache');
    return new Response(saida.body, { status: saida.status, headers: cab });
  } catch (e) {
    return pagina;
  }
}
