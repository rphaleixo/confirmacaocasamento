import { jsonResponse, recalcularStatusGrupo, gravarResposta, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

const MARCA_MANUAL = 'Confirmado manualmente pelos noivos';

// body: { id, resposta } ou { ids: [...], resposta } — resposta: 'sim' | 'nao_sei' | 'nao' | '' (sem resposta).
// Também aceita { id, confirmado } (formato antigo). Serve para corrigir respostas pelo painel, uma a uma ou em lote.
//
// Efeito no grupo (regra de situacao.js: um grupo "respondeu" se tem data de confirmação ou alguma resposta):
//  - com resposta (sim, não sei, não): registra a data; o nome do responsável que o convidado informou é mantido, e só
//    quando não havia nenhum entra a marca "Confirmado manualmente";
//  - sem resposta (''): se o grupo ficou sem nenhuma resposta, volta a ser um grupo que ainda não respondeu (sem data e sem a
//    marca manual); se ainda há respostas, nada além das pessoas muda.
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
  const comandos = [];
  for (const id of ids) {
    const c = await db.prepare('SELECT c.codigo_grupo FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.id = ? AND g.evento_id = ?').bind(id, evento.id).first();
    if (!c) continue;
    comandos.push(gravarResposta(db, id, resposta));
    grupos.add(c.codigo_grupo);
  }
  if (!comandos.length) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);
  await db.batch(comandos); // todas as pessoas de uma vez: ou todas mudam ou nenhuma

  let status = null;
  for (const codigo of grupos) {
    if (resposta) {
      await db.prepare(`UPDATE grupos SET data_confirmacao = ?,
          responsavel = CASE WHEN responsavel IS NULL OR responsavel = '' THEN ? ELSE responsavel END WHERE codigo = ?`)
        .bind(new Date().toISOString(), MARCA_MANUAL, codigo).run();
    } else {
      const { n } = await db.prepare('SELECT COUNT(*) AS n FROM convidados WHERE codigo_grupo = ? AND resposta IS NOT NULL').bind(codigo).first();
      if (!n) await db.prepare("UPDATE grupos SET data_confirmacao = NULL, responsavel = CASE WHEN responsavel = ? THEN NULL ELSE responsavel END WHERE codigo = ?").bind(MARCA_MANUAL, codigo).run();
    }
    status = await recalcularStatusGrupo(db, codigo);
  }
  return jsonResponse({ ok: true, alterados: comandos.length, status });
}
