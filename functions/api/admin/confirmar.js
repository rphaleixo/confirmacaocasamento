import { jsonResponse, recalcularStatusGrupo } from '../../_lib.js';

// body: { id, confirmado }
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const { id, confirmado } = payload;
  if (!id) return jsonResponse({ erro: 'Convidado não informado.' }, 400);

  const db = env.DB;
  const convidado = await db.prepare('SELECT codigo_grupo FROM convidados WHERE id = ?').bind(id).first();
  if (!convidado) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  await db.prepare('UPDATE convidados SET confirmado = ? WHERE id = ?').bind(confirmado ? 1 : 0, id).run();

  await db
    .prepare("UPDATE grupos SET responsavel = 'Confirmado manualmente pelos noivos', data_confirmacao = ? WHERE codigo = ?")
    .bind(new Date().toISOString(), convidado.codigo_grupo)
    .run();

  const status = await recalcularStatusGrupo(db, convidado.codigo_grupo);
  return jsonResponse({ ok: true, status });
}
