import { jsonResponse, recalcularStatusGrupo, resolverEvento, eventoNaoEncontrado } from '../../../_lib.js';

// body: { id, novoCodigoGrupo }
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const { id, novoCodigoGrupo } = payload;
  if (!id || !novoCodigoGrupo) return jsonResponse({ erro: 'Dados incompletos.' }, 400);

  const db = env.DB;
  const evento = await resolverEvento(db, request);
  if (!evento) return eventoNaoEncontrado();
  const atual = await db.prepare('SELECT c.codigo_grupo FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.id = ? AND g.evento_id = ?').bind(id, evento.id).first();
  if (!atual) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  const destino = await db.prepare('SELECT evento_id FROM grupos WHERE codigo = ?').bind(novoCodigoGrupo).first();
  if (!destino) return jsonResponse({ erro: 'Grupo de destino não encontrado.' }, 404);
  if (destino.evento_id !== evento.id) return jsonResponse({ erro: 'Grupo de destino não encontrado.' }, 404);

  await db.prepare('UPDATE convidados SET codigo_grupo = ? WHERE id = ?').bind(novoCodigoGrupo, id).run();

  if (atual.codigo_grupo) await recalcularStatusGrupo(db, atual.codigo_grupo);
  await recalcularStatusGrupo(db, novoCodigoGrupo);

  return jsonResponse({ ok: true });
}
