// Ofertas: las subpáginas de cada línea de servicio (p. ej. Audiovisual > Planes de emergencia).
// Un Markdown por oferta y por idioma en src/content/ofertas/<linea>/<clave>.<idioma>.md.
// Las ofertas salen de `includes` de cada servicio: no se inventa ninguna.
// Sin imports de Astro en tiempo de ejecución para poder probarla en tests/contenido.test.ts.
import type { ImageMetadata } from 'astro';
import { LOCALES, type Locale } from '../i18n/ui';
import { emparejarPorClave, porIdioma, repetido } from './contenido';
import { servicioPath, type Servicio } from './servicios';

export interface OfertaTexto {
  slug: string;
  title: string;
  lead: string;
  /** Para quién es (opcional). */
  para: string[];
  /** Qué incluye (opcional). */
  incluye: string[];
  /** Texto alternativo de la foto propia de la oferta (solo si la tiene). */
  alt?: string;
  /** Id de la entrada en la colección, para renderizar el cuerpo del Markdown. */
  entrada?: string;
}

export interface EntradaOferta extends Omit<OfertaTexto, 'entrada'> {
  clave: string;
  idioma: Locale;
  /** Clave del servicio al que pertenece. */
  linea: string;
  orden: number;
  borrador?: boolean;
  /** Foto propia de la oferta. Sin ella, la página usa la de su línea. */
  imagen?: ImageMetadata;
  entrada?: string;
}

export interface Oferta {
  id: string;
  linea: string;
  orden: number;
  borrador: boolean;
  /** Foto propia (con su `alt` en cada idioma). Sin ella se usa la de la línea. */
  image?: ImageMetadata;
  es: OfertaTexto;
  en: OfertaTexto;
  pt: OfertaTexto;
}

const texto = ({ slug, title, lead, para, incluye, alt, entrada }: EntradaOferta): OfertaTexto => ({
  slug,
  title,
  lead,
  para,
  incluye,
  ...(alt ? { alt } : {}),
  ...(entrada ? { entrada } : {}),
});

/**
 * Une las ofertas por clave y las deja solo si su línea está entre `servicios` (así una línea
 * en borrador se lleva sus ofertas). Ordena por el orden de la línea y luego por el de la oferta.
 * Falla si una oferta apunta a una línea que no existe en `lineasConocidas`, si los idiomas no
 * coinciden en línea, orden o foto, si una foto no tiene su `alt` en todos los idiomas, o si se repite un orden o un slug dentro de la misma línea.
 */
export function emparejarOfertas(
  entradas: EntradaOferta[],
  { borradores, servicios, lineasConocidas }: { borradores: boolean; servicios: Servicio[]; lineasConocidas: string[] },
): Oferta[] {
  const pares = emparejarPorClave(entradas, {
    nombre: (c) => `La oferta "${c}"`,
    borradores: true,
    iguales: [
      [(e) => e.linea, 'tiene una línea distinta en cada idioma'],
      [(e) => e.orden, 'tiene un orden distinto en cada idioma'],
      [(e) => e.imagen?.src ?? '', 'tiene una foto distinta en cada idioma'],
    ],
    ambitoSlug: (e) => e.linea,
  });
  const ofertas: Oferta[] = pares.map((par) => {
    const { clave, borrador, es } = par;
    if (!lineasConocidas.includes(es.linea)) throw new Error(`La oferta "${clave}" apunta a la línea "${es.linea}", que no existe`);
    if (es.imagen) {
      const sinAlt = LOCALES.find((l) => !par[l].alt?.trim());
      if (sinAlt) throw new Error(`La oferta "${clave}" tiene foto pero le falta el alt en ${sinAlt}`);
    }
    return { id: clave, linea: es.linea, orden: es.orden, borrador, ...(es.imagen ? { image: es.imagen } : {}), ...porIdioma((l) => texto(par[l])) };
  });
  for (const linea of lineasConocidas) {
    const orden = repetido(ofertas.filter((o) => o.linea === linea).map((o) => o.orden));
    if (orden !== undefined) throw new Error(`Dos ofertas de "${linea}" tienen el orden ${orden}`);
  }

  const posicion = new Map(servicios.map((s, i) => [s.id, i]));
  return ofertas
    .filter((o) => posicion.has(o.linea) && (borradores || !o.borrador))
    .sort((a, b) => posicion.get(a.linea)! - posicion.get(b.linea)! || a.orden - b.orden);
}

export function ofertaPath(linea: Servicio, oferta: Oferta, locale: Locale): string {
  return `${servicioPath(linea, locale)}${oferta[locale].slug}/`;
}

