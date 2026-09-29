import { jsonResponse, recalcularStatusGrupo, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

// body: { id, resposta } — resposta: 'sim' | 'nao_sei' | 'nao' | '' (sem resposta). Também aceita { id, confirmado } (formato antigo).
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const { id } = payload;
  if (!id) return jsonResponse({ erro: 'Convidado não informado.' }, 400);
  let resposta = payload.resposta;
  if (resposta === undefined) resposta = payload.confirmado ? 'sim' : 'nao';
  if (!['sim', 'nao_sei', 'nao', ''].includes(resposta)) return jsonResponse({ erro: 'Resposta inválida.' }, 400);

  const db = env.DB;
  const evento = await resolverEvento(db, request);
  if (!evento) return eventoNaoEncontrado();
  const convidado = await db.prepare('SELECT c.codigo_grupo FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.id = ? AND g.evento_id = ?').bind(id, evento.id).first();
  if (!convidado) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  await db.prepare('UPDATE convidados SET resposta = ?, confirmado = ? WHERE id = ?').bind(resposta || null, resposta === 'sim' ? 1 : 0, id).run();

  await db
    .prepare("UPDATE grupos SET responsavel = 'Confirmado manualmente pelos noivos', data_confirmacao = ? WHERE codigo = ?")
    .bind(new Date().toISOString(), convidado.codigo_grupo)
    .run();

  const status = await recalcularStatusGrupo(db, convidado.codigo_grupo);
  return jsonResponse({ ok: true, status });
}
