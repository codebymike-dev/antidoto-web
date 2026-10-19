// Markdown sin HTML crudo ni URLs peligrosas, para todo el Markdown del sitio (astro.config.mjs).
// El blog, los casos y las vacantes llegan del panel (src/lib/cms/) y el sitio comparte dominio con
// /admin/: un <script> o un enlace javascript: en un artículo correría con la sesión de quien lo
// abra. El HTML pasa a texto (como en la vista previa del panel) y los comentarios se quitan; las
// URLs solo pueden ser relativas, http(s), mailto o tel.
//
// Plugin mdast de Sätteri, el procesador de Markdown de Astro 7. urlSegura es pura, con pruebas.
import type { MdastPluginDefinition } from 'satteri';

const ESQUEMAS = new Set(['http', 'https', 'mailto', 'tel']);

/** true si la URL es relativa o usa un esquema permitido. */
export function urlSegura(url: string): boolean {
  // Los navegadores ignoran espacios y caracteres de control dentro del esquema ("java\tscript:").
  const limpia = url.replace(/[\u0000- \u007f]/g, '');
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(limpia);
  return !esquema || ESQUEMAS.has(esquema[1]!.toLowerCase());
}

const COMENTARIO = /^\s*<!--[\s\S]*-->\s*$/;

export const markdownSeguro: MdastPluginDefinition = {
  name: 'markdown-seguro',
  html(node, ctx) {
    if (COMENTARIO.test(node.value)) return void ctx.removeNode(node);
    return { type: 'text', value: node.value };
  },
  link(node, ctx) {
    if (!urlSegura(node.url)) ctx.setProperty(node, 'url', '#');
  },
  definition(node, ctx) {
    if (!urlSegura(node.url)) ctx.setProperty(node, 'url', '#');
  },
  image(node, ctx) {
    if (!urlSegura(node.url)) ctx.setProperty(node, 'url', '');
  },
};
