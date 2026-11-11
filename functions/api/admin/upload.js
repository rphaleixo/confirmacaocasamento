import { jsonResponse } from '../../_lib.js';
import { detectarMidia } from '../../_midia.js';

const LIMITE_IMAGEM = 8 * 1024 * 1024;
const LIMITE_VIDEO = 40 * 1024 * 1024;
const VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'];

// POST /api/admin/upload?nome=arquivo.jpg — corpo = bytes do arquivo (fetch(url, {body: file}))
// Aceita imagens JPG, PNG, WebP, GIF e AVIF (até 8 MB) e vídeos mp4/webm/mov (até 40 MB).
// O formato vem do CONTEÚDO do arquivo (ver _midia.js): o Content-Type e o nome enviados só servem para recusar cedo.
// SVG e HTML não são aceitos, porque podem carregar código que rodaria no endereço da plataforma.
export async function onRequestPost({ request, env }) {
  const contentType = (request.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim().toLowerCase();
  const declaraImagem = contentType.startsWith('image/') && contentType !== 'image/svg+xml';
  const declaraVideo = VIDEOS.includes(contentType);
  if (!declaraImagem && !declaraVideo) return jsonResponse({ erro: 'Formato não aceito. Envie uma imagem (JPG, PNG, WebP ou GIF) ou um vídeo MP4, WebM ou MOV.' }, 400);
  const limiteMaximo = declaraVideo ? LIMITE_VIDEO : LIMITE_IMAGEM;

  // recusa antes de ler o corpo quando o tamanho já vem no cabeçalho
  const declarado = Number(request.headers.get('content-length') || 0);
  if (declarado > limiteMaximo) return jsonResponse({ erro: `Arquivo maior que ${declaraVideo ? '40MB' : '8MB'}.` }, 400);

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return jsonResponse({ erro: 'Arquivo vazio.' }, 400);

  const midia = detectarMidia(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 32)));
  if (!midia) return jsonResponse({ erro: 'Não reconheci este arquivo como imagem (JPG, PNG, WebP ou GIF) ou vídeo (MP4, WebM ou MOV). Verifique se ele não está corrompido.' }, 400);
  const ehVideo = midia.classe === 'video';
  const limite = ehVideo ? LIMITE_VIDEO : LIMITE_IMAGEM;
  if (bytes.byteLength > limite) return jsonResponse({ erro: `Arquivo maior que ${ehVideo ? '40MB' : '8MB'}.` }, 400);

  // a extensão e o tipo guardados são os do conteúdo detectado; o nome enviado pelo navegador não entra
  const chave = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${midia.ext}`;
  await env.MEDIA.put(chave, bytes, { httpMetadata: { contentType: midia.tipo } });

  return jsonResponse({ url: `/media/${chave}`, tipo: ehVideo ? 'video' : 'imagem' });
}
