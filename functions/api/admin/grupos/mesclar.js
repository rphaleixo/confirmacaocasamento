import { jsonResponse, recalcularStatusGrupo } from '../../../_lib.js';

// body: { codigos: [...], manter: 'CODIGO' }
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const codigos = payload.codigos || [];
  const manter = payload.manter;

  if (codigos.length < 2) return jsonResponse({ erro: 'Selecione ao menos dois grupos.' }, 400);
  if (!codigos.includes(manter)) {
    return jsonResponse({ erro: 'O código escolhido pra manter precisa estar entre os selecionados.' }, 400);
  }

  const db = env.DB;
  const remover = codigos.filter((c) => c !== manter);

  for (const codigo of remover) {
    await db.prepare('UPDATE convidados SET codigo_grupo = ? WHERE codigo_grupo = ?').bind(manter, codigo).run();
    await db.prepare('DELETE FROM grupos WHERE codigo = ?').bind(codigo).run();
  }

  await recalcularStatusGrupo(db, manter);
  return jsonResponse({ ok: true, mantido: manter, removidos: remover });
}
