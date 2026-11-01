// Monta a pasta .public com SÓ o que pode ser público no site (páginas, scripts e imagens).
// Código do servidor, banco (.sql), configurações e a pasta .git ficam de fora por construção, sem depender de lista de exclusão.
import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';

const DESTINO = '.public';
const PASTAS = ['admin', 'presentes', 'landing', 'entrar'];
const EXTENSOES = /\.(html|js|css|jpg|jpeg|png|svg|webp|ico|webmanifest)$/i;

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });
let n = 0;
for (const nome of readdirSync('.')) {
  if (nome.startsWith('.')) continue;
  if (statSync(nome).isFile() && EXTENSOES.test(nome)) { cpSync(nome, DESTINO + '/' + nome); n++; }
}
for (const pasta of PASTAS) { cpSync(pasta, DESTINO + '/' + pasta, { recursive: true }); n++; }
console.log('Site montado em ' + DESTINO + ' (' + n + ' itens)');
