// Teste do FLUXO DE CRIAÇÃO DO CONVITE: evento novo nasce sem dados inventados, checklist, bloqueio de publicação,
// prévia do assistente e marca de exemplo (etapa 1); criação em uma tela, nomes na criação e link de primeiro acesso (etapa 2);
// assistente com rótulos neutros, local sem depender do Google Maps, publicar no último passo, passo dos convidados e retomada em outro aparelho (etapa 3);
// menu do topo, caminho padrão de edição, rascunho x "Tudo salvo", Save the Date só ao salvar, ajuste fino fechado e lista de partes (etapa 4).
//
//   1. Servidor local rodando (README, "Rodar no computador") com os dados de exemplo.
//   2. PLAYWRIGHT_PATH=<pasta node_modules do Playwright> node testes/fluxo-criacao.mjs [http://localhost:8799] [slug-de-um-evento-existente]
//
// Só roda em localhost: ele CRIA eventos de teste (a API não apaga eventos).
import { createRequire } from 'node:module';
const BASE = process.argv[2] || 'http://localhost:8799';
const SLUG_EXISTENTE = process.argv[3] || 'casamento';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('Recusado: este teste só roda contra localhost.'); process.exit(2); }
const USER = process.env.ADMIN_USER || 'mestre', PASS = process.env.ADMIN_PASSWORD || 'senha123';
const AUTH = 'Basic ' + Buffer.from(USER + ':' + PASS).toString('base64');
const { chromium } = createRequire(process.env.PLAYWRIGHT_PATH || import.meta.url)('playwright');

const resultados = [];
const verificar = (cenario, esperado, obtido) => resultados.push({ cenario, esperado, obtido, ok: JSON.stringify(esperado) === JSON.stringify(obtido) });

