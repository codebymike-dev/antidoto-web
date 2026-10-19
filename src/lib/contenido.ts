// Emparejado genérico de contenido en varios idiomas: cada entrada vive en un archivo por idioma
// y los idiomas (LOCALES) se unen por `clave`. Lo usan servicios, ofertas, casos y artículos.
// Sin imports de Astro en tiempo de ejecución para poder probarlo en tests/contenido.test.ts.
import { LOCALES, type Locale } from '../i18n/ui';

export interface EntradaBase {
  clave: string;
  idioma: Locale;
  slug: string;
  borrador?: boolean;
}

export type Par<E extends EntradaBase> = Record<Locale, E> & {
  clave: string;
  /** Borrador si cualquiera de los idiomas lo es: nunca se publica un idioma sin los demás. */
  borrador: boolean;
};

export interface OpcionesEmparejado<E extends EntradaBase> {
  /** Cómo nombrar una entrada en los errores, p. ej. (c) => `El servicio "${c}"`. */
  nombre: (clave: string) => string;
  /** Incluye los borradores (en desarrollo). */
  borradores: boolean;
  /** Campos que deben coincidir en todos los idiomas: [valor, error si no coinciden]. */
  iguales?: Array<[valor: (e: E) => unknown, error: string]>;
  /** Ámbito en el que el slug no puede repetirse (p. ej. la línea de una oferta). */
  ambitoSlug?: (e: E) => string;
}

/**
 * Une las entradas por clave y, si no se piden, quita los borradores. Conserva el orden de
 * aparición: quien llama ordena. Lanza un error (y el build falla) si falta un idioma, si un
 * idioma se repite, si los idiomas no coinciden en un campo de `iguales` o si un slug se repite
 * en su ámbito. Valida también los borradores: un error no espera a que se publique.
 */
export function emparejarPorClave<E extends EntradaBase>(entradas: E[], opciones: OpcionesEmparejado<E>): Par<E>[] {
  const { nombre, borradores, iguales = [], ambitoSlug = () => '' } = opciones;
  const porClave = new Map<string, Partial<Record<Locale, E>>>();
  for (const e of entradas) {
    const par = porClave.get(e.clave) ?? {};
    if (par[e.idioma]) throw new Error(`${nombre(e.clave)} está repetido en ${e.idioma}`);
    par[e.idioma] = e;
    porClave.set(e.clave, par);
  }

  const pares: Par<E>[] = [];
  for (const [clave, idiomas] of porClave) {
    const falta = LOCALES.find((l) => !idiomas[l]);
    if (falta) throw new Error(`${nombre(clave)}: le falta el idioma ${falta}`);
    const porIdioma = idiomas as Record<Locale, E>;
    for (const [valor, error] of iguales) {
      if (LOCALES.some((l) => valor(porIdioma[l]) !== valor(porIdioma.es))) throw new Error(`${nombre(clave)} ${error}`);
    }
    pares.push({ ...porIdioma, clave, borrador: LOCALES.some((l) => !!porIdioma[l].borrador) });
  }

  for (const l of LOCALES) {
    const vistos = new Set<string>();
    for (const p of pares) {
      const k = `${ambitoSlug(p[l])}/${p[l].slug}`;
      if (vistos.has(k)) throw new Error(`El slug "${p[l].slug}" se repite en ${l}`);
      vistos.add(k);
    }
  }

  return pares.filter((p) => borradores || !p.borrador);
}

/** Arma un objeto con un valor por idioma. */
export function porIdioma<T>(valor: (l: Locale) => T): Record<Locale, T> {
  return Object.fromEntries(LOCALES.map((l) => [l, valor(l)])) as Record<Locale, T>;
}

/** Primer valor repetido de una lista, o undefined. */
export function repetido<T>(valores: T[]): T | undefined {
  return valores.find((v, i) => valores.indexOf(v) !== i);
}
