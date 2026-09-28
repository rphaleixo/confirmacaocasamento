// Protege todas as rotas /api/admin/* com HTTP Basic Auth (MVP — sem sessão/cookie).
// Dois tipos de login:
//  - master: secrets ADMIN_USER / ADMIN_PASSWORD do Cloudflare Pages — cria eventos e vê todos;
//  - evento: usuário/senha do próprio evento — só acessa o evento indicado em ?e=<slug>.
import { identificarAdmin } from '../../_lib.js';

export async function onRequest({ request, env, next, data }) {
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) {
    return new Response('Admin ainda não configurado: defina os secrets ADMIN_USER e ADMIN_PASSWORD.', {
      status: 500,
    });
  }
  const admin = await identificarAdmin(request, env);
  if (!admin) {
    return new Response('Autenticação necessária.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    });
  }
  data.admin = admin;
  return next();
}
