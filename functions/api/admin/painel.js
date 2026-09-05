import { jsonResponse } from '../../_lib.js';

const META_PADRAO = '150';
const MENSAGEM_PADRAO =
  'Oi {nome}! Poderia confirmar sua presença no nosso casamento através deste link? {link} 💛';

export async function onRequestGet({ env }) {
  const db = env.DB;

  const { results: convidados } = await db
    .prepare(
      `SELECT c.id, c.nome, c.telefone, c.confirmado, c.tipo, c.codigo_grupo AS codigoGrupo,
              g.nome_grupo AS grupo, g.status_abertura AS statusAbertura, g.data_abertura AS dataAbertura,
              g.status_confirmacao AS statusConfirmacao, g.data_confirmacao AS dataConfirmacao,
              g.responsavel AS responsavel, g.contato_responsavel AS contatoResponsavel
       FROM convidados c JOIN grupos g ON g.codigo = c.codigo_grupo
       ORDER BY g.nome_grupo, c.id`
    )
    .all();

  const config = await db
    .prepare("SELECT chave, valor FROM conteudo WHERE chave IN ('config.meta_convidados', 'config.mensagem_template')")
    .all();
  const configMap = {};
  config.results.forEach((r) => { configMap[r.chave] = r.valor; });
  const metaConvidados = Number(configMap['config.meta_convidados']) || Number(META_PADRAO);
  const mensagemTemplate = configMap['config.mensagem_template'] || MENSAGEM_PADRAO;

  const totalCadastrados = convidados.length;
  const adultosConfirmados = convidados.filter((c) => c.tipo === 'adulto' && c.confirmado === 1).length;
  const criancasConfirmadas = convidados.filter((c) => c.tipo === 'crianca' && c.confirmado === 1).length;
  const totalConfirmados = adultosConfirmados + criancasConfirmadas;
  const percentualOcupacao = metaConvidados > 0 ? Math.round((adultosConfirmados / metaConvidados) * 1000) / 10 : 0;

  return jsonResponse({
    metaConvidados,
    mensagemTemplate,
    totalCadastrados,
    totalConfirmados,
    adultosConfirmados,
    criancasConfirmadas,
    percentualOcupacao,
    convidados: convidados.map((c) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      tipo: c.tipo,
      confirmado: c.confirmado === 1,
      grupo: c.grupo,
      codigoGrupo: c.codigoGrupo,
      statusAbertura: c.statusAbertura,
      dataAbertura: c.dataAbertura,
      statusConfirmacao: c.statusConfirmacao,
      dataConfirmacao: c.dataConfirmacao,
      responsavel: c.responsavel,
      contatoResponsavel: c.contatoResponsavel,
    })),
  });
}
