// Tipos de evento (templates): cada tipo define quais módulos o site do evento pode ter,
// os textos/configurações iniciais e a mensagem padrão de convite.
// Para criar um tipo novo: acrescente uma entrada em TIPOS (e, se preciso, módulos em MODULOS).

export const MODULOS = {
  countdown: 'Contagem regressiva',
  presente_teaser: 'Presentes (chamada)',
  timeline: 'Linha do Tempo',
  padrinhos: 'Padrinhos e Madrinhas',
  madrinhas_pais: 'Pais e Daminhas',
  mapa: 'Localização',
  galeria: 'Galeria',
  rsvp: 'Confirmação de presença',
  presentes: 'Presentes',
  recados: 'Recados',
};

export const TIPOS = {
  casamento: {
    nome: 'Casamento',
    descricao: 'Noiva e noivo, linha do tempo do casal, padrinhos, madrinhas, pais e daminhas.',
    modulos: ['countdown', 'presente_teaser', 'timeline', 'padrinhos', 'madrinhas_pais', 'mapa', 'galeria', 'rsvp', 'presentes', 'recados'],
    mensagemPadrao: 'Oi {nome}! Poderia confirmar sua presença no nosso casamento através deste link? {link} Pedimos a resposta até {prazo} 💛',
    padroes: {
      'hero.eyebrow': 'Nosso casamento',
      'hero.noiva': 'Noiva',
      'hero.noivo': 'Noivo',
      'hero.cta_label': 'Confirmar Presença →',
      'countdown.eyebrow': 'Para o grande dia',
      'presente_teaser.titulo': 'Um mimo pra gente?',
      'mapa.titulo': 'Local da realização de nossos sonhos',
      'presentes.titulo': 'Seja protagonista da nossa história',
      'rsvp.texto': 'Com muito carinho, para celebrar esse dia especial com você',
      'config.mensagem_template': 'Oi {nome}! Poderia confirmar sua presença no nosso casamento através deste link? {link} Pedimos a resposta até {prazo} 💛',
      'secao.padrinhos.ativa': '0',
      'secao.madrinhas_pais.ativa': '0',
    },
  },
  aniversario: {
    nome: 'Aniversário',
    descricao: 'Aniversariante e idade, contagem regressiva, local, galeria, confirmação, presentes e recados.',
    modulos: ['countdown', 'presente_teaser', 'mapa', 'galeria', 'rsvp', 'presentes', 'recados'],
    mensagemPadrao: 'Oi {nome}! Vai ser uma festa muito especial e queremos você lá. Confirme sua presença por este link: {link} até {prazo} 🎉',
    padroes: {
      'hero.eyebrow': 'Você é nosso convidado',
      'hero.noiva': 'Nome do aniversariante',
      'hero.noivo': '',
      'hero.idade': '',
      'hero.cta_label': 'Confirmar Presença →',
      'countdown.eyebrow': 'Contagem regressiva',
      'countdown.titulo': 'Faltam apenas',
      'presente_teaser.titulo': 'Quer me presentear?',
      'presente_teaser.texto': 'Se quiser fazer parte desse momento, escolha um presente com carinho.',
      'presente_teaser.cta_label': 'Ver lista de presentes →',
      'mapa.titulo': 'Onde vai ser a festa',
      'presentes.titulo': 'Quer me presentear?',
      'rsvp.texto': 'Vai ser uma festa muito especial e queremos você lá',
      'config.mensagem_template': 'Oi {nome}! Vai ser uma festa muito especial e queremos você lá. Confirme sua presença por este link: {link} até {prazo} 🎉',
    },
  },
};

export const TIPO_PADRAO = 'casamento';

export function tipoDe(id) {
  return TIPOS[id] ? id : TIPO_PADRAO;
}

