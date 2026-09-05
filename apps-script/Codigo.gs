/*
 * PAINEL DE CONFIRMAÇÃO DE PRESENÇA
 * ---------------------------------------------------
 * Como instalar (uma vez só):
 * 1. Crie uma planilha nova no Google Sheets.
 * 2. Menu Extensões > Apps Script.
 * 3. Apague o conteúdo do arquivo "Código.gs" e cole o conteúdo deste arquivo.
 * 4. Crie um arquivo HTML pra cada um destes (menu Arquivo > Novo > Arquivo HTML,
 *    usando exatamente esses nomes): NovoGrupo, MesclarGrupos, MoverConvidado, ImportarLista.
 *    Cole o conteúdo de cada arquivo .html correspondente.
 * 5. Salve tudo (ícone de disquete) e feche a aba do Apps Script.
 * 6. Volte pra planilha e recarregue a página (F5). Vai aparecer um menu novo "🎊 Casamento".
 * 7. Clique em "🎊 Casamento" > "⚙️ Configurar planilha (1x)". Na primeira vez o Google
 *    vai pedir autorização — é normal, é só autorizar com sua própria conta Google.
 * 8. Pronto. A partir daqui, todo o uso do dia a dia é pelo menu "🎊 Casamento" e pela aba "Painel".
 *
 * IMPORTANTE: troque a constante BASE_URL abaixo pela URL real da página de confirmação do site.
 */

const SHEET_PAINEL = 'Painel';
const SHEET_CONV = 'Dados_Convidados';
const SHEET_GRUPOS = 'Dados_Grupos';

// Troque pela URL real da tela de confirmação do site. O código do grupo é
// concatenado no final, ex: BASE_URL + "7K2P9X"
const BASE_URL = 'https://SEU-SITE-AQUI.pages.dev/?c=';

// Colunas da aba Dados_Convidados
const CONV_COLS = { NOME: 1, TELEFONE: 2, CODIGO_GRUPO: 3, CONFIRMADO: 4 };
// Colunas da aba Dados_Grupos
const GRUPO_COLS = {
  CODIGO: 1, NOME_GRUPO: 2, URL: 3, STATUS_ABERTURA: 4, DATA_ABERTURA: 5,
  STATUS_CONFIRMACAO: 6, DATA_CONFIRMACAO: 7, RESPONSAVEL: 8, CONTATO_RESPONSAVEL: 9
};

// Linha onde a tabela de convidados começa a ser escrita no Painel (após título/resumo/cabeçalho)
const PAINEL_CONV_HEADER_ROW = 8;
const PAINEL_CONV_START_ROW = 9;
// Colunas da tabela de convidados no Painel
const PC = { CONFIRMADO: 1, NOME: 2, TELEFONE: 3, GRUPO: 4, LINHA_DADOS: 6 }; // LINHA_DADOS é oculta (helper)

/* ============================= MENU ============================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎊 Casamento')
    .addItem('📋 Atualizar Painel', 'atualizarPainel')
    .addSeparator()
    .addItem('➕ Novo Grupo', 'abrirNovoGrupo')
    .addItem('🔀 Mesclar Grupos', 'abrirMesclarGrupos')
    .addItem('↔️ Mover Convidado', 'abrirMoverConvidado')
    .addItem('📥 Importar Lista (colar)', 'abrirImportarLista')
    .addSeparator()
    .addItem('⚙️ Configurar planilha (1x)', 'setupPlanilha')
    .addToUi();
}

/* ============================= SETUP ============================= */

function setupPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let conv = ss.getSheetByName(SHEET_CONV);
  if (!conv) conv = ss.insertSheet(SHEET_CONV);
  if (conv.getRange('A1').getValue() !== 'nome') {
    conv.getRange(1, 1, 1, 4).setValues([['nome', 'telefone', 'codigo_grupo', 'confirmado']]);
    conv.setFrozenRows(1);
  }

  let grupos = ss.getSheetByName(SHEET_GRUPOS);
  if (!grupos) grupos = ss.insertSheet(SHEET_GRUPOS);
  if (grupos.getRange('A1').getValue() !== 'codigo') {
    grupos.getRange(1, 1, 1, 9).setValues([[
      'codigo', 'nome_grupo', 'url_confirmacao', 'status_abertura', 'data_abertura',
      'status_confirmacao', 'data_confirmacao', 'responsavel_confirmacao', 'contato_responsavel'
    ]]);
    grupos.setFrozenRows(1);
  }

  let painel = ss.getSheetByName(SHEET_PAINEL);
  if (!painel) painel = ss.insertSheet(SHEET_PAINEL);
  painel.clear();
  painel.getRange('A1').setValue('Painel de Confirmação de Presença')
    .setFontSize(16).setFontWeight('bold');
  painel.getRange('A3').setFormula(
    '="Convidados confirmados: " & COUNTIF(' + SHEET_CONV + '!D:D,TRUE) & " de " & (COUNTA(' + SHEET_CONV + '!A:A)-1)'
  );
  painel.getRange('A4').setFormula(
    '="Grupos 100% confirmados: " & COUNTIF(' + SHEET_GRUPOS + '!F:F,"Confirmado") & " de " & (COUNTA(' + SHEET_GRUPOS + '!A:A)-1)'
  );
  painel.getRange('A3:A4').setFontWeight('bold').setFontColor('#75003D');

  painel.getRange('A6').setValue('Convidados').setFontSize(13).setFontWeight('bold');
  painel.getRange(PAINEL_CONV_HEADER_ROW, 1, 1, 4)
    .setValues([['Confirmado', 'Nome', 'Telefone', 'Grupo']])
    .setFontWeight('bold').setBackground('#F3DEE7');
  painel.setColumnWidth(1, 90);
  painel.setColumnWidth(2, 220);
  painel.setColumnWidth(3, 140);
  painel.setColumnWidth(4, 200);
  painel.hideColumns(PC.LINHA_DADOS); // coluna F: guarda a linha correspondente em Dados_Convidados

  // Sheets de dados ficam ocultas — os noivos operam só pelo Painel e pelo menu.
  ss.setActiveSheet(painel);
  conv.hideSheet();
  grupos.hideSheet();

  atualizarPainel();
  SpreadsheetApp.getUi().alert('Planilha configurada! Use o menu 🎊 Casamento para cadastrar grupos.');
}

/* ============================= CÓDIGO ALEATÓRIO ============================= */

function gerarCodigoUnico_() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0 e I/1, pra evitar confusão
  const grupos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GRUPOS);
  const existentes = grupos.getLastRow() > 1
    ? grupos.getRange(2, GRUPO_COLS.CODIGO, grupos.getLastRow() - 1, 1).getValues().flat()
    : [];
  let codigo;
  do {
    codigo = '';
    for (let i = 0; i < 6; i++) codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  } while (existentes.indexOf(codigo) !== -1);
  return codigo;
}

/* ============================= NOVO GRUPO ============================= */

function abrirNovoGrupo() {
  const html = HtmlService.createHtmlOutputFromFile('NovoGrupo').setTitle('Novo grupo').setWidth(380);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Chamado pelo sidebar NovoGrupo.html via google.script.run
function criarGrupo(nomeGrupo, convidadosTexto) {
  nomeGrupo = (nomeGrupo || '').trim();
  if (!nomeGrupo) throw new Error('Dê um nome pro grupo.');

  const nomes = (convidadosTexto || '')
    .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  if (nomes.length === 0) throw new Error('Adicione ao menos um convidado.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const grupos = ss.getSheetByName(SHEET_GRUPOS);
  const conv = ss.getSheetByName(SHEET_CONV);

  const codigo = gerarCodigoUnico_();
  const url = BASE_URL + codigo;

  grupos.appendRow([codigo, nomeGrupo, url, 'Não aberto', '', 'Pendente', '', '', '']);

  const linhas = nomes.map(function (nome) { return [nome, '', codigo, false]; });
  conv.getRange(conv.getLastRow() + 1, 1, linhas.length, 4).setValues(linhas);

  atualizarPainel();
  return { codigo: codigo, url: url, total: nomes.length };
}

/* ============================= MESCLAR GRUPOS ============================= */

function abrirMesclarGrupos() {
  const html = HtmlService.createHtmlOutputFromFile('MesclarGrupos').setWidth(420).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, 'Mesclar grupos');
}

// Retorna a lista de grupos pro dialog preencher os checkboxes/dropdown
function listarGrupos() {
  const grupos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GRUPOS);
  if (grupos.getLastRow() < 2) return [];
  const dados = grupos.getRange(2, 1, grupos.getLastRow() - 1, 9).getValues();
  return dados.map(function (r) {
    return { codigo: r[0], nome: r[1], status: r[5] };
  });
}

