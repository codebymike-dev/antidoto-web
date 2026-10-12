// Lo que sabe el asesor: lo MISMO que publica el sitio. Los servicios con sus ofertas, las
// soluciones por área, las preguntas frecuentes y los clientes salen de publico.gen.ts (generado
// desde los Markdown, src/data/soluciones.ts, src/data/faq.ts y src/data/clientes.ts) y el resto
// de los textos de src/i18n/ui.ts, los mismos diccionarios que pintan la página. Si el asesor leyera de otra
// fuente, tarde o temprano diría algo distinto de lo que dice la página que tiene detrás.
//
// Lo que el cliente todavía no ha entregado va entre corchetes ("[PEDIDO MÍNIMO]") y el sitio no
// lo publica. Eso no entra: una pregunta sin respuesta no llega al asesor.
//
// La licencia en SST solo cubre sus cinco campos de acción: el asesor no la asocia a las
// auditorías de PESV, RUC o ISO ni a las demás líneas, igual que la página /sg-sst/.
//
// Antídoto no publica precios: cada propuesta se arma a la medida. Por eso no hay tarifario
// ni calcular_precio, y la guardia de cifras no deja pasar ninguna cifra de dinero.
//
// Módulo PURO.
import type { Locale } from '../../../src/i18n/ui';
import { SERVICIOS_PUBLICOS, CLIENTES_PUBLICOS, FAQ_PUBLICA, SOLUCIONES_PUBLICAS, UI as ui, RUTAS as rutas, SITE, LICENCIA } from './publico.gen';

export type Clave = (typeof SERVICIOS_PUBLICOS)[number]['clave'];
export const CLAVES = SERVICIOS_PUBLICOS.map((s) => s.clave) as readonly Clave[];

/** Cifras de dinero publicadas (ninguna: Antídoto cotiza a la medida). */
export const CIFRAS_PUBLICAS: readonly number[] = [];

const PENDIENTE = /\[[^\]]*\]/g;
const TIENE_PENDIENTE = /\[[^\]]*\]/;

/** Quita los datos pendientes entre corchetes; null si no queda nada. */
export function sinPendientes(s: string): string | null {
  const limpio = s.replace(PENDIENTE, '').replace(/\s{2,}/g, ' ').trim();
  return limpio || null;
}

/** Preguntas y clientes publicados desde el panel (src/asesor/publicado.ts): se suman a los del sitio. */
export interface Extra {
  faq: readonly { clave: string; es: readonly [string, string]; en: readonly [string, string] }[];
  clientes: readonly string[];
}

