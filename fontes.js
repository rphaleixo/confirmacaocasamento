// Catálogo de fontes (Google Fonts) usado pelo site do evento e pela tela de Aparência do admin.
// Cada fonte tem: categoria, papéis em que funciona (título e/ou texto) e um texto de contexto de uso.
// Cada fonte é carregada num <link> próprio: se uma falhar, as outras continuam funcionando.
(function () {
  var C = {
    classica: 'Clássicas e elegantes',
    romantica: 'Românticas (manuscritas)',
    moderna: 'Modernas e limpas',
    divertida: 'Divertidas e festivas',
    leitura: 'Ótimas para leitura',
  };
  var IT = ':ital,wght@0,400;0,500;0,600;1,400;1,500';
  var IT2 = ':ital,wght@0,400;0,700;1,400';
  var W = ':wght@400;500;600';

  // [id, nome, genérica, spec, categoria, papéis, estilo do título, uso]
  var L = [
    // ---- clássicas e elegantes (serifadas) ----
    ['cormorant-garamond', 'Cormorant Garamond', 'serif', IT, 'classica', 'tx', 'italic', 'Fina e sofisticada, com muito charme em itálico. Casamentos clássicos, convites formais e nomes de noivos.'],
    ['playfair-display', 'Playfair Display', 'serif', IT, 'classica', 'tx', 'italic', 'Contraste forte e ar editorial. Casamentos modernos e elegantes, títulos de impacto.'],
    ['fraunces', 'Fraunces', 'serif', IT, 'classica', 'tx', 'italic', 'Serifa suave e acolhedora, com personalidade. Casamentos descontraídos e aniversários sofisticados.'],
    ['bodoni-moda', 'Bodoni Moda', 'serif', IT, 'classica', 'tx', 'italic', 'Luxo de revista de moda. Eventos black-tie, bodas e festas de gala.'],
    ['dm-serif-display', 'DM Serif Display', 'serif', ':ital@0;1', 'classica', 't', 'italic', 'Serifa gorda, marcante e vintage. Bodas, aniversários de 50+ e temas retrô.'],
    ['cormorant', 'Cormorant', 'serif', IT, 'classica', 'tx', 'italic', 'Delicada e leve, mais miúda que a Garamond. Convites minimalistas e textos curtos.'],
    ['eb-garamond', 'EB Garamond', 'serif', IT, 'classica', 'tx', 'italic', 'Clássica de livro antigo. Cerimônias religiosas e eventos tradicionais.'],
    ['libre-baskerville', 'Libre Baskerville', 'serif', IT2, 'classica', 'tx', 'italic', 'Séria e confiável. Casamentos no campo, eventos corporativos e formais.'],
    ['lora', 'Lora', 'serif', IT, 'classica', 'tx', 'italic', 'Serifa amigável e equilibrada. Serve bem para títulos e para textos longos.'],
    ['spectral', 'Spectral', 'serif', ':ital,wght@0,400;0,500;1,400;1,500', 'classica', 'tx', 'italic', 'Refinada e discreta, pensada para leitura em tela. Eventos intimistas.'],
    ['cinzel', 'Cinzel', 'serif', W, 'classica', 't', 'normal', 'Letras maiúsculas inspiradas em Roma antiga. Temas épicos, medievais ou de realeza. Use em títulos curtos.'],
    ['prata', 'Prata', 'serif', '', 'classica', 't', 'normal', 'Serifa elegante e contrastada, com ar de joalheria. Casamentos e noivados.'],
    ['marcellus', 'Marcellus', 'serif', '', 'classica', 't', 'normal', 'Clássica, leve e arejada. Cerimônias ao ar livre e eventos de dia.'],
    ['gilda-display', 'Gilda Display', 'serif', '', 'classica', 't', 'normal', 'Sofisticada e feminina. Chá de panela, noivado e bodas.'],
    ['abril-fatface', 'Abril Fatface', 'serif', '', 'classica', 't', 'normal', 'Títulos bem grossos e chamativos. Aniversários e festas com muita personalidade.'],
    // ---- românticas (manuscritas) ----
    ['great-vibes', 'Great Vibes', 'cursive', '', 'romantica', 't', 'normal', 'Caligrafia de convite formal, cheia de floreios. Casamentos românticos. Use em títulos curtos.'],
    ['pinyon-script', 'Pinyon Script', 'cursive', '', 'romantica', 't', 'normal', 'Caligrafia clássica de cartório. Casamentos tradicionais e bodas.'],
    ['allura', 'Allura', 'cursive', '', 'romantica', 't', 'normal', 'Manuscrita fluida e delicada. Casamentos e chás de noiva.'],
    ['parisienne', 'Parisienne', 'cursive', '', 'romantica', 't', 'normal', 'Charme francês, leve e feminina. Casamentos e festas de 15 anos.'],
    ['alex-brush', 'Alex Brush', 'cursive', '', 'romantica', 't', 'normal', 'Pincelada elegante e legível. Casamentos e convites de noivado.'],
    ['italianno', 'Italianno', 'cursive', '', 'romantica', 't', 'normal', 'Manuscrita fina e inclinada. Casamentos clássicos. Precisa de tamanho grande.'],
    ['tangerine', 'Tangerine', 'cursive', ':wght@400;700', 'romantica', 't', 'normal', 'Caligrafia bem fina e alta. Convites minimalistas. Precisa de tamanho grande.'],
    ['sacramento', 'Sacramento', 'cursive', '', 'romantica', 't', 'normal', 'Traço contínuo e delicado, estilo assinatura. Casamentos boho e íntimos.'],
    ['dancing-script', 'Dancing Script', 'cursive', W, 'romantica', 't', 'normal', 'Manuscrita alegre e bem legível. Casamentos e aniversários leves.'],
    ['playball', 'Playball', 'cursive', '', 'romantica', 't', 'normal', 'Manuscrita esportiva e elegante. Casamentos e aniversários de estilo retrô.'],
    ['satisfy', 'Satisfy', 'cursive', '', 'romantica', 't', 'normal', 'Manuscrita casual e calorosa. Eventos ao ar livre e chás.'],
    ['caveat', 'Caveat', 'cursive', W, 'romantica', 't', 'normal', 'Letra de caderno, feita à mão. Eventos descontraídos e recadinhos.'],
    // ---- modernas e limpas (sem serifa) ----
    ['montserrat', 'Montserrat', 'sans-serif', IT, 'moderna', 'tx', 'normal', 'Geométrica, moderna e muito versátil. Qualquer evento contemporâneo.'],
    ['poppins', 'Poppins', 'sans-serif', IT, 'moderna', 'tx', 'normal', 'Redonda, amigável e atual. Aniversários, formaturas e festas jovens.'],
    ['raleway', 'Raleway', 'sans-serif', IT, 'moderna', 'tx', 'normal', 'Fina e elegante, com ar minimalista. Casamentos modernos e eventos de design.'],
    ['josefin-sans', 'Josefin Sans', 'sans-serif', IT, 'moderna', 'tx', 'normal', 'Geométrica e vintage, estilo anos 20. Casamentos boho e temas retrô.'],
    ['jost', 'Jost', 'sans-serif', IT, 'moderna', 'tx', 'normal', 'Limpa e contemporânea, inspirada no design alemão. Casamentos e eventos minimalistas.'],
    ['work-sans', 'Work Sans', 'sans-serif', IT, 'moderna', 'tx', 'normal', 'Neutra e confortável. Boa opção para o texto de qualquer evento.'],
    ['outfit', 'Outfit', 'sans-serif', W, 'moderna', 'tx', 'normal', 'Geométrica e leve, com cara de aplicativo. Festas jovens e eventos modernos.'],
    ['oswald', 'Oswald', 'sans-serif', W, 'moderna', 't', 'normal', 'Estreita e forte. Eventos esportivos, churrascos e festas de time.'],
    ['bebas-neue', 'Bebas Neue', 'sans-serif', '', 'moderna', 't', 'normal', 'Só maiúsculas, bem impactante. Festas, formaturas e eventos esportivos. Títulos curtos.'],
    // ---- divertidas e festivas ----
    ['fredoka', 'Fredoka', 'sans-serif', W, 'divertida', 'tx', 'normal', 'Arredondada e simpática. Festa infantil, chá de bebê e aniversário de criança.'],
    ['baloo-2', 'Baloo 2', 'sans-serif', W, 'divertida', 'tx', 'normal', 'Gordinha e alegre. Festas infantis e temas coloridos.'],
    ['quicksand', 'Quicksand', 'sans-serif', W, 'divertida', 'tx', 'normal', 'Suave e arredondada, delicada. Chá de bebê, batizados e festas de menina.'],
    ['comfortaa', 'Comfortaa', 'sans-serif', W, 'divertida', 'tx', 'normal', 'Redonda e futurista. Festas jovens e temas tecnológicos.'],
    ['pacifico', 'Pacifico', 'cursive', '', 'divertida', 't', 'normal', 'Manuscrita surfista e descontraída. Festas na praia, verão e churrascos.'],
    ['lobster', 'Lobster', 'cursive', '', 'divertida', 't', 'normal', 'Chamativa e retrô, estilo cartaz. Festas temáticas e aniversários animados.'],
    ['chewy', 'Chewy', 'cursive', '', 'divertida', 't', 'normal', 'Desenho animado, cheia de graça. Festa infantil.'],
    ['bangers', 'Bangers', 'cursive', '', 'divertida', 't', 'normal', 'Estilo história em quadrinhos. Festa de super-herói e aniversário infantil.'],
    ['righteous', 'Righteous', 'sans-serif', '', 'divertida', 't', 'normal', 'Arrojada e retrofuturista. Festas anos 80 e temas neon.'],
    // ---- ótimas para leitura (textos) ----
    ['inter', 'Inter', 'sans-serif', W, 'leitura', 'x', 'normal', 'Nítida e neutra, feita para telas. Boa para qualquer texto corrido.'],
    ['lato', 'Lato', 'sans-serif', IT2, 'leitura', 'x', 'normal', 'Calorosa e equilibrada. Textos longos e informações práticas.'],
    ['open-sans', 'Open Sans', 'sans-serif', IT, 'leitura', 'x', 'normal', 'Muito legível em qualquer tamanho. Uma escolha segura.'],
    ['source-sans-3', 'Source Sans 3', 'sans-serif', IT, 'leitura', 'x', 'normal', 'Discreta e clara. Combina com títulos serifados.'],
    ['dm-sans', 'DM Sans', 'sans-serif', IT, 'leitura', 'x', 'normal', 'Geométrica e amigável. Combina com títulos manuscritos.'],
    ['nunito', 'Nunito', 'sans-serif', ':ital,wght@0,400;0,600;1,400', 'leitura', 'x', 'normal', 'Cantos arredondados e acolhedora. Combina com temas infantis e leves.'],
    ['mulish', 'Mulish', 'sans-serif', IT, 'leitura', 'x', 'normal', 'Minimalista e leve. Combina com títulos elegantes.'],
    ['karla', 'Karla', 'sans-serif', IT, 'leitura', 'x', 'normal', 'Um toque quirky e descontraído. Eventos criativos.'],
    ['libre-franklin', 'Libre Franklin', 'sans-serif', IT, 'leitura', 'x', 'normal', 'Clássica de jornal, sóbria. Eventos formais.'],
    ['merriweather', 'Merriweather', 'serif', IT2, 'leitura', 'x', 'normal', 'Serifa robusta, ótima para ler em celular. Textos longos.'],
    ['pt-serif', 'PT Serif', 'serif', IT2, 'leitura', 'x', 'normal', 'Serifa clássica e neutra. Eventos tradicionais.'],
    ['crimson-pro', 'Crimson Pro', 'serif', IT, 'leitura', 'x', 'normal', 'Serifa de livro, elegante em corpo pequeno. Casamentos clássicos.'],
  ];

  var fontes = L.map(function (r) {
    return {
      id: r[0], nome: r[1], generica: r[2], spec: r[3], categoria: r[4], categoriaNome: C[r[4]],
      titulo: r[5].indexOf('t') !== -1, texto: r[5].indexOf('x') !== -1,
      estiloTitulo: r[6], uso: r[7],
    };
  });
  var porId = {};
  fontes.forEach(function (f) { porId[f.id] = f; });

  // Combinações prontas: título + texto pensados para funcionar juntos
  var combinacoes = [
    ['classico', 'Clássico', 'cormorant-garamond', 'inter', 'O padrão do site: elegante e neutro. Funciona para casamentos em geral.'],
    ['moderno', 'Moderno', 'playfair-display', 'work-sans', 'Títulos de impacto com texto limpo. Casamentos e eventos contemporâneos.'],
    ['elegante', 'Elegante', 'fraunces', 'jost', 'Acolhedor e sofisticado. Casamentos íntimos e aniversários adultos.'],
    ['minimal', 'Minimalista', 'cormorant-garamond', 'montserrat', 'Delicado e arejado. Convites clean.'],
    ['romantico', 'Romântico', 'great-vibes', 'lora', 'Caligrafia de convite com texto serifado. Casamentos românticos (títulos curtos).'],
    ['boho', 'Boho chic', 'sacramento', 'josefin-sans', 'Assinatura delicada e sans geométrica. Casamentos no campo e na praia.'],
    ['luxo', 'Luxo editorial', 'bodoni-moda', 'jost', 'Ar de revista de moda. Eventos de gala.'],
    ['vintage', 'Vintage', 'dm-serif-display', 'source-sans-3', 'Serifa gorda e retrô. Bodas de ouro e aniversários de 50+.'],
    ['rustico', 'Rústico', 'libre-baskerville', 'lato', 'Sóbrio e tradicional. Casamentos no campo e eventos religiosos.'],
    ['festa', 'Festa animada', 'lobster', 'poppins', 'Título retrô e chamativo. Aniversários e festas temáticas.'],
    ['infantil', 'Festa infantil', 'fredoka', 'nunito', 'Arredondado e simpático. Aniversário de criança e chá de bebê.'],
    ['cha-bebe', 'Chá de bebê', 'quicksand', 'quicksand', 'Suave e delicado. Chá de bebê, batizado e festas de menina.'],
    ['praia', 'Praia e verão', 'pacifico', 'poppins', 'Descontraído e ensolarado. Festas na praia e churrascos.'],
    ['jovem', 'Festa jovem', 'outfit', 'dm-sans', 'Moderno e leve. Formaturas, 15 anos e festas jovens.'],
    ['esporte', 'Esporte e time', 'bebas-neue', 'open-sans', 'Forte e direto. Festas de time, churrascos e formaturas.'],
  ].map(function (r) { return { id: r[0], nome: r[1], titulo: r[2], texto: r[3], uso: r[4] }; });

  // Combinações antigas (chave "aparencia.fontes") continuam funcionando
  var legado = {};
  combinacoes.slice(0, 4).forEach(function (c) { legado[c.id] = c; });

  function familia(f) { return "'" + f.nome + "'," + f.generica; }
  function url(f) {
    return 'https://fonts.googleapis.com/css2?family=' + f.nome.replace(/ /g, '+') + f.spec + '&display=swap';
  }
  function carregar(f, doc) {
    doc = doc || document;
    if (!f) return;
    var id = 'fonte-' + f.id;
    if (doc.getElementById(id)) return;
    var l = doc.createElement('link');
    l.id = id; l.rel = 'stylesheet'; l.href = url(f);
    doc.head.appendChild(l);
  }

  window.FONTES_CATALOGO = { categorias: C, lista: fontes, porId: porId, combinacoes: combinacoes, legado: legado, familia: familia, url: url, carregar: carregar };
})();
