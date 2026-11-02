// Endereços da plataforma. Em vemnafesta.com cada evento tem o seu subdomínio (nome.vemnafesta.com, com /admin e /presentes);
// em qualquer outro endereço (testes, workers.dev, pages.dev) o evento continua em /e/<nome>/.
// Usado pelo site, pela lista de presentes e pelo painel.
(function () {
  'use strict';
  var BASE = 'vemnafesta.com';
  var RESERVADOS = { www: 1, admin: 1, api: 1, app: 1, mail: 1, email: 1, ftp: 1, smtp: 1, ns1: 1, ns2: 1, static: 1, assets: 1, media: 1, cdn: 1, painel: 1, login: 1, suporte: 1, ajuda: 1, blog: 1, status: 1, exemplo: 0 };
  function minusculo(h) { return String(h || '').toLowerCase(); }
  function nosso(host) { host = minusculo(host); return host === BASE || host.slice(-(BASE.length + 1)) === '.' + BASE; }
  function sub(host) {
    host = minusculo(host);
    if (host.length <= BASE.length + 1 || host.slice(-(BASE.length + 1)) !== '.' + BASE) return null;
    var s = host.slice(0, -(BASE.length + 1));
    return /^[a-z0-9-]+$/.test(s) && !RESERVADOS[s] ? s : null;
  }
  var R = {
    BASE: BASE, RESERVADOS: RESERVADOS, nosso: nosso, sub: sub,
    // slug do evento da página aberta: do subdomínio ou do caminho /e/<slug>
    slug: function () {
      var s = sub(location.hostname); if (s) return s;
      var m = location.pathname.match(/^\/e\/([^\/]+)/);
      return m ? decodeURIComponent(m[1]).toLowerCase() : null;
    },
    // no mesmo formato que o resultado de String.match: [texto, slug] ou null
    casar: function () { var s = R.slug(); return s ? [null, s] : null; },
    casarAdmin: function () {
      var s = sub(location.hostname);
      if (s) return /^\/admin(\/|$)/.test(location.pathname) ? [null, s] : null;
      var m = location.pathname.match(/^\/e\/([^\/]+)\/admin/);
      return m ? [null, decodeURIComponent(m[1]).toLowerCase()] : null;
    },
    // começo do caminho dos links internos do evento ('' no subdomínio, /e/<slug> nos outros endereços)
    prefixo: function (slug) { return sub(location.hostname) ? '' : '/e/' + slug; },
    urlSite: function (slug) { return nosso(location.hostname) ? 'https://' + slug + '.' + BASE + '/' : location.origin + '/e/' + slug + '/'; },
    // para a prévia dentro do painel: precisa ser da MESMA origem do painel (no painel geral, o caminho /e/<slug> do próprio endereço)
    urlMesmaOrigem: function (slug) { return sub(location.hostname) ? location.origin + '/' : location.origin + '/e/' + slug + '/'; },
    urlAdmin: function (slug) { return R.urlSite(slug) + 'admin'; },
    // /preview e /teste: o convite como o convidado vê, para o anfitrião conferir (só mostra tudo a quem está logado no painel)
    emTeste: function () { return /^(\/e\/[^\/]+)?\/(preview|teste)\/?$/.test(location.pathname) || /[?&]teste=1/.test(location.search); },
    // o que o /preview está mostrando: 'pessoal' (convidado com link pessoal), 'encerrado' (prazo acabou) ou 'generico' (link sem código)
    verTeste: function () { var v = new URLSearchParams(location.search).get('ver'); return ['pessoal', 'encerrado', 'generico'].indexOf(v) !== -1 ? v : 'pessoal'; },
    urlPreview: function (slug) { return R.urlSite(slug) + 'preview'; },
    // cabeçalho de acesso guardado pelo painel (para o /preview mostrar tudo ao anfitrião)
    acesso: function () {
      var s = R.slug(), chaves = s ? ['rsvp-acesso:evento:' + s, 'rsvp-acesso:master'] : ['rsvp-acesso:master'];
      for (var i = 0; i < chaves.length; i++) { try { var v = sessionStorage.getItem(chaves[i]) || localStorage.getItem(chaves[i]); if (v) return v; } catch (e) { /* segue */ } }
      return '';
    },
    // parâmetros que a API de conteúdo usa para decidir o que mostrar (código do convite e token do rascunho)
    consultaAcesso: function () {
      var p = new URLSearchParams(location.search), r = [];
      ['c', 'rascunho'].forEach(function (k) { if (p.get(k)) r.push(k + '=' + encodeURIComponent(p.get(k))); });
      return r.join('&');
    },
    buscarConteudo: function () {
      var s = R.slug(), q = [s ? 'e=' + encodeURIComponent(s) : '', R.consultaAcesso()].filter(Boolean).join('&');
      var op = {}; if (R.emTeste()) { var a = R.verTeste() === 'generico' ? '' : R.acesso(); if (a) op.headers = { Authorization: a }; op.credentials = 'omit'; }
      return fetch('/api/conteudo' + (q ? '?' + q : ''), op).then(function (r) { return r.json(); }).catch(function () { return { erro: 'Sem conexão.', rede: true }; });
    },
    urlPresentes: function (slug) { return R.urlSite(slug) + 'presentes'; },
    // como o endereço aparece escrito para a pessoa
    endereco: function (slug) { return nosso(location.hostname) ? slug + '.' + BASE : location.host + '/e/' + slug; },
    enderecoAdmin: function (slug) { return R.endereco(slug) + (nosso(location.hostname) ? '/admin' : '/admin'); },
    // texto fixo ao redor do campo "endereço" na criação de evento
    antes: function () { return nosso(location.hostname) ? '' : location.host + '/e/'; },
    depois: function () { return nosso(location.hostname) ? '.' + BASE : ''; },
  };
  window.ROTAS = R;
})();
