// Archivos del panel: lee dist-admin/ del disco (en Vercel, la copia que scripts/vercel-build.mjs
// deja junto a la función) y los entrega por ruta a src/panel.ts.
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import type { ArchivosPanel } from '../env';

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

export function assetsDesdeDisco(raiz: string): ArchivosPanel {
  const base = normalize(raiz) + sep;
  return {
    async fetch(req) {
      const ruta = decodeURIComponent(new URL(req.url).pathname);
      const archivo = normalize(join(base, ruta));
      // Nada fuera de dist-admin/.
      if (!archivo.startsWith(base)) return new Response('No existe', { status: 404 });
      try {
        const datos = await readFile(archivo);
        return new Response(datos, { status: 200, headers: { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' } });
      } catch {
        return new Response('No existe', { status: 404 });
      }
    },
  };
}
