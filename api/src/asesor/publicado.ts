// Preguntas frecuentes y clientes publicados desde el panel, para el conocimiento del asesor. Así
// el chat dice lo mismo que el sitio sin esperar a que se vuelva a desplegar la API. Se guardan
// 5 minutos en memoria del isolate; si la base no responde, el asesor sigue con lo del sitio
// (falla abierto: es información extra, no un control).
import { and, inArray, isNotNull, isNull } from 'drizzle-orm';
import type { Db } from '../db/conexion';
import { contenido } from '../db/schema';
import type { Extra } from './conocimiento';
import { LOCALES } from '../dominio';

const VIGENCIA_MS = 5 * 60_000;
let cache: { hasta: number; extra: Extra } | null = null;

export function vaciarCache() {
  cache = null;
}

export async function contenidoAsesor(db: Db, t = Date.now()): Promise<Extra | undefined> {
  if (cache && cache.hasta > t) return cache.extra;
  try {
    const filas = await db
      .select({ tipo: contenido.tipo, clave: contenido.clave, publicada: contenido.publicada })
      .from(contenido)
      .where(and(inArray(contenido.tipo, ['faq', 'cliente']), isNotNull(contenido.publicada), isNull(contenido.archivada)));
    const texto = (v: unknown) => (typeof v === 'string' ? v : '');
    const extra: Extra = {
      faq: filas
        .filter((f) => f.tipo === 'faq')
        .map((f) => {
          const t = f.publicada!.textos;
          // Una pregunta publicada antes del portugués (18/10/2026) no trae `pt`: va en español.
          const par = (l: (typeof LOCALES)[number]) => {
            const x = t[l] ?? (l === 'pt' ? t.es : undefined);
            return [texto(x?.pregunta), texto(x?.respuesta)] as const;
          };
          return { clave: f.clave, es: par('es'), en: par('en'), pt: par('pt') };
        }),
      clientes: filas.filter((f) => f.tipo === 'cliente').map((f) => texto(f.publicada!.datos.nombre)).filter(Boolean),
    };
    cache = { hasta: t + VIGENCIA_MS, extra };
    return extra;
  } catch (e) {
    console.error('[asesor] no se pudo leer el contenido publicado', e);
    return undefined;
  }
}
