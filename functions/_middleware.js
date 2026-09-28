// Roda antes de TODA rota de /functions: garante que o banco está na versão que o código espera.
import { garantirMigracoes } from './_migracoes.js';

export async function onRequest({ env, next }) {
  try {
    await garantirMigracoes(env.DB);
  } catch (e) {
    return new Response('Erro ao atualizar o banco de dados: ' + (e && e.message ? e.message : e), { status: 500 });
  }
  return next();
}
