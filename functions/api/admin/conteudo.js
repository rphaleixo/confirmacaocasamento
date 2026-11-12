import { jsonResponse, resolverEvento, eventoNaoEncontrado, ehChaveRica, limparHtml } from '../../_lib.js';

// A última parte da chave tem a palavra "cor" (cor_primaria, convite_cor_texto, cor): é um campo de cor.
const ehChaveDeCor = (chave) => /(^|_)cor(_|$)/.test(String(chave).split('.').pop());

// body: { "chave1": "valor1", "chave2": "valor2", ... } — upsert em lote
export async function onRequestPost({ request, env }) {
  const evento = await resolverEvento(env.DB, request);
  if (!evento) return eventoNaoEncontrado();
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== 'object') return jsonResponse({ erro: 'Dados inválidos.' }, 400);

  const entradas = Object.entries(payload);
  if (entradas.length === 0) return jsonResponse({ ok: true, atualizados: 0 });
  // chaves de cor (aparencia.cor_primaria, secao.x.cor_fundo, hero.convite_cor_texto...) só aceitam caracteres de cor:
  // nada de aspas, sinais de menor/maior ou barra invertida, que permitiriam escapar do atributo onde a cor é usada
  const invalida = entradas.find(([chave, valor]) => ehChaveDeCor(chave) && !/^[#a-zA-Z0-9\s.,%()\/-]{0,80}$/.test(String(valor)));
  if (invalida) return jsonResponse({ erro: 'Cor inválida em "' + invalida[0] + '". Escolha a cor pelo seletor ou escreva no formato #RRGGBB.' }, 400);

  // escolher ou salvar cores, tema ou letras é o anfitrião confirmando o visual (o checklist só conta a partir daí)
  if (entradas.some(([chave]) => /^aparencia\.(cor_|tema$|fonte)/.test(chave)) && !entradas.some(([chave]) => chave === 'aparencia.visual_confirmado')) entradas.push(['aparencia.visual_confirmado', '1']);

  const stmt = env.DB.prepare(
    'INSERT INTO conteudo (evento_id, chave, valor) VALUES (?, ?, ?) ON CONFLICT(evento_id, chave) DO UPDATE SET valor = excluded.valor'
  );
  await env.DB.batch(entradas.map(([chave, valor]) => stmt.bind(evento.id, chave, ehChaveRica(chave) ? limparHtml(valor) : String(valor))));

  return jsonResponse({ ok: true, atualizados: Object.keys(payload).length });
}
