// Archivos en Vercel: un store PRIVADO de Vercel Blob. Las imágenes del contenido y los archivos de
// entregables son dos prefijos del mismo store: medios/<clave> y archivos/<clave>, con la misma
// clave que guarda la base. Nada se sirve directo desde Blob: todo sale por la API, que decide
// quién puede verlo.
import { del, get, put } from '@vercel/blob';
import type { Almacen } from '../env';

export type Prefijo = 'medios' | 'archivos';

export const rutaBlob = (prefijo: Prefijo, clave: string) => `${prefijo}/${clave}`;

export function almacenBlob(prefijo: Prefijo): Almacen {
  return {
    async get(clave) {
      const r = await get(rutaBlob(prefijo, clave), { access: 'private', useCache: false });
      if (!r || r.statusCode !== 200) return null;
      return { body: r.stream, size: r.blob.size, contentType: r.blob.contentType };
    },
    async put(clave, datos, opciones) {
      await put(rutaBlob(prefijo, clave), datos as ArrayBuffer, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: opciones?.contentType,
      });
    },
    async delete(claves) {
      const lista = (Array.isArray(claves) ? claves : [claves]).map((c) => rutaBlob(prefijo, c));
      if (lista.length) await del(lista);
    },
  };
}
