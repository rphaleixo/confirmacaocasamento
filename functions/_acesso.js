// Quem pode ver o quê no convite.
// Sem o código pessoal do convite (?c=...), o link não mostra data, horário, local nem presentes: assim quem não foi
// convidado não consegue ir à festa só com o endereço do site. Aparecem inteiros para:
//  - quem abre com um código de convite válido deste evento;
//  - o anfitrião logado (painel, /preview e /teste) ou com o token do rascunho;
//  - qualquer pessoa, quando o evento é aberto (Confirmação › "Evento aberto": não pede confirmação).
import { identificarAdmin } from './_lib.js';

// o que não sai do servidor sem acesso completo
export const CHAVE_RESTRITA = /^(hero\.(data_iso|data_display|horario_display)|mapa\.|presentes\.|presente_teaser\.|compartilhar\.data_texto$)/;

export async function codigoValido(db, eventoId, codigo) {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) return false;
  const g = await db.prepare('SELECT 1 FROM grupos WHERE codigo = ? AND evento_id = ?').bind(c, eventoId).first();
  if (g) return true;
  const p = await db.prepare('SELECT 1 FROM convidados cv JOIN grupos g ON g.codigo = cv.codigo_grupo WHERE cv.codigo_individual = ? AND g.evento_id = ?').bind(c, eventoId).first();
  return !!p;
}

// anfitrião (ou administrador da plataforma) logado, com o acesso do painel no cabeçalho
export async function ehAnfitriao(request, env, evento) {
  if (!request.headers.get('Authorization')) return false;
  try { const adm = await identificarAdmin(request, env); return !!adm && (adm.tipo === 'master' || adm.eventoId === evento.id); } catch (e) { return false; }
}

// quem escolheu cada presente é só do anfitrião: o convidado recebe a lista sem esses campos
const CAMPOS_PRIVADOS_PRESENTE = ['escolhidoPor', 'escolhidoGrupo', 'escolhidoCodigo', 'escolhidoToken', 'escolhidoEm'];
export function esconderQuemEscolheu(conteudo) {
  const bruto = conteudo['presentes.itens'];
  if (!bruto) return conteudo;
  try {
    const itens = JSON.parse(bruto);
    if (Array.isArray(itens)) conteudo['presentes.itens'] = JSON.stringify(itens.map((it) => { const c = Object.assign({}, it); CAMPOS_PRIVADOS_PRESENTE.forEach((k) => delete c[k]); return c; }));
  } catch (e) { /* lista inválida: segue como está */ }
  return conteudo;
}

// conteudo: objeto chave/valor do evento. Devolve true se a pessoa pode ver tudo.
export async function acessoCompleto(request, env, evento, conteudo) {
  if (conteudo && conteudo['rsvp.modo'] === 'aberto') return true;
  const url = new URL(request.url);
  if (await codigoValido(env.DB, evento.id, url.searchParams.get('c'))) return true;
  const tk = (url.searchParams.get('rascunho') || '').trim();
  if (tk) {
    const ev = await env.DB.prepare('SELECT token_rascunho FROM eventos WHERE id = ?').bind(evento.id).first();
    if (ev && ev.token_rascunho && ev.token_rascunho === tk) return true;
  }
  return ehAnfitriao(request, env, evento);
}

// No Save the Date o anfitrião quer divulgar a data: ela e o horário continuam públicos; local e presentes não.
const SO_LOCAL_E_PRESENTES = /^(mapa\.|presentes\.|presente_teaser\.)/;
export function removerRestritas(conteudo) {
  const regra = conteudo['config.modo_save_the_date'] === '1' ? SO_LOCAL_E_PRESENTES : CHAVE_RESTRITA;
  Object.keys(conteudo).forEach((k) => { if (regra.test(k)) delete conteudo[k]; });
  return conteudo;
}
