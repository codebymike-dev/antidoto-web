// La obra de la sección "Construye en equipo" de la home: una muestra del constructor 3D de fichas
// de la plataforma de misiones (../antidoto, src/lib/bricks/). De allá vienen las medidas, el
// catálogo de piezas y la regla de encaje; aquí solo queda lo que hace falta para que una obra
// fija se arme sola. Lógica pura, sin three, para probarla con Vitest (tests/fichas.test.ts).
//
// Unidades enteras como en el motor original: x y z en studs, y en placas (un ladrillo = 3 placas).
// La base ocupa x y z de 0 a BASE - 1 y tiene studs en toda su cara superior (y = 0).

/** Medidas del ladrillo en unidades de mundo (1 = paso entre studs, 8 mm). */
const MM = 1 / 8;
export const MEDIDAS = {
  placa: 3.2 * MM,
  holgura: 0.1 * MM,
  studR: 2.4 * MM,
  studH: 1.7 * MM,
  bisel: 0.3 * MM,
} as const;

export const BASE = 12;

export type Tipo = 'ladrillo' | 'placa' | 'teja' | 'inclinada' | 'redonda' | 'ventana';

export interface Pieza {
  tipo: Tipo;
  /** Huella sin rotar: w en x, d en z (studs). Alto h en placas. */
  w: number;
  d: number;
  h: number;
}

/** Las piezas que usa la obra, con las medidas del catálogo del juego (src/lib/bricks/parts.ts). */
export const PIEZAS = {
  'ladrillo-1x1': { tipo: 'ladrillo', w: 1, d: 1, h: 3 },
  'ladrillo-1x2': { tipo: 'ladrillo', w: 2, d: 1, h: 3 },
  'ladrillo-1x6': { tipo: 'ladrillo', w: 6, d: 1, h: 3 },
  'ladrillo-2x2': { tipo: 'ladrillo', w: 2, d: 2, h: 3 },
  'ladrillo-2x6': { tipo: 'ladrillo', w: 6, d: 2, h: 3 },
  'placa-4x4': { tipo: 'placa', w: 4, d: 4, h: 1 },
  'teja-1x2': { tipo: 'teja', w: 2, d: 1, h: 1 },
  'teja-2x2': { tipo: 'teja', w: 2, d: 2, h: 1 },
  'inclinada-2x2': { tipo: 'inclinada', w: 2, d: 2, h: 3 },
  'inclinada-4x2': { tipo: 'inclinada', w: 4, d: 2, h: 3 },
  'redondo-1x1': { tipo: 'redonda', w: 1, d: 1, h: 3 },
  'redondo-2x2': { tipo: 'redonda', w: 2, d: 2, h: 3 },
  'placa-redonda-1x1': { tipo: 'redonda', w: 1, d: 1, h: 1 },
  'ventana-1x2x3': { tipo: 'ventana', w: 2, d: 1, h: 9 },
} as const satisfies Record<string, Pieza>;

export type ClavePieza = keyof typeof PIEZAS;

/**
 * Colores de pantalla de las fichas (los mismos valores de la paleta del juego, que siguen la
 * referencia de BrickLink Studio y LDraw), más el cian de Antídoto en la torre del equipo.
 */
export const COLORES = {
  blanco: '#F4F4F4',
  rojo: '#C91A09',
  azulOscuro: '#0A3463',
  grisOscuro: '#6C6E68',
  marron: '#582A12',
  verde: '#237841',
  lima: '#BBE90B',
  amarillo: '#FAC80A',
  naranja: '#FE8A18',
  coral: '#FF698F',
  beige: '#E4CD9E',
  cian: '#3BC8F3',
} as const;

export type Color = keyof typeof COLORES;

/** Color de la base: la bruma de la marca, un punto más oscura para que se lean sus studs. */
export const COLOR_BASE = '#DCE7EC';

export interface Ficha {
  pieza: ClavePieza;
  color: Color;
  x: number;
  y: number;
  z: number;
  /** Media vuelta en el eje vertical, dentro de la misma huella (solo la usan las inclinadas). */
  giro?: boolean;
}

/**
 * La obra, en el orden en que se arma. Una casa con ventanas y techo a dos aguas, un árbol, la
 * torre del equipo en cian, un camino y flores: varias manos trabajando a la vez.
 */
