// Teste de transições de ACESSO (convite do anfitrião, código de troca, revogação), CRIAÇÃO DE EVENTO e LEMBRANÇAS,
// pela API real. Inclui ações simultâneas (duas pessoas usando o mesmo convite ao mesmo tempo).
//
//   1. Banco local novo e servidor:  veja "Rodar no computador" no README.
//   2. node testes/api-acesso.mjs [http://localhost:8799] [slug-de-um-evento-com-convidados]
//
// ATENÇÃO: este teste CRIA eventos de teste (a API não apaga eventos). Por isso só roda em localhost, com banco descartável.
// Variáveis opcionais: ADMIN_USER e ADMIN_PASSWORD (padrão: mestre / senha123).
const BASE = process.argv[2] || 'http://localhost:8799';
const SLUG_BASE = process.argv[3] || 'casamento';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('Recusado: este teste só roda contra localhost (ele cria eventos de teste).'); process.exit(2); }
const AUTH = 'Basic ' + Buffer.from((process.env.ADMIN_USER || 'mestre') + ':' + (process.env.ADMIN_PASSWORD || 'senha123')).toString('base64');

async function chamar(metodo, caminho, corpo, { auth = AUTH, slug } = {}) {
  const url = BASE + caminho + (slug ? (caminho.includes('?') ? '&' : '?') + 'e=' + slug : '');
  const r = await fetch(url, { method: metodo, headers: Object.assign({ 'content-type': 'application/json' }, auth ? { Authorization: auth } : {}), body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text();
  try { const j = JSON.parse(t); return Array.isArray(j) ? Object.assign(j, { _http: r.status }) : Object.assign({ _http: r.status }, j); } catch (e) { return { _http: r.status, _texto: t.slice(0, 160) }; }
}
const resultados = [];
const verificar = (cenario, esperado, obtido) => resultados.push({ cenario, esperado, obtido, ok: JSON.stringify(esperado) === JSON.stringify(obtido) });
const basic = (u, s) => 'Basic ' + Buffer.from(u + ':' + s).toString('base64');

const sufixo = Math.random().toString(36).slice(2, 7);
const slug = 'teste-' + sufixo;

try {
  // ---------- criação de evento ----------
  const [c1, c2] = await Promise.all([chamar('POST', '/api/admin/eventos', { nome: 'Evento ' + sufixo, slug }), chamar('POST', '/api/admin/eventos', { nome: 'Evento ' + sufixo, slug })]);
  verificar('E1 dois pedidos ao mesmo tempo para o mesmo endereço: um cria, o outro recebe aviso claro', [200, 400], [c1._http, c2._http].sort());
  const recusado = c1._http === 400 ? c1 : c2;
  verificar('E1b o aviso é o de endereço repetido (não um erro interno)', 'Já existe um evento com esse endereço.', recusado.erro);
  verificar('E2 endereço reservado é recusado', 400, (await chamar('POST', '/api/admin/eventos', { nome: 'Admin', slug: 'admin' }))._http);

  // ---------- convite de primeiro acesso: uso único, mesmo com duas pessoas ao mesmo tempo ----------
  const convite = await chamar('POST', '/api/admin/convite-acesso', null, { slug });
  const token = String(convite.url || '').split('/entrar/')[1];
  verificar('A0 o convite é gerado', true, /^[a-f0-9]{48}$/.test(token || ''));
  const dados = (usuario) => ({ t: token, acao: 'senha', usuario, senha: 'senha-' + sufixo + '-forte' });
  const [u1, u2] = await Promise.all([chamar('POST', '/api/entrar/convite', dados('anfitriao1'), { auth: null }), chamar('POST', '/api/entrar/convite', dados('anfitriao2'), { auth: null })]);
  verificar('A1 dois usos simultâneos do mesmo convite: só um vale', [200, 410], [u1._http, u2._http].sort());
  const vencedor = u1._http === 200 ? { r: u1, usuario: 'anfitriao1' } : { r: u2, usuario: 'anfitriao2' };
  const perdedor = vencedor.usuario === 'anfitriao1' ? 'anfitriao2' : 'anfitriao1';
  verificar('A2 o convite usado não vale mais', 410, (await chamar('GET', '/api/entrar/convite?t=' + token, null, { auth: null }))._http);
  verificar('A3 quem usou o convite consegue entrar com a senha escolhida', 200, (await chamar('GET', '/api/admin/painel', null, { auth: basic(vencedor.usuario, 'senha-' + sufixo + '-forte'), slug }))._http);
  verificar('A3b quem chegou depois NÃO consegue entrar com o usuário que tentou criar', 401, (await chamar('GET', '/api/admin/painel', null, { auth: basic(perdedor, 'senha-' + sufixo + '-forte'), slug }))._http);

  // ---------- código de troca: vale uma vez, mesmo usado ao mesmo tempo ----------
  const codigo = String(vencedor.r.destino || '').split('#codigo=')[1];
  verificar('A4 o convite devolve um código de troca', true, /^[a-f0-9]{64}$/.test(codigo || ''));
  const [t1, t2] = await Promise.all([chamar('POST', '/api/entrar/trocar', { codigo }, { auth: null, slug }), chamar('POST', '/api/entrar/trocar', { codigo }, { auth: null, slug })]);
  verificar('A5 dois usos simultâneos do mesmo código de troca: só um vale', [200, 401], [t1._http, t2._http].sort());
  const sessao = (t1._http === 200 ? t1 : t2).token;
  verificar('A6 a sessão obtida abre o painel do evento', 200, (await chamar('GET', '/api/admin/painel', null, { auth: 'Bearer ' + sessao, slug }))._http);
  verificar('A6b a sessão não abre outro evento', true, [401, 403, 404].includes((await chamar('GET', '/api/admin/painel', null, { auth: 'Bearer ' + sessao, slug: SLUG_BASE }))._http));

  // ---------- revogar o acesso ----------
  const novoConvite = await chamar('POST', '/api/admin/convite-acesso', null, { slug });
  const tokenNovo = String(novoConvite.url || '').split('/entrar/')[1];
  await chamar('DELETE', '/api/admin/eventos', { slug });
  verificar('R1 revogar: a senha deixa de valer', 401, (await chamar('GET', '/api/admin/painel', null, { auth: basic(vencedor.usuario, 'senha-' + sufixo + '-forte'), slug }))._http);
  verificar('R2 revogar: a sessão aberta deixa de valer', 401, (await chamar('GET', '/api/admin/painel', null, { auth: 'Bearer ' + sessao, slug }))._http);
  verificar('R3 revogar: convite ainda não usado deixa de valer', 410, (await chamar('GET', '/api/entrar/convite?t=' + tokenNovo, null, { auth: null }))._http);

  // ---------- lembranças: duas alterações ao mesmo tempo na mesma pessoa não se apagam ----------
  const painel = await chamar('GET', '/api/admin/painel', null, { slug: SLUG_BASE });
  const pessoa = (painel.convidados || [])[0];
  const lem = await chamar('POST', '/api/admin/lembrancas/salvar', { nome: 'Teste ' + sufixo, publico: 'todos', presenca: 'qualquer', infoRotulo: 'Tamanho', infoOpcoes: ['P', 'M', 'G'] }, { slug: SLUG_BASE });
  const lemId = lem.id || (lem.lembranca && lem.lembranca.id);
  verificar('L0 a lembrança de teste é criada', true, !!lemId && !!pessoa);
  let perdas = 0;
  for (let rodada = 0; rodada < 8; rodada++) {
    await chamar('POST', '/api/admin/lembrancas/item', { lembrancaId: lemId, convidadoIds: [pessoa.id], situacao: 'auto', info: '', comentario: '' }, { slug: SLUG_BASE });
    await Promise.all([
      chamar('POST', '/api/admin/lembrancas/item', { lembrancaId: lemId, convidadoIds: [pessoa.id], situacao: 'entregue' }, { slug: SLUG_BASE }),
      chamar('POST', '/api/admin/lembrancas/item', { lembrancaId: lemId, convidadoIds: [pessoa.id], info: 'M' }, { slug: SLUG_BASE }),
      chamar('POST', '/api/admin/lembrancas/item', { lembrancaId: lemId, convidadoIds: [pessoa.id], comentario: 'caixa azul' }, { slug: SLUG_BASE }),
    ]);
    const lista = await chamar('GET', '/api/admin/lembrancas', null, { slug: SLUG_BASE });
    const it = (lista.itens || []).find((i) => i.lembrancaId === lemId && i.convidadoId === pessoa.id) || {};
    if (it.situacao !== 'entregue' || it.info !== 'M' || it.comentario !== 'caixa azul') perdas++;
  }
  verificar('L1 situação, informação e comentário alterados ao mesmo tempo ficam todos gravados (8 rodadas)', 0, perdas);
  // desmarcar tudo apaga a linha (nada vazio fica no banco)
  await chamar('POST', '/api/admin/lembrancas/item', { lembrancaId: lemId, convidadoIds: [pessoa.id], situacao: 'auto', info: '', comentario: '' }, { slug: SLUG_BASE });
  const apos = await chamar('GET', '/api/admin/lembrancas', null, { slug: SLUG_BASE });
  verificar('L2 voltar ao automático e limpar apaga a linha', 0, (apos.itens || []).filter((i) => i.lembrancaId === lemId).length);
  await chamar('POST', '/api/admin/lembrancas/excluir', { id: lemId }, { slug: SLUG_BASE });
} catch (erro) {
  resultados.push({ cenario: 'ERRO NO TESTE', esperado: 'sem exceção', obtido: String((erro && erro.message) || erro), ok: false });
}

let falhas = 0;
for (const r of resultados) {
  if (!r.ok) falhas++;
  console.log((r.ok ? 'APROVADO  ' : 'REPROVADO ') + r.cenario + (r.ok ? '' : '\n    esperado: ' + JSON.stringify(r.esperado) + '\n    obtido:   ' + JSON.stringify(r.obtido)));
}
console.log('\n' + (resultados.length - falhas) + ' de ' + resultados.length + ' aprovados');
process.exit(falhas ? 1 : 0);
