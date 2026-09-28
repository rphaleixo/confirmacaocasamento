// Visão geral da plataforma e catálogo de templates — só o admin master.
import { jsonResponse } from '../../_lib.js';
import { TIPOS, MODULOS } from '../../_tipos.js';

export async function onRequestGet({ env, data }) {
  if (data.admin.tipo !== 'master') return jsonResponse({ erro: 'Só o administrador master vê a plataforma.' }, 403);
  const db = env.DB;

  const totais = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM eventos) AS eventos,
         (SELECT COUNT(*) FROM eventos WHERE admin_usuario IS NOT NULL) AS comAnfitriao,
         (SELECT COUNT(*) FROM grupos) AS grupos,
         (SELECT COUNT(*) FROM convidados) AS convidados,
         (SELECT COUNT(*) FROM convidados WHERE confirmado = 1) AS confirmados,
         (SELECT COUNT(*) FROM recados WHERE aprovado = 0) AS recadosPendentes,
         (SELECT COALESCE(SUM(visitas), 0) FROM acessos) AS visitas,
         (SELECT COALESCE(SUM(visitas), 0) FROM acessos WHERE dia >= date('now', '-30 day')) AS visitas30d,
         (SELECT COUNT(*) FROM eventos e WHERE
            EXISTS (SELECT 1 FROM acessos a WHERE a.evento_id = e.id AND a.dia >= date('now', '-30 day'))
            OR EXISTS (SELECT 1 FROM grupos g WHERE g.evento_id = e.id AND g.data_confirmacao >= date('now', '-30 day'))) AS eventosAtivos30d`
    )
    .first();

  const { results: porTipo } = await db.prepare('SELECT tipo, COUNT(*) AS eventos FROM eventos GROUP BY tipo').all();
  const { results: visitasPorDia } = await db
    .prepare("SELECT dia, SUM(visitas) AS visitas FROM acessos WHERE dia >= date('now', '-13 day') GROUP BY dia ORDER BY dia")
    .all();

  const contagem = {};
  porTipo.forEach((r) => { contagem[r.tipo] = r.eventos; });
  const tipos = Object.entries(TIPOS).map(([id, t]) => ({
    id,
    nome: t.nome,
    descricao: t.descricao,
    eventos: contagem[id] || 0,
    modulos: t.modulos.map((m) => ({ id: m, nome: MODULOS[m] || m })),
  }));

  return jsonResponse({ totais, tipos, visitasPorDia });
}
