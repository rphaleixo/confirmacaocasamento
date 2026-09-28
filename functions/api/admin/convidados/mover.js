import { jsonResponse, recalcularStatusGrupo } from '../../../_lib.js';

// body: { id, novoCodigoGrupo }
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const { id, novoCodigoGrupo } = payload;
  if (!id || !novoCodigoGrupo) return jsonResponse({ erro: 'Dados incompletos.' }, 400);

  const db = env.DB;
  const atual = await db.prepare('SELECT codigo_grupo FROM convidados WHERE id = ?').bind(id).first();
  if (!atual) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  const origem = await db.prepare('SELECT evento_id FROM grupos WHERE codigo = ?').bind(atual.codigo_grupo).first();
  const destino = await db.prepare('SELECT evento_id FROM grupos WHERE codigo = ?').bind(novoCodigoGrupo).first();
  if (!destino) return jsonResponse({ erro: 'Grupo de destino não encontrado.' }, 404);
  if (origem && origem.evento_id !== destino.evento_id) return jsonResponse({ erro: 'Não dá pra mover convidado entre eventos diferentes.' }, 400);

  await db.prepare('UPDATE convidados SET codigo_grupo = ? WHERE id = ?').bind(novoCodigoGrupo, id).run();

  if (atual.codigo_grupo) await recalcularStatusGrupo(db, atual.codigo_grupo);
  await recalcularStatusGrupo(db, novoCodigoGrupo);

  return jsonResponse({ ok: true });
}
