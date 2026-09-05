// API pública de RSVP — sem autenticação, é o que o convidado usa a partir do link ?c=CODIGO
import { jsonResponse, recalcularStatusGrupo } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const codigo = (url.searchParams.get('c') || '').trim().toUpperCase();
  if (!codigo) return jsonResponse({ erro: 'Código não informado.' });

  const db = env.DB;
  const grupo = await db.prepare('SELECT * FROM grupos WHERE codigo = ?').bind(codigo).first();
  if (!grupo) return jsonResponse({ erro: 'Convite não encontrado. Confira o link recebido.' });

  if (grupo.status_abertura !== 'Aberto') {
    await db
      .prepare('UPDATE grupos SET status_abertura = ?, data_abertura = ? WHERE codigo = ?')
      .bind('Aberto', new Date().toISOString(), codigo)
      .run();
  }

  const { results } = await db
    .prepare('SELECT nome, confirmado, tipo FROM convidados WHERE codigo_grupo = ? ORDER BY id')
    .bind(codigo)
    .all();

  return jsonResponse({
    grupo: grupo.nome_grupo,
    convidados: results.map((r) => ({ nome: r.nome, confirmado: r.confirmado === 1, tipo: r.tipo })),
    statusConfirmacao: grupo.status_confirmacao,
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
  const grupo = await db.prepare('SELECT codigo FROM grupos WHERE codigo = ?').bind(codigo).first();
  if (!grupo) return jsonResponse({ erro: 'Convite não encontrado. Confira o link recebido.' });

  for (const c of payload.convidados || []) {
    await db
      .prepare('UPDATE convidados SET confirmado = ? WHERE codigo_grupo = ? AND nome = ?')
      .bind(c.confirmado ? 1 : 0, codigo, c.nome)
      .run();
  }

  await db
    .prepare(
      'UPDATE grupos SET responsavel = ?, contato_responsavel = ?, data_confirmacao = ? WHERE codigo = ?'
    )
    .bind(payload.responsavel || '', payload.contatoResponsavel || '', new Date().toISOString(), codigo)
    .run();

  await recalcularStatusGrupo(db, codigo);
  return jsonResponse({ ok: true });
}