async function api(metodo, caminho, corpo, slug) {
  const url = BASE + caminho + (slug ? (caminho.includes('?') ? '&' : '?') + 'e=' + slug : '');
  const r = await fetch(url, { method: metodo, headers: { Authorization: AUTH, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  const j = await r.json().catch(() => ({}));
  return Object.assign(Array.isArray(j) ? [] : {}, j, { _http: r.status });
}
const sufixo = Math.random().toString(36).slice(2, 7);
const criar = async (tipo, nome) => { const slug = 'novo-' + tipo.slice(0, 3) + '-' + sufixo; const r = await api('POST', '/api/admin/eventos', { nome, slug, tipo }); if (r._http !== 200) throw new Error('não criou ' + slug + ': ' + JSON.stringify(r)); return slug; };
// com o acesso do anfitrião: sem ele o servidor esconde data, horário e local de quem não tem o código do convite
const conteudoDe = async (slug) => (await (await fetch(BASE + '/api/conteudo?e=' + slug, { headers: { Authorization: AUTH } })).json());
const DEMONSTRACAO = /12 de junho|01 de maio|Copacabana|Av\. Atlântica|2027/;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const cas = await criar('casamento', 'Casamento Teste ' + sufixo);
  const ani = await criar('aniversario', 'Aniversário Teste ' + sufixo);

  // ---------- 1: nasce sem dados inventados ----------
  const c = await conteudoDe(cas);
  verificar('F1 evento novo nasce sem data, sem prazo e sem local', { data: '', prazo: '', local: '', endereco: '', visual: '0' }, { data: c['hero.data_iso'], prazo: c['hero.prazo_iso'], local: c['mapa.local_nome'], endereco: c['mapa.local_endereco'], visual: c['aparencia.visual_confirmado'] });

  // ---------- 3: publicação bloqueada sem nomes ou data ----------
  const bloqueio = await api('POST', '/api/admin/publicacao', { publicado: true }, cas);
  verificar('F2 publicar sem nomes e sem data é recusado e diz o que falta', { http: 400, faltando: ['nomes', 'data'] }, { http: bloqueio._http, faltando: (bloqueio.faltando || []).map((f) => f.id) });
  const blqAni = await api('POST', '/api/admin/publicacao', { publicado: true }, ani);
  verificar('F2b aniversário também: nome e data', ['nomes', 'data'], (blqAni.faltando || []).map((f) => f.id));
  await api('POST', '/api/admin/conteudo', { 'hero.noiva': 'Ana', 'hero.noivo': 'Beto' }, cas);
  const soData = await api('POST', '/api/admin/publicacao', { publicado: true }, cas);
  verificar('F2c com os nomes preenchidos falta só a data', ['data'], (soData.faltando || []).map((f) => f.id));
  await api('POST', '/api/admin/conteudo', { 'hero.noiva': 'Noiva' }, cas);
  verificar('F2d nome provisório ("Noiva") não conta como nome preenchido', ['nomes', 'data'], ((await api('POST', '/api/admin/publicacao', { publicado: true }, cas)).faltando || []).map((f) => f.id));
  await api('POST', '/api/admin/conteudo', { 'hero.noiva': 'Ana', 'hero.data_iso': '2030-05-10T16:00:00-03:00' }, cas);
  const ok = await api('POST', '/api/admin/publicacao', { publicado: true }, cas);
  verificar('F2e com nomes e data a publicação é aceita', { http: 200, publicado: true }, { http: ok._http, publicado: ok.publicado });
  verificar('F2f voltar para "Em breve" nunca é bloqueado', 200, (await api('POST', '/api/admin/publicacao', { publicado: false }, cas))._http);

  // ---------- visual confirmado ----------
  const antes = (await conteudoDe(ani))['aparencia.visual_confirmado'];
  await api('POST', '/api/admin/conteudo', { 'aparencia.cor_destaque': '#C9A227' }, ani);
  verificar('F3 salvar cores confirma o visual (de 0 para 1)', ['0', '1'], [antes, (await conteudoDe(ani))['aparencia.visual_confirmado']]);

  // ---------- evento novo no navegador ----------
  const slugB = 'vazio-' + sufixo;
  await api('POST', '/api/admin/eventos', { nome: 'Casamento Vazio ' + sufixo, slug: slugB, tipo: 'casamento' });
  const tokenB = (await api('GET', '/api/admin/publicacao', null, slugB)).token;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(BASE + '/admin/?e=' + slugB + '#painel');
  await page.evaluate((s) => localStorage.setItem('rsvp-assist-visto:' + s, '1'), slugB); // sem o assistente abrindo sozinho
  await page.fill('#loginUsuario', USER); await page.fill('#loginSenha', PASS); await page.click('#loginBtn');
  await page.waitForSelector('#app:not([hidden])'); await page.waitForTimeout(1800);
  const prep = await page.locator('#p-prep').innerText();
  verificar('F4 checklist de evento novo: nenhum passo essencial marcado', true, /\b0 de 6\b/.test(prep));

  // convite do evento novo, visto como o anfitrião (rascunho)
  const convite = await ctx.newPage();
  await convite.goto(BASE + '/e/' + slugB + '/?rascunho=' + tokenB);
  await convite.waitForTimeout(2500);
  const textos = await convite.evaluate(() => ({ corpo: document.body.innerText, data: document.getElementById('heroData').textContent, local: document.getElementById('mapEndereco').textContent, contagem: document.getElementById('cd-sentence').textContent, prazo: getComputedStyle(document.getElementById('rsvpPrazo')).display }));
  verificar('F5 convite sem dados mostra texto neutro e nenhuma demonstração', { data: 'Data a definir', local: 'Local a definir', contagem: 'Data a definir', prazo: 'none', demonstracao: false }, { data: textos.data, local: textos.local, contagem: textos.contagem, prazo: textos.prazo, demonstracao: DEMONSTRACAO.test(textos.corpo) });

  // publicar pelo painel: bloqueio com caminho para o passo que falta
  await page.locator('#faixaRascunho button', { hasText: 'Publicar' }).first().click();
  await page.waitForTimeout(600);
  const aviso = await page.locator('[role=alert]', { hasText: 'Para publicar, falta' }).first().innerText().catch(() => '');
  verificar('F6 o passo de publicar avisa o que falta (nomes e data)', true, /nomes do casal e dia e hora/i.test(aviso));
  verificar('F6b o botão "Publicar o convite" fica desativado', true, await page.getByRole('button', { name: 'Publicar o convite' }).isDisabled());
  await page.getByRole('button', { name: /Preencher: nomes do casal/i }).click();
  await page.waitForTimeout(900);
  verificar('F6c "Preencher" leva ao passo dos nomes do assistente', 'Quem vai se casar?', (await page.locator('#as-titulo').innerText()).trim());

  // ---------- prévia do assistente de um aniversário: sem demonstração, nomes de exemplo marcados ----------
  const pAni = await ctx.newPage();
  await pAni.goto(BASE + '/admin/?e=' + ani + '#painel');
  await pAni.evaluate((s) => localStorage.setItem('rsvp-assist-visto:' + s, '1'), ani);
  await pAni.waitForSelector('#app:not([hidden])').catch(() => {});
  if (await pAni.locator('#loginUsuario').isVisible().catch(() => false)) { await pAni.fill('#loginUsuario', USER); await pAni.fill('#loginSenha', PASS); await pAni.click('#loginBtn'); await pAni.waitForSelector('#app:not([hidden])'); }
  await pAni.waitForTimeout(1500);
  await pAni.locator('#faixaRascunho button', { hasText: 'Continuar montando' }).first().click();
  await pAni.waitForTimeout(1500);
  const iframe = pAni.frames().find((f) => /previa=1/.test(f.url()));
  if (iframe) await iframe.waitForSelector('.exemplo-tag', { timeout: 15000 }).catch(() => {});
  // só os textos que a pessoa vê (sem código de scripts e sem módulos escondidos, como a linha do tempo no aniversário)
  const previa = iframe ? await iframe.evaluate(() => { const t = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!/^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName) && n.parentElement.getClientRects().length) t.push(n.textContent); } return t.join(' '); }) : '';
  if (process.env.DEPURAR && iframe) console.log('F7 onde:', await iframe.evaluate(() => { const r = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (/Nosso casamento/.test(n.textContent) && !/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)) r.push(n.parentElement.tagName + '#' + n.parentElement.id + '.' + n.parentElement.className + ' hidden=' + n.parentElement.closest('[hidden]') + ' display=' + getComputedStyle(n.parentElement).display + ' :: ' + n.textContent.trim().slice(0, 80)); } return r; }));
  if (process.env.DEPURAR) console.log('F7 quadro:', iframe && iframe.url(), '\n', previa.split('\n').filter((l) => /01 de maio|Nosso casamento/.test(l)).join(' || ').slice(0, 400));
  verificar('F7 prévia do assistente (aniversário) não mostra casamento nem datas de demonstração', { achouPrevia: true, demonstracao: false, casamento: false }, { achouPrevia: !!iframe, demonstracao: DEMONSTRACAO.test(previa) ? (previa.match(DEMONSTRACAO) || [])[0] : false, casamento: /nosso casamento/i.test(previa) ? previa.slice(Math.max(0, previa.search(/nosso casamento/i) - 40), previa.search(/nosso casamento/i) + 30) : false });
  const marca = iframe ? await iframe.locator('.exemplo-tag').first().innerText().catch(() => '') : '';
  verificar('F8 nomes de exemplo da saudação aparecem marcados como exemplo na prévia', true, /exemplo/i.test(marca));

  // tocar nos nomes de exemplo, no editor do convite, diz o que o campo edita
  const pEd = await ctx.newPage();
  await pEd.goto(BASE + '/admin/?e=' + ani + '#editor');
  await pEd.waitForTimeout(500);
  if (await pEd.locator('#loginUsuario').isVisible().catch(() => false)) { await pEd.fill('#loginUsuario', USER); await pEd.fill('#loginSenha', PASS); await pEd.click('#loginBtn'); }
  await pEd.waitForSelector('#app:not([hidden])'); await pEd.waitForTimeout(2500);
  const quadro = pEd.frames().find((f) => /previa=1/.test(f.url()) && /editor=1/.test(f.url()));
  let rotuloVisto = false;
  if (quadro) {
    await quadro.waitForSelector('#heroConvite:not([hidden])', { timeout: 15000 }).catch(() => {});
    await pEd.waitForTimeout(1200);
    await quadro.locator('#heroConvite').click({ force: true }).catch(() => {});
    await pEd.waitForTimeout(900);
    rotuloVisto = (await pEd.locator('body').innerText()).includes('os nomes ao lado são só um exemplo');
  }
  verificar('F9 tocar nos nomes de exemplo, no editor, diz que o campo é o texto "Convite para"', { achouEditor: true, rotulo: true }, { achouEditor: !!quadro, rotulo: rotuloVisto });

  // ---------- evento que já existe: continua igual ----------
  const painel = await api('GET', '/api/admin/painel', null, SLUG_EXISTENTE);
  const cod = (painel.convidados || [])[0] && painel.convidados[0].codigoGrupo;
  if (cod) {
    const velho = await ctx.newPage();
    await velho.goto(BASE + '/e/' + SLUG_EXISTENTE + '/?c=' + cod);
    await velho.waitForTimeout(2500);
    const tv = await velho.evaluate(() => ({ data: document.getElementById('heroData').innerText, local: document.getElementById('mapEndereco').innerText }));
    const cv = await conteudoDe(SLUG_EXISTENTE);
    verificar('F10 evento existente com data e local preenchidos continua mostrando os dele', { semNeutro: true, temData: true }, { semNeutro: !/a definir/i.test(tv.data + tv.local), temData: tv.data.trim().length > 0 });
  }
  // ================= ETAPA 2: criação em uma tela, nomes na criação e link de primeiro acesso =================
  // ---------- servidor: os nomes informados na criação vão para o convite ----------
  const slugN = 'nomes-' + sufixo;
  await api('POST', '/api/admin/eventos', { nome: 'Casamento com nomes ' + sufixo, slug: slugN, tipo: 'casamento', nomes: { primeiro: '  Ana  ', segundo: 'Beto <script>x</script>' } });
  const cn = await conteudoDe(slugN);
  verificar('G1 nomes da criação são gravados no convite (limpos)', { a: 'Ana', b: 'Beto' }, { a: cn['hero.noiva'], b: cn['hero.noivo'] });
  const slugC = 'copia-' + sufixo;
  await api('POST', '/api/admin/eventos', { nome: 'Cópia ' + sufixo, slug: slugC, tipo: 'casamento', copiarDe: slugN, nomes: { primeiro: 'Caio', segundo: 'Davi' } });
  const cc = await conteudoDe(slugC);
  verificar('G2 ao copiar de outro evento valem os nomes deste, não os do evento de origem', { a: 'Caio', b: 'Davi' }, { a: cc['hero.noiva'], b: cc['hero.noivo'] });
  const slugA = 'aniv-nomes-' + sufixo;
  await api('POST', '/api/admin/eventos', { nome: 'Aniversário com nome ' + sufixo, slug: slugA, tipo: 'aniversario', nomes: { primeiro: 'Helena', idade: '5 anos' } });
  const ca = await conteudoDe(slugA);
  verificar('G3 aniversário: nome e idade gravados', { nome: 'Helena', idade: '5 anos' }, { nome: ca['hero.noiva'], idade: ca['hero.idade'] });

  // ---------- painel geral: tela única ----------
  const geral = await ctx.newPage();
  geral.on('pageerror', (e) => erros.push('criação: ' + e.message));
  await geral.goto(BASE + '/admin/#eventos');
  await geral.fill('#loginUsuario', USER); await geral.fill('#loginSenha', PASS); await geral.click('#loginBtn');
  await geral.waitForSelector('#app:not([hidden])'); await geral.waitForTimeout(1200);
  await geral.click('#btnNovoEvento'); await geral.waitForSelector('#me-primeiro');
  const botaoCriar = () => geral.evaluate(() => { const b = document.querySelector('#me-foot .prim'); return { texto: b.textContent, travado: b.disabled }; });
  verificar('G4 tudo em uma tela (tipo, nomes, nome e endereço), sem passos, com o botão travado enquanto falta algo',
    { campos: true, passos: false, botao: { texto: 'Criar evento', travado: true } },
    { campos: await geral.evaluate(() => ['me-primeiro', 'me-segundo', 'me-nome', 'me-slug'].every((id) => !!document.getElementById(id)) && document.querySelectorAll('#me-corpo .opcao-tipo').length >= 2),
      passos: await geral.evaluate(() => !document.getElementById('me-passos').hidden), botao: await botaoCriar() });
  const pn = 'Lia' + sufixo;
  await geral.fill('#me-primeiro', pn); await geral.fill('#me-segundo', 'Noa');
  verificar('G5 nome do evento e endereço sugeridos a partir dos nomes', { nome: 'Casamento de ' + pn + ' e Noa', slug: (pn + '-e-noa').toLowerCase(), travado: false },
    { nome: await geral.inputValue('#me-nome'), slug: await geral.inputValue('#me-slug'), travado: (await botaoCriar()).travado });
  // caminho secundário: marcar "criar usuário e senha" traz o usuário sugerido (antes vinha vazio e o botão nunca liberava)
  await geral.click('#me-mais summary'); await geral.check('#me-criar-login');
  verificar('G6 ao marcar usuário e senha, o usuário vem sugerido do endereço e o botão continua liberado', { usuario: (pn + '-e-noa').toLowerCase(), travado: false },
    { usuario: await geral.inputValue('#me-usuario'), travado: (await botaoCriar()).travado });
  await geral.uncheck('#me-criar-login');
  // clique duplo: cria um evento só
  let criacoes = 0;
  geral.on('request', (rq) => { if (rq.method() === 'POST' && /\/api\/admin\/eventos/.test(rq.url())) criacoes++; });
  await geral.dblclick('#me-foot .prim');
  await geral.waitForSelector('#me-link-acesso code', { timeout: 15000 });
  const link = await geral.textContent('#me-link-acesso code');
  const tokenAcesso = (link.match(/\/entrar\/([a-f0-9]{48})$/) || [])[1] || '';
  const conv = tokenAcesso ? await (await fetch(BASE + '/api/entrar/convite?t=' + tokenAcesso)).json() : {};
  verificar('G7 clique duplo em "Criar evento" cria um evento só', 1, criacoes);
  verificar('G8 ao concluir aparece o link de primeiro acesso, válido para o evento criado, com copiar mensagem e WhatsApp',
    { linkDoEvento: (pn + '-e-noa').toLowerCase(), botoes: ['Gerir este evento', 'Copiar mensagem', 'Enviar por WhatsApp'] },
    { linkDoEvento: conv.evento && conv.evento.slug, botoes: await geral.$$eval('#me-foot button', (bs) => bs.map((x) => x.textContent)) });
  const cl = await conteudoDe((pn + '-e-noa').toLowerCase());
  verificar('G9 os nomes digitados na tela foram para o convite', { a: pn, b: 'Noa' }, { a: cl['hero.noiva'], b: cl['hero.noivo'] });
  const semLogin = (await api('GET', '/api/admin/eventos')).find((e) => e.slug === (pn + '-e-noa').toLowerCase());
  verificar('G10 pelo caminho principal o evento nasce sem usuário e senha', null, semLogin ? semLogin.anfitriaoUsuario : 'evento não achado');
  await geral.click('#me-x');

  // caminho secundário de ponta a ponta: usuário e senha criados na mesma tela entram no painel do evento
  await geral.click('#btnNovoEvento'); await geral.waitForSelector('#me-primeiro');
  const ps = 'Rui' + sufixo;
  await geral.fill('#me-primeiro', ps); await geral.fill('#me-segundo', 'Teo');
  await geral.click('#me-mais summary'); await geral.check('#me-criar-login');
  const senhaGerada = await geral.inputValue('#me-senha');
  await geral.click('#me-foot .prim');
  await geral.waitForFunction(() => /está pronto/.test(document.getElementById('me-titulo').textContent), null, { timeout: 15000 });
  const slugS = (ps + '-e-teo').toLowerCase();
  const entra = await fetch(BASE + '/api/admin/painel?e=' + slugS, { headers: { Authorization: 'Basic ' + Buffer.from(slugS + ':' + senhaGerada).toString('base64') } });
  verificar('G11 caminho secundário: o usuário e a senha mostrados entram no painel do evento, e a tela não mostra link de acesso', { http: 200, link: false },
    { http: entra.status, link: await geral.evaluate(() => !!document.getElementById('me-link-acesso')) });
  await geral.click('#me-x');

  // ---------- anfitrião: assistente com os nomes já preenchidos e capa sem "Noiva & Noivo" ----------
  const anf = await ctx.newPage();
  anf.on('pageerror', (e) => erros.push('assistente: ' + e.message));
  await anf.goto(BASE + '/admin/?e=' + slugN + '#painel');
  await anf.fill('#loginUsuario', USER); await anf.fill('#loginSenha', PASS); await anf.click('#loginBtn');
  await anf.waitForSelector('#assistente:not([hidden])', { timeout: 15000 }); await anf.waitForTimeout(600);
  verificar('G12 no primeiro acesso o assistente abre nos nomes, já preenchidos, com o aviso para conferir',
    { titulo: 'Quem vai se casar?', a: 'Ana', b: 'Beto', aviso: true },
    { titulo: await anf.textContent('#as-titulo'), a: await anf.inputValue('#as-corpo [data-chave="hero.noiva"]'), b: await anf.inputValue('#as-corpo [data-chave="hero.noivo"]'), aviso: await anf.evaluate(() => !!document.getElementById('as-nomes-conferir')) });
  await anf.click('#as-fechar'); await anf.waitForTimeout(1500);
  const itemNomes = await anf.evaluate(() => { const i = Array.from(document.querySelectorAll('#p-prep .prep-item')).find((x) => /Nomes do casal/.test(x.textContent)); return i ? i.classList.contains('ok') : null; });
  verificar('G13 nomes vindos da criação contam como preenchidos no checklist', true, itemNomes);
  const tokenN = (await api('GET', '/api/admin/publicacao', null, slugN)).token;
  const capa = await ctx.newPage();
  await capa.goto(BASE + '/e/' + slugN + '/?rascunho=' + tokenN); await capa.waitForTimeout(2500);
  const nomesCapa = await capa.evaluate(() => document.querySelector('#hero h1').innerText.replace(/\s+/g, ' ').trim());
  verificar('G14 a capa do evento novo mostra os nomes informados, não "Noiva & Noivo"', { temNomes: true, semProvisorio: true }, { temNomes: /Ana/.test(nomesCapa) && /Beto/.test(nomesCapa), semProvisorio: !/Noiva|Noivo/.test(nomesCapa) });

  // ================= ETAPA 3: assistente e publicação =================
  const slugH = 'etapa3-' + sufixo;
  await api('POST', '/api/admin/eventos', { nome: 'Etapa 3 ' + sufixo, slug: slugH, tipo: 'casamento', nomes: { primeiro: 'Bia', segundo: 'Caê' } });
  await api('POST', '/api/admin/conteudo', { 'hero.data_iso': '2031-03-15T16:00:00-03:00', 'hero.data_display': '15 de março de 2031' }, slugH);
  const estadoAssist = async () => (await api('GET', '/api/admin/publicacao', null, slugH)).assistente;
  verificar('H1 evento novo: o servidor diz que o assistente nunca foi aberto', { passo: null, concluido: false }, await estadoAssist());
  verificar('H1b passo desconhecido é recusado pelo servidor', 400, (await api('POST', '/api/admin/publicacao', { assistente: { passo: 'qualquer' } }, slugH))._http);
  const entrar = async (contexto) => {
    const pg = await contexto.newPage();
    pg.on('pageerror', (e) => erros.push('etapa 3: ' + e.message));
    await pg.goto(BASE + '/admin/?e=' + slugH + '#painel');
    await pg.fill('#loginUsuario', USER); await pg.fill('#loginSenha', PASS); await pg.click('#loginBtn');
    await pg.waitForSelector('#app:not([hidden])');
    return pg;
  };
  // aparelho 1: o assistente abre sozinho, com rótulos neutros; o anfitrião avança um passo e sai
  const ap1 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const h1 = await entrar(ap1);
  await h1.waitForSelector('#assistente:not([hidden])', { timeout: 15000 }); await h1.waitForTimeout(500);
  verificar('H2 passo dos nomes do casamento usa rótulos neutros', ['Primeiro nome', 'Segundo nome'], await h1.$$eval('#as-corpo label', (ls) => ls.map((l) => l.textContent)));
  await h1.click('#as-proximo'); await h1.waitForFunction(() => document.getElementById('as-titulo').textContent === 'Quando vai ser?'); await h1.waitForTimeout(400);
  await h1.click('#as-fechar'); await h1.waitForTimeout(900);
  verificar('H3 ao sair, o servidor guarda o passo em que o anfitrião parou', { passo: 'data', concluido: false }, await estadoAssist());
  // aparelho 2: não abre sozinho de novo; "Continuar de onde parei" retoma no mesmo passo
  const ap2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const h2 = await entrar(ap2);
  await h2.waitForTimeout(2500);
  verificar('H4 em outro aparelho o assistente não abre sozinho por cima do painel', true, await h2.evaluate(() => document.getElementById('assistente').hidden));
  await h2.locator('#p-prep button', { hasText: 'Continuar de onde parei' }).click();
  await h2.waitForSelector('#assistente:not([hidden])'); await h2.waitForTimeout(700);
  verificar('H5 em outro aparelho, "Continuar de onde parei" abre no passo guardado', 'Quando vai ser?', await h2.textContent('#as-titulo'));
  // passo do local: nome e endereço primeiro; o link do Google Maps é opcional
  await h2.click('#as-proximo'); await h2.waitForFunction(() => document.getElementById('as-titulo').textContent === 'Onde vai ser?'); await h2.waitForTimeout(500);
  verificar('H6 passo do local começa pelo nome e endereço, e o link do Google Maps vem depois, como opcional', { nomeAntesDoLink: true, rotuloLink: 'Ou cole o link do local no Google Maps (opcional)' },
    await h2.evaluate(() => { const n = document.querySelector('#as-corpo [data-chave="mapa.local_nome"]'), l = document.getElementById('lugar-link'); return { nomeAntesDoLink: !!(n.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING), rotuloLink: document.querySelector('label[for="lugar-link"]').textContent }; }));
  await h2.fill('#as-corpo [data-chave="mapa.local_nome"]', 'Sítio das Flores'); await h2.fill('#as-corpo [data-chave="mapa.local_endereco"]', 'Estrada Velha, 100, Petrópolis');
  await h2.click('#as-proximo'); await h2.waitForFunction(() => /capa/i.test(document.getElementById('as-titulo').textContent)); await h2.waitForTimeout(300);
  const ch = await conteudoDe(slugH);
  verificar('H6b dá para preencher o local sem link do Google Maps', { nome: 'Sítio das Flores', endereco: 'Estrada Velha, 100, Petrópolis' }, { nome: ch['mapa.local_nome'], endereco: ch['mapa.local_endereco'] });
  await h2.click('#as-pular'); await h2.waitForTimeout(500); await h2.click('#as-pular');
  await h2.waitForSelector('#as-resumo'); await h2.waitForTimeout(500);
  // conferir e publicar no mesmo passo, sem janela por cima
  verificar('H7 conferência e publicação em um passo só: resumo, escolha do modo e botão de publicar, sem janela',
    { titulo: 'Conferir e publicar', resumo: true, modos: 2, esconder: true, botao: 'Publicar o convite', travado: false, janela: false },
    await h2.evaluate(() => ({ titulo: document.getElementById('as-titulo').textContent, resumo: document.querySelectorAll('#as-resumo .prep-item').length >= 4, modos: document.querySelectorAll('#as-corpo input[name="pb-modo"]').length,
      esconder: !!document.getElementById('pb-esconder'), botao: document.getElementById('as-proximo').textContent, travado: document.getElementById('as-proximo').disabled, janela: !!document.querySelector('dialog[open]') })));
  let publicacoes = 0;
  h2.on('request', (r) => { if (r.method() === 'POST' && /\/api\/admin\/publicacao/.test(r.url()) && /"publicado"/.test(r.postData() || '')) publicacoes++; });
  await h2.dblclick('#as-proximo');
  await h2.waitForFunction(() => document.getElementById('as-titulo').textContent === 'Agora convide as pessoas', null, { timeout: 15000 }); await h2.waitForTimeout(1200);
  verificar('H8 clique duplo em publicar: publica uma vez e para no passo dos convidados (o segundo clique não fecha o passo)',
    { pedidos: 1, publicado: true, passoVisivel: true, concluido: false },
    { pedidos: publicacoes, publicado: !!(await api('GET', '/api/admin/publicacao', null, slugH)).publicado, passoVisivel: await h2.evaluate(() => !document.getElementById('assistente').hidden), concluido: (await estadoAssist()).concluido });
  verificar('H9 depois de publicar: criar o primeiro grupo, importar a lista, como enviar pelo WhatsApp e a opção de deixar para depois',
    { botoes: ['Criar o primeiro grupo', 'Importar a lista de uma planilha'], comoEnviar: 3, depois: 'Deixar para depois' },
    await h2.evaluate(() => ({ botoes: Array.from(document.querySelectorAll('#as-convidar-acoes button')).map((b) => b.textContent), comoEnviar: document.querySelectorAll('#as-como-enviar li').length, depois: document.getElementById('as-proximo').textContent })));
  const semRolagem = await h2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('.as-corpo-wrap').scrollWidth <= document.querySelector('.as-corpo-wrap').clientWidth);
  verificar('H9b o passo dos convidados cabe em 390 px sem rolagem lateral', true, semRolagem);
  await h2.locator('#as-convidar-acoes button', { hasText: 'Criar o primeiro grupo' }).click();
  await h2.waitForSelector('dialog[open]', { timeout: 10000 }); await h2.waitForTimeout(500);
  verificar('H10 "Criar o primeiro grupo" fecha o assistente, abre a janela de novo grupo e marca o assistente como concluído',
    { assistenteFechado: true, janelaGrupo: true, concluido: true },
    { assistenteFechado: await h2.evaluate(() => document.getElementById('assistente').hidden), janelaGrupo: /grupo/i.test(await h2.textContent('#me-titulo')), concluido: (await estadoAssist()).concluido });
  await ap1.close(); await ap2.close();

  // ================= ETAPA 4: painel de edição do convite =================
  const slugI = 'etapa4-' + sufixo;
  await api('POST', '/api/admin/eventos', { nome: 'Etapa 4 ' + sufixo, slug: slugI, tipo: 'casamento', nomes: { primeiro: 'Dora', segundo: 'Enzo' } });
  await api('POST', '/api/admin/publicacao', { assistente: { passo: 'fim', concluido: true } }, slugI); // sem o assistente abrindo por cima
  const abrirPainel = async (largura, altura, hash) => {
    const c = await browser.newContext({ viewport: { width: largura, height: altura } });
    await c.addInitScript((a) => { sessionStorage.setItem('rsvp-acesso:master', a); }, AUTH);
    const pg = await c.newPage();
    pg.on('pageerror', (e) => erros.push('etapa 4: ' + e.message));
    pg.on('dialog', (d) => d.accept()); // aviso do navegador ao recarregar com alteração não salva
    await pg.goto(BASE + '/admin/?e=' + slugI + hash); await pg.waitForSelector('#app:not([hidden])'); await pg.waitForTimeout(2500);
    return pg;
  };
  const rascunhos = (pg) => pg.evaluate(() => Object.keys(localStorage).filter((k) => k.indexOf('rascunho-painel:') === 0));
  const estadoBarra = (pg) => pg.evaluate(() => { const e = Array.from(document.querySelectorAll('#tab-conteudo .savebar .estado')).find((x) => x.getClientRects().length); return e ? e.textContent.trim() : null; });
  const abrirParte = async (pg, nome) => { await pg.locator('#ct-subnav .ct-item', { hasText: nome }).first().click(); await pg.waitForTimeout(900); };

  // ---------- topo, abas e caminho padrão ----------
  const d1 = await abrirPainel(1366, 630, '#painel');
  verificar('I1 os botões do topo ficam recolhidos em um menu', { visiveis: ['Menu'], aberto: false },
    await d1.evaluate(() => ({ visiveis: Array.from(document.querySelectorAll('header.hd button, header.hd a')).filter((e) => e.getClientRects().length).map((e) => e.textContent.trim()), aberto: document.getElementById('hdAcoes').classList.contains('aberto') })));
  await d1.click('#hdMenuBtn'); await d1.waitForTimeout(250);
  const itensMenu = await d1.$$eval('#hdAcoes .hd-btn', (bs) => bs.filter((e) => e.getClientRects().length).map((e) => ({ t: e.textContent.trim(), h: Math.round(e.getBoundingClientRect().height) })));
  await d1.keyboard.press('Escape');
  verificar('I1b o menu abre com as ações (cada uma com 44 px de altura) e fecha com Esc, devolvendo o foco ao botão',
    { tem: true, altura: true, fechou: true, foco: 'hdMenuBtn' },
    { tem: ['Testar convite', 'Copiar link do site', 'Sair'].every((t) => itensMenu.some((i) => i.t === t)), altura: itensMenu.every((i) => i.h >= 44), fechou: await d1.evaluate(() => !document.getElementById('hdAcoes').classList.contains('aberto')), foco: await d1.evaluate(() => document.activeElement.id) });
  await d1.click('#navEvento [data-area=site]'); await d1.waitForTimeout(2500);
  verificar('I2 no computador, "Site" abre em Editar no convite; Conteúdo é o atalho ao lado e as abas de aparência ficam recolhidas',
    { aba: '#editor', abas: ['Editar no convite', 'Conteúdo', 'Cores, letras e ordem'] }, { aba: await d1.evaluate(() => location.hash), abas: await d1.$$eval('#subheaderIn button', (bs) => bs.map((e) => e.textContent)) });
  verificar('I3 em 630 px de altura o convite a editar aparece sem rolar, a lista de partes não tem rolagem própria e o aviso de salvo fica embaixo',
    { previaNoAlto: true, listaSemRolagem: true, barra: { estado: 'Tudo salvo', botao: 'Salvar alterações', travado: true, noRodape: true }, botaoNoAlto: false },
    await d1.evaluate(() => { const m = document.getElementById('ed2-menu'), b = document.getElementById('ed2-savebar').getBoundingClientRect();
      return { previaNoAlto: document.getElementById('ed2-prev').getBoundingClientRect().top <= innerHeight / 2 /* metade de cima, mesmo com a faixa de "não publicado" */, listaSemRolagem: m.scrollHeight <= m.clientHeight + 2 && getComputedStyle(m).overflowY === 'visible',
        barra: { estado: document.getElementById('ed2-estado').textContent, botao: document.getElementById('ed2-salvar').textContent, travado: document.getElementById('ed2-salvar').disabled, noRodape: b.bottom > innerHeight - 60 && b.bottom <= innerHeight + 2 },
        botaoNoAlto: !!document.querySelector('#ed2-painel .ed2-barra-topo .action') }; }));
  const linhas = await d1.$$eval('#ed2-menu .ed2-linha', (ls) => ls.map((l) => ({ nome: l.querySelector('.nm span:last-child').textContent, icone: l.querySelector('.nm span').textContent, fixo: !!l.querySelector('.fixo'), chave: !!l.querySelector('input[type=checkbox]') })));
  const lin = (n) => linhas.find((l) => l.nome === n) || {};
  verificar('I4 lista de partes: a confirmação tem a etiqueta "fixo" e as duas partes de presentes têm nomes e ícones diferentes',
    { confirmacaoFixo: true, chamada: true, lista: true, iconesDiferentes: true },
    { confirmacaoFixo: lin('Confirmação de presença').fixo === true, chamada: !!lin('Chamada para presentes').nome, lista: !!lin('Presentes (lista, PIX e dicas)').nome, iconesDiferentes: lin('Chamada para presentes').icone !== lin('Presentes (lista, PIX e dicas)').icone });
  await d1.click('#sub-aparencia'); await d1.waitForTimeout(1500);
  verificar('I5 "Cores, letras e ordem" mostra as abas de aparência só quando a pessoa pede', { aba: '#cores', abas: ['Editar no convite', 'Conteúdo', 'Cores', 'Tipografia', 'Ordem dos módulos'] },
    { aba: await d1.evaluate(() => location.hash), abas: await d1.$$eval('#subheaderIn button', (bs) => bs.map((e) => e.textContent)) });
  await d1.context().close();
  const m1 = await abrirPainel(390, 800, '#painel');
  await m1.click('#navEvento [data-area=site]'); await m1.waitForTimeout(2500);
  verificar('I6 em tela estreita (390 px), "Site" abre no formulário Conteúdo, que vem primeiro', { aba: '#conteudo', primeira: 'Conteúdo', lateral: false },
    { aba: await m1.evaluate(() => location.hash), primeira: await m1.$eval('#subheaderIn button', (e) => e.textContent), lateral: await m1.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  await m1.context().close();

  // ---------- rascunho guardado no aparelho x "Tudo salvo" ----------
  const CAMPO = '#ct-form [data-chave="sticky.cta_label"]';
  const d2 = await abrirPainel(1366, 800, '#conteudo');
  verificar('I7 no Conteúdo a lista de partes também não tem rolagem própria', true, await d2.evaluate(() => { const m = document.getElementById('ct-subnav'); return m.scrollHeight <= m.clientHeight + 2; }));
  await abrirParte(d2, 'Galeria'); await abrirParte(d2, 'Recados'); await abrirParte(d2, 'Rodapé');
  await d2.fill(CAMPO, 'Quero ir'); await d2.waitForTimeout(1000);
  verificar('I8 depois de passar por várias partes, uma edição grava um rascunho só (antes gravava um por parte visitada)', 1, (await rascunhos(d2)).length);
  await d2.reload(); await d2.waitForSelector('#app:not([hidden])'); await d2.waitForTimeout(2500); await abrirParte(d2, 'Rodapé');
  verificar('I9 alteração não salva de verdade: a tela oferece trazer de volta e NÃO diz "Tudo salvo" ao mesmo tempo',
    { oferta: true, estado: 'Há alterações guardadas neste aparelho' }, { oferta: await d2.evaluate(() => !!document.getElementById('aviso-rascunho')), estado: await estadoBarra(d2) });
  await d2.locator('#aviso-rascunho button', { hasText: 'Descartar' }).click(); await d2.waitForTimeout(300);
  verificar('I9b descartar tira a oferta e a barra volta a "Tudo salvo"', { oferta: false, estado: 'Tudo salvo', rascunhos: 0 }, { oferta: await d2.evaluate(() => !!document.getElementById('aviso-rascunho')), estado: await estadoBarra(d2), rascunhos: (await rascunhos(d2)).length });
  // rascunho que ficou velho: a parte foi salva depois (aqui simulado por outro aparelho) → nada de oferta
  await d2.fill(CAMPO, 'Rascunho velho'); await d2.waitForTimeout(1000);
  await api('POST', '/api/admin/conteudo', { 'sticky.cta_label': 'Salvo em outro aparelho' }, slugI);
  await d2.reload(); await d2.waitForSelector('#app:not([hidden])'); await d2.waitForTimeout(2500); await abrirParte(d2, 'Rodapé');
  verificar('I10 rascunho mais velho que o conteúdo salvo não é oferecido: fica só "Tudo salvo", com o valor salvo no campo',
    { oferta: false, estado: 'Tudo salvo', campo: 'Salvo em outro aparelho', rascunhos: 0 },
    { oferta: await d2.evaluate(() => !!document.getElementById('aviso-rascunho')), estado: await estadoBarra(d2), campo: await d2.inputValue(CAMPO), rascunhos: (await rascunhos(d2)).length });
  // salvar logo depois de digitar: o rascunho não renasce depois do salvamento
  await d2.fill(CAMPO, 'Confirmar já');
  await d2.locator('#tab-conteudo .savebar button.action:visible').first().click(); await d2.waitForTimeout(1500);
  verificar('I11 salvar logo depois de digitar não deixa rascunho para trás', { estado: 'Tudo salvo', rascunhos: 0, salvo: 'Confirmar já' }, { estado: await estadoBarra(d2), rascunhos: (await rascunhos(d2)).length, salvo: (await conteudoDe(slugI))['sticky.cta_label'] });

  // ---------- Save the Date: só vale depois de salvar ----------
  await abrirParte(d2, 'Save the Date');
  let gravacoes = 0;
  d2.on('request', (r) => { if (r.method() === 'POST' && /\/api\/admin\/conteudo/.test(r.url())) gravacoes++; });
  await d2.locator('label[for="std-chave"]').click(); await d2.waitForTimeout(800);
  verificar('I12 ligar o Save the Date não grava nada na hora: avisa que esconde a confirmação e espera o salvar',
    { gravacoes: 0, noServidor: '0', aviso: true, estado: 'Alterações não salvas' },
    { gravacoes, noServidor: (await conteudoDe(slugI))['config.modo_save_the_date'] || '0', aviso: /confirmação de presença/i.test(await d2.evaluate(() => { const a = document.getElementById('std-aviso'); return a && !a.hidden ? a.textContent : ''; })), estado: await estadoBarra(d2) });
  await d2.locator('#tab-conteudo .savebar button.action:visible').first().click(); await d2.waitForTimeout(1800);
  verificar('I12b depois de salvar, o Save the Date fica ligado no servidor e a faixa de aviso aparece', { noServidor: '1', faixa: true, estado: 'Tudo salvo' },
    { noServidor: (await conteudoDe(slugI))['config.modo_save_the_date'], faixa: await d2.evaluate(() => !document.getElementById('stdBar').hidden), estado: await estadoBarra(d2) });
  await api('POST', '/api/admin/conteudo', { 'config.modo_save_the_date': '0' }, slugI);

  // ---------- ajuste fino da Capa: fechado ----------
  await api('POST', '/api/admin/conteudo', { 'hero.el.nomes.dy': '12' }, slugI);
  await d2.reload(); await d2.waitForSelector('#app:not([hidden])'); await d2.waitForTimeout(2500); await abrirParte(d2, 'Capa');
  verificar('I13 na Capa, o ajuste fino aparece fechado mesmo quando o evento já tem ajustes', { existe: true, visivel: true, aberto: false },
    await d2.evaluate(() => { const a = document.getElementById('ajuste-fino'); return { existe: !!a, visivel: !!a && !a.hidden, aberto: !!a && a.open }; }));
  await d2.context().close();

  if (erros.length) resultados.push({ cenario: 'F11 erros de página no painel', esperado: [], obtido: erros.slice(0, 3), ok: false });
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
