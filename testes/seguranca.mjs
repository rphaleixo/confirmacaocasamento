// Teste de SEGURANÇA: cor de evento que tenta virar código e upload de arquivo que não é imagem nem vídeo.
//
//   1. Servidor local rodando (README, "Rodar no computador") com os dados de exemplo.
//   2. PLAYWRIGHT_PATH=<pasta node_modules do Playwright> node testes/seguranca.mjs [http://localhost:8799] [slug]
//
// Só roda em localhost. Guarda e restaura a cor que mexe; os arquivos enviados ficam no armazenamento local de teste.
import { createRequire } from 'node:module';
const BASE = process.argv[2] || 'http://localhost:8799';
const SLUG = process.argv[3] || 'casamento';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('Recusado: este teste só roda contra localhost.'); process.exit(2); }
const USER = process.env.ADMIN_USER || 'mestre', PASS = process.env.ADMIN_PASSWORD || 'senha123';
const AUTH = 'Basic ' + Buffer.from(USER + ':' + PASS).toString('base64');
const { chromium } = createRequire(process.env.PLAYWRIGHT_PATH || import.meta.url)('playwright');

const resultados = [];
const verificar = (cenario, esperado, obtido) => resultados.push({ cenario, esperado, obtido, ok: JSON.stringify(esperado) === JSON.stringify(obtido) });

const bytes = (...partes) => { const out = []; partes.forEach((p) => { if (typeof p === 'string') for (const c of p) out.push(c.charCodeAt(0)); else out.push(...p); }); while (out.length < 40) out.push(0); return Buffer.from(out); };
const ARQUIVOS = {
  jpeg: { tipo: 'image/jpeg', dados: bytes([0xff, 0xd8, 0xff, 0xe0, 0, 16], 'JFIF'), ext: 'jpg' },
  png: { tipo: 'image/png', dados: bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a]), ext: 'png' },
  gif: { tipo: 'image/gif', dados: bytes('GIF89a'), ext: 'gif' },
  webp: { tipo: 'image/webp', dados: bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '), ext: 'webp' },
  mp4: { tipo: 'video/mp4', dados: bytes([0, 0, 0, 24], 'ftypmp42'), ext: 'mp4' },
  mov: { tipo: 'video/quicktime', dados: bytes([0, 0, 0, 20], 'ftypqt  '), ext: 'mov' },
  movAntigo: { tipo: 'video/quicktime', dados: bytes([0, 0, 0, 8], 'wide', [0, 0, 0, 0]), ext: 'mov' },
  webm: { tipo: 'video/webm', dados: bytes([0x1a, 0x45, 0xdf, 0xa3]), ext: 'webm' },
};
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>');
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');
const HEIC = bytes([0, 0, 0, 24], 'ftypheic');

