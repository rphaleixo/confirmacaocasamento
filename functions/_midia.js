// Descobre o formato de um arquivo enviado pelos BYTES do início dele, nunca pelo que o navegador declarou (Content-Type)
// nem pela extensão do nome. Só formatos de imagem e vídeo que o convite sabe mostrar são aceitos; SVG, HTML e outros formatos
// que podem carregar código ficam de fora de propósito.
//
// detectarMidia(bytes: Uint8Array) → { tipo: 'image/png', ext: 'png', classe: 'imagem' | 'video' } ou null (não aceito)

const ascii = (b, de, ate) => String.fromCharCode(...b.slice(de, ate));

export function detectarMidia(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { tipo: 'image/jpeg', ext: 'jpg', classe: 'imagem' };
  if (b[0] === 0x89 && ascii(b, 1, 4) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { tipo: 'image/png', ext: 'png', classe: 'imagem' };
  if (ascii(b, 0, 4) === 'GIF8' && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return { tipo: 'image/gif', ext: 'gif', classe: 'imagem' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return { tipo: 'image/webp', ext: 'webp', classe: 'imagem' };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { tipo: 'video/webm', ext: 'webm', classe: 'video' };
  // vídeo QuickTime antigo (.mov) que começa direto por um bloco de dados em vez de "ftyp"
  if (/^(moov|mdat|wide|free|skip)$/.test(ascii(b, 4, 8))) return { tipo: 'video/quicktime', ext: 'mov', classe: 'video' };
  if (ascii(b, 4, 8) === 'ftyp') {
    const marca = ascii(b, 8, 12);
    if (marca === 'avif' || marca === 'avis') return { tipo: 'image/avif', ext: 'avif', classe: 'imagem' };
    if (marca === 'qt  ') return { tipo: 'video/quicktime', ext: 'mov', classe: 'video' };
    if (/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(marca)) return null; // HEIC do iPhone: os navegadores não mostram
    return { tipo: 'video/mp4', ext: 'mp4', classe: 'video' };
  }
  return null;
}

// Tipos que podem ser entregues como arquivo "para ver". Qualquer outro tipo guardado (por exemplo um SVG enviado antes desta
// regra existir) é entregue como download, nunca como página.
export const TIPOS_SEGUROS = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime']);