// codigosParaMesclar: array de códigos selecionados. codigoQueFica: qual deles sobrevive.
function mesclarGrupos(codigosParaMesclar, codigoQueFica) {
  if (!codigosParaMesclar || codigosParaMesclar.length < 2) {
    throw new Error('Selecione ao menos dois grupos.');
  }
  if (codigosParaMesclar.indexOf(codigoQueFica) === -1) {
    throw new Error('O código escolhido pra manter precisa estar entre os selecionados.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conv = ss.getSheetByName(SHEET_CONV);
  const grupos = ss.getSheetByName(SHEET_GRUPOS);

  const codigosParaRemover = codigosParaMesclar.filter(function (c) { return c !== codigoQueFica; });

  // Realoca os convidados dos grupos removidos pro grupo que fica
  if (conv.getLastRow() > 1) {
    const range = conv.getRange(2, 1, conv.getLastRow() - 1, 4);
    const valores = range.getValues();
    for (let i = 0; i < valores.length; i++) {
      if (codigosParaRemover.indexOf(valores[i][CONV_COLS.CODIGO_GRUPO - 1]) !== -1) {
        valores[i][CONV_COLS.CODIGO_GRUPO - 1] = codigoQueFica;
      }
    }
    range.setValues(valores);
  }

  // Remove as linhas dos grupos que não ficaram (de baixo pra cima, pra não bagunçar os índices)
  const dadosGrupos = grupos.getRange(2, 1, grupos.getLastRow() - 1, 9).getValues();
  for (let i = dadosGrupos.length - 1; i >= 0; i--) {
    if (codigosParaRemover.indexOf(dadosGrupos[i][0]) !== -1) {
      grupos.deleteRow(i + 2);
    }
  }

  recalcularStatusGrupo_(codigoQueFica);
  atualizarPainel();
  return { ok: true, mantido: codigoQueFica, removidos: codigosParaRemover };
}

/* ============================= MOVER CONVIDADO ============================= */

function abrirMoverConvidado() {
  const html = HtmlService.createHtmlOutputFromFile('MoverConvidado').setWidth(400).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, 'Mover convidado de grupo');
}

// Retorna convidados com a linha real na aba de dados (pra identificar sem ambiguidade de nomes repetidos)
function listarConvidadosParaMover() {
  const conv = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONV);
  if (conv.getLastRow() < 2) return [];
  const dados = conv.getRange(2, 1, conv.getLastRow() - 1, 4).getValues();
  return dados.map(function (r, i) {
    return { linha: i + 2, nome: r[0], grupoAtual: r[2] };
  });
}

function moverConvidado(linhaConvidado, novoCodigoGrupo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conv = ss.getSheetByName(SHEET_CONV);
  const grupoAntigo = conv.getRange(linhaConvidado, CONV_COLS.CODIGO_GRUPO).getValue();

  conv.getRange(linhaConvidado, CONV_COLS.CODIGO_GRUPO).setValue(novoCodigoGrupo);

  if (grupoAntigo) recalcularStatusGrupo_(grupoAntigo);
  recalcularStatusGrupo_(novoCodigoGrupo);
  atualizarPainel();
  return { ok: true };
}

/* ============================= IMPORTAR LISTA (COLAR) ============================= */

function abrirImportarLista() {
  const html = HtmlService.createHtmlOutputFromFile('ImportarLista').setWidth(480).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, 'Importar lista colada');
}