export const OBRA: readonly Ficha[] = [
  // Primera ronda: cada quien empieza su parte.
  { pieza: 'ladrillo-2x6', color: 'rojo', x: 2, y: 0, z: 3 },
  { pieza: 'redondo-2x2', color: 'marron', x: 9, y: 0, z: 8 },
  { pieza: 'ladrillo-1x6', color: 'rojo', x: 2, y: 0, z: 5 },
  { pieza: 'ladrillo-2x2', color: 'cian', x: 0, y: 0, z: 9 },
  { pieza: 'ventana-1x2x3', color: 'blanco', x: 2, y: 0, z: 6 },
  { pieza: 'teja-2x2', color: 'beige', x: 4, y: 0, z: 7 },
  { pieza: 'ladrillo-1x2', color: 'rojo', x: 4, y: 0, z: 6 },
  { pieza: 'ventana-1x2x3', color: 'blanco', x: 6, y: 0, z: 6 },
  { pieza: 'teja-2x2', color: 'beige', x: 4, y: 0, z: 9 },
  { pieza: 'teja-1x2', color: 'beige', x: 4, y: 0, z: 11 },
  { pieza: 'redondo-1x1', color: 'verde', x: 7, y: 0, z: 9 },
  { pieza: 'redondo-1x1', color: 'verde', x: 1, y: 0, z: 6 },
  // Segunda ronda: los muros suben y la torre crece.
  { pieza: 'ladrillo-2x6', color: 'blanco', x: 2, y: 3, z: 3 },
  { pieza: 'redondo-2x2', color: 'marron', x: 9, y: 3, z: 8 },
  { pieza: 'ladrillo-2x2', color: 'amarillo', x: 0, y: 3, z: 9 },
  { pieza: 'ladrillo-1x6', color: 'blanco', x: 2, y: 3, z: 5 },
  { pieza: 'ladrillo-1x2', color: 'blanco', x: 4, y: 3, z: 6 },
  { pieza: 'placa-redonda-1x1', color: 'coral', x: 7, y: 3, z: 9 },
  { pieza: 'placa-redonda-1x1', color: 'amarillo', x: 1, y: 3, z: 6 },
  { pieza: 'ladrillo-2x6', color: 'rojo', x: 2, y: 6, z: 3 },
  { pieza: 'redondo-2x2', color: 'marron', x: 9, y: 6, z: 8 },
  { pieza: 'ladrillo-2x2', color: 'cian', x: 0, y: 6, z: 9 },
  { pieza: 'ladrillo-1x6', color: 'rojo', x: 2, y: 6, z: 5 },
  { pieza: 'ladrillo-1x2', color: 'rojo', x: 4, y: 6, z: 6 },
  // Tercera ronda: techo, copa del árbol y remate de la torre.
  { pieza: 'inclinada-4x2', color: 'azulOscuro', x: 2, y: 9, z: 3, giro: true },
  { pieza: 'placa-4x4', color: 'verde', x: 8, y: 9, z: 7 },
  { pieza: 'inclinada-4x2', color: 'azulOscuro', x: 2, y: 9, z: 5 },
  { pieza: 'ladrillo-2x2', color: 'naranja', x: 0, y: 9, z: 9 },
  { pieza: 'inclinada-2x2', color: 'azulOscuro', x: 6, y: 9, z: 3, giro: true },
  { pieza: 'inclinada-2x2', color: 'azulOscuro', x: 6, y: 9, z: 5 },
  { pieza: 'ladrillo-2x2', color: 'verde', x: 9, y: 10, z: 8 },
  { pieza: 'ladrillo-2x2', color: 'cian', x: 0, y: 12, z: 9 },
  { pieza: 'ladrillo-1x1', color: 'grisOscuro', x: 6, y: 12, z: 5 },
  { pieza: 'redondo-2x2', color: 'lima', x: 9, y: 13, z: 8 },
];

/** Si la celda (i, k) de la huella de la ficha tiene stud arriba. */
export function tieneStud(f: Ficha, i: number, k: number): boolean {
  const p = PIEZAS[f.pieza];
  if (p.tipo === 'teja') return false;
  // Las inclinadas solo llevan studs en su fila alta: el fondo (z local 0), o el frente si van giradas.
  if (p.tipo === 'inclinada') return f.giro ? k === p.d - 1 : k === 0;
  return true;
}

/** Celdas que ocupa una ficha, como "x,y,z". */
export function celdas(f: Ficha): string[] {
  const p = PIEZAS[f.pieza];
  const out: string[] = [];
  for (let y = f.y; y < f.y + p.h; y++)
    for (let k = 0; k < p.d; k++) for (let i = 0; i < p.w; i++) out.push(`${f.x + i},${y},${f.z + k}`);
  return out;
}

/** Alto de la obra terminada, en placas. */
export function altoObra(obra: readonly Ficha[] = OBRA): number {
  return Math.max(...obra.map((f) => f.y + PIEZAS[f.pieza].h));
}