const subir = async (dados, tipo, nome) => {
  const r = await fetch(BASE + '/api/admin/upload?e=' + SLUG + '&nome=' + encodeURIComponent(nome || 'x'), { method: 'POST', headers: { Authorization: AUTH, 'content-type': tipo }, body: dados });
  return Object.assign({ _http: r.status }, await r.json().catch(() => ({})));
};
const conteudo = async (corpo) => {
  const r = await fetch(BASE + '/api/admin/conteudo?e=' + SLUG, { method: 'POST', headers: { Authorization: AUTH, 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  return Object.assign({ _http: r.status }, await r.json().catch(() => ({})));
};

// ---------- upload ----------
verificar('U1 SVG declarado como SVG é recusado', 400, (await subir(SVG, 'image/svg+xml', 'a.svg'))._http);
verificar('U2 SVG disfarçado de PNG (tipo e nome de PNG) é recusado', 400, (await subir(SVG, 'image/png', 'a.png'))._http);
verificar('U3 HTML disfarçado de JPEG é recusado', 400, (await subir(HTML, 'image/jpeg', 'a.jpg'))._http);
verificar('U4 vídeo falso (texto) declarado como MP4 é recusado', 400, (await subir(HTML, 'video/mp4', 'a.mp4'))._http);
verificar('U5 HEIC (iPhone) é recusado com aviso', 400, (await subir(HEIC, 'image/heic', 'a.heic'))._http);
verificar('U6 tipo desconhecido é recusado', 400, (await subir(SVG, 'application/octet-stream', 'a.bin'))._http);
const urls = {};
for (const [nome, a] of Object.entries(ARQUIVOS)) {
  const r = await subir(a.dados, a.tipo, 'malicioso.html'); // o nome enviado NÃO decide a extensão
  urls[nome] = r.url;
  verificar('U7 ' + nome + ' válido é aceito e a extensão vem do conteúdo (nome enviado: malicioso.html)', { http: 200, ext: a.ext }, { http: r._http, ext: String(r.url || '').split('.').pop() });
}
const m = await fetch(BASE + urls.png);
verificar('M1 a mídia servida traz nosniff, sandbox e o tipo correto', { tipo: 'image/png', nosniff: 'nosniff', csp: 'sandbox' }, { tipo: m.headers.get('content-type'), nosniff: m.headers.get('x-content-type-options'), csp: m.headers.get('content-security-policy') });
const v = await fetch(BASE + urls.mp4, { headers: { range: 'bytes=0-9' } });
verificar('M2 vídeo continua entregue em trechos (Range) com os mesmos cabeçalhos', { http: 206, nosniff: 'nosniff' }, { http: v.status, nosniff: v.headers.get('x-content-type-options') });
// um SVG que já estivesse guardado (enviado antes desta regra) é entregue como download
const legado = await fetch(BASE + '/media/legado-teste.svg');
if (legado.status === 200) verificar('M3 SVG antigo guardado é entregue como download, nunca como página', { tipo: 'application/octet-stream', anexo: 'attachment' }, { tipo: legado.headers.get('content-type'), anexo: legado.headers.get('content-disposition') });

// ---------- cor ----------
const original = await (await fetch(BASE + '/api/conteudo?e=' + SLUG)).json();
const PAYLOAD = '#fff"/><image href="x" onerror="window.__xss=1"/><x a="';
for (const chave of ['aparencia.cor_destaque', 'aparencia.cor_primaria', 'secao.galeria.cor_fundo', 'hero.convite_cor_texto']) {
  verificar('C1 ' + chave + ' com código dentro é recusada pelo servidor', 400, (await conteudo({ [chave]: PAYLOAD }))._http);
}
verificar('C2 cores válidas continuam aceitas (#hex, rgb com transparência)', [200, 200], [(await conteudo({ 'aparencia.cor_destaque': '#C9A227' }))._http, (await conteudo({ 'aparencia.cor_secundaria': 'rgba(10, 20, 30, 0.5)' }))._http]);
// devolve as cores como estavam
await conteudo({ 'aparencia.cor_destaque': original['aparencia.cor_destaque'] || '', 'aparencia.cor_secundaria': original['aparencia.cor_secundaria'] || '' });

// ---------- no navegador: mesmo que uma cor ruim chegue ao convite, nada executa ----------
const painel = await (await fetch(BASE + '/api/admin/painel?e=' + SLUG, { headers: { Authorization: AUTH } })).json();
const codigo = painel.convidados[0].codigoGrupo;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const injeta = async (rota) => {
    const resp = await rota.fetch(); const j = await resp.json();
    Object.assign(j, { 'aparencia.cor_destaque': PAYLOAD, 'aparencia.cor_secundaria': PAYLOAD, 'aparencia.cor_primaria': PAYLOAD, 'aparencia.cor_fundo': PAYLOAD, 'layout.divisoria_forma': 'ornamento', 'layout.divisoria_altura': 'media' });
    await rota.fulfill({ response: resp, json: j });
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route(/\/api\/conteudo/, injeta);
  const convite = await ctx.newPage();
  await convite.goto(BASE + '/e/' + SLUG + '/?c=' + codigo);
  await convite.waitForTimeout(3500);
  verificar('X1 convite com cor maliciosa vinda do servidor não executa nada', null, await convite.evaluate(() => window.__xss === undefined ? null : window.__xss));
  const painelPag = await ctx.newPage();
  await painelPag.goto(BASE + '/admin/?e=' + SLUG + '#painel');
  await painelPag.fill('#loginUsuario', USER); await painelPag.fill('#loginSenha', PASS); await painelPag.click('#loginBtn');
  await painelPag.waitForSelector('#app:not([hidden])'); await painelPag.waitForTimeout(1500);
  for (const aba of ['aparencia', 'cores', 'formas', 'editor', 'conteudo']) { await painelPag.evaluate((x) => { location.hash = x; }, aba); await painelPag.waitForTimeout(1200); }
  verificar('X2 painel (miniaturas de aparência e formas) com cor maliciosa não executa nada', null, await painelPag.evaluate(() => window.__xss === undefined ? null : window.__xss));
  await ctx.close();
} catch (e) {
  resultados.push({ cenario: 'ERRO NO TESTE', esperado: 'sem exceção', obtido: String((e && e.message) || e).split('\n')[0], ok: false });
} finally { await browser.close(); }

let falhas = 0;
for (const r of resultados) {
  if (!r.ok) falhas++;
  console.log((r.ok ? 'APROVADO  ' : 'REPROVADO ') + r.cenario + (r.ok ? '' : '\n    esperado: ' + JSON.stringify(r.esperado) + '\n    obtido:   ' + JSON.stringify(r.obtido)));
}
console.log('\n' + (resultados.length - falhas) + ' de ' + resultados.length + ' aprovados');
process.exit(falhas ? 1 : 0);
