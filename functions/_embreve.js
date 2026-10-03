// Página "Em breve": é o que o convidado vê enquanto o anfitrião ainda não publicou o convite.
// Usa as cores e os nomes que já existem; sem nada preenchido, fica neutra.
import { escapar } from './_compartilhar.js';

const COR = /^#[0-9a-f]{3,8}$/i;
const cor = (v, pad) => (COR.test(String(v || '').trim()) ? String(v).trim() : pad);

export async function paginaEmBreve(db, evento) {
  const { results } = await db
    .prepare("SELECT chave, valor FROM conteudo WHERE evento_id = ? AND chave IN ('hero.noiva','hero.noivo','aparencia.cor_primaria','aparencia.cor_destaque','aparencia.cor_fundo','aparencia.cor_texto')")
    .bind(evento.id).all();
  const c = {}; results.forEach((r) => { c[r.chave] = r.valor; });
  const n1 = String(c['hero.noiva'] || '').trim(), n2 = String(c['hero.noivo'] || '').trim();
  const nomes = evento.tipo === 'aniversario' ? n1 : (n1 && n2 && n1 !== 'Noiva' ? n1 + ' & ' + n2 : '');
  const prim = cor(c['aparencia.cor_primaria'], '#0B2545'), dest = cor(c['aparencia.cor_destaque'], '#C9A227'), fundo = cor(c['aparencia.cor_fundo'], '#EAF1FB'), texto = cor(c['aparencia.cor_texto'], '#14213D');
  const e = escapar;
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${e(nomes ? nomes + ' · Em breve' : 'Convite em breve')}</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:linear-gradient(160deg,${fundo},#fff);color:${texto};font-family:Georgia,'Times New Roman',serif;text-align:center}
.c{max-width:420px;padding:44px 28px;border:1px solid ${dest};border-radius:22px;background:rgba(255,255,255,.7)}
.s{display:block;width:60px;height:2px;background:${dest};margin:18px auto}
h1{font-size:30px;font-weight:500;margin:0 0 6px;color:${prim};font-style:italic}p{margin:8px 0 0;font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;opacity:.85}.k{font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:${dest};margin-bottom:12px}</style></head>
<body><main class="c"><div class="k">Em breve</div><h1>${e(nomes || 'Seu convite')}</h1><span class="s"></span><p>O convite está sendo preparado com carinho.</p><p>Volte em alguns instantes e confirme sua presença.</p></main></body></html>`;
}
