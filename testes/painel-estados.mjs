// Teste do PAINEL no navegador: situação do grupo, aviso de alterações não salvas e edição durante o salvamento.
//
//   1. Servidor local rodando (README, "Rodar no computador"), com os dados de exemplo.
//   2. Playwright instalado (npm i -D playwright && npx playwright install chromium) ou PLAYWRIGHT_PATH apontando para a pasta
//      node_modules global (ex.: PLAYWRIGHT_PATH=/opt/node22/lib/node_modules/).
//   3. node testes/painel-estados.mjs [http://localhost:8799] [slug-do-evento]
//
// Sai com código 1 se algum cenário falhar. Cria e remove um grupo próprio; não altera os dados de exemplo.
import { createRequire } from 'node:module';
const require = createRequire(process.env.PLAYWRIGHT_PATH || import.meta.url);
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8799';
const SLUG = process.argv[3] || 'casamento';
const USER = process.env.ADMIN_USER || 'mestre', PASS = process.env.ADMIN_PASSWORD || 'senha123';
const AUTH = 'Basic ' + Buffer.from(USER + ':' + PASS).toString('base64');

async function api(metodo, caminho, corpo, auth = true) {
  const r = await fetch(BASE + caminho + (caminho.startsWith('/api/admin') ? (caminho.includes('?') ? '&' : '?') + 'e=' + SLUG : ''), {
    method: metodo, headers: Object.assign({ 'content-type': 'application/json' }, auth ? { Authorization: AUTH } : {}), body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { _texto: t }; }
}

const resultados = [];
const verificar = (cenario, esperado, obtido) => resultados.push({ cenario, esperado, obtido, ok: JSON.stringify(esperado) === JSON.stringify(obtido) });

const sufixo = Math.random().toString(36).slice(2, 6).toUpperCase();
const codigo = 'P' + sufixo + '1', nomeGrupo = 'Grupo Teste ' + sufixo;

// as caixas de marcar do painel são "interruptores" com a caixa escondida: muda o valor e avisa a tela como o navegador faria
const alternar = (loc, valor) => loc.evaluate((el, v) => { el.checked = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, valor);

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const erros = [];
try {
  await api('POST', '/api/admin/grupos', { nomeGrupo, codigo });
  for (const n of ['Ana', 'Beto']) await api('POST', '/api/admin/convidados', { nome: n + ' ' + sufixo, codigoGrupo: codigo, tipo: 'adulto' });
  const ids = ((await api('GET', '/api/admin/painel')).convidados || []).filter((c) => c.codigoGrupo === codigo).map((c) => c.id);
  const responde = (respostas) => api('POST', '/api/rsvp', { codigo, responsavel: 'Maria', contatoResponsavel: '(41) 99999-0000', respostas: ids.map((id, i) => ({ id, resposta: respostas[i] })) }, false);

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto(BASE + '/admin/?e=' + SLUG + '#painel');
  await page.fill('#loginUsuario', USER); await page.fill('#loginSenha', PASS);
  await page.click('#loginBtn');
  await page.waitForSelector('#app:not([hidden])');
  await page.waitForTimeout(1200);

  // ---------- situação do grupo (a mesma regra no painel, no CSV e no servidor) ----------
  const rotuloDoGrupo = async () => {
    await page.evaluate(() => { location.hash = 'convidados'; });
    await page.reload(); await page.waitForSelector('#app:not([hidden])'); await page.waitForTimeout(1500);
    const el = page.locator('.grupo-topo', { hasText: nomeGrupo }).first();
    return (await el.locator('.chip').first().textContent().catch(() => null) || '').trim();
  };
  await responde(['sim', 'sim']);
  verificar('P1 todos "sim" aparece como Confirmado', 'Confirmado', await rotuloDoGrupo());
  await responde(['sim', 'nao']);
  verificar('P2 um "sim" e um "não" aparece como Parcial', 'Parcial: 1 de 2', await rotuloDoGrupo());
  await api('POST', '/api/admin/confirmar', { ids, resposta: '' });
  verificar('P3 anfitrião limpa todas as respostas: o grupo NÃO vira "Não vão"', true, ['Não abriu o convite', 'Abriu, sem resposta'].includes(await rotuloDoGrupo()));
  await responde(['nao', 'nao']);
  verificar('P4 todos "não" aparece como Não vão', 'Não vão', await rotuloDoGrupo());

  // CSV: a coluna "Status confirmação" usa o mesmo texto do painel
  await page.goto(BASE + '/admin/?e=' + SLUG + '#painel');
  await page.waitForSelector('#btn-baixar-csv', { state: 'attached' }); await page.waitForTimeout(1500);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('btn-baixar-csv').click())]);
  const csv = await (await import('node:fs')).promises.readFile(await dl.path(), 'utf8');
  const linhaCsv = csv.split('\n').find((l) => l.includes('Ana ' + sufixo)) || '';
  verificar('P5 CSV usa o mesmo texto da situação que o painel', true, linhaCsv.includes('"Não vão"'));

  // ---------- alterações não salvas: trocar de aba por fora do menu ----------
  await page.goto(BASE + '/admin/?e=' + SLUG + '#conteudo');
  await page.waitForSelector('#app:not([hidden])'); await page.waitForTimeout(1500);
  // usa a primeira caixa de marcar visível da aba (não depende de texto de nenhum módulo)
  const campo = page.locator('#tab-conteudo input[type=checkbox][data-chave]').first();
  const marcadoAntes = await campo.isChecked();
  await alternar(campo, !marcadoAntes);
  await page.waitForTimeout(200);
  await page.evaluate(() => { location.hash = 'painel'; });   // o mesmo que o botão Voltar/Avançar do navegador
  await page.waitForTimeout(500);
  const avisou = await page.getByText('Sair sem salvar?').isVisible().catch(() => false);
  verificar('P6 trocar de aba com alteração pendente (sem usar o menu) pergunta antes', { avisou: true, hash: '#conteudo' }, { avisou, hash: await page.evaluate(() => location.hash) });
  if (avisou) {
    await page.getByRole('button', { name: 'Sair sem salvar' }).click(); await page.waitForTimeout(600);
    verificar('P7 confirmar o aviso leva para a aba pedida', '#painel', await page.evaluate(() => location.hash));
  }

  // ---------- editar enquanto salva ----------
  await page.goto(BASE + '/admin/?e=' + SLUG + '#conteudo');
  await page.waitForSelector('#app:not([hidden])'); await page.waitForTimeout(1500);
  const c2 = page.locator('#tab-conteudo input[type=checkbox][data-chave]').first();
  const v2 = await c2.isChecked();
  let liberar;
  const segura = new Promise((r) => { liberar = r; });
  await page.route('**/api/admin/conteudo*', async (rota) => {
    if (rota.request().method() === 'POST') { await segura; await rota.continue(); } else await rota.continue();
  });
  await alternar(c2, !v2);
  await page.locator('#tab-conteudo .savebar button.action:visible').first().click();
  await page.waitForTimeout(300);
  await alternar(c2, v2);             // continua mexendo enquanto o salvamento está em andamento
  await page.waitForTimeout(200);
  liberar(); await page.waitForTimeout(1200);
  const estado = (await page.locator('#tab-conteudo .savebar .estado:visible').first().textContent()).trim();
  verificar('P8 editar durante o salvamento: a tela continua "não salva"', 'Alterações não salvas', estado);
  // desfaz a alteração de teste no conteúdo
  await page.unroute('**/api/admin/conteudo*');
  await alternar(c2, v2);
  await page.locator('#tab-conteudo .savebar button.action:visible').first().click(); await page.waitForTimeout(1000);
  // ---------- publicar: clique repetido não envia duas vezes ----------
  await api('POST', '/api/admin/publicacao', { publicado: false });
  await page.evaluate((slug) => localStorage.setItem('rsvp-assist-visto:' + slug, '1'), SLUG); // senão o assistente de primeiro acesso abre sozinho por cima
  await page.goto(BASE + '/admin/?e=' + SLUG + '#painel');
  await page.waitForSelector('#faixaRascunho:not([hidden])'); await page.waitForTimeout(800);
  let envios = 0;
  page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/admin\/publicacao/.test(r.url())) envios++; });
  await page.locator('#faixaRascunho button', { hasText: 'Publicar' }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Publicar agora' }).dblclick();
  await page.waitForTimeout(1500);
  verificar('P9 clique duplo em "Publicar agora" envia uma só vez', 1, envios);
  verificar('P9b o convite aparece como publicado', true, !!(await api('GET', '/api/admin/publicacao')).publicado);
  await ctx.close();
} catch (e) {
  resultados.push({ cenario: 'ERRO NO TESTE', esperado: 'sem exceção', obtido: String((e && e.message) || e).split('\n')[0], ok: false });
} finally {
  await api('POST', '/api/admin/publicacao', { publicado: true }).catch(() => {}); // o evento de exemplo volta a ficar publicado
  await api('DELETE', '/api/admin/grupos', { codigo }).catch(() => {});
  await browser.close();
}

let falhas = 0;
for (const r of resultados) {
  if (!r.ok) falhas++;
  console.log((r.ok ? 'APROVADO  ' : 'REPROVADO ') + r.cenario + (r.ok ? '' : '\n    esperado: ' + JSON.stringify(r.esperado) + '\n    obtido:   ' + JSON.stringify(r.obtido)));
}
if (erros.length) console.log('Erros de página:', erros.slice(0, 5).join(' | '));
console.log('\n' + (resultados.length - falhas) + ' de ' + resultados.length + ' aprovados');
process.exit(falhas ? 1 : 0);
