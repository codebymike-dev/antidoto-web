import { describe, expect, it } from 'vitest';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { markdownSeguro, urlSegura } from '../src/lib/markdown-seguro';
import { jsonLdSeguro } from '../src/data/schema';

const procesador = createSatteriMarkdownProcessor({ mdastPlugins: [markdownSeguro] });
const html = async (md: string) => (await (await procesador).render(md, {})).code;

describe('urlSegura', () => {
  it('acepta relativas, anclas, http(s), mailto y tel', () => {
    for (const u of ['/contacto/', '#arriba', 'foto.jpg', 'https://a.com', 'http://a.com', 'mailto:x@a.com', 'tel:+571234']) expect(urlSegura(u)).toBe(true);
  });
  it('rechaza javascript:, data: y vbscript:, también disfrazados', () => {
    for (const u of ['javascript:alert(1)', 'JavaScript:alert(1)', 'java\tscript:alert(1)', ' javascript:alert(1)', 'data:text/html,x', 'vbscript:x']) expect(urlSegura(u)).toBe(false);
  });
});

describe('markdownSeguro', () => {
  it('pasa el HTML crudo a texto', async () => {
    const r = await html('Hola <img src=x onerror="alert(1)">\n\n<script>alert(2)</script>');
    expect(r).not.toMatch(/<img|<script/);
    expect(r).toContain('&lt;script&gt;');
  });
  it('quita los comentarios HTML', async () => {
    expect(await html('Antes\n\n<!-- nota interna -->\n\nDespués')).not.toContain('nota interna');
  });
  it('neutraliza enlaces, referencias, autoenlaces e imágenes peligrosos', async () => {
    const r = await html('[a](javascript:alert(1)) [b][r] <javascript:alert(2)> [c](&#106;avascript:alert(3))\n\n![i](javascript:alert(4))\n\n[r]: javascript:alert(5)');
    expect(r).not.toMatch(/javascript:/i.source.replace('javascript:', 'href="javascript:') ? /href="javascript:|src="javascript:/i : /x/);
    expect(r.match(/href="#"/g)).toHaveLength(4);
  });
  it('deja el Markdown normal como está', async () => {
    const r = await html('## Título\n\n**negrita** y [enlace](/contacto/) y `<b>código</b>`');
    expect(r).toContain('<strong>negrita</strong>');
    expect(r).toContain('<a href="/contacto/">enlace</a>');
    expect(r).toContain('<code>&lt;b&gt;código&lt;/b&gt;</code>');
  });
});

describe('jsonLdSeguro', () => {
  it('no deja cerrar la etiqueta <script>', () => {
    const s = jsonLdSeguro({ name: '</script><script>alert(1)</script>' });
    expect(s).not.toContain('<');
    expect(JSON.parse(s)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
