// Archivos en el disco, para la API en local (npm run dev) y las pruebas: la misma interfaz que
// Blob (src/plataforma/blob.ts). El tipo de cada archivo va en un .tipo al lado.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, sep } from 'node:path';
import type { Almacen } from '../env';

export function almacenEnDisco(raiz: string): Almacen {
  const base = normalize(raiz) + sep;
  const ruta = (clave: string) => {
    const archivo = normalize(join(base, clave));
    if (!archivo.startsWith(base)) throw new Error('clave fuera del almacén');
    return archivo;
  };
  return {
    async get(clave) {
      try {
        const datos = await readFile(ruta(clave));
        const contentType = await readFile(`${ruta(clave)}.tipo`, 'utf8').catch(() => undefined);
        return { body: new Blob([datos]).stream(), size: datos.byteLength, contentType };
      } catch {
        return null;
      }
    },
    async put(clave, datos, opciones) {
      const archivo = ruta(clave);
      await mkdir(dirname(archivo), { recursive: true });
      const bytes = datos instanceof ReadableStream ? new Uint8Array(await new Response(datos).arrayBuffer()) : new Uint8Array(datos);
      await writeFile(archivo, bytes);
      await writeFile(`${archivo}.tipo`, opciones?.contentType ?? '');
    },
    async delete(claves) {
      for (const c of Array.isArray(claves) ? claves : [claves]) {
        await rm(ruta(c), { force: true });
        await rm(`${ruta(c)}.tipo`, { force: true });
      }
    },
  };
}
