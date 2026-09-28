// Roda antes de TODA rota de /functions: garante que o banco está na versão que o código espera
// e transforma qualquer exceção em uma mensagem legível (em vez do "Error 1101" da Cloudflare).
import { garantirMigracoes } from './_migracoes.js';

const LIMITE_MS = 2500; // se a atualização do banco passar disso, mostra a tela de carregamento

function paginaHtml(titulo, corpo, status, extraHead = '') {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${titulo}</title>${extraHead}
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f4ee;color:#3b3b3b;font-family:system-ui,Arial,sans-serif;text-align:center;padding:24px;}
  .box{max-width:420px;}
  .spin{width:44px;height:44px;margin:0 auto 20px;border:4px solid #e2dccd;border-top-color:#b08d3c;border-radius:50%;animation:g 1s linear infinite;}
  @keyframes g{to{transform:rotate(360deg);}}
  h1{font-size:20px;margin:0 0 8px;} p{font-size:14px;color:#6b6b6b;margin:6px 0;}
  pre{text-align:left;white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #e2dccd;border-radius:8px;padding:10px;font-size:12px;}
</style></head><body><div class="box">${corpo}</div></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

function telaCarregando() {
  return paginaHtml(
    'Atualizando o sistema…',
    '<div class="spin"></div><h1>Atualizando o sistema…</h1><p>Estamos preparando o banco de dados. Leva poucos segundos.</p><p>Esta página recarrega sozinha.</p>',
    503,
    '<meta http-equiv="refresh" content="3">'
  );
}

function telaErro(e) {
  const detalhe = String((e && (e.stack || e.message)) || e).slice(0, 1500).replace(/</g, '&lt;');
  return paginaHtml(
    'Erro no sistema',
    `<h1>Algo deu errado</h1><p>Envie o texto abaixo para quem cuida do sistema.</p><pre>${detalhe}</pre>`,
    500
  );
}

export async function onRequest({ request, env, next, waitUntil }) {
  const ehNavegacao = (request.headers.get('accept') || '').includes('text/html');
  const ehApi = new URL(request.url).pathname.startsWith('/api/');
  const erro = (e) => (ehApi
    ? new Response(JSON.stringify({ erro: 'Erro interno: ' + ((e && e.message) || e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } })
    : telaErro(e));

  try {
    if (!env.DB) throw new Error('Binding "DB" (banco D1) não está configurado neste projeto Pages.');
    const migracao = garantirMigracoes(env.DB).then(() => 'ok');
    const limite = new Promise((resolve) => setTimeout(() => resolve('lento'), LIMITE_MS));
    const resultado = await Promise.race([migracao, limite]);
    if (resultado === 'lento') {
      waitUntil(migracao.catch(() => {})); // deixa a atualização terminar mesmo respondendo antes
      return ehNavegacao && !ehApi
        ? telaCarregando()
        : new Response(JSON.stringify({ erro: 'Sistema em atualização, tente em instantes.' }), {
            status: 503,
            headers: { 'content-type': 'application/json; charset=utf-8', 'retry-after': '3' },
          });
    }
    return await next();
  } catch (e) {
    return erro(e);
  }
}
