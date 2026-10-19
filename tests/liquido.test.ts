import { describe, expect, it } from 'vitest';
import { ola, olaRuta, PUNTOS_OLA } from '../src/lib/motion/liquido';

const ys = (poly: string) =>
  poly
    .slice('polygon('.length, -1)
    .split(', ')
    .slice(0, PUNTOS_OLA + 1)
    .map((p) => Number(p.split(' ')[1].replace('%', '')));

describe('ola', () => {
  it('vacía: todo el borde en el fondo (nada visible)', () => {
    expect(ys(ola(0, 1.3))).toEqual(Array(PUNTOS_OLA + 1).fill(100));
  });

  it('llena: todo el borde arriba (rectángulo completo)', () => {
    expect(ys(ola(1, 2.1))).toEqual(Array(PUNTOS_OLA + 1).fill(0));
  });

  it('a medio camino tiene ola y el nivel medio sube con el avance', () => {
    const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    const mitad = ys(ola(0.5, 0));
    expect(new Set(mitad).size).toBeGreaterThan(2);
    expect(media(ys(ola(0.7, 0)))).toBeLessThan(media(mitad));
    expect(media(mitad)).toBeLessThan(media(ys(ola(0.3, 0))));
  });

  it('nunca sale del elemento y acota el avance', () => {
    for (const a of [-1, 0.1, 0.5, 0.9, 2]) for (const y of ys(ola(a, 0.7, 30))) expect(y).toBeGreaterThanOrEqual(0), expect(y).toBeLessThanOrEqual(100);
    expect(ola(2)).toBe(ola(1));
  });
});

describe('olaRuta', () => {
  const caja = { x0: 0, x1: 200, arriba: 20, abajo: 220 };
  const ysRuta = (d: string) =>
    d
      .slice(1)
      .split(' L')
      .slice(0, PUNTOS_OLA + 1)
      .map((p) => Number(p.split(' ')[1]));

  it('vacía y llena son rectángulos exactos', () => {
    expect(ysRuta(olaRuta(0, caja, 1.1))).toEqual(Array(PUNTOS_OLA + 1).fill(220));
    expect(ysRuta(olaRuta(1, caja, 2.3))).toEqual(Array(PUNTOS_OLA + 1).fill(20));
  });

  it('a medio camino tiene ola, sube con el avance y no sale de la caja', () => {
    const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    const mitad = ysRuta(olaRuta(0.5, caja));
    expect(new Set(mitad).size).toBeGreaterThan(2);
    expect(media(ysRuta(olaRuta(0.8, caja)))).toBeLessThan(media(mitad));
    for (const a of [-1, 0.2, 0.5, 0.9, 3]) for (const y of ysRuta(olaRuta(a, caja, 0.4, 60))) expect(y).toBeGreaterThanOrEqual(20), expect(y).toBeLessThanOrEqual(220);
  });
});
