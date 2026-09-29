// Texto formatado (HTML) com segurança: o painel deixa o anfitrião usar negrito, itálico, sublinhado, cor, links e quebras de linha;
// o site só mostra o que passa pela lista de tags abaixo. Usado pelo painel (editor) e pelo site (exibição).
(function () {
  var PERMITIDAS = { b: 1, strong: 1, i: 1, em: 1, u: 1, s: 1, strike: 1, br: 1, a: 1, span: 1, small: 1, mark: 1, sub: 1, sup: 1 };
  var REMOVER = { script: 1, style: 1, iframe: 1, object: 1, embed: 1, noscript: 1, template: 1, svg: 1, math: 1, link: 1, meta: 1, title: 1, head: 1, textarea: 1, select: 1, button: 1, form: 1, input: 1 };
  // campos de texto de exibição que aceitam formatação (nomes, datas, links e botões continuam texto simples)
  var RICO = /(^|\.)(eyebrow|titulo|texto|sucesso_texto|sem_codigo_texto|infos_titulo|externa_titulo|externa_texto|lista_opcao_titulo|lista_opcao_texto|pix_titulo|pix_texto|lista_texto)$|^timeline\.node\d+\.(ano|titulo|texto)$/;

  function corSegura(v) {
    v = String(v || '').trim();
    return (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i.test(v)) ? v : '';
  }
  function copiar(origem, destino) {
    for (var no = origem.firstChild; no; no = no.nextSibling) {
      if (no.nodeType === 3) { destino.appendChild(document.createTextNode(no.nodeValue)); continue; }
      if (no.nodeType !== 1) continue;
      var tag = no.tagName.toLowerCase();
      if (REMOVER[tag]) continue;
      if (tag === 'div' || tag === 'p') { copiar(no, destino); if (no.nextSibling) destino.appendChild(document.createElement('br')); continue; }
      if (tag === 'br') { destino.appendChild(document.createElement('br')); continue; }
      if (tag === 'font') {
        var cf = corSegura(no.getAttribute('color'));
        if (cf) { var sf = document.createElement('span'); sf.style.color = cf; copiar(no, sf); destino.appendChild(sf); } else copiar(no, destino);
        continue;
      }
      if (!PERMITIDAS[tag]) { copiar(no, destino); continue; } // tag desconhecida: fica só o texto de dentro
      if (tag === 'span') {
        var cs = corSegura(no.style && no.style.color);
        if (!cs) { copiar(no, destino); continue; }
        var sp = document.createElement('span'); sp.style.color = cs; copiar(no, sp); destino.appendChild(sp); continue;
      }
      var el = document.createElement(tag === 'strong' ? 'b' : tag === 'em' ? 'i' : tag === 'strike' ? 's' : tag);
      if (tag === 'a') {
        var href = (no.getAttribute('href') || '').trim();
        if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) {
          el.setAttribute('href', href);
          if (/^https?:/i.test(href)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
        }
      }
      copiar(no, el); destino.appendChild(el);
    }
  }
  function limpar(html) {
    html = String(html == null ? '' : html);
    if (!html) return '';
    // texto antigo (sem nenhuma tag) com quebras de linha: cada linha vira uma quebra
    if (!/<\s*(br|p|div|b|i|u|s|a|span|strong|em|small|mark)\b/i.test(html)) html = html.replace(/\r?\n/g, '<br>');
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + html, 'text/html');
    var saida = document.createElement('div');
    copiar(doc.body, saida);
    return saida.innerHTML;
  }
  function texto(html) {
    var doc = new DOMParser().parseFromString('<!doctype html><body>' + String(html == null ? '' : html), 'text/html');
    return doc.body.textContent || '';
  }
  window.HTML_SEGURO = { limpar: limpar, texto: texto, ehRico: function (chave) { return RICO.test(String(chave || '')); } };
})();
