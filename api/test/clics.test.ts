// Analítica sin cookies (POST /v1/clic y Métricas del panel) y el límite diario por visitante
// del chat, contra una D1 local.
import { describe, test, expect } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import { prepararPruebas } from './ayudas';
import { validarClic } from '../src/clics';
import { dentroDelLimite } from '../src/limite';
import { DIA, HORA } from '../src/util';

const SITIO = 'https://antidotocolombia.com';

const p = prepararPruebas();

const clic = (cuerpo: unknown, origen = SITIO) =>
  p.llamar('/v1/clic', { method: 'POST', body: JSON.stringify(cuerpo), ip: '200.1.1.1', headers: { origin: origen, 'content-type': 'text/plain;charset=UTF-8' } });

describe('POST /v1/clic', () => {
  test('valida tipo y ruta, sin datos personales', () => {
    expect(validarClic({ tipo: 'whatsapp', pagina: '/sg-sst/' })).toEqual({ tipo: 'whatsapp', pagina: '/sg-sst/' });
    expect(validarClic({ tipo: 'otro', pagina: '/' })).toBe(null);
    expect(validarClic({ tipo: 'llamada', pagina: 'https://otro.com/' })).toBe(null);
    expect(validarClic({ tipo: 'llamada', pagina: '/?correo=a@b.co' })).toBe(null);
  });

  test('suma por día, tipo y página, y solo desde el sitio', async () => {
    expect((await clic({ tipo: 'whatsapp', pagina: '/contacto/' }, 'https://otro.com')).status).toBe(403);
    expect((await clic({ tipo: 'nada', pagina: '/' })).status).toBe(422);
    expect((await clic({ tipo: 'whatsapp', pagina: '/contacto/' })).status).toBe(204);
    expect((await clic({ tipo: 'whatsapp', pagina: '/contacto/' })).status).toBe(204);
    expect((await clic({ tipo: 'cotizacion_correo', pagina: '/contacto/' })).status).toBe(204);
    const filas = await p.env.DB.prepare('select tipo, pagina, n from clics order by tipo').all();
    expect(filas.results).toEqual([
      { tipo: 'cotizacion_correo', pagina: '/contacto/', n: 1 },
      { tipo: 'whatsapp', pagina: '/contacto/', n: 2 },
    ]);
  });

  test('las métricas del panel los muestran', async () => {
    const cookie = await p.entrarComo('metricas@antidotocolombia.com', 'comercial');
    const m = (await (await p.conSesion(cookie, '/admin/api/metricas?dias=30')).json()) as { clics: { porTipo: { clave: string; n: number }[] } };
    expect(m.clics.porTipo).toContainEqual({ clave: 'whatsapp', n: 2 });
  });
});

describe('límite del chat', () => {
  test('el límite diario cuenta todo el día, no solo la hora', async () => {
    const db = drizzle(p.env.DB);
    const t = Date.UTC(2026, 9, 12, 1, 0, 0);
    expect(await dentroDelLimite(db, 'prueba-dia', 2, t, DIA)).toBe(true);
    expect(await dentroDelLimite(db, 'prueba-dia', 2, t + 3 * HORA, DIA)).toBe(true);
    expect(await dentroDelLimite(db, 'prueba-dia', 2, t + 6 * HORA, DIA)).toBe(false);
    expect(await dentroDelLimite(db, 'prueba-dia', 2, t + DIA, DIA)).toBe(true);
  });
});
