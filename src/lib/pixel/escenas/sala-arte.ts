// Arte de la sala de la actividad, la sección a ancho completo de la home: el salón donde un
// equipo construye con bloques junto a un facilitador de Antídoto. Pantalla grande con el plano
// del modelo, una mesa baja con su base para armar, dos cajones llenos de fichas, puffs y plantas.
// Lo importante va en el centro: en celular se ve solo la franja del medio.

import { CLEAR, mix, seeded, type Color, type PixelBuffer } from '../buffer.ts';
import { Iso, type BoxColors } from '../iso.ts';
import { C, darker, drawCuarto } from '../cuarto.ts';

export const W = 640;
export const H = 312;
export const I = 16;
export const J = 6;
export const WALL = 70;
export const iso = new Iso(220, 80);

export const DOOR = { j0: 3.4, j1: 4.6, h: 48 };
export const PANTALLA = { i0: 6.0, i1: 10.6, z0: 22, z1: 62 };

/** Mesa baja de construcción (en baldosas) y su alto en px. */
export const MESA = { i0: 7.0, i1: 10.0, j0: 2.2, j1: 3.6, h: 14 };
/** Cajones de fichas en el piso: centro y medida. */
export const CAJONES = [
  { i: 4.6, j: 3.6, di: 0.8, dj: 0.6 },
  { i: 13.2, j: 4.8, di: 0.8, dj: 0.6 },
];

export interface Bloque {
  /** Columna de la izquierda, en studs (0 a 6). */
  u: number;
  fila: number;
  /** Ancho en studs. */
  ancho: number;
  color: Color;
}

/** El modelo que arma el equipo, en el orden en que se pone: dos torres y un puente. */
export const PLAN: Bloque[] = [
  { u: 0, fila: 0, ancho: 2, color: C.reto },
  { u: 4, fila: 0, ancho: 2, color: C.antidote },
  { u: 0, fila: 1, ancho: 2, color: C.yellow },
  { u: 4, fila: 1, ancho: 2, color: C.green },
  { u: 0, fila: 2, ancho: 3, color: C.deep },
  { u: 3, fila: 2, ancho: 3, color: C.reto },
  { u: 1, fila: 3, ancho: 2, color: C.antidote },
  { u: 3, fila: 3, ancho: 2, color: C.yellow },
  { u: 1, fila: 4, ancho: 4, color: C.green },
  { u: 2, fila: 5, ancho: 2, color: C.reto },
];

/** Dónde queda el modelo sobre la mesa: un stud mide STUD baldosas y una fila ALTO px. */
const STUD = 0.3;
const ALTO = 5;
const BASE = { i: (MESA.i0 + MESA.i1) / 2 - 0.9, j: 2.75, dj: 0.35 };
/** Punto de la mesa donde se arma (las personas miran hacia ahí). */
export const OBRA = { i: (MESA.i0 + MESA.i1) / 2, j: BASE.j + BASE.dj / 2 };

export const PUFFS = [
  { i: 2.2, j: 4.6, c: C.reto },
  { i: 3.5, j: 5.2, c: C.antidote },
  { i: 1.5, j: 3.2, c: C.yellow },
];
export const PLANTAS = [
  { i: 0.7, j: 0.7 },
  { i: 15.2, j: 0.8 },
  { i: 15.3, j: 5.2 },
];

const WOOD: BoxColors = { top: C.furnitureLit, front: C.furniture, side: C.furnitureDark, line: darker(C.furnitureDark, 0.5) };

function colores(c: Color): BoxColors {
  return { top: mix(c, C.paper, 0.3), front: c, side: darker(c, 0.22), line: darker(c, 0.55) };
}

/** Piso, paredes, ventanas, el tapete bajo la mesa y la pantalla apagada. */
export function drawFondo(buf: PixelBuffer) {
  drawCuarto(buf, iso, { I, J, wall: WALL, door: DOOR, windows: [12.2, 13.6] });

  // Tapete claro bajo la mesa, con borde.
  const r = { i0: 5.6, i1: 11.6, j0: 1.0, j1: 4.9 };
  iso.quad(buf, [[r.i0, r.j0, 0], [r.i1, r.j0, 0], [r.i1, r.j1, 0], [r.i0, r.j1, 0]], (x, y) => {
    const { i, j } = iso.floorAt(x + 0.5, y + 0.5);
    const m = Math.min(i - r.i0, r.i1 - i, (j - r.j0) * 2, (r.j1 - j) * 2);
    if (m < 0.1) return C.deep;
    if (m < 0.2) return C.paper;
    return (Math.floor(i * 2) + Math.floor(j * 4)) % 9 === 0 ? C.glow : mix(C.glow, C.paper, 0.45);
  });
  iso.floorShadow(buf, MESA.i0 + 0.1, MESA.j0 + 0.1, MESA.i1 - MESA.i0, MESA.j1 - MESA.j0, C.shadow, 0.22);

  // Pantalla grande en la pared derecha.
  const s = PANTALLA;
  iso.onFront(buf, 0.02, [s.i0, s.i1, s.z0, s.z1], (i, z) => {
    if (i < s.i0 || i > s.i1 || z < s.z0 || z > s.z1) return CLEAR;
    if (i < s.i0 + 0.06 || i > s.i1 - 0.06 || z < s.z0 + 1.5 || z > s.z1 - 1.5) return C.ink;
    return C.inkRaised;
  });
  // Puffs: no tapan a nadie (van atrás a la izquierda), se pintan con el fondo.
  for (const p of PUFFS) drawPuff(buf, p.i, p.j, p.c);
}

