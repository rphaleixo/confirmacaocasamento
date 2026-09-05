import { jsonResponse, gerarCodigoUnico } from '../../_lib.js';

// body: { texto } — linhas de: Nome [tab] Grupo [tab] Telefone(opcional) [tab] adulto|crianca(opcional)
export async function onRequestPost({ request, env }) {
  const payload = await request.json().catch(() => ({}));
  const linhas = (payload.texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (linhas.length === 0) return jsonResponse({ erro: 'Cole ao menos uma linha.' }, 400);

  const db = env.DB;
  const { results: gruposExistentes } = await db.prepare('SELECT codigo, nome_grupo FROM grupos').all();
  const mapaGrupos = {};
  gruposExistentes.forEach((g) => { mapaGrupos[g.nome_grupo.trim().toLowerCase()] = g.codigo; });

  const novosGrupos = [];
  const novosConvidados = [];

  for (const linha of linhas) {
    const cols = linha.split('\t').map((c) => c.trim());
    const nome = cols[0] || '';
    const nomeGrupo = cols[1] || '';
    const telefone = cols[2] || '';
    const tipo = (cols[3] || '').toLowerCase() === 'crianca' ? 'crianca' : 'adulto';
    if (!nome || !nomeGrupo) continue;

    const chave = nomeGrupo.toLowerCase();
    let codigo = mapaGrupos[chave];
    if (!codigo) {
      codigo = await gerarCodigoUnico(db);
      mapaGrupos[chave] = codigo;
      novosGrupos.push({ codigo, nomeGrupo });
    }
    novosConvidados.push({ nome, telefone, codigo, tipo });
  }

  const writes = [];
  for (const g of novosGrupos) {
    writes.push(
      db
        .prepare("INSERT INTO grupos (codigo, nome_grupo, status_abertura, status_confirmacao) VALUES (?, ?, 'Não aberto', 'Pendente')")
        .bind(g.codigo, g.nomeGrupo)
    );
  }
  for (const c of novosConvidados) {
    writes.push(
      db
        .prepare('INSERT INTO convidados (nome, telefone, codigo_grupo, confirmado, tipo) VALUES (?, ?, ?, ?, ?)')
        .bind(c.nome, c.telefone, c.codigo, c.tipo === 'crianca' ? 1 : 0, c.tipo)
    );
  }
  if (writes.length > 0) await db.batch(writes);

  return jsonResponse({ convidados: novosConvidados.length, gruposCriados: novosGrupos.length });
}
