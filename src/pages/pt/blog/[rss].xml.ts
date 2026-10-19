// RSS del blog en este idioma, generado en el build con los artículos publicables. Ruta dinámica
// para no generar un feed vacío: sin artículos no hay blog (ver [...indice].astro).
import type { APIRoute } from 'astro';
import { obtenerArticulos, articuloPath } from '../../../data/contenido';
import { rssXml } from '../../../lib/publicaciones';
import { t, rutas } from '../../../i18n/ui';

export async function getStaticPaths() {
  return (await obtenerArticulos()).length ? [{ params: { rss: 'rss' } }] : [];
}

export const GET: APIRoute = async () =>
  new Response(rssXml((await obtenerArticulos()).map((a) => ({ titulo: a.pt.title, resumen: a.pt.lead, ruta: articuloPath(a, 'pt'), fecha: a.fecha })), {
    titulo: t('pt').seo.blog[0],
    descripcion: t('pt').seo.blog[1],
    ruta: rutas.blog.pt,
    idioma: t('pt').htmlLang,
  }), { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
