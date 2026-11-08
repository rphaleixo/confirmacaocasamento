import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../../_lib.js';
import { SITUACOES, texto } from '../../../_lembrancas.js';

// body: { lembrancaId, convidadoIds: [..], situacao?, info?, comentario? }
//  - situacao: 'planejada' | 'separada' | 'entregue' | 'nao_recebe', ou 'auto' para voltar ao critério da lembrança
//  - info / comentario: só mudam se vierem no corpo (texto vazio apaga)
// Vale para vários convidados de uma vez (ação em massa). Linhas que ficam sem nada são apagadas.
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const p = await request.json().catch(() => ({}));

  const lem = await env.DB.prepare('SELECT id FROM lembrancas WHERE id = ? AND evento_id = ?').bind(p.lembrancaId, evento.id).first();
  if (!lem) return jsonResponse({ erro: 'Lembrança não encontrada.' }, 404);
  const ids = Array.from(new Set((Array.isArray(p.convidadoIds) ? p.convidadoIds : []).map(Number).filter(Number.isInteger))).slice(0, 1000);
  if (!ids.length) return jsonResponse({ erro: 'Escolha ao menos um convidado.' }, 400);

  const mudaSituacao = p.situacao !== undefined;
  if (mudaSituacao && p.situacao !== 'auto' && !SITUACOES.includes(p.situacao)) return jsonResponse({ erro: 'Situação inválida.' }, 400);
  const mudaInfo = p.info !== undefined, mudaComentario = p.comentario !== undefined;

  // só convidados deste evento
  const marcas = ids.map(() => '?').join(',');
  const { results: validos } = await env.DB
    .prepare(`SELECT c.id FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE g.evento_id = ? AND c.id IN (${marcas})`)
    .bind(evento.id, ...ids)
    .all();
  const permitidos = validos.map((r) => r.id);
  if (!permitidos.length) return jsonResponse({ erro: 'Convidado não encontrado.' }, 404);

  // Cada campo é gravado só se veio no corpo, direto no banco (sem ler a linha antes): duas alterações simultâneas na mesma
  // pessoa (uma muda a situação, outra a informação) não se sobrescrevem. Linhas que ficam sem nada são apagadas no fim.
  const situacao = mudaSituacao ? (p.situacao === 'auto' ? null : p.situacao) : null;
  const info = mudaInfo ? (texto(p.info, 80) || null) : null;
  const comentario = mudaComentario ? (texto(p.comentario, 500) || null) : null;
  const grava = env.DB.prepare(`INSERT INTO lembranca_itens (lembranca_id, convidado_id, evento_id, situacao, info, comentario, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(lembranca_id, convidado_id) DO UPDATE SET
        situacao = CASE WHEN ? THEN excluded.situacao ELSE lembranca_itens.situacao END,
        info = CASE WHEN ? THEN excluded.info ELSE lembranca_itens.info END,
        comentario = CASE WHEN ? THEN excluded.comentario ELSE lembranca_itens.comentario END,
        atualizado_em = datetime('now')`);
  const comandos = permitidos.map((cid) => grava.bind(lem.id, cid, evento.id, situacao, info, comentario, mudaSituacao ? 1 : 0, mudaInfo ? 1 : 0, mudaComentario ? 1 : 0));
  comandos.push(env.DB.prepare(`DELETE FROM lembranca_itens WHERE lembranca_id = ? AND convidado_id IN (${permitidos.map(() => '?').join(',')})
      AND situacao IS NULL AND COALESCE(info, '') = '' AND COALESCE(comentario, '') = ''`).bind(lem.id, ...permitidos));
  await env.DB.batch(comandos);
  return jsonResponse({ ok: true, alterados: permitidos.length });
}
