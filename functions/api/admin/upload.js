import { jsonResponse } from '../../_lib.js';

const LIMITE_IMAGEM = 8 * 1024 * 1024;
const LIMITE_VIDEO = 40 * 1024 * 1024;
const VIDEOS = ['video/mp4', 'video/webm', 'video/quicktime'];

// POST /api/admin/upload?nome=arquivo.jpg — corpo = bytes do arquivo (fetch(url, {body: file}))
// Aceita imagens (até 8 MB) e vídeos mp4/webm/mov (até 40 MB), com o tipo informado no Content-Type.
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const nomeOriginal = url.searchParams.get('nome') || 'arquivo';
  const extensao = (nomeOriginal.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const contentType = (request.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim().toLowerCase();

  const ehImagem = contentType.startsWith('image/');
  const ehVideo = VIDEOS.includes(contentType);
  if (!ehImagem && !ehVideo) return jsonResponse({ erro: 'Formato não aceito. Envie uma imagem ou um vídeo MP4, WebM ou MOV.' }, 400);
  const limite = ehVideo ? LIMITE_VIDEO : LIMITE_IMAGEM;
  const rotuloLimite = ehVideo ? '40MB' : '8MB';

  // recusa antes de ler o corpo quando o tamanho já vem no cabeçalho
  const declarado = Number(request.headers.get('content-length') || 0);
  if (declarado > limite) return jsonResponse({ erro: `Arquivo maior que ${rotuloLimite}.` }, 400);

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return jsonResponse({ erro: 'Arquivo vazio.' }, 400);
  if (bytes.byteLength > limite) return jsonResponse({ erro: `Arquivo maior que ${rotuloLimite}.` }, 400);

  const chave = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;
  await env.MEDIA.put(chave, bytes, { httpMetadata: { contentType } });

  return jsonResponse({ url: `/media/${chave}`, tipo: ehVideo ? 'video' : 'imagem' });
}