export function conocimiento(locale: Locale, extra?: Extra): string {
  const s = ui[locale];
  const i = s.inicio;
  const es = locale === 'es';
  const L = es
    ? { servicios: 'Servicios', incluye: 'Incluye', datos: 'Datos', pagina: 'Página', ofertas: 'Programas y ofertas', para: 'para', recomendadas: 'Ofertas recomendadas', perfiles: 'Para quién (soluciones por área)', pasos: 'Cómo trabajamos', actividades: 'Actividades digitales', faq: 'Preguntas frecuentes', pend: 'Pendiente de confirmar: el equipo lo responde por WhatsApp.', clientes: 'Clientes publicados en el sitio', sinClientes: 'El sitio no publica nombres de clientes. No nombres ninguno.', cifras: 'Cifras publicadas', fundadora: 'Fundadora', historia: 'Historia', contacto: 'Contacto', aliados: 'Aliados', sgsst: 'SG-SST y licencia en Seguridad y Salud en el Trabajo', cubre: 'La licencia cubre solo estos campos de acción', noCubre: 'Sistemas de gestión y auditorías (NO hacen parte de la licencia; nunca digas que Antídoto certifica: la certificación ISO la otorga el organismo certificador)', juegos: 'Juegos (Misiones Antídoto): los participantes entran con el código de su actividad en' }
    : { servicios: 'Services', incluye: 'Includes', datos: 'Facts', pagina: 'Page', ofertas: 'Programs and offers', para: 'for', recomendadas: 'Recommended offers', perfiles: 'Who it is for (solutions by area)', pasos: 'How we work', actividades: 'Digital activities', faq: 'FAQ', pend: 'Not confirmed yet: the team answers this on WhatsApp.', clientes: 'Clients published on the site', sinClientes: 'The site does not publish client names. Do not name any.', cifras: 'Published figures', fundadora: 'Founder', historia: 'History', contacto: 'Contact', aliados: 'Partners', sgsst: 'OHS (SG-SST) and occupational health and safety license', cubre: 'The license only covers these fields of practice', noCubre: 'Management systems and audits (NOT part of the license; never say Antídoto certifies: ISO certification is granted by the certification body)', juegos: 'Games (Misiones Antídoto): participants join with their activity code at' };

  const lista = (xs: readonly string[]) => xs.map(sinPendientes).filter(Boolean).map((x) => `- ${x}`).join('\n');
  const base = `${SITE.url}${rutas.servicios[locale]}`;
  const ofertas = new Map<string, string>(SERVICIOS_PUBLICOS.flatMap((sv) => sv.ofertas.map((o) => [o.clave, o[locale].titulo] as const)));

  // Solo el Markdown de cada servicio: los puntos y cifras de la home repiten lo mismo con otras
  // palabras, y con dos listas el modelo cuenta dos veces.
  const servicios = SERVICIOS_PUBLICOS.map((sv) => {
    const t = sv[locale];
    // "Incluye" suele nombrar las mismas ofertas que se listan abajo: sin repetirlas.
    const titulos = new Set<string>(sv.ofertas.map((o) => o[locale].titulo));
    const incluye = t.incluye.filter((x) => !titulos.has(x));
    return [
      `### ${t.titulo} (${es ? 'clave' : 'key'}: ${sv.clave})`,
      t.resumen,
      ...(incluye.length ? [`${L.incluye}:`, lista(incluye)] : []),
      `${L.datos}:`,
      lista(t.datos),
      `${L.pagina}: ${base}${t.slug}/`,
      ...(sv.ofertas.length
        ? [
            `${L.ofertas}:`,
            ...sv.ofertas.map((o) => {
              const ot = o[locale];
              const para = ot.para.length ? ` (${L.para} ${ot.para.join(', ')})` : '';
              return `- ${ot.titulo}: ${ot.resumen}${para} ${L.pagina}: ${base}${t.slug}/${ot.slug}/`;
            }),
          ]
        : []),
    ].join('\n');
  }).join('\n\n');

  // Cada área con su título y descripción de la home (como su página) y las ofertas recomendadas.
  const soluciones = SOLUCIONES_PUBLICAS.flatMap((sol) => {
    const perfil = i.paraQuien.perfiles[sol.perfil];
    if (!perfil) return [];
    const recomendadas = sol.ofertas.map((o) => ofertas.get(o)).filter(Boolean);
    const extra = recomendadas.length ? ` ${L.recomendadas}: ${recomendadas.join(', ')}.` : '';
    return [`- ${perfil[0]}: ${perfil[1]}${extra} ${L.pagina}: ${SITE.url}${rutas.soluciones[locale]}${sol.slug[locale]}/`];
  }).join('\n');

  // Lo publicado en el panel pisa a la pregunta del sitio con la misma clave, como en el build.
  const delPanel = new Map((extra?.faq ?? []).map((q) => [q.clave, q]));
  const preguntas = [...FAQ_PUBLICA.filter((q) => !delPanel.has(q.clave)), ...delPanel.values()];
  const clientes = [...new Set([...CLIENTES_PUBLICOS, ...(extra?.clientes ?? [])])];
  // Una respuesta que es entera un dato pendiente no se publica en el sitio: tampoco llega aquí.
  const faq = preguntas.map((q) => q[locale])
    .filter(([, r]) => sinPendientes(r))
    .map(([p, r]) => `- ${p} ${sinPendientes(r)}${TIENE_PENDIENTE.test(r) ? ` (${L.pend})` : ''}`)
    .join('\n');
  const sg = s.sgsst;

  return `## ${es ? 'Quién es Antídoto' : 'Who Antídoto is'}
${s.nosotrosLead}
${i.lead}
${i.servicios.lead}
${s.footerLema}
${i.insignia}.

## ${L.servicios}
${servicios}

## ${L.sgsst}
${sg.lead} ${L.pagina}: ${SITE.url}${rutas.sgsst[locale]}
${sg.sello} · Res. ${LICENCIA.resolucion} · ${LICENCIA.entidad[locale]}.
${L.cubre}:
${lista(LICENCIA.campos[locale])}
${L.noCubre}:
${sg.auditorias.map(([t, d]) => `- ${t}: ${d}`).join('\n')}
${sg.evidencia[0]}: ${sg.evidencia[1]}

## ${L.actividades}
${i.actividades.lead}
${lista(i.actividades.puntos)}
${L.juegos} ${SITE.url}${rutas.actividades[locale]}

## ${L.perfiles}
${soluciones}
- ${i.paraQuien.aliados[0]} ${i.paraQuien.aliados[1]}

## ${L.pasos}
${i.pasos.items.map(([t, d], n) => `${n + 1}. ${t}: ${d}`).join('\n')}

## ${L.cifras}
${i.cifras.map(([n, d]) => `- ${n} ${d}`).join('\n')}

## ${L.fundadora}
${s.fundadoraNombre}, ${s.fundadoraCargo}. ${s.fundadoraBio}

## ${L.historia}
${s.historia.map(([a, t, d]) => `- ${a}: ${t}. ${d}`).join('\n')}

## ${L.clientes}
${clientes.length ? `${clientes.join(', ')}.` : L.sinClientes}

## ${L.faq}
${L.pagina}: ${SITE.url}${rutas.faq[locale]}
${faq}

## ${L.contacto}
${es ? 'WhatsApp (solo mensajes)' : 'WhatsApp (messages only)'}: ${SITE.phoneDisplay}. ${es ? 'Llamadas' : 'Calls'}: ${SITE.llamadasDisplay}. ${es ? 'Correo' : 'Email'}: ${SITE.email}. ${es ? 'Dónde' : 'Where'}: ${SITE.ubicacion[locale]}. ${es ? 'Cotizador' : 'Quote form'}: ${SITE.url}${rutas.contacto[locale]}`;
}
