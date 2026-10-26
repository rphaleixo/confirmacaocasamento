import { jsonResponse, recalcularStatusGrupo, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

const limpar = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 60);

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB
    .prepare(
      `SELECT c.id, c.nome, c.codigo_grupo AS grupoAtual, g.nome_grupo AS grupoAtualNome
       FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo
       WHERE g.evento_id = ?
       ORDER BY c.nome`
    )
    .bind(evento.id)
    .all();
  return jsonResponse(results);
}

// body: { nome, telefone, codigoGrupo, tipo, responsavel? } — adiciona 1 convidado a um grupo já existente
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const nome = (payload.nome || '').trim();
  const codigoGrupo = (payload.codigoGrupo || '').trim().toUpperCase();
  const tipo = payload.tipo === 'crianca' ? 'crianca' : 'adulto';
  if (!nome) return jsonResponse({ erro: 'Dê um nome pro convidado.' }, 400);
  if (!codigoGrupo) return jsonResponse({ erro: 'Escolha um grupo.' }, 400);

  const db = env.DB;
  const grupo = await db.prepare('SELECT 1 FROM grupos WHERE codigo = ? AND evento_id = ?').bind(codigoGrupo, evento.id).first();
  if (!grupo) return jsonResponse({ erro: 'Grupo não encontrado.' }, 404);

  await db
    .prepare('INSERT INTO convidados (nome, telefone, codigo_grupo, confirmado, tipo, como_chamar, tratamento) VALUES (?, ?, ?, 0, ?, ?, ?)')
    .bind(nome, payload.telefone || '', codigoGrupo, tipo, limpar(payload.comoChamar), limpar(payload.tratamento))
    .run();

  const responsavel = (payload.responsavel || '').trim();
  if (responsavel) {
    await db.prepare('UPDATE grupos SET responsavel = ? WHERE codigo = ?').bind(responsavel, codigoGrupo).run();
  }

  await recalcularStatusGrupo(db, codigoGrupo);
  return jsonResponse({ ok: true });
}

// body: { id, nome?, telefone?, tipo?, comoChamar?, tratamento? } — edita um convidado (só o que vier no corpo)
export async function onRequestPatch({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const id = Number(payload.id);
  if (!id) return jsonResponse({ erro: 'Convidado não informado.' }, 400);
  const db = env.DB;
  const atual = await db.prepare('SELECT c.* FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.id = ? AND g.evento_id = ?').bind(id, evento.id).first();
  if (!atual) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  const nome = payload.nome !== undefined ? String(payload.nome).trim() : atual.nome;
  if (!nome) return jsonResponse({ erro: 'O convidado precisa de um nome.' }, 400);
  const tipo = payload.tipo === undefined ? atual.tipo : payload.tipo === 'crianca' ? 'crianca' : 'adulto';
  await db
    .prepare('UPDATE convidados SET nome = ?, telefone = ?, tipo = ?, como_chamar = ?, tratamento = ? WHERE id = ?')
    .bind(
      nome,
      payload.telefone !== undefined ? String(payload.telefone).trim() : atual.telefone,
      tipo,
      payload.comoChamar !== undefined ? limpar(payload.comoChamar) : atual.como_chamar,
      payload.tratamento !== undefined ? limpar(payload.tratamento) : atual.tratamento,
      id
    )
    .run();
  return jsonResponse({ ok: true });
}

// body: { id } — remove um convidado (e o que foi anotado sobre ele nas lembranças). Se o grupo ficar vazio, o grupo também sai.
export async function onRequestDelete({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const id = Number(payload.id);
  if (!id) return jsonResponse({ erro: 'Convidado não informado.' }, 400);
  const db = env.DB;
  const c = await db.prepare('SELECT c.id, c.codigo_grupo FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.id = ? AND g.evento_id = ?').bind(id, evento.id).first();
  if (!c) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);
  await db.batch([
    db.prepare('DELETE FROM lembranca_itens WHERE convidado_id = ? AND evento_id = ?').bind(id, evento.id),
    db.prepare('DELETE FROM convidados WHERE id = ?').bind(id),
  ]);
  const { n } = await db.prepare('SELECT COUNT(*) AS n FROM convidados WHERE codigo_grupo = ?').bind(c.codigo_grupo).first();
  if (n === 0) await db.prepare('DELETE FROM grupos WHERE codigo = ? AND evento_id = ?').bind(c.codigo_grupo, evento.id).run();
  else await recalcularStatusGrupo(db, c.codigo_grupo);
  return jsonResponse({ ok: true, grupoRemovido: n === 0 });
}
