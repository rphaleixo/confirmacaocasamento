// Teste de transições de estado do GRUPO e das RESPOSTAS, pela API real (precisa do servidor local rodando).
//
//   1. Banco local novo e servidor:  veja "Rodar no computador" no README.
//   2. node testes/api-estados.mjs [http://localhost:8799] [slug-do-evento]
//
// Variáveis opcionais: ADMIN_USER e ADMIN_PASSWORD (padrão: mestre / senha123, os do README com --binding).
// Cada execução cria grupos próprios (código aleatório) e os remove no fim; não mexe nos dados de exemplo.
// Sai com código 1 se algum cenário falhar.
const BASE = process.argv[2] || 'http://localhost:8799';
const SLUG = process.argv[3] || 'casamento';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) { console.error('Recusado: este teste só roda contra localhost.'); process.exit(2); }
const AUTH = 'Basic ' + Buffer.from((process.env.ADMIN_USER || 'mestre') + ':' + (process.env.ADMIN_PASSWORD || 'senha123')).toString('base64');

async function chamar(metodo, caminho, corpo, comAuth = true) {
  const sep = caminho.includes('?') ? '&' : '?';
  const r = await fetch(BASE + caminho + (caminho.startsWith('/api/admin') ? sep + 'e=' + SLUG : ''), {
    method: metodo,
    headers: Object.assign({ 'content-type': 'application/json' }, comAuth ? { Authorization: AUTH } : {}),
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  try { const j = JSON.parse(texto); return Array.isArray(j) ? j : Object.assign({ _http: r.status }, j); } catch (e) { return { _http: r.status, _texto: texto.slice(0, 200) }; }
}

const resultados = [];
function verificar(cenario, esperado, obtido) {
  const ok = JSON.stringify(esperado) === JSON.stringify(obtido);
  resultados.push({ cenario, esperado, obtido, ok });
}

const sufixo = Math.random().toString(36).slice(2, 6).toUpperCase();
const criados = [];
async function novoGrupo(nome, pessoas, responsavel) {
  const codigo = 'T' + sufixo + String(criados.length + 1);
  const g = await chamar('POST', '/api/admin/grupos', { nomeGrupo: nome + ' ' + sufixo, codigo, responsavel: responsavel || '' });
  if (!g.codigo) throw new Error('Não criou o grupo: ' + JSON.stringify(g));
  criados.push(codigo);
  for (const n of pessoas) await chamar('POST', '/api/admin/convidados', { nome: n + ' ' + sufixo, codigoGrupo: codigo, tipo: 'adulto' });
  return codigo;
}
async function estado(codigo) {
  const p = await chamar('GET', '/api/admin/painel');
  const linhas = (p.convidados || []).filter((c) => c.codigoGrupo === codigo);
  const l = linhas[0] || {};
  return { status: l.statusConfirmacao, abertura: l.statusAbertura, dataConfirmacao: l.dataConfirmacao || null, responsavel: l.responsavel || null, respostas: linhas.map((c) => c.resposta || null), ids: linhas.map((c) => c.id) };
}
const statusLista = async (codigo) => ((await chamar('GET', '/api/admin/grupos')).find((g) => g.codigo === codigo) || {}).status;
const convidadoResponde = (codigo, ids, respostas, extra) => chamar('POST', '/api/rsvp', Object.assign({ codigo, responsavel: 'Maria Teste', contatoResponsavel: '(41) 99999-0000', respostas: ids.map((id, i) => ({ id, resposta: respostas[i] })) }, extra), false);
const anfitriaoMarca = (ids, resposta) => chamar('POST', '/api/admin/confirmar', { ids, resposta });

try {
  // T1 — grupo recém-criado, sem pessoas
  const g0 = await chamar('POST', '/api/admin/grupos', { nomeGrupo: 'Vazio ' + sufixo, codigo: 'T' + sufixo + '0' });
  criados.push(g0.codigo);
  verificar('T1 grupo vazio recém-criado', 'Pendente', await statusLista(g0.codigo));

  // T2..T7 — o ciclo de vida de um grupo de duas pessoas
  const A = await novoGrupo('Ana e Beto', ['Ana', 'Beto']);
  let e = await estado(A);
  verificar('T2 pessoas adicionadas, link não aberto', { status: 'Pendente', abertura: 'Não aberto' }, { status: e.status, abertura: e.abertura });

  await chamar('GET', '/api/rsvp?c=' + A, null, false);
  e = await estado(A);
  verificar('T3 convidado abre o link (ainda sem resposta)', { status: 'Aguardando resposta', abertura: 'Aberto' }, { status: e.status, abertura: e.abertura });

  await convidadoResponde(A, e.ids, ['nao', 'nao']);
  e = await estado(A);
  verificar('T4 todos respondem "não"', 'Não vão', e.status);

  await convidadoResponde(A, e.ids, ['nao_sei', 'nao']);
  e = await estado(A);
  verificar('T5 um "não sei" e um "não"', 'Em dúvida', e.status);

  await convidadoResponde(A, e.ids, ['sim', 'nao']);
  e = await estado(A);
  verificar('T6 um "sim" e um "não"', 'Parcial (1/2)', e.status);

  await convidadoResponde(A, e.ids, ['sim', 'sim']);
  e = await estado(A);
  verificar('T7 todos "sim"', 'Confirmado', e.status);
  verificar('T7b nome do responsável vem do convidado', 'Maria Teste', e.responsavel);

  // T8 — anfitrião corrige uma resposta: o nome que o convidado informou NÃO pode ser apagado
  await anfitriaoMarca([e.ids[1]], 'nao');
  e = await estado(A);
  verificar('T8 anfitrião muda uma resposta: status', 'Parcial (1/2)', e.status);
  verificar('T8b anfitrião muda uma resposta: responsável preservado', 'Maria Teste', e.responsavel);

  // T9 — anfitrião limpa todas as respostas: o grupo volta a "sem resposta" (nunca "Não vão")
  await anfitriaoMarca(e.ids, '');
  e = await estado(A);
  verificar('T9 anfitrião limpa todas as respostas', { status: 'Aguardando resposta', dataConfirmacao: null, respostas: [null, null] }, { status: e.status, dataConfirmacao: e.dataConfirmacao, respostas: e.respostas });

  // T10 — anfitrião marca num grupo que nunca respondeu: registra que foi manual
  const B = await novoGrupo('Carla e Davi', ['Carla', 'Davi']);
  let eb = await estado(B);
  await anfitriaoMarca(eb.ids, 'sim');
  eb = await estado(B);
  verificar('T10 anfitrião confirma grupo sem resposta', { status: 'Confirmado', responsavel: 'Confirmado manualmente pelos noivos' }, { status: eb.status, responsavel: eb.responsavel });

  // T11 — remover quem disse "não" recalcula o grupo
  const C = await novoGrupo('Eva e Fábio', ['Eva', 'Fábio']);
  let ec = await estado(C);
  await convidadoResponde(C, ec.ids, ['sim', 'nao']);
  ec = await estado(C);
  verificar('T11a antes de remover', 'Parcial (1/2)', ec.status);
  await chamar('DELETE', '/api/admin/convidados', { id: ec.ids[1] });
  ec = await estado(C);
  verificar('T11b depois de remover quem disse "não"', 'Confirmado', ec.status);

  // T12 — respostas inválidas e código inexistente não alteram nada
  const D = await novoGrupo('Gil e Hana', ['Gil', 'Hana']);
  let ed = await estado(D);
  const inval = await convidadoResponde(D, ed.ids, ['talvez', 'sim']);
  ed = await estado(D);
  verificar('T12a resposta inválida só vale para a pessoa com resposta válida', { respostas: [null, 'sim'] }, { respostas: ed.respostas });
  const semCod = await chamar('POST', '/api/rsvp', { codigo: 'ZZZZZZ', respostas: [] }, false);
  verificar('T12b código inexistente é recusado', 'Convite não encontrado. Confira o link recebido.', semCod.erro);
  const vazio = await convidadoResponde(D, ed.ids, ['x', 'y']);
  verificar('T12c nenhuma resposta válida é recusada', 'Escolha uma resposta para cada pessoa.', vazio.erro);

  // T13 — dois envios ao mesmo tempo para o mesmo grupo: o resultado é sempre um estado válido (nenhuma pessoa fica pela metade)
  const E = await novoGrupo('Iara e João', ['Iara', 'João']);
  let ee = await estado(E);
  await Promise.all([convidadoResponde(E, ee.ids, ['sim', 'sim']), convidadoResponde(E, ee.ids, ['nao', 'nao'])]);
  ee = await estado(E);
  const par = ee.respostas.join('/');
  verificar('T13 envios simultâneos deixam as duas pessoas coerentes', true, par === 'sim/sim' || par === 'nao/nao');
} catch (erro) {
  resultados.push({ cenario: 'ERRO NO TESTE', esperado: 'sem exceção', obtido: String(erro && erro.message || erro), ok: false });
} finally {
  for (const c of criados) await chamar('DELETE', '/api/admin/grupos', { codigo: c }).catch(() => {});
}

let falhas = 0;
for (const r of resultados) {
  if (!r.ok) falhas++;
  console.log((r.ok ? 'APROVADO  ' : 'REPROVADO ') + r.cenario + (r.ok ? '' : '\n    esperado: ' + JSON.stringify(r.esperado) + '\n    obtido:   ' + JSON.stringify(r.obtido)));
}
console.log('\n' + (resultados.length - falhas) + ' de ' + resultados.length + ' aprovados');
process.exit(falhas ? 1 : 0);
