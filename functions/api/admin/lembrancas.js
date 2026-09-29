import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';
import { lembrancaParaApi } from '../../_lembrancas.js';

// Lista tudo do controle de lembranças do evento: as lembranças, os convidados e o que foi planejado para cada um.
// Rota do painel do anfitrião (protegida pelo login do admin); nada disto aparece no site dos convidados.
export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();

  const [lem, conv, itens] = await Promise.all([
    env.DB.prepare('SELECT id, nome, descricao, publico, presenca, info_rotulo, info_opcoes, info_obrigatoria, ordem FROM lembrancas WHERE evento_id = ? ORDER BY ordem, id').bind(evento.id).all(),
    env.DB
      .prepare(
        `SELECT c.id, c.nome, c.tipo, c.resposta, g.nome_grupo AS grupo
         FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo
         WHERE g.evento_id = ?
         ORDER BY c.nome COLLATE NOCASE, c.id`
      )
      .bind(evento.id)
      .all(),
    env.DB
      .prepare(
        `SELECT li.lembranca_id AS lembrancaId, li.convidado_id AS convidadoId, li.situacao, li.info, li.comentario
         FROM lembranca_itens li JOIN lembrancas l ON l.id = li.lembranca_id
         WHERE l.evento_id = ?`
      )
      .bind(evento.id)
      .all(),
  ]);

  return jsonResponse({ lembrancas: lem.results.map(lembrancaParaApi), convidados: conv.results, itens: itens.results });
}
