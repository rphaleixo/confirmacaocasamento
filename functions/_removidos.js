// "Removidos recentemente": tirar alguém da lista guarda um retrato do que saiu (grupo, pessoas e anotações
// de lembranças) por 30 dias, para o anfitrião poder restaurar. Passado o prazo, some de vez.
import { gerarCodigoUnico, recalcularStatusGrupo } from './_lib.js';

export const DIAS_NA_LIXEIRA = 30;

export async function limparAntigos(db, eventoId) {
  await db.prepare("DELETE FROM removidos WHERE evento_id = ? AND removido_em < datetime('now', ?)").bind(eventoId, '-' + DIAS_NA_LIXEIRA + ' day').run();
}

async function itensDe(db, eventoId, ids) {
  if (!ids.length) return [];
  const { results } = await db.prepare(`SELECT lembranca_id, convidado_id, situacao, info, comentario FROM lembranca_itens WHERE evento_id = ? AND convidado_id IN (${ids.map(() => '?').join(',')})`).bind(eventoId, ...ids).all();
  return results;
}

// remove pessoas (de qualquer grupo do evento); grupos que ficam vazios saem junto. Cada pessoa vira uma entrada.
export async function removerPessoas(db, eventoId, ids) {
  const marcas = ids.map(() => '?').join(',');
  const { results: pessoas } = await db.prepare(`SELECT c.* FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE g.evento_id = ? AND c.id IN (${marcas})`).bind(eventoId, ...ids).all();
  if (!pessoas.length) return 0;
  const grupos = new Map();
  for (const c of pessoas) if (!grupos.has(c.codigo_grupo)) grupos.set(c.codigo_grupo, await db.prepare('SELECT * FROM grupos WHERE codigo = ?').bind(c.codigo_grupo).first());
  const itens = await itensDe(db, eventoId, pessoas.map((p) => p.id));
  const agora = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const comandos = [];
  for (const c of pessoas) {
    const g = grupos.get(c.codigo_grupo);
    comandos.push(db.prepare('INSERT INTO removidos (evento_id, tipo, titulo, detalhe, dados, removido_em) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(eventoId, 'pessoa', c.nome, g.nome_grupo, JSON.stringify({ grupo: g, pessoas: [c], itens: itens.filter((i) => i.convidado_id === c.id) }), agora));
  }
  comandos.push(db.prepare(`DELETE FROM lembranca_itens WHERE evento_id = ? AND convidado_id IN (${pessoas.map(() => '?').join(',')})`).bind(eventoId, ...pessoas.map((p) => p.id)));
  comandos.push(db.prepare(`DELETE FROM convidados WHERE id IN (${pessoas.map(() => '?').join(',')})`).bind(...pessoas.map((p) => p.id)));
  await db.batch(comandos);
  for (const cod of grupos.keys()) {
    const { n } = await db.prepare('SELECT COUNT(*) AS n FROM convidados WHERE codigo_grupo = ?').bind(cod).first();
    if (n === 0) await db.prepare('DELETE FROM grupos WHERE codigo = ? AND evento_id = ?').bind(cod, eventoId).run();
    else await recalcularStatusGrupo(db, cod);
  }
  return pessoas.length;
}

export async function removerGrupo(db, eventoId, codigo) {
  const g = await db.prepare('SELECT * FROM grupos WHERE codigo = ? AND evento_id = ?').bind(codigo, eventoId).first();
  if (!g) return false;
  const { results: pessoas } = await db.prepare('SELECT * FROM convidados WHERE codigo_grupo = ?').bind(codigo).all();
  const itens = await itensDe(db, eventoId, pessoas.map((p) => p.id));
  const agora = new Date().toISOString().replace('T', ' ').slice(0, 19);
  await db.batch([
    db.prepare('INSERT INTO removidos (evento_id, tipo, titulo, detalhe, dados, removido_em) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(eventoId, 'grupo', g.nome_grupo, pessoas.length + (pessoas.length === 1 ? ' pessoa' : ' pessoas'), JSON.stringify({ grupo: g, pessoas, itens }), agora),
    db.prepare('DELETE FROM lembranca_itens WHERE evento_id = ? AND convidado_id IN (SELECT id FROM convidados WHERE codigo_grupo = ?)').bind(eventoId, codigo),
    db.prepare('DELETE FROM convidados WHERE codigo_grupo = ?').bind(codigo),
    db.prepare('DELETE FROM grupos WHERE codigo = ? AND evento_id = ?').bind(codigo, eventoId),
  ]);
  return true;
}

function insere(db, tabela, linha) {
  const cols = Object.keys(linha);
  return db.prepare(`INSERT INTO ${tabela} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).bind(...cols.map((k) => linha[k]));
}

// devolve { ok, aviso? }; se o código do grupo foi tomado por outro grupo nesse meio tempo, ele ganha um código novo
export async function restaurar(db, eventoId, id) {
  const r = await db.prepare('SELECT * FROM removidos WHERE id = ? AND evento_id = ?').bind(id, eventoId).first();
  if (!r) return { ok: false, erro: 'Não encontrei esse item.' };
  const d = JSON.parse(r.dados);
  let codigo = d.grupo.codigo, aviso = '';
  const existente = await db.prepare('SELECT evento_id FROM grupos WHERE codigo = ?').bind(codigo).first();
  const comandos = [];
  let criarGrupo = !existente;
  if (existente && existente.evento_id !== eventoId) { codigo = await gerarCodigoUnico(db); criarGrupo = true; aviso = 'O link do grupo mudou, porque o código antigo já estava em uso.'; }
  if (criarGrupo) comandos.push(insere(db, 'grupos', Object.assign({}, d.grupo, { codigo, evento_id: eventoId })));
  for (const p of d.pessoas) {
    const jaTem = await db.prepare('SELECT 1 AS ok FROM convidados WHERE id = ?').bind(p.id).first();
    if (jaTem) continue;
    let ind = p.codigo_individual || null;
    if (ind) { const uso = await db.prepare('SELECT 1 AS ok FROM convidados WHERE codigo_individual = ?').bind(ind).first(); const uso2 = await db.prepare('SELECT 1 AS ok FROM grupos WHERE codigo = ?').bind(ind).first(); if (uso || uso2) ind = null; }
    comandos.push(insere(db, 'convidados', Object.assign({}, p, { codigo_grupo: codigo, codigo_individual: ind })));
  }
  for (const i of d.itens || []) {
    const l = await db.prepare('SELECT 1 AS ok FROM lembrancas WHERE id = ? AND evento_id = ?').bind(i.lembranca_id, eventoId).first();
    if (l) comandos.push(db.prepare("INSERT OR REPLACE INTO lembranca_itens (lembranca_id, convidado_id, evento_id, situacao, info, comentario, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))").bind(i.lembranca_id, i.convidado_id, eventoId, i.situacao, i.info, i.comentario));
  }
  comandos.push(db.prepare('DELETE FROM removidos WHERE id = ?').bind(id));
  await db.batch(comandos);
  await recalcularStatusGrupo(db, codigo);
  return { ok: true, aviso, titulo: r.titulo };
}
