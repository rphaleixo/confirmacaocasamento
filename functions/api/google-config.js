import { jsonResponse } from '../_lib.js';
// Público: diz se o "Entrar com Google" está configurado (o Client ID do Google não é segredo)
export async function onRequestGet({ env }) {
  return jsonResponse({ clientId: env.GOOGLE_CLIENT_ID || null });
}
