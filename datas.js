// Formatação da data do evento, compartilhada pelo site e pelo painel.
// window.FORMATA_DATA(iso, formato, semana, textoLivre) → "Quarta, 16/12/26"
//   iso: "2026-12-16T19:00:00-03:00" (só a parte da data conta, para o fuso não mudar o dia)
//   formato: texto | extenso | extenso_sem_ano | numerico | numerico2 | abreviado
//   semana: nao | curto (Qua) | medio (Quarta) | completo (Quarta-feira)
(function () {
  var DIAS = [['Dom', 'Domingo', 'Domingo'], ['Seg', 'Segunda', 'Segunda-feira'], ['Ter', 'Terça', 'Terça-feira'], ['Qua', 'Quarta', 'Quarta-feira'], ['Qui', 'Quinta', 'Quinta-feira'], ['Sex', 'Sexta', 'Sexta-feira'], ['Sáb', 'Sábado', 'Sábado']];
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var dois = function (n) { return (n < 10 ? '0' : '') + n; };

  function partes(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? { a: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function formata(iso, formato, semana, textoLivre) {
    var p = partes(iso);
    var base = textoLivre || '';
    if (p && formato && formato !== 'texto') {
      if (formato === 'extenso') base = p.d + ' de ' + MESES[p.m - 1] + ' de ' + p.a;
      else if (formato === 'extenso_sem_ano') base = p.d + ' de ' + MESES[p.m - 1];
      else if (formato === 'numerico') base = dois(p.d) + '/' + dois(p.m) + '/' + p.a;
      else if (formato === 'numerico2') base = dois(p.d) + '/' + dois(p.m) + '/' + String(p.a).slice(-2);
      else if (formato === 'abreviado') base = p.d + ' ' + MESES_CURTOS[p.m - 1] + ' ' + p.a;
    }
    var idx = ['curto', 'medio', 'completo'].indexOf(semana);
    if (p && idx !== -1) {
      var dia = DIAS[new Date(Date.UTC(p.a, p.m - 1, p.d)).getUTCDay()][idx];
      base = base ? dia + ', ' + base : dia;
    }
    return base;
  }
  window.FORMATA_DATA = formata;
  window.FORMATOS_DATA = [
    { valor: 'texto', label: 'Texto que eu escrevo' },
    { valor: 'extenso', label: '16 de dezembro de 2026' },
    { valor: 'extenso_sem_ano', label: '16 de dezembro' },
    { valor: 'numerico', label: '16/12/2026' },
    { valor: 'numerico2', label: '16/12/26' },
    { valor: 'abreviado', label: '16 dez 2026' },
  ];
  window.DIAS_SEMANA = [
    { valor: 'nao', label: 'Não mostrar' },
    { valor: 'curto', label: 'Curto (Qua)' },
    { valor: 'medio', label: 'Nome (Quarta)' },
    { valor: 'completo', label: 'Completo (Quarta-feira)' },
  ];
})();
