// Roteamento por endereço. Cada evento tem o seu subdomínio (nome.vemnafesta.com); o que o servidor entende por dentro
// continua sendo /e/<nome>/... e as telas (site, /admin, /presentes) são as mesmas.
export const BASE = 'vemnafesta.com';
// nomes que não podem ser de evento (viram endereços de serviço)
export const RESERVADOS = new Set(['www', 'admin', 'api', 'app', 'mail', 'email', 'ftp', 'smtp', 'ns1', 'ns2', 'static', 'assets', 'media', 'cdn', 'painel', 'login', 'suporte', 'ajuda', 'blog', 'status', 'convite', 'landing', 'inicio']);

export function subdominio(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h.endsWith('.' + BASE)) return null;
  const s = h.slice(0, -(BASE.length + 1));
  return /^[a-z0-9-]{1,63}$/.test(s) && !RESERVADOS.has(s) ? s : null;
}

// devolve { tipo: 'passa' | 'estatico' | 'reescrever' (com url) | 'redirecionar' (com para e status) | 'exemplo' (com resto) }
export function rotaDeEndereco(url) {
  const host = url.hostname.toLowerCase();
  const caminho = url.pathname;
  const sub = subdominio(host);
  // página de primeiro acesso: /entrar/<convite> mostra o mesmo arquivo /entrar/ (o código do convite fica na barra de endereço)
  if (!sub && /^\/entrar\/[A-Za-z0-9]+\/?$/.test(caminho)) return { tipo: 'estatico', url: url.origin + '/entrar/' };
  const paginaDoEvento = caminho === '/' || /^\/(admin|presentes)\/?$/.test(caminho);
  if (sub) {
    if (paginaDoEvento) return { tipo: 'reescrever', url: url.origin + '/e/' + sub + (caminho === '/' ? '/' : caminho) + url.search };
    return { tipo: 'passa' };
  }
  if (host === BASE || host === 'www.' + BASE) {
    if (host === 'www.' + BASE) return { tipo: 'redirecionar', status: 301, para: 'https://' + BASE + caminho + url.search };
    if (caminho === '/exemplo' || caminho.startsWith('/exemplo/')) return { tipo: 'exemplo', resto: caminho.slice('/exemplo/'.length) + url.search };
    // links no formato antigo (/e/nome/...) seguem funcionando, levando ao endereço novo; a prévia do painel geral precisa ficar aqui
    const m = caminho.match(/^\/e\/([a-z0-9-]+)(\/.*)?$/i);
    if (m && url.searchParams.get('previa') !== '1' && subdominio(m[1].toLowerCase() + '.' + BASE)) {
      return { tipo: 'redirecionar', status: 301, para: 'https://' + m[1].toLowerCase() + '.' + BASE + (m[2] || '/') + url.search };
    }
    if (caminho === '/') return { tipo: 'estatico', url: url.origin + '/landing/' };
    if (/^\/admin\/?$/.test(caminho)) return { tipo: 'estatico' };
    return { tipo: 'passa' };
  }
  return { tipo: 'passa' };
}