// textoColado: texto colado direto de uma planilha (linhas separadas por \n, colunas por \t)
// Espera duas ou três colunas por linha: Nome [tab] Grupo [tab] Telefone(opcional)
function importarLista(textoColado) {
  const linhas = (textoColado || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  if (linhas.length === 0) throw new Error('Cole ao menos uma linha.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conv = ss.getSheetByName(SHEET_CONV);
  const grupos = ss.getSheetByName(SHEET_GRUPOS);

  // mapa nome_do_grupo (minúsculo) -> codigo, pra não recriar grupo que já existe
  const gruposExistentes = grupos.getLastRow() > 1
    ? grupos.getRange(2, 1, grupos.getLastRow() - 1, 2).getValues()
    : [];
  const mapaGrupos = {};
  gruposExistentes.forEach(function (r) { mapaGrupos[String(r[1]).trim().toLowerCase()] = r[0]; });

  const novasLinhasConvidados = [];
  let gruposCriados = 0;

  linhas.forEach(function (linha) {
    const cols = linha.split('\t').map(function (c) { return c.trim(); });
    const nome = cols[0] || '';
    const nomeGrupo = cols[1] || '';
    const telefone = cols[2] || '';
    if (!nome || !nomeGrupo) return; // ignora linha incompleta

    const chave = nomeGrupo.toLowerCase();
    let codigo = mapaGrupos[chave];
    if (!codigo) {
      codigo = gerarCodigoUnico_();
      grupos.appendRow([codigo, nomeGrupo, BASE_URL + codigo, 'Não aberto', '', 'Pendente', '', '', '']);
      mapaGrupos[chave] = codigo;
      gruposCriados++;
    }
    novasLinhasConvidados.push([nome, telefone, codigo, false]);
  });

  if (novasLinhasConvidados.length > 0) {
    conv.getRange(conv.getLastRow() + 1, 1, novasLinhasConvidados.length, 4).setValues(novasLinhasConvidados);
  }

  atualizarPainel();
  return { convidados: novasLinhasConvidados.length, gruposCriados: gruposCriados };
}

/* ============================= API PÚBLICA (usada pelo site) =============================
 * Depois de colar este arquivo, publique como Web App:
 * Implantar > Nova implantação > tipo "App da Web" > Executar como "Eu" > Quem tem acesso "Qualquer pessoa".
 * Copie a URL gerada (termina em /exec) e cole na constante WEB_APP_URL no HTML do site.
 * ========================================================================================== */

// GET .../exec?c=CODIGO  -> devolve os convidados daquele grupo
function doGet(e) {
  const codigo = (e.parameter.c || '').trim().toUpperCase();
  if (!codigo) return jsonOutput_({ erro: 'Código não informado.' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const grupos = ss.getSheetByName(SHEET_GRUPOS);
  const conv = ss.getSheetByName(SHEET_CONV);

  const dadosGrupos = grupos.getLastRow() > 1 ? grupos.getRange(2, 1, grupos.getLastRow() - 1, 9).getValues() : [];
  const linhaGrupoIdx = dadosGrupos.findIndex(function (r) { return String(r[0]).toUpperCase() === codigo; });
  if (linhaGrupoIdx === -1) return jsonOutput_({ erro: 'Convite não encontrado. Confira o link recebido.' });

  const linhaGrupo = linhaGrupoIdx + 2;
  // primeira abertura: marca status_abertura e data_abertura
  if (grupos.getRange(linhaGrupo, GRUPO_COLS.STATUS_ABERTURA).getValue() !== 'Aberto') {
    grupos.getRange(linhaGrupo, GRUPO_COLS.STATUS_ABERTURA).setValue('Aberto');
    grupos.getRange(linhaGrupo, GRUPO_COLS.DATA_ABERTURA).setValue(new Date());
  }

  const dadosConv = conv.getLastRow() > 1 ? conv.getRange(2, 1, conv.getLastRow() - 1, 4).getValues() : [];
  const convidados = dadosConv
    .filter(function (r) { return String(r[2]).toUpperCase() === codigo; })
    .map(function (r) { return { nome: r[0], confirmado: r[3] === true }; });

  return jsonOutput_({
    grupo: dadosGrupos[linhaGrupoIdx][1],
    convidados: convidados,
    statusConfirmacao: dadosGrupos[linhaGrupoIdx][5]
  });
}

// POST .../exec  (corpo em text/plain contendo um JSON, pra não disparar preflight de CORS)
// { codigo, responsavel, contatoResponsavel, convidados: [{nome, confirmado}] }
function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput_({ erro: 'Não entendi os dados enviados.' });
  }

  const codigo = String(payload.codigo || '').trim().toUpperCase();
  if (!codigo) return jsonOutput_({ erro: 'Código não informado.' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conv = ss.getSheetByName(SHEET_CONV);
  const grupos = ss.getSheetByName(SHEET_GRUPOS);

  if (conv.getLastRow() > 1) {
    const range = conv.getRange(2, 1, conv.getLastRow() - 1, 4);
    const valores = range.getValues();
    (payload.convidados || []).forEach(function (c) {
      for (let i = 0; i < valores.length; i++) {
        if (String(valores[i][2]).toUpperCase() === codigo && valores[i][0] === c.nome) {
          valores[i][3] = !!c.confirmado;
          break;
        }
      }
    });
    range.setValues(valores);
  }

  const dadosGrupos = grupos.getRange(2, 1, grupos.getLastRow() - 1, 9).getValues();
  for (let i = 0; i < dadosGrupos.length; i++) {
    if (String(dadosGrupos[i][0]).toUpperCase() === codigo) {
      const linha = i + 2;
      grupos.getRange(linha, GRUPO_COLS.RESPONSAVEL).setValue(payload.responsavel || '');
      grupos.getRange(linha, GRUPO_COLS.CONTATO_RESPONSAVEL).setValue(payload.contatoResponsavel || '');
      grupos.getRange(linha, GRUPO_COLS.DATA_CONFIRMACAO).setValue(new Date());
      break;
    }
  }

  recalcularStatusGrupo_(codigo);
  atualizarPainel();
  return jsonOutput_({ ok: true });
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================= STATUS DO GRUPO ============================= */

function recalcularStatusGrupo_(codigo) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conv = ss.getSheetByName(SHEET_CONV);
  const grupos = ss.getSheetByName(SHEET_GRUPOS);

  const dadosConv = conv.getLastRow() > 1 ? conv.getRange(2, 1, conv.getLastRow() - 1, 4).getValues() : [];
  const doGrupo = dadosConv.filter(function (r) { return r[2] === codigo; });
  const total = doGrupo.length;
  const confirmados = doGrupo.filter(function (r) { return r[3] === true; }).length;

  const linhasGrupos = grupos.getLastRow() > 1 ? grupos.getRange(2, 1, grupos.getLastRow() - 1, 9).getValues() : [];
  for (let i = 0; i < linhasGrupos.length; i++) {
    if (linhasGrupos[i][0] === codigo) {
      const linhaPlanilha = i + 2;
      let status;
      if (total === 0) status = 'Pendente';
      else if (confirmados === 0) status = linhasGrupos[i][3] === 'Aberto' ? 'Aguardando resposta' : 'Pendente';
      else if (confirmados === total) status = 'Confirmado';
      else status = 'Parcial (' + confirmados + '/' + total + ')';
      grupos.getRange(linhaPlanilha, GRUPO_COLS.STATUS_CONFIRMACAO).setValue(status);
      break;
    }
  }
}

/* ============================= PAINEL (leitura + confirmação manual) ============================= */

function atualizarPainel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const painel = ss.getSheetByName(SHEET_PAINEL);
  const conv = ss.getSheetByName(SHEET_CONV);
  const grupos = ss.getSheetByName(SHEET_GRUPOS);

  // limpa a tabela de convidados atual (mantém título/resumo/cabeçalho)
  const ultimaLinha = painel.getLastRow();
  if (ultimaLinha >= PAINEL_CONV_START_ROW) {
    painel.getRange(PAINEL_CONV_START_ROW, 1, ultimaLinha - PAINEL_CONV_START_ROW + 1, 6).clearContent();
  }

  const dadosConv = conv.getLastRow() > 1 ? conv.getRange(2, 1, conv.getLastRow() - 1, 4).getValues() : [];
  if (dadosConv.length === 0) return;

  // mapa codigo -> nome_grupo, pra mostrar o nome em vez do código no Painel
  const dadosGrupos = grupos.getLastRow() > 1 ? grupos.getRange(2, 1, grupos.getLastRow() - 1, 2).getValues() : [];
  const nomeDoGrupo = {};
  dadosGrupos.forEach(function (r) { nomeDoGrupo[r[0]] = r[1]; });

  const linhasPainel = dadosConv.map(function (r, i) {
    const nome = r[0], telefone = r[1], codigoGrupo = r[2], confirmado = r[3];
    return [confirmado, nome, telefone, nomeDoGrupo[codigoGrupo] || codigoGrupo, '', i + 2];
    // coluna 5 (E) fica em branco de propósito (respiro visual); coluna 6 (F) é a linha real em Dados_Convidados
  });

  painel.getRange(PAINEL_CONV_START_ROW, 1, linhasPainel.length, 6).setValues(linhasPainel);

  // reaplica a validação de checkbox na coluna "Confirmado" (setValues por cima apaga a validação)
  const rangeCheckbox = painel.getRange(PAINEL_CONV_START_ROW, PC.CONFIRMADO, linhasPainel.length, 1);
  rangeCheckbox.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());

  // recalcula o status de todos os grupos (garante que nada ficou desatualizado)
  const codigosUnicos = Array.from(new Set(dadosConv.map(function (r) { return r[2]; })));
  codigosUnicos.forEach(function (codigo) { if (codigo) recalcularStatusGrupo_(codigo); });
}

/**
 * Trigger simples: dispara sozinho sempre que alguém edita uma célula na planilha.
 * Aqui a gente só reage a cliques na coluna "Confirmado" da tabela do Painel.
 */
function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_PAINEL) return;
  if (e.range.getColumn() !== PC.CONFIRMADO) return;
  if (e.range.getRow() < PAINEL_CONV_START_ROW) return;

  const linhaPainel = e.range.getRow();
  const linhaDados = sheet.getRange(linhaPainel, PC.LINHA_DADOS).getValue();
  if (!linhaDados) return;

  const novoValor = e.range.getValue() === true;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conv = ss.getSheetByName(SHEET_CONV);

  conv.getRange(linhaDados, CONV_COLS.CONFIRMADO).setValue(novoValor);

  const codigoGrupo = conv.getRange(linhaDados, CONV_COLS.CODIGO_GRUPO).getValue();
  if (codigoGrupo) {
    recalcularStatusGrupo_(codigoGrupo);
    marcarResponsavelManual_(codigoGrupo);
  }
}

