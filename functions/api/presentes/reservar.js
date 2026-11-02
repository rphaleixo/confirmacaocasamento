// Marca/desmarca um item da lista de presentes como "já escolhido". Não processa pagamento: serve para os
// convidados não repetirem presentes e para o anfitrião saber quem escolheu o quê.
// Quem escolheu (nome, grupo, data) fica só no painel do anfitrião: o convidado vê apenas "escolhido".
// Para desfazer, quem escolheu precisa apresentar a chave que recebeu ao escolher (ou o mesmo código de convite).
import { jsonResponse, resolverEvento, eventoNaoEncontrado } from '../../_lib.js';
import { acessoCompleto } from '../../_acesso.js';

const LIMPAR = ['escolhidoPor', 'escolhidoGrupo', 'escolhidoCodigo', 'escolhidoToken', 'escolhidoEm'];

export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const cfg = await env.DB.prepare("SELECT valor FROM conteudo WHERE evento_id = ? AND chave = 'rsvp.modo'").bind(evento.id).first();
  if (!(await acessoCompleto(request, env, evento, { 'rsvp.modo': cfg && cfg.valor }))) return jsonResponse({ erro: 'Abra a lista pelo link pessoal que você recebeu.' }, 403);
  const payload = await request.json().catch(() => ({}));
  const id = payload.id;
  const reservado = !!payload.reservado;
  if (!id) return jsonResponse({ erro: 'Presente não informado.' }, 400);

  const db = env.DB;
  const codigo = (new URL(request.url).searchParams.get('c') || '').trim().toUpperCase();
  let grupoNome = '';
  if (codigo) {
    const g = await db.prepare('SELECT nome_grupo FROM grupos WHERE codigo = ? AND evento_id = ?').bind(codigo, evento.id).first()
      || await db.prepare('SELECT g.nome_grupo FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo WHERE c.codigo_individual = ? AND g.evento_id = ?').bind(codigo, evento.id).first();
    grupoNome = (g && g.nome_grupo) || '';
  }

  // vários convidados podem escolher ao mesmo tempo: a gravação só vale se a lista não mudou desde a leitura (senão lê de novo)
  let chave = '';
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const row = await db.prepare('SELECT valor FROM conteudo WHERE evento_id = ? AND chave = ?').bind(evento.id, 'presentes.itens').first();
    const antes = (row && row.valor) || '[]';
    let itens = [];
    try { itens = JSON.parse(antes); } catch (e) { itens = []; }
    const item = itens.find((it) => it.id === id);
    if (!item) return jsonResponse({ erro: 'Presente não encontrado.' }, 404);

    if (reservado) {
      if (item.reservado) return jsonResponse({ erro: 'Este presente acabou de ser escolhido por outra pessoa. Escolha outro, por favor.' }, 409);
      const nome = String(payload.nome || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!nome && !grupoNome) return jsonResponse({ erro: 'Informe o seu nome para o casal saber quem escolheu.' }, 400);
      chave = crypto.randomUUID().replace(/-/g, '');
      item.reservado = true;
      item.escolhidoPor = nome || grupoNome;
      item.escolhidoGrupo = grupoNome;
      item.escolhidoCodigo = codigo;
      item.escolhidoToken = chave;
      item.escolhidoEm = new Date().toISOString();
    } else {
      // desfazer: só quem escolheu (mesma chave ou mesmo convite). Escolhas antigas, sem registro, qualquer um desfaz.
      const semRegistro = !item.escolhidoToken && !item.escolhidoCodigo;
      const mesmaChave = !!item.escolhidoToken && String(payload.chave || '') === item.escolhidoToken;
      const mesmoConvite = !!item.escolhidoCodigo && item.escolhidoCodigo === codigo;
      if (item.reservado && !(semRegistro || mesmaChave || mesmoConvite)) return jsonResponse({ erro: 'Só quem escolheu este presente pode desfazer. Fale com o casal se precisar mudar.' }, 403);
      item.reservado = false;
      LIMPAR.forEach((k) => { delete item[k]; });
    }

    const r = await db.prepare('UPDATE conteudo SET valor = ? WHERE evento_id = ? AND chave = ? AND valor = ?').bind(JSON.stringify(itens), evento.id, 'presentes.itens', antes).run();
    if (r.meta && r.meta.changes > 0) return jsonResponse({ ok: true, chave });
  }
  return jsonResponse({ erro: 'Muita gente escolhendo ao mesmo tempo. Tente de novo em instantes.' }, 503);
}