/** El bloque del plan que cubre un punto (u en studs, f en filas), si hay. */
function bloqueEn(u: number, f: number): number {
  return PLAN.findIndex((b) => f >= b.fila && f < b.fila + 1 && u >= b.u && u < b.u + b.ancho);
}

/**
 * Lo que muestra la pantalla: el plano del modelo (lo puesto, de color; lo que falta, punteado),
 * la barra del tiempo y, al terminar, la bandera y el marco que titila.
 */
export function drawPantalla(buf: PixelBuffer, estado: { encendida: boolean; puestos: number; tiempo: number; completo: boolean; t: number }) {
  const s = PANTALLA;
  if (!estado.encendida) return;
  const ancho = 0.36;
  const bi0 = (s.i0 + s.i1) / 2 - 3 * ancho;
  const bz0 = s.z0 + 7;
  const fila = 4;
  const lit = estado.completo && Math.floor(estado.t * 4) % 2 === 0;
  iso.onFront(buf, 0.03, [s.i0 + 0.12, s.i1 - 0.12, s.z0 + 2.5, s.z1 - 2.5], (i, z) => {
    if (i < s.i0 + 0.12 || i > s.i1 - 0.12 || z < s.z0 + 2.5 || z > s.z1 - 2.5) return CLEAR;
    if (lit && (i < s.i0 + 0.2 || i > s.i1 - 0.2 || z < s.z0 + 3.5 || z > s.z1 - 3.5)) return C.antidote;
    // Barra del tiempo.
    if (z >= s.z0 + 3.5 && z < s.z0 + 5) {
      const a = s.i0 + 0.4;
      const b = s.i1 - 0.4;
      if (i < a || i > b) return CLEAR;
      return i < a + (b - a) * estado.tiempo ? (estado.tiempo < 0.25 ? C.reto : C.antidote) : C.slate;
    }
    const u = (i - bi0) / ancho;
    const f = (z - bz0) / fila;
    const n = bloqueEn(u, f);
    if (n >= 0) {
      const b = PLAN[n];
      const borde = u - b.u < 0.14 || b.u + b.ancho - u < 0.14 || f - b.fila < 0.2 || b.fila + 1 - f < 0.2;
      if (n < estado.puestos) return borde ? darker(b.color, 0.45) : b.color;
      return borde && Math.floor(i * 18 + z) % 3 !== 0 ? C.dash : CLEAR;
    }
    // Bandera en la punta del modelo.
    const tope = bz0 + 6 * fila + 0.5;
    const mastil = Math.abs(u - 3) < 0.12 && z >= tope && z < tope + 6;
    const tela = u > 3.1 && u < 3.1 + (tope + 6 - z) * 0.5 && z > tope + 2.5 && z < tope + 6;
    if (mastil) return estado.completo ? C.paper : C.dash;
    if (tela && estado.completo) return C.antidote;
    return CLEAR;
  });
}

/** Mesa con la base verde, unas fichas sueltas y el modelo con los bloques ya puestos. */
export function drawMesa(buf: PixelBuffer, puestos: number, completo: boolean, t: number) {
  const m = MESA;
  const pata = { top: C.steelDark, front: C.steel, side: C.steelDark };
  for (const [i, j] of [[m.i0 + 0.15, m.j0 + 0.15], [m.i1 - 0.3, m.j0 + 0.15], [m.i0 + 0.15, m.j1 - 0.3], [m.i1 - 0.3, m.j1 - 0.3]]) {
    iso.box(buf, i, j, 0, 0.15, 0.15, m.h - 3, pata);
  }
  iso.box(buf, m.i0, m.j0, m.h - 3, m.i1 - m.i0, m.j1 - m.j0, 3, WOOD);

  // Base verde con sus studs.
  const b = { i0: BASE.i - 0.2, i1: BASE.i + 6 * STUD + 0.2, j0: BASE.j - 0.3, j1: BASE.j + BASE.dj + 0.3 };
  iso.box(buf, b.i0, b.j0, m.h, b.i1 - b.i0, b.j1 - b.j0, 1, { top: C.green, front: C.greenDark, side: C.greenDark });
  for (let i = b.i0 + 0.15; i < b.i1 - 0.05; i += STUD) {
    for (let j = b.j0 + 0.12; j < b.j1 - 0.05; j += 0.3) {
      const p = iso.P(i, j, m.h + 1);
      buf.px(p.x, p.y - 1, mix(C.green, C.paper, 0.35));
    }
  }

  // Fichas sueltas a los lados de la base.
  const sueltas: [number, number, Color][] = [
    [7.25, 2.4, C.yellow],
    [7.35, 3.15, C.antidote],
    [9.55, 2.35, C.reto],
    [9.7, 3.2, C.paper],
  ];
  for (const [i, j, c] of sueltas) drawBloque(buf, i, j, m.h, 2, c);

  // El modelo: fila por fila, de la izquierda a la derecha.
  PLAN.slice(0, puestos).forEach((bl) => drawBloque(buf, BASE.i + bl.u * STUD, BASE.j, m.h + 1 + bl.fila * ALTO, bl.ancho, bl.color, BASE.dj));

  // La bandera al terminar, ondeando.
  if (completo) {
    const tope = m.h + 1 + 6 * ALTO;
    const p = iso.P(BASE.i + 3 * STUD, BASE.j + BASE.dj / 2, tope);
    buf.rect(p.x, p.y - 14, 1, 14, C.steelDark);
    const ola = Math.round(Math.sin(t * 6));
    buf.poly([p.x + 1, p.y - 14, p.x + 10, p.y - 11 + ola, p.x + 1, p.y - 8], C.antidote);
    buf.px(p.x + 2, p.y - 13, C.glow);
  }
}

