// API pública de RSVP — sem autenticação, é o que o convidado usa a partir do link ?c=CODIGO
// O código pode ser de um grupo (todos respondem juntos) ou individual (só aquela pessoa responde).
// Cada pessoa responde "sim", "não sei" ou "não", e pode mudar de ideia até o fim do prazo do evento.
import { jsonResponse, recalcularStatusGrupo, nomeParaChamar } from '../_lib.js';

const RESPOSTAS = ['sim', 'nao_sei', 'nao'];

// Acha o grupo (e, se for o caso, a pessoa) a que o código pertence
async function resolverCodigo(db, codigo) {
  let grupo = await db.prepare('SELECT * FROM grupos WHERE codigo = ?').bind(codigo).first();
  if (grupo) return { grupo, individual: null };
  const pessoa = await db.prepare('SELECT * FROM convidados WHERE codigo_individual = ?').bind(codigo).first();
  if (!pessoa) return null;
  grupo = await db.prepare('SELECT * FROM grupos WHERE codigo = ?').bind(pessoa.codigo_grupo).first();
  return grupo ? { grupo, individual: pessoa } : null;
}

// O prazo é o do evento (Capa › Data e prazo). Sem prazo definido, a resposta fica sempre aberta.
async function prazoEncerrado(db, eventoId) {
  const row = await db.prepare("SELECT valor FROM conteudo WHERE evento_id = ? AND chave = 'hero.prazo_iso'").bind(eventoId).first();
  const limite = row && row.valor ? new Date(row.valor).getTime() : NaN;
  return { encerrado: Number.isFinite(limite) && Date.now() > limite, limite: Number.isFinite(limite) ? row.valor : '' };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const codigo = (url.searchParams.get('c') || '').trim().toUpperCase();
  if (!codigo) return jsonResponse({ erro: 'Código não informado.' });

  const db = env.DB;
  const achou = await resolverCodigo(db, codigo);
  if (!achou) return jsonResponse({ erro: 'Convite não encontrado. Confira o link recebido.' });
  const { grupo, individual } = achou;

  if (grupo.status_abertura !== 'Aberto') {
    await db
      .prepare('UPDATE grupos SET status_abertura = ?, data_abertura = ? WHERE codigo = ?')
      .bind('Aberto', new Date().toISOString(), grupo.codigo)
      .run();
  }

  const { results: todos } = await db.prepare('SELECT * FROM convidados WHERE codigo_grupo = ? ORDER BY id').bind(grupo.codigo).all();
  const results = individual ? todos.filter((r) => r.id === individual.id) : todos;
  // para avisar "só crianças confirmadas": quantos adultos o grupo tem e quantos, fora deste link, já disseram sim
  const adultosNoGrupo = todos.filter((r) => r.tipo !== 'crianca').length;
  const outrosAdultosSim = todos.filter((r) => r.tipo !== 'crianca' && r.resposta === 'sim' && !results.some((x) => x.id === r.id)).length;
  const prazo = await prazoEncerrado(db, grupo.evento_id);

  return jsonResponse({
    escopo: individual ? 'individual' : 'grupo',
    grupo: grupo.nome_grupo,
    convidados: results.map((r) => ({ id: r.id, nome: r.nome, tipo: r.tipo, resposta: r.resposta || null, chamar: nomeParaChamar(r) })),
    adultosNoGrupo,
    outrosAdultosSim,
    respondeu: results.some((r) => !!r.resposta),
    statusConfirmacao: grupo.status_confirmacao,
    prazoEncerrado: prazo.encerrado,
    prazoIso: prazo.limite,
  });
}

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch (e) {
    return jsonResponse({ erro: 'Não entendi os dados enviados.' });
  }

  const codigo = String(payload.codigo || '').trim().toUpperCase();
  if (!codigo) return jsonResponse({ erro: 'Código não informado.' });

  const db = env.DB;
  const achou = await resolverCodigo(db, codigo);
  if (!achou) return jsonResponse({ erro: 'Convite não encontrado. Confira o link recebido.' });
  const { grupo, individual } = achou;

  const prazo = await prazoEncerrado(db, grupo.evento_id);
  if (prazo.encerrado) return jsonResponse({ erro: 'O prazo para confirmar terminou. Se precisar mudar algo, fale com quem enviou o convite.' });

  // quem pode ser alterado por este código: o grupo inteiro ou só a pessoa do link individual
  const { results: doGrupo } = individual
    ? { results: [individual] }
    : await db.prepare('SELECT id, nome FROM convidados WHERE codigo_grupo = ?').bind(grupo.codigo).all();
  const permitidos = new Map(doGrupo.map((c) => [c.id, c]));

  // formato atual: respostas [{ id, resposta }]; o formato antigo (convidados [{ nome, confirmado }]) ainda é entendido
  let respostas = Array.isArray(payload.respostas) ? payload.respostas : [];
  if (!respostas.length && Array.isArray(payload.convidados)) {
    const porNome = new Map(doGrupo.map((c) => [String(c.nome).trim().toLowerCase(), c.id]));
    respostas = payload.convidados.map((c) => ({ id: porNome.get(String(c.nome || '').trim().toLowerCase()), resposta: c.confirmado ? 'sim' : 'nao' }));
  }
  const validas = respostas.filter((r) => permitidos.has(Number(r.id)) && RESPOSTAS.includes(r.resposta));
  if (!validas.length) return jsonResponse({ erro: 'Escolha uma resposta para cada pessoa.' });

  for (const r of validas) {
    await db.prepare('UPDATE convidados SET resposta = ?, confirmado = ? WHERE id = ?').bind(r.resposta, r.resposta === 'sim' ? 1 : 0, Number(r.id)).run();
  }

  await db
    .prepare('UPDATE grupos SET responsavel = ?, contato_responsavel = ?, data_confirmacao = ? WHERE codigo = ?')
    .bind(payload.responsavel || '', payload.contatoResponsavel || '', new Date().toISOString(), grupo.codigo)
    .run();

  await recalcularStatusGrupo(db, grupo.codigo);
  return jsonResponse({ ok: true });
}
