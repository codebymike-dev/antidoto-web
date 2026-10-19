// Empaqueta lo que publica el sitio sobre los servicios y sus ofertas (src/content/servicios/ y
// src/content/ofertas/), las soluciones por área, las preguntas frecuentes y los nombres de los
// clientes en un módulo que el asesor lee. Así el asesor dice lo mismo que la página: si cambia
// un Markdown, cambia lo que sabe, sin tocar el prompt.
// Corre antes de dev, deploy, check y test; el archivo generado no se versiona.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const raiz = new URL('../../', import.meta.url);
const dirServicios = new URL('src/content/servicios/', raiz);

/** Frontmatter simple de los servicios: `clave: valor`, `clave: "texto"` y listas `  - "item"`. */
export function leerFrontmatter(md) {
  const m = /^---\n([\s\S]*?)\n---/.exec(md);
  if (!m) throw new Error('sin frontmatter');
  const datos = {};
  let lista = null;
  for (const linea of m[1].split('\n')) {
    const item = /^\s+-\s+(.*)$/.exec(linea);
    if (item && lista) {
      lista.push(valor(item[1]));
      continue;
    }
    const par = /^([\w]+):\s*(.*)$/.exec(linea);
    if (!par) continue;
    if (par[2] === '') {
      lista = datos[par[1]] = [];
    } else {
      lista = null;
      datos[par[1]] = valor(par[2]);
    }
  }
  return datos;
}