// Registra que a confirmação daquele grupo foi feita manualmente pelos noivos (não pelo link)
function marcarResponsavelManual_(codigoGrupo) {
  const grupos = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_GRUPOS);
  const dados = grupos.getRange(2, 1, grupos.getLastRow() - 1, 9).getValues();
  for (let i = 0; i < dados.length; i++) {
    if (dados[i][0] === codigoGrupo) {
      const linha = i + 2;
      grupos.getRange(linha, GRUPO_COLS.RESPONSAVEL).setValue('Confirmado manualmente pelos noivos');
      grupos.getRange(linha, GRUPO_COLS.DATA_CONFIRMACAO).setValue(new Date());
      break;
    }
  }
}

/**
 * Confirma ou desconfirma TODOS os convidados de um grupo de uma vez.
 * Chamada pelo dialog MesclarGrupos.html (reaproveitado também como "ações de grupo")
 * ou diretamente pelo menu, se você quiser adicionar um atalho depois.
 */
function definirConfirmacaoDoGrupo(codigoGrupo, valor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const conv = ss.getSheetByName(SHEET_CONV);
  if (conv.getLastRow() < 2) return { ok: true, alterados: 0 };

  const range = conv.getRange(2, 1, conv.getLastRow() - 1, 4);
  const valores = range.getValues();
  let alterados = 0;
  for (let i = 0; i < valores.length; i++) {
    if (valores[i][2] === codigoGrupo) {
      valores[i][3] = valor;
      alterados++;
    }
  }
  range.setValues(valores);

  recalcularStatusGrupo_(codigoGrupo);
  marcarResponsavelManual_(codigoGrupo);
  atualizarPainel();
  return { ok: true, alterados: alterados };
}
