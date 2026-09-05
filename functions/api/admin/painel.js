import { jsonResponse, LIMITE_ADULTOS } from '../../_lib.js';

export async function onRequestGet({ env }) {
  const db = env.DB;

  const { results: convidados } = await db
    .prepare(
      `SELECT c.id, c.nome, c.telefone, c.confirmado, c.tipo, c.codigo_grupo AS codigoGrupo, g.nome_grupo AS grupo
       FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo
       ORDER BY g.nome_grupo, c.id`
    )
    .all();

  const adultosConfirmados = convidados.filter((c) => c.tipo === 'adulto' && c.confirmado === 1).length;
  const criancasConfirmadas = convidados.filter((c) => c.tipo === 'crianca' && c.confirmado === 1).length;

  const { results: grupos } = await db.prepare('SELECT status_confirmacao FROM grupos').all();
  const gruposConfirmados = grupos.filter((g) => g.status_confirmacao === 'Confirmado').length;

  return jsonResponse({
    limiteAdultos: LIMITE_ADULTOS,
    adultosConfirmados,
    criancasConfirmadas,
    gruposTotal: grupos.length,
    gruposConfirmados,
    convidados: convidados.map((c) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      tipo: c.tipo,
      confirmado: c.confirmado === 1,
      grupo: c.grupo,
      codigoGrupo: c.codigoGrupo,
    })),
  });
}