function valor(crudo) {
  const v = crudo.trim();
  if (v.startsWith('"') && v.endsWith('"')) return JSON.parse(v);
  if (v === 'true' || v === 'false') return v === 'true';
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

const entradas = readdirSync(dirServicios)
  .filter((f) => f.endsWith('.md'))
  .map((f) => leerFrontmatter(readFileSync(new URL(f, dirServicios), 'utf8')));

// Idiomas del sitio (LOCALES de src/i18n/ui.ts).
const { ui, rutas, LOCALES } = await import(new URL('src/i18n/ui.ts', raiz).href);

/** Las entradas de una clave en cada idioma, o null si falta alguno o alguno es borrador. */
function porIdioma(lista, clave) {
  const par = Object.fromEntries(LOCALES.map((l) => [l, lista.find((e) => e.clave === clave && e.idioma === l)]));
  return LOCALES.every((l) => par[l] && !par[l].borrador) ? par : null;
}
const textos = (par, texto) => Object.fromEntries(LOCALES.map((l) => [l, texto(par[l])]));

// Igual que el build de producción (src/lib/servicios.ts): un borrador en cualquiera de los
// idiomas saca el servicio entero.
const claves = [...new Set(entradas.map((e) => e.clave))];
const servicios = claves
  .map((clave) => {
    const par = porIdioma(entradas, clave);
    if (!par) return null;
    const texto = (e) => ({ titulo: e.title, slug: e.slug, resumen: e.lead, datos: e.facts ?? [], incluye: e.includes ?? [] });
    return { clave, orden: par.es.orden ?? 99, ...textos(par, texto) };
  })
  .filter(Boolean)
  .sort((a, b) => a.orden - b.orden)
  .map(({ orden: _, ...s }) => s);

// Ofertas de cada línea (src/content/ofertas/<linea>/<clave>.<idioma>.md), con la misma regla:
// un borrador en cualquier idioma, o una línea que no se publica, la saca.
const dirOfertas = new URL('src/content/ofertas/', raiz);
const entradasOfertas = readdirSync(dirOfertas, { recursive: true })
  .filter((f) => f.endsWith('.md'))
  .map((f) => leerFrontmatter(readFileSync(new URL(f, dirOfertas), 'utf8')));
const lineas = new Set(servicios.map((s) => s.clave));
const ofertas = [...new Set(entradasOfertas.map((e) => e.clave))]
  .map((clave) => {
    const par = porIdioma(entradasOfertas, clave);
    if (!par || !lineas.has(par.es.linea)) return null;
    const texto = (e) => ({ titulo: e.title, slug: e.slug, resumen: e.lead, para: e.para ?? [] });
    return { clave, linea: par.es.linea, orden: par.es.orden ?? 99, ...textos(par, texto) };
  })
  .filter(Boolean)
  .sort((a, b) => a.orden - b.orden)
  .map(({ orden: _, ...o }) => o);
for (const sv of servicios) sv.ofertas = ofertas.filter((o) => o.linea === sv.clave).map(({ linea: _, ...o }) => o);
const ofertasPublicas = new Set(ofertas.map((o) => o.clave));

// Clientes locales (hoy ninguno: falta la autorización de cada marca). Los del panel se suman al
// responder (src/asesor/publicado.ts).
// Se lee como texto: el módulo usa import.meta.glob, que solo existe en Vite.
const fuenteClientes = readFileSync(new URL('src/data/clientes.ts', raiz), 'utf8');
const clientes = [...fuenteClientes.matchAll(/^\s*\['[\w-]+', '([^']+)', '\w+'\],?$/gm)].map((m) => m[1]);

// Textos de interfaz, rutas y contacto: se copian aquí para que la API no cargue archivos
// .ts del sitio al ejecutarse. En CI solo se instalan las dependencias de api/, y transformar
// esos archivos exige el tsconfig de Astro de la raíz (falla con TSCONFIG_ERROR). Node 24 los
// lee directamente (quita los tipos); las funciones de ui.ts no pasan a JSON y el asesor no las usa.
const { SITE, EMPRESA, LICENCIA } = await import(new URL('src/data/site.ts', raiz).href);
const contacto = { url: SITE.url, phoneDisplay: SITE.phoneDisplay, llamadasDisplay: SITE.llamadasDisplay, email: SITE.email, ubicacion: EMPRESA.ubicacion };

// Preguntas frecuentes (src/data/faq.ts, las mismas de /preguntas-frecuentes/): sin las del tema
// de una línea que no se publica ni las que siguen sin respuesta (entre corchetes), que el sitio
// tampoco publica.
const { FAQ, esPendiente } = await import(new URL('src/data/faq.ts', raiz).href);
const temasLinea = new Set(entradas.map((e) => e.clave));
const faq = FAQ.filter((p) => (!temasLinea.has(p.tema) || lineas.has(p.tema)) && !esPendiente(p.es[1])).map((p) => ({ clave: p.clave, tema: p.tema, ...Object.fromEntries(LOCALES.map((l) => [l, p[l]])) }));

// Soluciones por área (src/data/soluciones.ts): título y descripción de ui.inicio.paraQuien,
// como en su página, y solo las ofertas publicadas.
const { SOLUCIONES, solucionesBase } = await import(new URL('src/data/soluciones.ts', raiz).href);
const soluciones = SOLUCIONES.map((sol) => ({
  clave: sol.clave,
  perfil: sol.perfil,
  slug: sol.slug,
  ofertas: sol.ofertas.filter((o) => ofertasPublicas.has(o)),
}));

const salida = `// Generado por scripts/empaquetar-conocimiento.mjs desde src/content/servicios/, src/content/ofertas/,
// src/data/clientes.ts, src/data/faq.ts, src/data/soluciones.ts, src/i18n/ui.ts y src/data/site.ts. No editar.
import type { ui as Ui, rutas as Rutas, Locale } from '../../../src/i18n/ui';

export const SERVICIOS_PUBLICOS = ${JSON.stringify(servicios, null, 2)} as const;
export const CLIENTES_PUBLICOS: readonly string[] = ${JSON.stringify(clientes)};
/** Textos de ui.ts sin sus funciones (JSON): el asesor solo lee datos. */
export const UI = ${JSON.stringify(ui)} as unknown as typeof Ui;
export const RUTAS = ${JSON.stringify({ servicios: rutas.servicios, contacto: rutas.contacto, faq: rutas.faq, sgsst: rutas.sgsst, actividades: rutas.actividades, soluciones: solucionesBase })} as Pick<typeof Rutas, 'servicios' | 'contacto' | 'faq' | 'sgsst' | 'actividades'> & { soluciones: Record<Locale, string> };
export const FAQ_PUBLICA: readonly ({ clave: string; tema: string } & Record<Locale, readonly [string, string]>)[] = ${JSON.stringify(faq)};
export const SOLUCIONES_PUBLICAS: readonly { clave: string; perfil: number; slug: Record<Locale, string>; ofertas: readonly string[] }[] = ${JSON.stringify(soluciones)};
export const SITE = ${JSON.stringify(contacto)} as const;
export const LICENCIA = ${JSON.stringify(LICENCIA)} as const;
`;
writeFileSync(new URL('../src/asesor/publico.gen.ts', import.meta.url), salida);
