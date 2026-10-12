// /llms.txt (formato de llmstxt.org): un resumen en Markdown de Antídoto para asistentes de IA,
// armado con los mismos datos del sitio (servicios publicables, clientes, contacto y rutas).
// Sin imports de Astro en tiempo de ejecución para poder probarlo en tests/.
import { SITE, EMPRESA, LICENCIA } from '../data/site';
import { servicioPath, type Servicio } from './servicios';
import { ofertaPath, type Oferta } from './ofertas';
import { t, rutas, type Locale, type Pagina } from '../i18n/ui';

const url = (ruta: string) => new URL(ruta, SITE.url).href;

// Clientes y portafolio solo existen con contenido publicado: se suman abajo si lo hay.
const PAGINAS: Pagina[] = ['inicio', 'servicios', 'soluciones', 'sgsst', 'nosotros', 'comoTrabajamos', 'faq', 'contacto', 'actividades'];

function paginas(locale: Locale, lista: Pagina[]): string[] {
  const seo = t(locale).seo;
  return lista.map((p) => `- [${seo[p][0]}](${url(rutas[p][locale])}): ${seo[p][1]}`);
}

/** Extras opcionales: ofertas de cada línea, preguntas frecuentes ya respondidas y si hay casos publicados. */
export interface ExtrasLlms {
  ofertas?: Oferta[];
  faq?: Array<{ pregunta: string; respuesta: string }>;
  hayCasos?: boolean;
}

export function llmsTxt(servicios: Servicio[], clientes: string[], { ofertas = [], faq = [], hayCasos = false }: ExtrasLlms = {}): string {
  const respondidas = faq.filter((f) => !/^\[.*\]$/.test(f.respuesta.trim()));
  const lista: Pagina[] = [...PAGINAS, ...(hayCasos ? (['portafolio'] as const) : []), ...(clientes.length ? (['clientes'] as const) : [])];
  return [
    `# ${SITE.name}`,
    '',
    `> ${t('es').seo.inicio[1]}`,
    '',
    `Antídoto (${EMPRESA.razonSocial}, NIT ${EMPRESA.nit}) es un estudio creativo empresarial de ${EMPRESA.ciudad}, marca desde ${SITE.foundingYear}, liderado por su fundadora, María Paula Ramos. Trabaja con empresas y colegios en toda Colombia. Tiene licencia en Seguridad y Salud en el Trabajo (Resolución ${LICENCIA.resolucion}, ${LICENCIA.entidad.es}): ${url(rutas.sgsst.es)}. Las cotizaciones se piden por WhatsApp (${SITE.phoneDisplay}), por correo o con el cotizador de ${url(rutas.contacto.es)}.`,
    '',
    '## Servicios',
    '',
    ...servicios.flatMap((s) => {
      const es = s.es;
      const incluye = es.includes.filter((i) => !es.facts.includes(i));
      return [
        `- [${es.title}](${url(servicioPath(s, 'es'))}): ${es.lead}`,
        `  - ${es.facts.join('. ')}.`,
        ...(incluye.length ? [`  - Incluye: ${incluye.join(', ')}.`] : []),
        ...ofertas.filter((o) => o.linea === s.id).map((o) => `  - [${o.es.title}](${url(ofertaPath(s, o, 'es'))}): ${o.es.lead}`),
      ];
    }),
    '',
    ...(respondidas.length ? ['## Preguntas frecuentes', '', ...respondidas.map((f) => `- ${f.pregunta} ${f.respuesta}`), ''] : []),
    ...(clientes.length ? ['## Clientes', '', `Han trabajado con Antídoto: ${clientes.join(', ')}.`, ''] : []),
    '## Páginas',
    '',
    ...paginas('es', lista),
    '',
    '## Contacto',
    '',
    `- WhatsApp (solo mensajes): ${SITE.phoneDisplay}`,
    `- Llamadas: ${SITE.llamadasDisplay}`,
    `- Correo: ${SITE.email}`,
    `- Ubicación: ${EMPRESA.ubicacion.es}`,
    `- Instagram: ${SITE.instagram}`,
    `- LinkedIn: ${SITE.linkedin}`,
    '',
    '## Optional',
    '',
    ...paginas('en', lista),
    ...servicios.map((s) => `- [${s.en.title}](${url(servicioPath(s, 'en'))}): ${s.en.lead}`),
    '',
  ].join('\n');
}
