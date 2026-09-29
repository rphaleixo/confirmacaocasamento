// Lembranças (brindes) planejadas pelo anfitrião. Tudo aqui é PRIVADO do painel: só as rotas de
// /api/admin/lembrancas* usam estas funções, e elas ficam atrás do login do admin.
export const PUBLICOS = ['todos', 'adultos', 'criancas'];
export const PRESENCAS = ['qualquer', 'confirmados', 'confirmados_talvez'];
export const SITUACOES = ['planejada', 'separada', 'entregue', 'nao_recebe'];
export const MAX_LEMBRANCAS = 30;

export const texto = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

// opções da informação por convidado: aceita lista ou texto separado por vírgula/linha; guarda como JSON
export function normalizarOpcoes(v) {
  const bruto = Array.isArray(v) ? v : String(v || '').split(/[\n,;]+/);
  const vistas = new Set();
  const lista = [];
  bruto.forEach((o) => {
    const t = texto(o, 40);
    if (t && !vistas.has(t.toLowerCase())) { vistas.add(t.toLowerCase()); lista.push(t); }
  });
  return lista.slice(0, 40);
}

export function lembrancaParaApi(r) {
  let opcoes = [];
  try { opcoes = JSON.parse(r.info_opcoes || '[]'); } catch (e) { opcoes = []; }
  return {
    id: r.id, nome: r.nome, descricao: r.descricao || '', publico: r.publico, presenca: r.presenca,
    infoRotulo: r.info_rotulo || '', infoOpcoes: Array.isArray(opcoes) ? opcoes : [], infoObrigatoria: r.info_obrigatoria === 1, ordem: r.ordem,
  };
}
