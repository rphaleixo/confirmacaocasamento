// Metadados de compartilhamento do site (o que o WhatsApp, o Instagram, o iMessage… mostram ao receber o link):
// título, descrição e imagem de miniatura. Esses aplicativos não executam JavaScript, então a tag <meta> precisa
// já vir no HTML — a rota /e/<slug> injeta estas tags antes de entregar a página.
const CHAVES = ['hero.noiva', 'hero.noivo', 'hero.data_display', 'compartilhar.msg_titulo', 'compartilhar.msg_descricao', 'compartilhar.imagem_url', 'compartilhar.imagem_propria', 'compartilhar.data_texto'];
export const IMAGEM_PADRAO = '/og-padrao.jpg';

// todo caractere fora do ASCII vira entidade numérica: as tags ficam corretas seja qual for a codificação da página
export function escapar(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/[^\x00-\x7f]/gu, (c) => '&#' + c.codePointAt(0) + ';');
}

const limpo = (v) => String(v == null ? '' : v).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function urlAbsoluta(valor, origem) {
  const v = String(valor || '').trim();
  if (!v) return '';
  if (v.startsWith('/') && !v.startsWith('//')) return origem + v;
  return /^https:\/\//i.test(v) ? v : '';
}

export async function dadosDeCompartilhamento(db, evento, origem) {
  const marcas = CHAVES.map(() => '?').join(',');
  const { results } = await db.prepare(`SELECT chave, valor FROM conteudo WHERE evento_id = ? AND chave IN (${marcas})`).bind(evento.id, ...CHAVES).all();
  const c = {};
  results.forEach((r) => { c[r.chave] = r.valor; });

  const aniversario = evento.tipo === 'aniversario';
  const noiva = limpo(c['hero.noiva']), noivo = limpo(c['hero.noivo']);
  const nomes = aniversario ? noiva : (noiva && noivo ? noiva + ' & ' + noivo : noiva || noivo);
  const tituloPadrao = nomes ? (aniversario ? 'Aniversário de ' + nomes : 'Casamento de ' + nomes) : limpo(evento.nome) || 'Convite';
  const titulo = limpo(c['compartilhar.msg_titulo']) || tituloPadrao;
  const data = limpo(c['compartilhar.data_texto']) || limpo(c['hero.data_display']);
  const descricao = limpo(c['compartilhar.msg_descricao']) || ((data ? data + ' · ' : '') + 'Abra o convite e confirme sua presença');

  const propria = urlAbsoluta(c['compartilhar.imagem_propria'], origem);
  const gerada = urlAbsoluta(c['compartilhar.imagem_url'], origem);
  const imagem = propria || gerada || origem + IMAGEM_PADRAO;
  return { titulo, descricao, imagem, tamanhoConhecido: !propria, nomeSite: limpo(evento.nome) || titulo, alt: 'Convite: ' + (nomes || titulo) };
}

export function tagsDeCompartilhamento(d) {
  const e = escapar;
  const linhas = [
    `<meta name="description" content="${e(d.descricao)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="pt_BR">',
    `<meta property="og:site_name" content="${e(d.nomeSite)}">`,
    `<meta property="og:title" content="${e(d.titulo)}">`,
    `<meta property="og:description" content="${e(d.descricao)}">`,
    `<meta property="og:image" content="${e(d.imagem)}">`,
    `<meta property="og:image:secure_url" content="${e(d.imagem)}">`,
    `<meta property="og:image:alt" content="${e(d.alt)}">`,
  ];
  if (d.tamanhoConhecido) linhas.push('<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">');
  linhas.push('<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${e(d.titulo)}">`, `<meta name="twitter:description" content="${e(d.descricao)}">`, `<meta name="twitter:image" content="${e(d.imagem)}">`);
  return linhas.join('\n');
}
