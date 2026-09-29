// Busca de endereços no Google Maps (Places API "New") para o painel. A chave fica só no servidor.
// Configuração: variável GOOGLE_MAPS_API_KEY no Cloudflare Pages, com a "Places API (New)" ativada na chave.
//   GET ?q=texto&sessao=<id>   -> { sugestoes: [{ id, principal, secundario }] }
//   GET ?id=<placeId>&sessao=  -> { id, nome, endereco, lat, lng, url }
// Sem chave configurada devolve { semChave: true } e o painel cai para o modo manual.
import { jsonResponse } from '../../_lib.js';

const BASE = 'https://places.googleapis.com/v1';

function mensagemGoogle(d, status) {
  const m = d && d.error && d.error.message ? String(d.error.message) : '';
  if (status === 403 || /not been used|disabled|API_KEY|permission/i.test(m)) {
    return 'A chave do Google Maps não tem permissão para buscar lugares. Ative a "Places API (New)" para essa chave e confira as restrições.';
  }
  if (status === 429) return 'Muitas buscas seguidas. Aguarde alguns segundos e tente de novo.';
  return 'O Google Maps não respondeu como esperado. Tente de novo em instantes.';
}

export async function onRequestGet({ request, env }) {
  const chave = env.GOOGLE_MAPS_API_KEY;
  if (!chave) return jsonResponse({ semChave: true });

  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
  let sessao = (url.searchParams.get('sessao') || '').trim();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(sessao)) sessao = '';

  try {
    if (id) {
      if (!/^[A-Za-z0-9_-]{5,200}$/.test(id)) return jsonResponse({ erro: 'Lugar inválido.' }, 400);
      const r = await fetch(`${BASE}/places/${encodeURIComponent(id)}?languageCode=pt-BR${sessao ? '&sessionToken=' + sessao : ''}`, {
        headers: { 'X-Goog-Api-Key': chave, 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,googleMapsUri' },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return jsonResponse({ erro: mensagemGoogle(d, r.status) }, 502);
      return jsonResponse({
        id: d.id || id,
        nome: (d.displayName && d.displayName.text) || '',
        endereco: d.formattedAddress || '',
        lat: d.location ? d.location.latitude : null,
        lng: d.location ? d.location.longitude : null,
        url: d.googleMapsUri || '',
      });
    }

    if (q.length < 3) return jsonResponse({ sugestoes: [] });
    const corpo = { input: q, languageCode: 'pt-BR', regionCode: 'BR' };
    if (sessao) corpo.sessionToken = sessao;
    const r = await fetch(`${BASE}/places:autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': chave },
      body: JSON.stringify(corpo),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return jsonResponse({ erro: mensagemGoogle(d, r.status) }, 502);
    const sugestoes = (d.suggestions || [])
      .map((s) => s.placePrediction)
      .filter(Boolean)
      .slice(0, 6)
      .map((p) => ({
        id: p.placeId,
        principal: (p.structuredFormat && p.structuredFormat.mainText && p.structuredFormat.mainText.text) || (p.text && p.text.text) || '',
        secundario: (p.structuredFormat && p.structuredFormat.secondaryText && p.structuredFormat.secondaryText.text) || '',
      }));
    return jsonResponse({ sugestoes });
  } catch (e) {
    return jsonResponse({ erro: 'Não consegui falar com o Google Maps agora. Tente de novo em instantes.' }, 502);
  }
}
