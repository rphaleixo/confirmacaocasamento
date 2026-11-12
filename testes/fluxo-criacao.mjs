// Teste do FLUXO DE CRIAÇÃO DO CONVITE: evento novo nasce sem dados inventados, checklist, bloqueio de publicação,
// prévia do assistente e marca de exemplo (etapa 1); criação em uma tela, nomes na criação e link de primeiro acesso (etapa 2).
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
  verificar('F6 janela de publicação avisa o que falta (nomes e data)', true, /nomes do casal e dia e hora/i.test(aviso));
  verificar('F6b o botão "Publicar agora" fica desativado', true, await page.getByRole('button', { name: 'Publicar agora' }).isDisabled());
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
