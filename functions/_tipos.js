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
    mensagemPadrao: 'Oi {nome}! Poderia confirmar sua presença no nosso casamento através deste link? {link} 💛',
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
      'config.mensagem_template': 'Oi {nome}! Poderia confirmar sua presença no nosso casamento através deste link? {link} 💛',
      'secao.padrinhos.ativa': '0',
      'secao.madrinhas_pais.ativa': '0',
    },
  },
  aniversario: {
    nome: 'Aniversário',
    descricao: 'Aniversariante e idade, contagem regressiva, local, galeria, confirmação, presentes e recados.',
    modulos: ['countdown', 'presente_teaser', 'mapa', 'galeria', 'rsvp', 'presentes', 'recados'],
    mensagemPadrao: 'Oi {nome}! Vai ser uma festa muito especial e queremos você lá. Confirme sua presença por este link: {link} 🎉',
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
      'config.mensagem_template': 'Oi {nome}! Vai ser uma festa muito especial e queremos você lá. Confirme sua presença por este link: {link} 🎉',
    },
  },
};

export const TIPO_PADRAO = 'casamento';

export function tipoDe(id) {
  return TIPOS[id] ? id : TIPO_PADRAO;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Conteúdo com o qual um evento novo nasce: padrões comuns (módulos ligados, cores, textos neutros,
// datas provisórias) + os padrões do tipo. Tudo é editável depois pelo painel do evento.
export function padroesIniciais(tipoId, agora = new Date()) {
  const dia = (n) => new Date(agora.getTime() + n * 86400000);
  const evento = dia(90);
  const prazo = dia(60);
  const isoBR = (d, h) => `${d.toISOString().slice(0, 10)}T${h}-03:00`;
  const extenso = (d) => `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
  const tipo = TIPOS[tipoDe(tipoId)];
  const base = {
    'hero.data_iso': isoBR(evento, '15:00:00'),
    'hero.data_display': extenso(evento),
    'hero.horario_display': 'às 15h00',
    'hero.prazo_iso': isoBR(prazo, '23:59:59'),
    'hero.prazo_display': `${prazo.getUTCDate()} de ${MESES[prazo.getUTCMonth()]}`,
    'hero.foto_url': '',
    'countdown.titulo': 'Faltam apenas',
    'mapa.eyebrow': 'Localização',
    'mapa.local_nome': 'Local do evento',
    'mapa.local_endereco': 'Endereço do evento',
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
    'layout.ordem': '[]',
  };
  return { ...base, ...tipo.padroes };
}
