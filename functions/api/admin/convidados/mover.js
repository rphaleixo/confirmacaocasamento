import { jsonResponse, recalcularStatusGrupo } from '../../../_lib.js';

// body: { id, novoCodigoGrupo }
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const { id, novoCodigoGrupo } = payload;
  if (!id || !novoCodigoGrupo) return jsonResponse({ erro: 'Dados incompletos.' }, 400);

  const db = env.DB;
  const atual = await db.prepare('SELECT codigo_grupo FROM convidados WHERE id = ?').bind(id).first();
  if (!atual) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  await db.prepare('UPDATE convidados SET codigo_grupo = ? WHERE id = ?').bind(novoCodigoGrupo, id).run();

  if (atual.codigo_grupo) await recalcularStatusGrupo(db, atual.codigo_grupo);
  await recalcularStatusGrupo(db, novoCodigoGrupo);

  return jsonResponse({ ok: true });
}
