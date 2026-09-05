// Protege todas as rotas /api/admin/* com HTTP Basic Auth (MVP — sem sessão/cookie).
// Credenciais vêm dos secrets ADMIN_USER / ADMIN_PASSWORD configurados no Cloudflare Pages.
import { checkBasicAuth } from '../../_lib.js';

export async function onRequest({ request, env, next }) {
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) {
    return new Response('Admin ainda não configurado: defina os secrets ADMIN_USER e ADMIN_PASSWORD.', {
      status: 500,
    });
  }
  if (!checkBasicAuth(request, env)) {
    return new Response('Autenticação necessária.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }
  return next();
}
