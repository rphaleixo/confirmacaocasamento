import { removerGrupo } from '../../_removidos.js';
import { jsonResponse, gerarCodigoUnico, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';

export async function onRequestGet({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const { results } = await env.DB
    .prepare('SELECT codigo, nome_grupo AS nome, status_confirmacao AS status FROM grupos WHERE evento_id = ? ORDER BY nome_grupo')
    .bind(evento.id)
    .all();
  return jsonResponse(results);
}

// body: { nomeGrupo, codigo?, responsavel? } — cria o grupo vazio; convidados entram depois por /api/admin/convidados
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const nomeGrupo = (payload.nomeGrupo || '').trim();
  if (!nomeGrupo) return jsonResponse({ erro: 'Dê um nome pro grupo.' }, 400);

  const db = env.DB;
  let codigo = (payload.codigo || '').trim().toUpperCase();
  if (codigo) {
    const existente = await db.prepare('SELECT 1 FROM grupos WHERE codigo = ?').bind(codigo).first();
    if (existente) return jsonResponse({ erro: 'Esse código já está em uso por outro grupo.' }, 400);
  } else {
    codigo = await gerarCodigoUnico(db);
  }

  await db
    .prepare(
      "INSERT INTO grupos (codigo, evento_id, nome_grupo, status_abertura, status_confirmacao, responsavel) VALUES (?, ?, ?, 'Não aberto', 'Pendente', ?)"
    )
    .bind(codigo, evento.id, nomeGrupo, (payload.responsavel || '').trim() || null)
    .run();

  return jsonResponse({ codigo });
}

// body: { codigo } — tira o grupo inteiro da lista (fica 30 dias em "Removidos recentemente")
export async function onRequestDelete({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const codigo = String(payload.codigo || '').trim().toUpperCase();
  if (!codigo || !(await removerGrupo(env.DB, evento.id, codigo))) return jsonResponse({ erro: 'Grupo não encontrado.' }, 404);
  return jsonResponse({ ok: true });
}

// body: { codigo, nome } — troca só o nome do grupo; o código e o link de confirmação continuam os mesmos
export async function onRequestPatch({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => ({}));
  const codigo = String(payload.codigo || '').trim().toUpperCase();
  const nome = String(payload.nome || '').replace(/\s+/g, ' ').trim();
  if (!codigo) return jsonResponse({ erro: 'Grupo não informado.' }, 400);
  if (!nome) return jsonResponse({ erro: 'Dê um nome ao grupo.' }, 400);
  if (nome.length > 100) return jsonResponse({ erro: 'O nome do grupo é muito longo (máximo 100 letras).' }, 400);
  const db = env.DB;
  const grupo = await db.prepare('SELECT codigo FROM grupos WHERE codigo = ? AND evento_id = ?').bind(codigo, evento.id).first();
  if (!grupo) return jsonResponse({ erro: 'Grupo não encontrado.' }, 404);
  // a importação de planilhas reconhece o grupo pelo nome: dois grupos com o mesmo nome a confundiriam
  const igual = await db.prepare('SELECT 1 FROM grupos WHERE evento_id = ? AND codigo <> ? AND lower(nome_grupo) = lower(?)').bind(evento.id, codigo, nome).first();
  if (igual) return jsonResponse({ erro: 'Já existe outro grupo com esse nome.' }, 400);
  await db.prepare('UPDATE grupos SET nome_grupo = ? WHERE codigo = ?').bind(nome, codigo).run();
  return jsonResponse({ ok: true, nome });
}