// Conteúdo com o qual um evento novo nasce: padrões comuns (módulos ligados, cores, textos neutros) + os padrões do tipo.
// Data, prazo de confirmação e local nascem VAZIOS de propósito: o convite e o checklist só tratam como preenchido o que o
// anfitrião informou (o convite mostra "Data a definir" e "Local a definir" enquanto isso). Tudo é editável depois pelo painel.
export function padroesIniciais(tipoId) {
  const tipo = TIPOS[tipoDe(tipoId)];
  const base = {
    'hero.data_iso': '',
    'hero.data_display': '',
    'hero.horario_display': '',
    'hero.prazo_iso': '',
    'hero.prazo_display': '',
    'hero.foto_url': '',
    'countdown.titulo': 'Faltam apenas',
    'mapa.eyebrow': 'Localização',
    'mapa.local_nome': '',
    'mapa.local_endereco': '',
    'mapa.cta_label': 'Como chegar ↗',
    'galeria.eyebrow': 'Galeria',
    'galeria.titulo': 'Momentos para sempre',
    'rsvp.eyebrow': 'Confirme sua presença',
    'rsvp.titulo': 'Estamos preparando cada detalhe',
    'rsvp.sucesso_texto': 'Presença confirmada! Obrigado 💛',
    'rsvp.cta_label': 'Confirmar Presença →',
    'presentes.eyebrow': 'Lista de presentes',
    'presentes.cta_label': 'Abrir lista de presentes →',
    'presentes.itens': '[]',
    'presentes.lista_opcao_titulo': 'Escolha na nossa lista',
    'presentes.lista_opcao_texto': 'Veja os presentes e marque o que você vai dar, para ninguém repetir.',
    'presentes.externa_titulo': 'Lista em outra loja',
    'presentes.externa_texto': 'Nossa lista está em outro site. Você será levado até lá.',
    'presentes.infos_titulo': 'Dicas para presentear',
    'hero.convite_prefixo': 'Convite para',
    'presentes.lista_cta_label': 'Ver lista de presentes →',
    'presentes.pix_titulo': 'Prefere enviar um PIX?',
    'presentes.mostrar_lista': '0',
    'presentes.mostrar_externa': '0',
    'presentes.mostrar_infos': '0',
    'presentes.mostrar_pix': '0',
    'presente_teaser.destino': 'secao',
    'presente_teaser.layout': 'medio',
    'presente_teaser.fundo': 'suave',
    'recados.eyebrow': 'Recados',
    'recados.titulo': 'Deixe seu recado',
    'recados.texto': 'Escreva uma mensagem carinhosa pra guardarmos para sempre',
    'footer.texto': 'Feito com amor',
    'sticky.titulo': 'Confirme sua presença',
    'sticky.cta_label': 'Confirmar →',
    'sticky.subtexto_template': 'até {prazo}',
    'config.meta_convidados': '100',
    'aparencia.cor_primaria': '#0B2545',
    'aparencia.cor_secundaria': '#2F5D9A',
    'aparencia.cor_destaque': '#C9A227',
    'aparencia.cor_fundo': '#EAF1FB',
    'aparencia.cor_texto': '#14213D',
    'aparencia.fontes': 'classico',
    'aparencia.visual_confirmado': '0', // vira 1 quando o anfitrião escolhe ou confirma cores e letras (o checklist só conta a partir daí)
    'layout.ordem': '[]',
  };
  return { ...base, ...tipo.padroes };
}

// Textos que o evento novo traz só para a tela não ficar vazia. NÃO contam como "nome preenchido".
export const NOMES_PROVISORIOS = ['Noiva', 'Noivo', 'Nome do aniversariante'];

// O que ainda falta para o convite poder ser publicado: lista de { id, titulo }, onde id é o passo do assistente que resolve.
// Só data e nomes bloqueiam; todo o resto é opcional. c = conteúdo do evento (objeto chave/valor).
export function faltaParaPublicar(c, tipoId) {
  const v = (k) => String((c && c[k]) || '').trim();
  const real = (k) => v(k) && !NOMES_PROVISORIOS.includes(v(k));
  const aniv = tipoDe(tipoId) === 'aniversario';
  const falta = [];
  if (!(aniv ? real('hero.noiva') : real('hero.noiva') && real('hero.noivo'))) falta.push({ id: 'nomes', titulo: aniv ? 'Nome do aniversariante' : 'Nomes do casal' });
  if (!v('hero.data_iso')) falta.push({ id: 'data', titulo: 'Dia e hora' });
  return falta;
}
