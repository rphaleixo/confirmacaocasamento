// Marca/desmarca um item da lista de presentes como "já escolhido" — público, sem
// pagamento nenhum, só pra reduzir duplicidade entre convidados. Sem conta de convidado,
// então não dá pra restringir quem desmarca; aceitável pro MVP (mesmo padrão de simplicidade
// do resto do produto).
import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const id = payload.id;
  const reservado = !!payload.reservado;
  if (!id) return jsonResponse({ erro: 'Presente não informado.' }, 400);

  const row = await env.DB.prepare('SELECT valor FROM conteudo WHERE evento_id = ? AND chave = ?').bind(evento.id, 'presentes.itens').first();
  let itens = [];
  try { itens = JSON.parse((row && row.valor) || '[]'); } catch (e) { itens = []; }

  const item = itens.find((it) => it.id === id);
  if (!item) return jsonResponse({ erro: 'Presente não encontrado.' }, 404);
  item.reservado = reservado;

  await env.DB
    .prepare('INSERT INTO conteudo (evento_id, chave, valor) VALUES (?, ?, ?) ON CONFLICT(evento_id, chave) DO UPDATE SET valor = excluded.valor')
    .bind(evento.id, 'presentes.itens', JSON.stringify(itens))
    .run();

  return jsonResponse({ ok: true });
}
