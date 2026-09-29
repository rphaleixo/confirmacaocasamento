// Imagem de compartilhamento (miniatura do link no WhatsApp, Instagram, iMessage…), 1200 × 630.
// Desenhada no navegador com <canvas> a partir das cores, fontes, nomes, data e foto do evento,
// usada pelo painel do anfitrião. O resultado vai para o armazenamento do site e vira o og:image.
// API: window.COMPARTILHAR = { ESTILOS, LARGURA, ALTURA, desenhar(op), assinatura(op), paraJpeg(canvas), fonteCarregada(f) }
(function () {
  'use strict';
  var W = 1200, H = 630;

  var ESTILOS = [
    { id: 'foto', nome: 'Foto e v\u00E9u', desc: 'A foto da capa com um véu elegante e moldura dourada' },
    { id: 'classico', nome: 'Cl\u00E1ssico', desc: 'Cor da marca, moldura dupla e monograma' },
    { id: 'claro', nome: 'Claro e delicado', desc: 'Fundo claro com folhagens e detalhes finos' },
    { id: 'arco', nome: 'Arco com foto', desc: 'Foto dentro de um arco ao lado do texto' },
  ];

  // ---------- cores ----------
  function rgb(h) {
    h = String(h || '#000000').replace('#', '');
    if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
    return [parseInt(h.substr(0, 2), 16) || 0, parseInt(h.substr(2, 2), 16) || 0, parseInt(h.substr(4, 2), 16) || 0];
  }
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function misturar(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); }).join(',') + ')';
  }
  function luminancia(h) {
    var c = rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  // ---------- utilidades de desenho ----------
  function semente(txt) { var h = 2166136261; for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function aleatorio(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function cobrir(ctx, img, x, y, w, h) {
    var r = Math.max(w / img.width, h / img.height), iw = img.width * r, ih = img.height * r;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  function estrela(ctx, x, y, r, cor, alfa) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alfa == null ? 1 : alfa; ctx.fillStyle = cor;
    ctx.beginPath();
    for (var i = 0; i < 8; i++) { var ang = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.22 : r; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function coracao(ctx, x, y, s, cor) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20); ctx.fillStyle = cor;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-14, -4, -8, -14, 0, -7); ctx.bezierCurveTo(8, -14, 14, -4, 0, 6); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function losango(ctx, x, y, r, cor) {
    ctx.save(); ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // folha em forma de gota, apontando para o ângulo dado
  function folha(ctx, x, y, ang, comp, larg, cor) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = cor;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(comp * 0.25, -larg, comp * 0.75, -larg * 0.8, comp, 0); ctx.bezierCurveTo(comp * 0.75, larg * 0.8, comp * 0.25, larg, 0, 0); ctx.fill(); ctx.restore();
  }
  // ramo com folhas alternadas: sai de (x, y) e se curva
  function ramo(ctx, x, y, ang, comp, cor, cor2, escala) {
    escala = escala || 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = cor; ctx.lineWidth = 2.2 * escala; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(comp * 0.3, -comp * 0.12, comp * 0.65, comp * 0.1, comp, -comp * 0.05); ctx.stroke();
    var n = 7;
    for (var i = 1; i <= n; i++) {
      var t = i / (n + 1), px = comp * t, py = -comp * 0.02 * Math.sin(t * 6);
      var l = (26 - i * 1.6) * escala;
      folha(ctx, px, py, i % 2 ? -0.9 : 0.9, l, l * 0.34, i % 3 === 0 ? cor2 : cor);
    }
    folha(ctx, comp, -comp * 0.05, -0.1, 30 * escala, 10 * escala, cor2);
    ctx.restore();
  }
  function confete(ctx, area, cores, seed, qtd) {
    var r = aleatorio(seed);
    for (var i = 0; i < qtd; i++) {
      var x = area.x + r() * area.w, y = area.y + r() * area.h, c = cores[Math.floor(r() * cores.length)], t = 5 + r() * 9;
      ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 6.28); ctx.fillStyle = c; ctx.globalAlpha = 0.55 + r() * 0.4;
      var f = r();
      if (f < 0.4) { ctx.beginPath(); ctx.arc(0, 0, t / 2, 0, 6.28); ctx.fill(); }
      else if (f < 0.75) ctx.fillRect(-t / 2, -t / 4, t, t / 2);
      else { ctx.beginPath(); ctx.moveTo(0, -t / 2); ctx.lineTo(t / 2, t / 2); ctx.lineTo(-t / 2, t / 2); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
  }
  function brilhos(ctx, seed, cor, qtd, evitar) {
    var r = aleatorio(seed), feitos = 0, tent = 0;
    while (feitos < qtd && tent++ < 400) {
      var x = 40 + r() * (W - 80), y = 40 + r() * (H - 80);
      var dentro = false;
      [].concat(evitar || []).forEach(function (a) { if (x > a.x && x < a.x + a.w && y > a.y && y < a.y + a.h) dentro = true; });
      if (dentro) continue;
      estrela(ctx, x, y, 3 + r() * 7, cor, 0.25 + r() * 0.6); feitos++;
    }
  }
  function espacado(ctx, txt, x, y, esp, alinhar) {
    var larg = 0, i, ws = [];
    for (i = 0; i < txt.length; i++) { ws[i] = ctx.measureText(txt[i]).width; larg += ws[i] + (i < txt.length - 1 ? esp : 0); }
    var ini = alinhar === 'centro' ? x - larg / 2 : x;
    ctx.save(); ctx.textAlign = 'left';
    for (i = 0; i < txt.length; i++) { ctx.fillText(txt[i], ini, y); ini += ws[i] + esp; }
    ctx.restore();
    return larg;
  }
  function larguraEspacada(ctx, txt, esp) { var l = 0; for (var i = 0; i < txt.length; i++) l += ctx.measureText(txt[i]).width + (i < txt.length - 1 ? esp : 0); return l; }
  function ajustar(ctx, txt, fonteFn, maxW, maxT, minT) {
    var t = maxT;
    while (t > minT) { ctx.font = fonteFn(t); if (ctx.measureText(txt).width <= maxW) break; t -= 2; }
    ctx.font = fonteFn(t);
    return t;
  }
  function retArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function caminhoArco(ctx, x, y, w, h) {
    var r = w / 2;
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
  }
  function iniciais(op) {
    var a = String(op.nome1 || '').trim().charAt(0).toUpperCase(), b = String(op.nome2 || '').trim().charAt(0).toUpperCase();
    return b ? a + ' & ' + b : a;
  }
  function divisor(ctx, cx, y, larg, cor, tipo) {
    ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.moveTo(cx - larg / 2, y); ctx.lineTo(cx - 26, y); ctx.moveTo(cx + 26, y); ctx.lineTo(cx + larg / 2, y); ctx.stroke(); ctx.restore();
    if (tipo === 'aniversario') estrela(ctx, cx, y, 12, cor); else coracao(ctx, cx, y + 2, 20, cor);
    losango(ctx, cx - larg / 2, y, 3.5, cor); losango(ctx, cx + larg / 2, y, 3.5, cor);
  }

  // ---------- fontes ----------
  function textoAmostra(op) { return (op.nome1 || '') + (op.nome2 || '') + (op.data || '') + (op.eyebrow || '') + '\u00C1\u00C9\u00CD\u00D3\u00DA\u00C2\u00CA\u00D4\u00C3\u00D5\u00C7\u00E1\u00E9\u00ED\u00F3\u00FA\u00E2\u00EA\u00F4\u00E3\u00F5\u00E7&\u00B70123456789'; }
  function fonteCarregada(f) {
    if (!f) return true;
    if (!document.fonts || !document.fonts.forEach) return true;
    var ok = false;
    document.fonts.forEach(function (ff) { if (String(ff.family).replace(/["']/g, '') === f.nome && ff.status === 'loaded') ok = true; });
    return ok;
  }
  // pede a fonte ao catálogo e espera o navegador baixá-la (até o tempo limite)
  function garantirFonte(f, amostra, limiteMs) {
    if (!f) return Promise.resolve(true);
    var CAT = window.FONTES_CATALOGO;
    if (CAT) CAT.carregar(f);
    var espec = f.estiloTitulo === 'italic' ? 'italic 500 60px' : '500 60px';
    var inicio = Date.now();
    return new Promise(function (resolve) {
      (function tentar() {
        var famCss = CAT ? CAT.familia(f) : "'" + f.nome + "'";
        var promessas = [document.fonts.load(espec + ' ' + famCss, amostra), document.fonts.load('600 30px ' + famCss, amostra), document.fonts.load('400 30px ' + famCss, amostra)];
        Promise.all(promessas).then(function () {
          if (fonteCarregada(f)) resolve(true);
          else if (Date.now() - inicio > (limiteMs || 5000)) resolve(false);
          else setTimeout(tentar, 250);
        }, function () { resolve(false); });
      })();
    });
  }
  function carregarImagem(url) {
    return new Promise(function (resolve) {
      if (!url) return resolve(null);
      var img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); }; img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  // ---------- estilos ----------
  function paleta(op) {
    var c = op.cores || {};
    return { prim: c.primaria || '#0B2545', sec: c.secundaria || '#2F5D9A', dest: c.destaque || '#C9A227', fundo: c.fundo || '#EAF1FB', texto: c.texto || '#14213D' };
  }
  function nomesLinha(ctx, op, cx, y, maxW, maxT, minT, corNome, corE, fam) {
    var estilo = fam.estilo, aniv = op.tipo === 'aniversario';
    var fn = function (t) { return estilo + ' 500 ' + t + 'px ' + fam.titulo; };
    var n1 = String(op.nome1 || ''), n2 = String(op.nome2 || '');
    if (aniv || !n2) {
      var t0 = ajustar(ctx, n1, fn, maxW, maxT, minT);
      ctx.textAlign = 'center'; ctx.fillStyle = corNome; ctx.fillText(n1, cx, y); return t0;
    }
    var t = maxT, w1, w2, wa;
    for (; t > minT; t -= 2) {
      ctx.font = fn(t); w1 = ctx.measureText(n1).width; w2 = ctx.measureText(n2).width; wa = ctx.measureText(' & ').width;
      if (w1 + w2 + wa <= maxW) break;
    }
    ctx.font = fn(t); w1 = ctx.measureText(n1).width; w2 = ctx.measureText(n2).width; wa = ctx.measureText(' & ').width;
    var x = cx - (w1 + wa + w2) / 2;
    ctx.textAlign = 'left'; ctx.fillStyle = corNome; ctx.fillText(n1, x, y);
    ctx.fillStyle = corE; ctx.font = 'italic 400 ' + Math.round(t * 0.92) + 'px ' + fam.titulo; ctx.fillText(' & ', x + w1 - (ctx.measureText(' & ').width - wa) / 2, y);
    ctx.font = fn(t); ctx.fillStyle = corNome; ctx.fillText(n2, x + w1 + wa, y);
    ctx.textAlign = 'center';
    return t;
  }
  function dataLinha(ctx, op, cx, y, cor, fam, tam) {
    var txt = String(op.data || '').toUpperCase(); if (!txt) return;
    ctx.font = '500 ' + tam + 'px ' + fam.texto; ctx.fillStyle = cor;
    var esp = tam * 0.16, larg = larguraEspacada(ctx, txt, esp);
    while (larg > 1000 && tam > 16) { tam -= 1; ctx.font = '500 ' + tam + 'px ' + fam.texto; esp = tam * 0.16; larg = larguraEspacada(ctx, txt, esp); }
    espacado(ctx, txt, cx, y, esp, 'centro');
  }
  function pilula(ctx, cx, y, txt, fam, corBorda, corTexto, corFundo) {
    ctx.font = '600 22px ' + fam.texto;
    var w = larguraEspacada(ctx, txt, 1.5) + 56, h = 48;
    retArredondado(ctx, cx - w / 2, y - h / 2, w, h, h / 2);
    if (corFundo) { ctx.fillStyle = corFundo; ctx.fill(); }
    ctx.lineWidth = 1.6; ctx.strokeStyle = corBorda; ctx.stroke();
    ctx.fillStyle = corTexto; espacado(ctx, txt, cx, y + 8, 1.5, 'centro');
  }
  function cantos(ctx, x, y, w, h, cor) {
    // pequenos ornamentos nos quatro cantos da moldura
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(function (c) {
      ctx.save(); ctx.translate(c[0], c[1]); ctx.scale(c[2], c[3]); ctx.strokeStyle = cor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI / 2); ctx.stroke(); ctx.restore();
      losango(ctx, c[0] + c[2] * 30, c[1] + c[3] * 30, 3.5, cor);
    });
  }
  function fundoDegrade(ctx, a, b, ang) {
    var g = ctx.createLinearGradient(0, 0, W * Math.cos(ang), H * Math.sin(ang) + H * 0.2);
    g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function brilhoSuave(ctx, x, y, r, cor, alfa) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(cor, alfa)); g.addColorStop(1, rgba(cor, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function estiloFoto(ctx, op, P, fam, foto) {
    if (foto) cobrir(ctx, foto, 0, 0, W, H);
    else { fundoDegrade(ctx, P.sec, P.prim, 0.6); brilhoSuave(ctx, W * 0.75, H * 0.2, 520, P.dest, 0.22); brilhoSuave(ctx, W * 0.15, H * 0.9, 460, '#ffffff', 0.10); }
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(P.prim, foto ? 0.42 : 0.15)); g.addColorStop(0.5, rgba(P.prim, foto ? 0.58 : 0.25)); g.addColorStop(1, rgba(P.prim, foto ? 0.88 : 0.55));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    brilhos(ctx, semente('foto' + op.nome1), '#ffffff', 22, { x: 150, y: 150, w: 900, h: 340 });
    if (op.tipo === 'aniversario') confete(ctx, { x: 30, y: 30, w: W - 60, h: 120 }, [P.dest, '#ffffff', P.sec], semente(op.nome1 + 'c'), 26);
    ctx.strokeStyle = rgba(P.dest, 0.95); ctx.lineWidth = 2.5; ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.strokeStyle = rgba(P.dest, 0.45); ctx.lineWidth = 1; ctx.strokeRect(40, 40, W - 80, H - 80);
    cantos(ctx, 28, 28, W - 56, H - 56, rgba(P.dest, 0.95));
    ctx.textAlign = 'center'; ctx.fillStyle = P.dest; ctx.font = '600 22px ' + fam.texto;
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 8;
    espacado(ctx, String(op.eyebrow || '').toUpperCase(), W / 2, 178, 5, 'centro');
    ctx.shadowBlur = 18; ctx.shadowColor = 'rgba(0,0,0,0.5)';
    nomesLinha(ctx, op, W / 2, 322, 1000, 132, 60, '#ffffff', P.dest, fam);
    ctx.shadowBlur = 0;
    divisor(ctx, W / 2, 376, 380, P.dest, op.tipo);
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10;
    dataLinha(ctx, op, W / 2, 440, '#ffffff', fam, 30);
    ctx.shadowBlur = 0;
    pilula(ctx, W / 2, 528, 'TOQUE PARA CONFIRMAR PRESEN\u00C7A', fam, rgba(P.dest, 0.95), '#ffffff', rgba(P.prim, 0.35));
  }

  function estiloClassico(ctx, op, P, fam) {
    fundoDegrade(ctx, misturar(P.prim, '#ffffff', 0.08), misturar(P.prim, '#000000', 0.32), 0.9);
    brilhoSuave(ctx, W / 2, H * 0.42, 620, P.sec, 0.55);
    brilhoSuave(ctx, W * 0.9, H * 0.05, 360, P.dest, 0.16);
    brilhos(ctx, semente('cl' + op.nome1), P.dest, 34, [{ x: 190, y: 140, w: 820, h: 370 }, { x: 520, y: 50, w: 160, h: 130 }]);
    if (op.tipo === 'aniversario') confete(ctx, { x: 60, y: 60, w: W - 120, h: H - 120 }, [P.dest, '#ffffff', misturar(P.sec, '#ffffff', 0.4)], semente(op.nome1 + 'c'), 46);
    ctx.strokeStyle = P.dest; ctx.lineWidth = 3; ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.lineWidth = 1; ctx.globalAlpha = 0.55; ctx.strokeRect(46, 46, W - 92, H - 92); ctx.globalAlpha = 1;
    cantos(ctx, 30, 30, W - 60, H - 60, P.dest);
    // monograma
    ctx.beginPath(); ctx.arc(W / 2, 112, 50, 0, 6.283); ctx.fillStyle = rgba(P.prim, 0.55); ctx.fill(); ctx.strokeStyle = P.dest; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, 112, 42, 0, 6.283); ctx.lineWidth = 1; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    if (op.generico) coracao(ctx, W / 2, 112, 44, P.dest);
    else { var ini = iniciais(op); var ti = ajustar(ctx, ini, function (t) { return fam.estilo + ' 500 ' + t + 'px ' + fam.titulo; }, 74, 42, 24); ctx.fillText(ini, W / 2, 112 + ti * 0.32); }
    ctx.fillStyle = P.dest; ctx.font = '600 21px ' + fam.texto;
    espacado(ctx, String(op.eyebrow || '').toUpperCase(), W / 2, 214, 5, 'centro');
    nomesLinha(ctx, op, W / 2, 335, 980, 118, 56, '#ffffff', P.dest, fam);
    divisor(ctx, W / 2, 388, 340, P.dest, op.tipo);
    dataLinha(ctx, op, W / 2, 448, '#ffffff', fam, 29);
    pilula(ctx, W / 2, 530, 'TOQUE PARA CONFIRMAR PRESEN\u00C7A', fam, P.dest, '#ffffff', null);
  }

  function estiloClaro(ctx, op, P, fam) {
    var claro = misturar(P.fundo, '#ffffff', 0.5);
    fundoDegrade(ctx, claro, P.fundo, 0.9);
    brilhoSuave(ctx, W * 0.2, H * 0.15, 520, P.dest, 0.20);
    brilhoSuave(ctx, W * 0.85, H * 0.95, 560, P.sec, 0.18);
    var f1 = P.sec, f2 = P.dest;
    ramo(ctx, 20, 92, -0.35, 330, rgba(f1, 0.9), rgba(f2, 0.9), 1.1);
    ramo(ctx, 10, 190, 0.2, 240, rgba(f1, 0.7), rgba(f2, 0.8), 0.9);
    ramo(ctx, W - 20, H - 92, Math.PI - 0.35, 330, rgba(f1, 0.9), rgba(f2, 0.9), 1.1);
    ramo(ctx, W - 10, H - 190, Math.PI + 0.2, 240, rgba(f1, 0.7), rgba(f2, 0.8), 0.9);
    ramo(ctx, W - 30, 50, Math.PI * 0.62, 170, rgba(f1, 0.5), rgba(f2, 0.6), 0.7);
    ramo(ctx, 30, H - 50, -Math.PI * 0.38, 170, rgba(f1, 0.5), rgba(f2, 0.6), 0.7);
    if (op.tipo === 'aniversario') confete(ctx, { x: 60, y: 40, w: W - 120, h: H - 80 }, [P.dest, P.sec, P.prim], semente(op.nome1 + 'c'), 42);
    else brilhos(ctx, semente('cr' + op.nome1), P.dest, 18, { x: 160, y: 140, w: 880, h: 360 });
    ctx.strokeStyle = rgba(P.dest, 0.85); ctx.lineWidth = 1.6; retArredondado(ctx, 34, 34, W - 68, H - 68, 26); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = P.sec; ctx.font = '600 21px ' + fam.texto;
    espacado(ctx, String(op.eyebrow || '').toUpperCase(), W / 2, 172, 5, 'centro');
    nomesLinha(ctx, op, W / 2, 316, 900, 130, 56, P.prim, P.dest, fam);
    divisor(ctx, W / 2, 372, 340, P.dest, op.tipo);
    dataLinha(ctx, op, W / 2, 436, P.texto, fam, 29);
    pilula(ctx, W / 2, 524, 'TOQUE PARA CONFIRMAR PRESEN\u00C7A', fam, P.prim, '#ffffff', P.prim);
  }

  function estiloArco(ctx, op, P, fam, foto) {
    fundoDegrade(ctx, misturar(P.prim, '#ffffff', 0.06), misturar(P.prim, '#000000', 0.3), 0.8);
    brilhoSuave(ctx, W * 0.78, H * 0.5, 520, P.sec, 0.6);
    brilhoSuave(ctx, W * 0.05, H * 0.1, 380, P.dest, 0.14);
    brilhos(ctx, semente('ar' + op.nome1), P.dest, 26, { x: 60, y: 130, w: 640, h: 380 });
    var ax = 776, ay = 44, aw = 360, ah = 542;
    // moldura em arco
    caminhoArco(ctx, ax - 16, ay - 16, aw + 32, ah + 32); ctx.strokeStyle = rgba(P.dest, 0.9); ctx.lineWidth = 2; ctx.stroke();
    caminhoArco(ctx, ax - 8, ay - 8, aw + 16, ah + 16); ctx.strokeStyle = rgba(P.dest, 0.4); ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); caminhoArco(ctx, ax, ay, aw, ah); ctx.clip();
    if (foto) cobrir(ctx, foto, ax, ay, aw, ah);
    else {
      var g = ctx.createLinearGradient(ax, ay, ax + aw, ay + ah); g.addColorStop(0, P.sec); g.addColorStop(1, misturar(P.prim, '#000000', 0.2)); ctx.fillStyle = g; ctx.fillRect(ax, ay, aw, ah);
      brilhoSuave(ctx, ax + aw * 0.5, ay + ah * 0.3, 260, P.dest, 0.35);
      ctx.fillStyle = rgba('#ffffff', 0.92); ctx.textAlign = 'center';
      var tt = ajustar(ctx, iniciais(op), function (t) { return fam.estilo + ' 500 ' + t + 'px ' + fam.titulo; }, aw - 80, 120, 40);
      ctx.fillText(iniciais(op), ax + aw / 2, ay + ah / 2 + tt * 0.3);
    }
    var vg = ctx.createLinearGradient(0, ay + ah * 0.6, 0, ay + ah); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, rgba(P.prim, 0.45)); ctx.fillStyle = vg; ctx.fillRect(ax, ay, aw, ah);
    ctx.restore();
    estrela(ctx, ax - 40, ay + 60, 14, P.dest, 0.9); estrela(ctx, ax + aw + 42, ay + ah - 90, 11, P.dest, 0.8);
    if (op.tipo === 'aniversario') confete(ctx, { x: ax - 60, y: ay, w: aw + 120, h: ah }, [P.dest, '#ffffff'], semente(op.nome1 + 'c'), 20);
    // texto à esquerda
    var cx = 60 + (ax - 40 - 60) / 2, larg = ax - 40 - 60;
    ctx.textAlign = 'center'; ctx.fillStyle = P.dest; ctx.font = '600 20px ' + fam.texto;
    espacado(ctx, String(op.eyebrow || '').toUpperCase(), cx, 150, 5, 'centro');
    var n1 = String(op.nome1 || ''), n2 = String(op.nome2 || ''), fn = function (t) { return fam.estilo + ' 500 ' + t + 'px ' + fam.titulo; };
    if (op.tipo === 'aniversario' || !n2) {
      var t1 = ajustar(ctx, n1, fn, larg, 112, 48); ctx.fillStyle = '#ffffff'; ctx.fillText(n1, cx, 290);
    } else {
      var t2 = 96; for (; t2 > 42; t2 -= 2) { ctx.font = fn(t2); if (Math.max(ctx.measureText(n1).width, ctx.measureText(n2).width) <= larg) break; }
      ctx.font = fn(t2); ctx.fillStyle = '#ffffff'; ctx.fillText(n1, cx, 250);
      ctx.fillStyle = P.dest; ctx.font = 'italic 400 ' + Math.round(t2 * 0.5) + 'px ' + fam.titulo; ctx.fillText('&', cx, 250 + t2 * 0.56);
      ctx.font = fn(t2); ctx.fillStyle = '#ffffff'; ctx.fillText(n2, cx, 250 + t2 * 1.12);
    }
    divisor(ctx, cx, 410, Math.min(320, larg - 40), P.dest, op.tipo);
    dataLinha(ctx, op, cx, 468, '#ffffff', fam, 26);
    pilula(ctx, cx, 546, 'TOQUE PARA CONFIRMAR', fam, P.dest, '#ffffff', null);
  }

  // ---------- API ----------
  // op: { estilo, tipo, nome1, nome2, data, eyebrow, cores:{primaria,secundaria,destaque,fundo,texto}, fonteTitulo, fonteTexto (objetos do catálogo), foto (URL) }
  function desenhar(op) {
    op = op || {};
    var CAT = window.FONTES_CATALOGO;
    var fT = op.fonteTitulo, fX = op.fonteTexto;
    var amostra = textoAmostra(op);
    return Promise.all([garantirFonte(fT, amostra), garantirFonte(fX, amostra), carregarImagem(op.foto)]).then(function (r) {
      var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext('2d');
      var fam = {
        titulo: fT && CAT ? CAT.familia(fT) : "'Cormorant Garamond',serif",
        texto: fX && CAT ? CAT.familia(fX) : "'Inter',sans-serif",
        estilo: fT ? fT.estiloTitulo : 'italic',
      };
      var P = paleta(op);
      ctx.textBaseline = 'alphabetic';
      var estilo = ESTILOS.some(function (e) { return e.id === op.estilo; }) ? op.estilo : 'foto';
      if (estilo === 'foto') estiloFoto(ctx, op, P, fam, r[2]);
      else if (estilo === 'classico') estiloClassico(ctx, op, P, fam);
      else if (estilo === 'claro') estiloClaro(ctx, op, P, fam);
      else estiloArco(ctx, op, P, fam, r[2]);
      return { canvas: canvas, fontesOk: r[0] && r[1] };
    });
  }

  // texto curto que identifica tudo o que muda o desenho (serve para saber se a imagem guardada ficou velha)
  function assinatura(op) {
    var c = op.cores || {};
    var base = ['v1', op.estilo, op.tipo, op.nome1, op.nome2, op.data, op.eyebrow, c.primaria, c.secundaria, c.destaque, c.fundo, c.texto,
      op.fonteTitulo ? op.fonteTitulo.id : '', op.fonteTexto ? op.fonteTexto.id : '', op.foto || ''].join('|');
    return semente(base).toString(36) + '-' + base.length.toString(36);
  }

  // JPEG abaixo de ~280 KB (o WhatsApp deixa de mostrar miniaturas muito pesadas)
  function paraJpeg(canvas, limite) {
    limite = limite || 280 * 1024;
    var qs = [0.9, 0.84, 0.78, 0.72, 0.66, 0.58];
    return new Promise(function (resolve) {
      (function passo(i) {
        canvas.toBlob(function (blob) {
          if (!blob) return resolve(null);
          if (blob.size <= limite || i >= qs.length - 1) resolve(blob); else passo(i + 1);
        }, 'image/jpeg', qs[i]);
      })(0);
    });
  }

  window.COMPARTILHAR = { ESTILOS: ESTILOS, LARGURA: W, ALTURA: H, desenhar: desenhar, assinatura: assinatura, paraJpeg: paraJpeg, fonteCarregada: fonteCarregada };
})();
