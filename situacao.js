// Situação de uma pessoa e de um grupo de convidados. FONTE ÚNICA da regra: o painel (navegador), o servidor
// (functions/_lib.js) e os testes (testes/situacao.test.mjs) usam este mesmo arquivo.
//
// Máquina de estados do GRUPO (cada grupo está sempre em exatamente um destes estados):
//
//   naoaberto  ── alguém abre o link ──────────────▶ aberto
//   naoaberto/aberto ── alguém responde (convidado ou anfitrião) ──▶ confirmado | parcial | duvida | naovao
//   confirmado/parcial/duvida/naovao ── respostas mudam ──▶ qualquer um dos quatro
//   confirmado/parcial/duvida/naovao ── anfitrião limpa TODAS as respostas ──▶ volta a aberto ou naoaberto
//   (grupo sem nenhuma pessoa: "vazio", nunca aparece como "Não vão")
//
// Regras (a ordem importa):
//   1. "Respondeu" = o grupo tem data de confirmação OU alguma pessoa tem resposta (sim, não sei ou não).
//   2. Quem respondeu é: Confirmado (todos vão) → Não vão (ninguém vai e ninguém está em dúvida)
//      → Em dúvida (ninguém vai, mas há "não sei") → Parcial (alguns vão).
//   3. Quem não respondeu é: Abriu, sem resposta (link aberto) ou Não abriu o convite.
//
// A pessoa tem 4 estados: sim → "Vai", nao_sei → "Não sei", nao → "Não vai", sem resposta (null).
(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.SITUACAO = api;
})(typeof self !== 'undefined' ? self : this, function () {
  var RESPOSTAS = ['sim', 'nao_sei', 'nao'];

  var PESSOA = {
    sim: { id: 'vai', rot: 'Vai', cls: 'ok' },
    nao_sei: { id: 'duvida', rot: 'Não sei', cls: 'warn' },
    nao: { id: 'naovai', rot: 'Não vai', cls: 'err' },
    sem: { id: 'sem', rot: 'Sem resposta', cls: '' },
  };

  function situacaoPessoa(resposta) {
    return PESSOA[RESPOSTAS.indexOf(resposta) === -1 ? 'sem' : resposta];
  }

  // g: { membros: [{ resposta }], dataConfirmacao, statusAbertura }  →  { id, rot, cls, total, vao, duvida }
  function situacaoGrupo(g) {
    var membros = (g && g.membros) || [];
    var total = membros.length;
    var vao = membros.filter(function (m) { return m.resposta === 'sim'; }).length;
    var duvida = membros.filter(function (m) { return m.resposta === 'nao_sei'; }).length;
    function com(id, rot, cls) { return { id: id, rot: rot, cls: cls, total: total, vao: vao, duvida: duvida }; }
    if (!total) return com('vazio', 'Sem pessoas', '');
    var respondeu = !!(g && g.dataConfirmacao) || membros.some(function (m) { return RESPOSTAS.indexOf(m.resposta) !== -1; });
    if (respondeu) {
      if (vao === total) return com('confirmado', 'Confirmado', 'ok');
      if (vao === 0 && !duvida) return com('naovao', 'Não vão', 'err');
      if (vao === 0) return com('duvida', 'Em dúvida: ' + duvida + ' de ' + total, 'warn');
      return com('parcial', 'Parcial: ' + vao + ' de ' + total + (duvida ? ' (' + duvida + ' em dúvida)' : ''), 'warn');
    }
    if (g && g.statusAbertura === 'Aberto') return com('aberto', 'Abriu, sem resposta', 'info');
    return com('naoaberto', 'Não abriu o convite', '');
  }

  // Texto guardado em grupos.status_confirmacao. É só uma cópia derivada (o painel sempre recalcula pela regra acima);
  // mantém o vocabulário antigo para não quebrar planilhas e relatórios que já usam estes textos.
  function statusParaBanco(sit) {
    switch (sit.id) {
      case 'confirmado': return 'Confirmado';
      case 'parcial': return 'Parcial (' + sit.vao + '/' + sit.total + ')';
      case 'duvida': return 'Em dúvida';
      case 'naovao': return 'Não vão';
      case 'aberto': return 'Aguardando resposta';
      default: return 'Pendente'; // naoaberto e vazio
    }
  }

  return { RESPOSTAS: RESPOSTAS, situacaoPessoa: situacaoPessoa, situacaoGrupo: situacaoGrupo, statusParaBanco: statusParaBanco };
});
