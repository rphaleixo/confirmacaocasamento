// Entrar com Google: confere o "ID token" que o Google entrega ao navegador (assinatura RS256 com as chaves públicas do Google,
// emissor, público = nosso Client ID, validade e e-mail verificado). Nada de senha do Google passa por aqui.
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
let cache = { chaves: null, ate: 0 };

function b64urlParaBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
}
const lerJson = (s) => JSON.parse(new TextDecoder().decode(b64urlParaBytes(s)));

export async function chavesDoGoogle(buscar = fetch) {
  if (cache.chaves && Date.now() < cache.ate) return cache.chaves;
  const r = await buscar('https://www.googleapis.com/oauth2/v3/certs');
  if (!r.ok) throw new Error('Não consegui falar com o Google agora.');
  const j = await r.json();
  cache = { chaves: j.keys || [], ate: Date.now() + 60 * 60 * 1000 };
  return cache.chaves;
}

// devolve { email, nome } ou lança Error com mensagem para a pessoa
export async function verificarIdToken(token, clientId, opcoes = {}) {
  const partes = String(token || '').split('.');
  if (partes.length !== 3) throw new Error('Login do Google inválido.');
  let cab, dados;
  try { cab = lerJson(partes[0]); dados = lerJson(partes[1]); } catch (e) { throw new Error('Login do Google inválido.'); }
  if (cab.alg !== 'RS256' || !cab.kid) throw new Error('Login do Google inválido.');
  const chaves = opcoes.chaves || (await chavesDoGoogle(opcoes.buscar));
  const jwk = chaves.find((k) => k.kid === cab.kid);
  if (!jwk) throw new Error('Login do Google expirou. Tente de novo.');
  const chave = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, b64urlParaBytes(partes[2]), new TextEncoder().encode(partes[0] + '.' + partes[1]));
  if (!ok) throw new Error('Login do Google inválido.');
  const agora = Math.floor((opcoes.agora || Date.now()) / 1000);
  if (!ISSUERS.includes(dados.iss) || dados.aud !== clientId) throw new Error('Login do Google inválido.');
  if (!dados.exp || dados.exp < agora - 30) throw new Error('Login do Google expirou. Tente de novo.');
  if (!dados.email || dados.email_verified !== true) throw new Error('O e-mail dessa conta Google não está verificado.');
  return { email: String(dados.email).trim().toLowerCase(), nome: dados.name || '' };
}
