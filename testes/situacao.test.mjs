// Testes da regra de situação (situacao.js). Não precisam de servidor nem de navegador:
//   node --test testes/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { situacaoPessoa, situacaoGrupo, statusParaBanco } = createRequire(import.meta.url)('../situacao.js');

const grupo = (respostas, extra) => Object.assign({ membros: respostas.map((r) => ({ resposta: r })), dataConfirmacao: null, statusAbertura: 'Não aberto' }, extra);
const id = (g) => situacaoGrupo(g).id;

test('pessoa: os quatro estados', () => {
  assert.deepEqual([situacaoPessoa('sim').id, situacaoPessoa('nao_sei').id, situacaoPessoa('nao').id, situacaoPessoa(null).id], ['vai', 'duvida', 'naovai', 'sem']);
  assert.equal(situacaoPessoa('qualquer coisa').id, 'sem', 'valor desconhecido conta como sem resposta');
  assert.equal(situacaoPessoa(undefined).rot, 'Sem resposta');
});

test('grupo que não respondeu: depende só de ter aberto o link', () => {
  assert.equal(id(grupo([null, null])), 'naoaberto');
  assert.equal(id(grupo([null, null], { statusAbertura: 'Aberto' })), 'aberto');
});

test('grupo que respondeu: as quatro situações, na ordem da regra', () => {
  assert.equal(id(grupo(['sim', 'sim'])), 'confirmado');
  assert.equal(id(grupo(['sim', 'nao'])), 'parcial');
  assert.equal(id(grupo(['sim', 'nao_sei'])), 'parcial');
  assert.equal(id(grupo(['nao', 'nao'])), 'naovao');
  assert.equal(id(grupo(['nao_sei', 'nao'])), 'duvida');
  assert.equal(id(grupo(['nao_sei', 'nao_sei'])), 'duvida');
});

test('grupo com uma resposta e outra pessoa sem resposta já "respondeu"', () => {
  assert.equal(id(grupo(['sim', null])), 'parcial');
  assert.equal(id(grupo(['nao', null])), 'naovao');
});

test('rótulos que o painel mostra', () => {
  assert.equal(situacaoGrupo(grupo(['sim', 'nao'])).rot, 'Parcial: 1 de 2');
  assert.equal(situacaoGrupo(grupo(['sim', 'nao_sei', 'nao'])).rot, 'Parcial: 1 de 3 (1 em dúvida)');
  assert.equal(situacaoGrupo(grupo(['nao_sei', 'nao'])).rot, 'Em dúvida: 1 de 2');
  assert.equal(situacaoGrupo(grupo(['nao', 'nao'])).rot, 'Não vão');
});

test('data de confirmação sem nenhuma resposta ainda conta como "respondeu" (por isso o servidor a apaga ao limpar as respostas)', () => {
  assert.equal(id(grupo([null, null], { dataConfirmacao: '2026-01-01T00:00:00Z' })), 'naovao');
});

test('grupo sem pessoas nunca vira "Não vão"', () => {
  assert.equal(id(grupo([], { dataConfirmacao: '2026-01-01T00:00:00Z' })), 'vazio');
  assert.equal(id({}), 'vazio');
  assert.equal(id(undefined), 'vazio');
});

test('texto guardado no banco (vocabulário antigo preservado)', () => {
  const banco = (g) => statusParaBanco(situacaoGrupo(g));
  assert.equal(banco(grupo([null])), 'Pendente');
  assert.equal(banco(grupo([null], { statusAbertura: 'Aberto' })), 'Aguardando resposta');
  assert.equal(banco(grupo(['sim', 'sim'])), 'Confirmado');
  assert.equal(banco(grupo(['sim', 'nao'])), 'Parcial (1/2)');
  assert.equal(banco(grupo(['nao', 'nao'])), 'Não vão');
  assert.equal(banco(grupo(['nao_sei'])), 'Em dúvida');
  assert.equal(banco(grupo([])), 'Pendente');
});
