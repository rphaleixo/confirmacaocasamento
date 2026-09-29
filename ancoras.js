// Âncoras públicas dos módulos do site: cada módulo tem um endereço direto próprio (ex.: /e/meu-evento/#confirmacao).
// Compartilhado entre o site do evento e o painel. As chaves são os ids internos das seções; os ids antigos
// (#rsvp, #map, #presentes...) continuam funcionando.
(function () {
  var POR_ID = {
    hero: 'capa',
    secCountdown: 'contagem',
    secPresenteTeaser: 'chamada-presentes',
    secTimeline: 'historia',
    secPadrinhos: 'padrinhos',
    secMadrinhasPais: 'pais-e-daminhas',
    map: 'local',
    secGaleria: 'galeria',
    rsvp: 'confirmacao',
    presentes: 'presentes',
    secRecados: 'recados',
    rodape: 'rodape',
  };
  window.ANCORAS_MODULOS = { porId: POR_ID, de: function (id) { return POR_ID[id] || id; } };
})();
