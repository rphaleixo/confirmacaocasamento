// Resolve links curtos do Google Maps (maps.app.goo.gl, goo.gl/maps) para o endereço completo, seguindo os
// redirecionamentos só entre domínios do Google. Não usa chave de API.
//   GET ?url=<link colado no painel>  ->  { url: <link final> }
import { jsonResponse } from '../../_lib.js';

const HOSTS_OK = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z.]+)$/i;

export async function onRequestGet({ request }) {
  const entrada = new URL(request.url).searchParams.get('url') || '';
  let atual;
  try { atual = new URL(entrada.trim()); } catch (e) { return jsonResponse({ erro: 'Esse texto não parece um link.' }, 400); }
  if (atual.protocol !== 'https:' || !HOSTS_OK.test(atual.hostname)) {
    return jsonResponse({ erro: 'Cole um link do Google Maps (começa com maps.app.goo.gl ou google.com/maps).' }, 400);
  }
  try {
    for (let salto = 0; salto < 6; salto++) {
      const r = await fetch(atual.href, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConviteBot/1.0)', 'Accept-Language': 'pt-BR' } });
      const destino = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && destino) {
        const prox = new URL(destino, atual);
        if (prox.protocol !== 'https:' || !HOSTS_OK.test(prox.hostname)) break; // ex.: página de consentimento: para aqui
        atual = prox;
        continue;
      }
      break;
    }
  } catch (e) {
    return jsonResponse({ erro: 'Não consegui abrir esse link agora. Tente de novo ou cole o link completo.' }, 502);
  }
  return jsonResponse({ url: atual.href });
}