/** Un bloque de `ancho` studs con sus studs arriba, puesto en (i, j, z). */
export function drawBloque(buf: PixelBuffer, i: number, j: number, z: number, ancho: number, c: Color, dj = 0.3) {
  iso.box(buf, i, j, z, ancho * STUD, dj, ALTO, colores(c));
  for (let k = 0; k < ancho; k++) {
    const p = iso.P(i + STUD / 2 + k * STUD, j + dj / 2, z + ALTO);
    buf.rect(p.x - 1, p.y - 1, 2, 1, mix(c, C.paper, 0.55));
  }
}

/** Ficha en la mano: un rectangulito con sus dos studs, de frente. */
export function drawFicha(buf: PixelBuffer, x: number, y: number, c: Color) {
  buf.rect(x - 3, y - 2, 7, 4, darker(c, 0.5));
  buf.rect(x - 2, y - 1, 5, 2, c);
  buf.rect(x - 2, y - 3, 2, 1, mix(c, C.paper, 0.4));
  buf.rect(x + 1, y - 3, 2, 1, mix(c, C.paper, 0.4));
}

/** Cajón de madera lleno de fichas de colores. */
export function drawCajon(buf: PixelBuffer, n: number) {
  const k = CAJONES[n];
  const i0 = k.i - k.di / 2;
  const j0 = k.j - k.dj / 2;
  const alto = 9;
  iso.floorShadow(buf, i0 + 0.08, j0 + 0.08, k.di, k.dj, C.shadow, 0.25);
  iso.box(buf, i0, j0, 0, k.di, k.dj, alto, { top: C.furnitureDark, front: C.deep, side: C.deepDark, line: darker(C.deepDark, 0.5) });
  const azar = seeded(17 + n * 31);
  const tonos = [C.reto, C.yellow, C.antidote, C.green, C.paper];
  for (let q = 0; q < 22; q++) {
    const p = iso.P(i0 + 0.1 + azar() * (k.di - 0.25), j0 + 0.1 + azar() * (k.dj - 0.2), alto + azar() * 3);
    const c = tonos[Math.floor(azar() * tonos.length)];
    buf.rect(p.x - 1, p.y - 1, 3, 2, c);
    buf.px(p.x - 1, p.y - 2, mix(c, C.paper, 0.4));
  }
}

function drawPuff(buf: PixelBuffer, i: number, j: number, c: Color) {
  const p = iso.P(i, j);
  buf.shadow(p.x, p.y + 1, 12, 5, C.shadow, 0.25);
  buf.ellipse(p.x, p.y - 4, 11, 7, darker(c, 0.5));
  buf.ellipse(p.x, p.y - 4.5, 10, 6.2, c);
  buf.ellipse(p.x - 2, p.y - 7, 5, 2.5, mix(c, C.paper, 0.4));
}

export function drawPlanta(buf: PixelBuffer, i: number, j: number) {
  const pot: BoxColors = { top: C.retoDark, front: C.reto, side: C.retoDark, line: darker(C.retoDark, 0.5) };
  iso.box(buf, i - 0.25, j - 0.25, 0, 0.5, 0.5, 10, pot);
  const q = iso.P(i, j, 10);
  const hojas: [number, number, number][] = [
    [0, -14, 5],
    [-6, -9, 4],
    [6, -10, 4],
    [-3, -19, 3.5],
    [4, -17, 3.5],
  ];
  for (const [dx, dy, r] of hojas) buf.ellipse(q.x + dx, q.y + dy, r + 1, r * 0.7 + 1, C.greenDark);
  for (const [dx, dy, r] of hojas) buf.ellipse(q.x + dx, q.y + dy - 0.5, r, r * 0.7, C.green);
}
