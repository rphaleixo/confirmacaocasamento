// Para onde o anfitrião vai depois de entrar: o painel do evento, no endereço certo para cada tipo de hospedagem
import { BASE } from './_enderecos.js';
export function destinoDoPainel(url, slug, codigo) {
  const h = url.hostname.toLowerCase();
  const nosso = h === BASE || h.endsWith('.' + BASE);
  return (nosso ? 'https://' + slug + '.' + BASE + '/admin/' : url.origin + '/e/' + slug + '/admin') + '#codigo=' + codigo;
}
