import { jsonResponse, recalcularStatusGrupo, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

// body: { id, resposta } ou { ids: [...], resposta } — resposta: 'sim' | 'nao_sei' | 'nao' | '' (sem resposta).
// Também aceita { id, confirmado } (formato antigo). Serve para corrigir respostas pelo painel, uma a uma ou em lote.
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const ids = Array.isArray(payload.ids) ? payload.ids.map(Number).filter(Boolean).slice(0, 500) : payload.id ? [Number(payload.id)] : [];
  if (!ids.length) return jsonResponse({ erro: 'Convidado não informado.' }, 400);
  let resposta = payload.resposta;
  if (resposta === undefined) resposta = payload.confirmado ? 'sim' : 'nao';
  if (!['sim', 'nao_sei', 'nao', ''].includes(resposta)) return jsonResponse({ erro: 'Resposta inválida.' }, 400);

  const db = env.DB;
  const evento = await resolverEvento(db, request);
  if (!evento) return eventoNaoEncontrado();

  const grupos = new Set();
  let alterados = 0;
  for (const id of ids) {
    const c = await db.prepare('SELECT c.codigo_grupo FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.id = ? AND g.evento_id = ?').bind(id, evento.id).first();
    if (!c) continue;
    await db.prepare('UPDATE convidados SET resposta = ?, confirmado = ? WHERE id = ?').bind(resposta || null, resposta === 'sim' ? 1 : 0, id).run();
    grupos.add(c.codigo_grupo);
    alterados++;
  }
  if (!alterados) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  let status = null;
  for (const codigo of grupos) {
    await db
      .prepare("UPDATE grupos SET responsavel = 'Confirmado manualmente pelos noivos', data_confirmacao = ? WHERE codigo = ?")
      .bind(new Date().toISOString(), codigo)
      .run();
    status = await recalcularStatusGrupo(db, codigo);
  }
  return jsonResponse({ ok: true, alterados, status });
}
