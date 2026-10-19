import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, PAGINAS, rutas, ui } from '../src/i18n/ui';
import { paginas } from '../src/i18n/paginas';
import { FAQ, TEMAS_FAQ } from '../src/data/faq';
import { SOLUCIONES, solucionPath } from '../src/data/soluciones';

describe('rutas', () => {
  it('cada página tiene ruta en cada idioma, con barra final, y el inglés y el portugués van bajo su prefijo', () => {
    for (const p of PAGINAS) {
      expect(rutas[p].es).toMatch(/^\/([a-z0-9-]+\/)*$/);
      expect(rutas[p].en).toMatch(/^\/en\/([a-z0-9-]+\/)*$/);
      expect(rutas[p].pt).toMatch(/^\/pt\/([a-z0-9-]+\/)*$/);
      expect(rutas[p].es).not.toMatch(/^\/(en|pt)\//);
    }
  });

  it('no hay dos páginas con la misma ruta', () => {
    const todas = PAGINAS.flatMap((p) => LOCALES.map((l) => rutas[p][l]));
    expect(new Set(todas).size).toBe(todas.length);
  });

  it('cada página tiene nombre en la nav y textos de SEO en cada idioma', () => {
    for (const l of LOCALES) {
      for (const p of PAGINAS) {
        // La home no lleva nombre en la nav: el logo la enlaza.
        if (p !== 'inicio') expect(ui[l].nav[p], `${l}.nav.${p}`).toBeTruthy();
        expect(ui[l].seo[p]?.[0], `${l}.seo.${p}`).toBeTruthy();
      }
    }
  });
});

describe('textos de páginas', () => {
  const sinGuiones = (v: unknown, ruta: string) => {
    if (typeof v === 'string') expect(v, ruta).not.toMatch(/[–—]/);
    else if (Array.isArray(v)) v.forEach((x, i) => sinGuiones(x, `${ruta}[${i}]`));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => sinGuiones(x, `${ruta}.${k}`));
  };

  it('sin guiones largos ni semilargos', () => {
    sinGuiones(ui, 'ui');
    sinGuiones(paginas, 'paginas');
    sinGuiones(FAQ, 'FAQ');
  });

  const claves = (o: object, pre = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? claves(v, `${pre}${k}.`) : [`${pre}${k}`]));

  it('los idiomas tienen las mismas claves', () => {
    for (const l of LOCALES) {
      expect(claves(paginas[l]).sort(), `paginas.${l}`).toEqual(claves(paginas.es).sort());
      expect(claves(ui[l]).sort(), `ui.${l}`).toEqual(claves(ui.es).sort());
    }
  });

  it('las listas tienen el mismo largo en cada idioma', () => {
    const largos = (o: unknown, pre = ''): string[] =>
      Array.isArray(o) ? [`${pre}:${o.length}`, ...o.flatMap((x, i) => largos(x, `${pre}[${i}]`))]
      : o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => largos(v, `${pre}.${k}`))
      : [];
    for (const l of LOCALES) {
      expect(largos(ui[l]), `ui.${l}`).toEqual(largos(ui.es));
      expect(largos(paginas[l]), `paginas.${l}`).toEqual(largos(paginas.es));
    }
  });
});

describe('preguntas frecuentes', () => {
  it('claves únicas, tema válido y texto en cada idioma', () => {
    expect(new Set(FAQ.map((f) => f.clave)).size).toBe(FAQ.length);
    for (const f of FAQ) {
      expect(TEMAS_FAQ).toContain(f.tema);
      for (const l of LOCALES) for (const x of f[l]) expect(x.trim()).not.toBe('');
      // Una respuesta pendiente lo es en todos los idiomas.
      for (const l of LOCALES) expect(/^\[.*\]$/.test(f[l][1]), `${f.clave}.${l}`).toBe(/^\[.*\]$/.test(f.es[1]));
    }
  });
});

describe('soluciones', () => {
  // Claves de oferta declaradas en los Markdown de src/content/ofertas/<linea>/.
  const dir = join(__dirname, '../src/content/ofertas');
  const claves = new Set(
    readdirSync(dir).flatMap((l) =>
      readdirSync(join(dir, l)).map((f) => readFileSync(join(dir, l, f), 'utf8').match(/^clave:\s*(\S+)/m)?.[1]),
    ),
  );

  it('slugs y claves únicos, y perfiles y retos que existen en la home', () => {
    expect(new Set(SOLUCIONES.map((s) => s.clave)).size).toBe(SOLUCIONES.length);
    for (const l of LOCALES) {
      const rutasSol = SOLUCIONES.map((s) => solucionPath(s, l));
      expect(new Set(rutasSol).size).toBe(rutasSol.length);
      for (const s of SOLUCIONES) {
        expect(ui[l].inicio.paraQuien.perfiles[s.perfil]).toBeDefined();
        for (const r of s.retos) expect(ui[l].inicio.dolores.items[r]).toBeDefined();
      }
    }
  });

  it('cada oferta recomendada existe como Markdown', () => {
    for (const s of SOLUCIONES) for (const o of s.ofertas) expect(claves, `${s.clave} > ${o}`).toContain(o);
  });
});
