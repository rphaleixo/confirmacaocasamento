// Formas para o topo das seções do site (a "quebra" entre um módulo e outro).
// Usado pelo site (index.html) e pelo painel (admin) — as duas telas leem daqui, então sempre mostram a mesma forma.
// Cada forma é uma linha de fronteira y(u), com u de 0 a 1 ao longo da largura e y de 0 a 64: o que fica ABAIXO da linha
// é a seção nova; o que fica acima é a seção anterior. Algumas formas têm ainda um enfeite desenhado por cima
// (bandeirinhas, folhagem, confete, ornamento).
// API: window.FORMAS_SECAO = { LISTA, ALTURAS, existe, caminho, temEnfeite, enfeite, mini }
(function () {
  'use strict';
  var PI = Math.PI;
  function tri(x) { x = x - Math.floor(x); return x < 0.5 ? x * 2 : 2 - x * 2; }
  function raiz(v) { return Math.sqrt(Math.max(0, v)); }
  function clamp(v) { return Math.max(0, Math.min(64, v)); }
  function picos(u) {
    var c = [0.06, 0.2, 0.34, 0.5, 0.64, 0.79, 0.93], h = [30, 46, 36, 52, 34, 44, 28], w = [0.13, 0.12, 0.11, 0.14, 0.11, 0.12, 0.12], m = 0, i, v;
    for (i = 0; i < c.length; i++) { v = h[i] * (1 - Math.abs(u - c[i]) / w[i]); if (v > m) m = v; }
    return 60 - m;
  }
  function nuvens(u) {
    var x = u * 480, c = [20, 66, 118, 170, 214, 262, 312, 358, 410, 456], r = [20, 26, 22, 28, 20, 26, 22, 27, 21, 24], m = 0, i, v;
    for (i = 0; i < c.length; i++) { v = raiz(r[i] * r[i] - (x - c[i]) * (x - c[i])); if (v > m) m = v; }
    return 54 - m * 1.15;
  }
  function arcos(u, pitch, r, sentido) { var x = (u * 480) % pitch; var v = raiz(r * r - (x - pitch / 2) * (x - pitch / 2)); return sentido > 0 ? 62 - v : 8 + v; }

  // fronteira de cada forma
  var Y = {
    onda: function (u) { return 34 + 14 * Math.sin(u * 2 * PI + 0.6); },
    vagas: function (u) { return 34 + 10 * Math.sin(u * 4 * PI + 0.3) + 6 * Math.sin(u * 6.6 * PI); },
    marolas: function (u) { return 38 + 6 * Math.sin(u * 14 * PI); },
    arco_cima: function (u) { return 58 - 52 * raiz(1 - (2 * u - 1) * (2 * u - 1)); },
    arco_baixo: function (u) { return 6 + 50 * raiz(1 - (2 * u - 1) * (2 * u - 1)); },
    diagonal_d: function (u) { return 56 - 48 * u; },
    diagonal_e: function (u) { return 8 + 48 * u; },
    zigzag: function (u) { return 12 + 34 * tri(u * 16); },
    picos: picos,
    degraus: function (u) { return 56 - 7 * Math.floor(u * 8); },
    nuvens: nuvens,
    bolhas: function (u) { return arcos(u, 48, 24, 1); },
    festao: function (u) { return arcos(u, 48, 24, -1); },
    ornamento: function () { return 32; },
    bandeirinhas: function () { return 54; },
    confete: function (u) { return 44 + 8 * Math.sin(u * 2 * PI * 1.5 + 1); },
    folhagem: function (u) { return 40 + 8 * Math.sin(u * 2 * PI * 1.25 + 0.4); },
  };

  var LISTA = [
    { id: 'onda', nome: 'Onda suave', desc: 'A cl\u00E1ssica, calma e elegante', grupo: 'Ondas' },
    { id: 'vagas', nome: 'Vagas', desc: 'Ondas em ritmos diferentes', grupo: 'Ondas' },
    { id: 'marolas', nome: 'Marolas', desc: 'Ondinhas pequenas e frequentes', grupo: 'Ondas' },
    { id: 'arco_cima', nome: 'Arco para cima', desc: 'A se\u00E7\u00E3o nova sobe como uma c\u00FApula', grupo: 'Curvas' },
    { id: 'arco_baixo', nome: 'Arco para baixo', desc: 'A se\u00E7\u00E3o de cima desce em curva', grupo: 'Curvas' },
    { id: 'diagonal_d', nome: 'Diagonal \u2197', desc: 'Corte inclinado para a direita', grupo: 'Retas' },
    { id: 'diagonal_e', nome: 'Diagonal \u2196', desc: 'Corte inclinado para a esquerda', grupo: 'Retas' },
    { id: 'zigzag', nome: 'Zigue-zague', desc: 'Dentes regulares', grupo: 'Geom\u00E9tricas' },
    { id: 'picos', nome: 'Picos', desc: 'Montanhas de alturas variadas', grupo: 'Geom\u00E9tricas' },
    { id: 'degraus', nome: 'Degraus', desc: 'Escada subindo', grupo: 'Geom\u00E9tricas' },
    { id: 'nuvens', nome: 'Nuvens', desc: 'Contorno fofo e arredondado', grupo: 'Delicadas' },
    { id: 'bolhas', nome: 'Bolhas', desc: 'Semic\u00EDrculos subindo', grupo: 'Delicadas' },
    { id: 'festao', nome: 'Fest\u00E3o', desc: 'Arcos pendurados, como renda', grupo: 'Delicadas' },
    { id: 'ornamento', nome: 'Ornamento', desc: 'Linha fina com detalhe no centro', grupo: 'Enfeitadas' },
    { id: 'folhagem', nome: 'Folhagem', desc: 'Ramo com folhinhas na borda', grupo: 'Enfeitadas' },
    { id: 'bandeirinhas', nome: 'Bandeirinhas', desc: 'Varal de festa colorido', grupo: 'Enfeitadas' },
    { id: 'confete', nome: 'Confete', desc: 'Onda baixa com confete', grupo: 'Enfeitadas' },
    { id: 'reta', nome: 'Sem forma', desc: 'Corte reto, sem divis\u00F3ria', grupo: 'Retas' },
  ];
  var ALTURAS = { baixa: 30, media: 46, alta: 78 };
  var ENFEITADAS = { ornamento: 1, folhagem: 1, bandeirinhas: 1, confete: 1 };

  function existe(id) { return id === 'reta' || !!Y[id]; }
  function amostras(id) {
    var f = Y[id], n = (id === 'zigzag' || id === 'nuvens' || id === 'bolhas' || id === 'festao' || id === 'degraus' || id === 'marolas' || id === 'picos') ? 360 : 120, pts = [], i, u;
    for (i = 0; i <= n; i++) { u = i / n; pts.push([u * 480, clamp(f(u))]); }
    return pts;
  }
  // caminho fechado (viewBox 480 x 64) da região de BAIXO da fronteira
  function caminho(id, espelhar) {
    if (!Y[id] || id === 'reta') return '';
    var pts = amostras(id);
    if (espelhar) pts = pts.map(function (p) { return [480 - p[0], p[1]]; }).reverse();
    var d = 'M0,64 L' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L') + ' L480,64 Z';
    return d;
  }
  function temEnfeite(id) { return !!ENFEITADAS[id]; }

  function alea(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function folha(x, y, ang, comp, larg, cor) {
    var a = ang * PI / 180;
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')"><path fill="' + cor + '" d="M0,0 C' + (comp * 0.25).toFixed(1) + ',-' + larg.toFixed(1) + ' ' + (comp * 0.75).toFixed(1) + ',-' + (larg * 0.8).toFixed(1) + ' ' + comp.toFixed(1) + ',0 C' + (comp * 0.75).toFixed(1) + ',' + (larg * 0.8).toFixed(1) + ' ' + (comp * 0.25).toFixed(1) + ',' + larg.toFixed(1) + ' 0,0Z"/></g>';
  }

  // enfeite desenhado por cima da divisória, em pixels (W x H): pal = { dest, sec, prim }
  function enfeite(id, W, H, pal, espelhar) {
    var out = '', i, r, esc = H / 64, f = Y[id];
    var yAt = function (x) { var u = x / W; if (espelhar) u = 1 - u; return f(u) * esc; };
    if (id === 'ornamento') {
      var cy = H * 0.5, cx = W / 2, g = 26;
      out += '<line x1="' + (W * 0.1) + '" y1="' + cy + '" x2="' + (cx - g) + '" y2="' + cy + '" stroke="' + pal.dest + '" stroke-width="1.4"/>';
      out += '<line x1="' + (cx + g) + '" y1="' + cy + '" x2="' + (W * 0.9) + '" y2="' + cy + '" stroke="' + pal.dest + '" stroke-width="1.4"/>';
      out += '<path fill="' + pal.dest + '" d="M' + cx + ',' + (cy - 8) + ' L' + (cx + 8) + ',' + cy + ' L' + cx + ',' + (cy + 8) + ' L' + (cx - 8) + ',' + cy + 'Z"/>';
      out += '<circle cx="' + (cx - 17) + '" cy="' + cy + '" r="2.4" fill="' + pal.dest + '"/><circle cx="' + (cx + 17) + '" cy="' + cy + '" r="2.4" fill="' + pal.dest + '"/>';
      return out;
    }
    if (id === 'bandeirinhas') {
      var cores = [pal.dest, pal.sec, pal.prim, '#ffffff'], n = Math.max(6, Math.round(W / 36)), y0 = 4 * esc + 2, sag = H * 0.42;
      out += '<path d="M0,' + y0 + ' Q' + (W / 2) + ',' + (y0 + sag) + ' ' + W + ',' + y0 + '" fill="none" stroke="' + pal.dest + '" stroke-width="1.4"/>';
      for (i = 0; i < n; i++) {
        var t = (i + 0.5) / n, x = W * t, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag) + t * t * y0, w = Math.min(24, W / n * 0.7), h = Math.min(H * 0.55, 30);
        out += '<path fill="' + cores[i % cores.length] + '" opacity="0.95" d="M' + (x - w / 2).toFixed(1) + ',' + (y - 0.5).toFixed(1) + ' L' + (x + w / 2).toFixed(1) + ',' + (y - 0.5).toFixed(1) + ' L' + x.toFixed(1) + ',' + (y + h).toFixed(1) + 'Z"/>';
      }
      return out;
    }
    if (id === 'confete') {
      r = alea(7); var cs = [pal.dest, pal.sec, pal.prim, '#ffffff'];
      for (i = 0; i < Math.round(W / 9); i++) {
        var x2 = r() * W, y2 = r() * (yAt(x2) - 2), c = cs[Math.floor(r() * cs.length)], s = 3 + r() * 5, q = r();
        if (q < 0.4) out += '<circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="' + (s / 2).toFixed(1) + '" fill="' + c + '"/>';
        else if (q < 0.75) out += '<rect x="' + (x2 - s / 2).toFixed(1) + '" y="' + (y2 - s / 4).toFixed(1) + '" width="' + s.toFixed(1) + '" height="' + (s / 2).toFixed(1) + '" fill="' + c + '" transform="rotate(' + Math.round(r() * 180) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ')"/>';
        else out += '<path fill="' + c + '" d="M' + x2.toFixed(1) + ',' + (y2 - s / 2).toFixed(1) + ' L' + (x2 + s / 2).toFixed(1) + ',' + (y2 + s / 2).toFixed(1) + ' L' + (x2 - s / 2).toFixed(1) + ',' + (y2 + s / 2).toFixed(1) + 'Z"/>';
      }
      return out;
    }
    if (id === 'folhagem') {
      var pts = [], step = 4;
      for (i = 0; i <= W; i += step) pts.push(i.toFixed(1) + ',' + (yAt(i) - 3).toFixed(1));
      out += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + pal.sec + '" stroke-width="1.6" stroke-linecap="round"/>';
      for (i = 10; i < W - 6; i += 19) {
        var yy = yAt(i) - 3, up = ((i / 19) | 0) % 2 === 0, cor = ((i / 19) | 0) % 3 === 0 ? pal.dest : pal.sec, l = 15 + ((i * 7) % 7);
        out += folha(i, yy, up ? -55 : 55, l, l * 0.36, cor);
      }
      out += folha(W - 4, yAt(W - 4) - 3, -10, 20, 7, pal.dest);
      return out;
    }
    return out;
  }

  // miniatura para o painel: duas cores separadas pela forma (viewBox 100 x 46)
  function mini(id, corDeCima, corDeBaixo, pal) {
    var W = 100, H = 46;
    var topo = '<rect width="' + W + '" height="' + H + '" rx="6" fill="' + corDeCima + '"/>';
    if (id === 'reta') return '<svg viewBox="0 0 ' + W + ' ' + H + '"><rect width="' + W + '" height="' + H + '" rx="6" fill="' + corDeCima + '"/><rect y="24" width="' + W + '" height="22" rx="0" fill="' + corDeBaixo + '"/></svg>';
    var d = caminho(id, false);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '"><defs><clipPath id="fm-' + id + '"><rect width="' + W + '" height="' + H + '" rx="6"/></clipPath></defs><g clip-path="url(#fm-' + id + ')">' + topo +
      '<g transform="translate(0 ' + (H * 0.15) + ') scale(' + (W / 480) + ' ' + (H * 0.78 / 64) + ')"><path d="' + d + '" fill="' + corDeBaixo + '"/></g>' +
      '<rect y="' + (H * 0.15 + H * 0.78 - 1) + '" width="' + W + '" height="' + (H * 0.1) + '" fill="' + corDeBaixo + '"/>';
    if (temEnfeite(id)) svg += '<g transform="translate(0 ' + (H * 0.15) + ')">' + enfeite(id, W, H * 0.78, pal || { dest: '#C9A227', sec: '#2F5D9A', prim: '#0B2545' }, false) + '</g>';
    return svg + '</g></svg>';
  }

  window.FORMAS_SECAO = { LISTA: LISTA, ALTURAS: ALTURAS, existe: existe, caminho: caminho, temEnfeite: temEnfeite, enfeite: enfeite, mini: mini };
})();
