import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../../_lib.js';
import { PUBLICOS, PRESENCAS, MAX_LEMBRANCAS, texto, normalizarOpcoes, lembrancaParaApi } from '../../../_lembrancas.js';

// body: { id?, nome, descricao?, publico, presenca, infoRotulo?, infoOpcoes?, infoObrigatoria? } — cria ou edita uma lembrança
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const p = await request.json().catch(() => ({}));

  const nome = texto(p.nome, 80);
  if (!nome) return jsonResponse({ erro: 'Dê um nome para a lembrança (ex.: "Chinelo personalizado").' }, 400);
  const descricao = texto(p.descricao, 300);
  const publico = PUBLICOS.includes(p.publico) ? p.publico : 'todos';
  const presenca = PRESENCAS.includes(p.presenca) ? p.presenca : 'qualquer';
  const infoRotulo = texto(p.infoRotulo, 60);
  const opcoes = infoRotulo ? normalizarOpcoes(p.infoOpcoes) : [];
  const obrigatoria = infoRotulo && p.infoObrigatoria ? 1 : 0;

  if (p.id) {
    const existe = await env.DB.prepare('SELECT id FROM lembrancas WHERE id = ? AND evento_id = ?').bind(p.id, evento.id).first();
    if (!existe) return jsonResponse({ erro: 'Lembrança não encontrada.' }, 404);
    await env.DB
      .prepare('UPDATE lembrancas SET nome = ?, descricao = ?, publico = ?, presenca = ?, info_rotulo = ?, info_opcoes = ?, info_obrigatoria = ? WHERE id = ? AND evento_id = ?')
      .bind(nome, descricao, publico, presenca, infoRotulo, JSON.stringify(opcoes), obrigatoria, p.id, evento.id)
      .run();
  } else {
    const { n, prox } = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(MAX(ordem), 0) + 1 AS prox FROM lembrancas WHERE evento_id = ?').bind(evento.id).first();
    if (n >= MAX_LEMBRANCAS) return jsonResponse({ erro: 'Você chegou ao limite de ' + MAX_LEMBRANCAS + ' lembranças.' }, 400);
    await env.DB
      .prepare('INSERT INTO lembrancas (evento_id, nome, descricao, publico, presenca, info_rotulo, info_opcoes, info_obrigatoria, ordem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(evento.id, nome, descricao, publico, presenca, infoRotulo, JSON.stringify(opcoes), obrigatoria, prox)
      .run();
  }
  const salva = await env.DB
    .prepare(p.id ? 'SELECT * FROM lembrancas WHERE id = ? AND evento_id = ?' : 'SELECT * FROM lembrancas WHERE evento_id = ? ORDER BY id DESC LIMIT 1')
    .bind(...(p.id ? [p.id, evento.id] : [evento.id]))
    .first();
  return jsonResponse({ ok: true, lembranca: lembrancaParaApi(salva) });
}
