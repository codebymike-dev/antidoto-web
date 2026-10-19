// Casos del portafolio y artículos del blog: un Markdown por idioma, unidos por `clave`.
// Se ordenan del más reciente al más antiguo. Sin imports de Astro en tiempo de ejecución
// para poder probarlos en tests/contenido.test.ts.
import type { ImageMetadata } from 'astro';
import type { Locale } from '../i18n/ui';
import { emparejarPorClave, type EntradaBase } from './contenido';

export interface EntradaPublicacion extends EntradaBase {
  title: string;
  lead: string;
  fecha: Date;
  imagen: ImageMetadata;
  alt: string;
  entrada?: string;
}

export interface Publicacion<E extends EntradaPublicacion> {
  id: string;
  fecha: Date;
  image: ImageMetadata;
  borrador: boolean;
  es: E;
  en: E;
  pt: E;
}

/** Une por clave, exige la misma fecha e imagen en todos los idiomas y ordena por fecha. */
export function emparejarPublicaciones<E extends EntradaPublicacion>(
  entradas: E[],
  { borradores, nombre }: { borradores: boolean; nombre: (clave: string) => string },
): Publicacion<E>[] {
  return emparejarPorClave(entradas, {
    nombre,
    borradores,
    iguales: [
      [(e) => e.fecha.getTime(), 'tiene una fecha distinta en cada idioma'],
      [(e) => e.imagen.src, 'tiene una imagen distinta en cada idioma'],
    ],
  })
    .map(({ clave, borrador, es, en, pt }) => ({ id: clave, fecha: es.fecha, image: es.imagen, borrador, es, en, pt }))
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

export const casosBase: Record<Locale, string> = { es: '/portafolio/', en: '/en/work/', pt: '/pt/portfolio/' };
export const blogBase: Record<Locale, string> = { es: '/blog/', en: '/en/blog/', pt: '/pt/blog/' };

export function casoPath(c: Record<Locale, { slug: string }>, locale: Locale): string {
  return `${casosBase[locale]}${c[locale].slug}/`;
}

export function articuloPath(a: Record<Locale, { slug: string }>, locale: Locale): string {
  return `${blogBase[locale]}${a[locale].slug}/`;
}

/** Segmento de las páginas de categoría del blog. */
export const segmentoCategoria: Record<Locale, string> = { es: 'categoria', en: 'category', pt: 'categoria' };

export function categoriaPath(categoria: string, locale: Locale): string {
  return `${blogBase[locale]}${segmentoCategoria[locale]}/${categoria}/`;
}

const escapar = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** RSS 2.0 de una lista de artículos. Las rutas son relativas al sitio. */
export function rssXml(
  items: Array<{ titulo: string; resumen: string; ruta: string; fecha: Date }>,
  canal: { titulo: string; descripcion: string; ruta: string; idioma: string },
  sitio = 'https://antidotocolombia.com',
): string {
  const url = (r: string) => new URL(r, sitio).href;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    `<title>${escapar(canal.titulo)}</title>`,
    `<link>${url(canal.ruta)}</link>`,
    `<description>${escapar(canal.descripcion)}</description>`,
    `<language>${canal.idioma}</language>`,
    ...items.map(
      (i) =>
        `<item><title>${escapar(i.titulo)}</title><link>${url(i.ruta)}</link><guid>${url(i.ruta)}</guid><pubDate>${i.fecha.toUTCString()}</pubDate><description>${escapar(i.resumen)}</description></item>`,
    ),
    '</channel></rss>',
  ].join('\n');
}
