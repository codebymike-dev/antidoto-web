import { describe, expect, it } from 'vitest';
import { BASE, OBRA, PIEZAS, celdas, tieneStud, type Ficha } from '../src/lib/fichas/modelo';
import { ALTURA, altura, ciclo, estadoEn, finArmado, instanteCompleto } from '../src/lib/fichas/guion';

const n = OBRA.length;

/** Qué ficha ocupa cada celda "x,y,z". */
function ocupacion(obra: readonly Ficha[]) {
  const mapa = new Map<string, number>();
  obra.forEach((f, i) => celdas(f).forEach((c) => mapa.set(c, i)));
  return mapa;
}

describe('la obra de Construye en equipo', () => {
  it('cabe en la base y ninguna ficha se pisa con otra', () => {
    const vistas = new Set<string>();
    for (const f of OBRA) {
      const p = PIEZAS[f.pieza];
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.z).toBeGreaterThanOrEqual(0);
      expect(f.x + p.w).toBeLessThanOrEqual(BASE);
      expect(f.z + p.d).toBeLessThanOrEqual(BASE);
      for (const c of celdas(f)) {
        expect(vistas.has(c), `celda ${c} ocupada dos veces`).toBe(false);
        vistas.add(c);
      }
    }
  });

  it('cada ficha encaja en la base o en un stud de la ficha de abajo', () => {
    const mapa = ocupacion(OBRA);
    OBRA.forEach((f, i) => {
      if (f.y === 0) return;
      const p = PIEZAS[f.pieza];
      let apoyos = 0;
      for (let k = 0; k < p.d; k++)
        for (let j = 0; j < p.w; j++) {
          const abajo = mapa.get(`${f.x + j},${f.y - 1},${f.z + k}`);
          if (abajo === undefined) continue;
          const g = OBRA[abajo];
          if (tieneStud(g, f.x + j - g.x, f.z + k - g.z)) apoyos++;
        }
      expect(apoyos, `la ficha ${i} (${f.pieza}) queda en el aire`).toBeGreaterThan(0);
    });
  });

  it('cada ficha llega después de la que la sostiene y antes de las que van encima', () => {
    // Al caer desde arriba, una ficha nunca atraviesa una que ya esté puesta más alto en su columna.
    OBRA.forEach((f, i) => {
      const p = PIEZAS[f.pieza];
      OBRA.slice(0, i).forEach((g, j) => {
        const q = PIEZAS[g.pieza];
        const cruzan = f.x < g.x + q.w && g.x < f.x + p.w && f.z < g.z + q.d && g.z < f.z + p.d;
        if (cruzan) expect(g.y, `la ficha ${i} cae a través de la ${j}`).toBeLessThan(f.y);
      });
    });
  });
});

describe('el guion de la animación', () => {
  it('empieza con la base vacía', () => {
    const e = estadoEn(0, n);
    expect(e.puestas).toBe(0);
    expect(e.fichas.slice(1).every((f) => !f.visible)).toBe(true);
  });

  it('en el instante del póster la obra está completa y quieta', () => {
    const e = estadoEn(instanteCompleto(n), n);
    expect(e.puestas).toBe(n);
    expect(e.fichas.every((f) => f.visible && f.dy === 0 && f.escala === 1)).toBe(true);
  });

  it('cuenta las fichas encajadas en orden', () => {
    let previo = 0;
    for (let paso = 0; paso <= 200; paso++) {
      const { puestas } = estadoEn(((finArmado(n) + 0.01) * paso) / 200, n);
      expect(puestas).toBeGreaterThanOrEqual(previo);
      previo = puestas;
    }
    expect(previo).toBe(n);
  });

  it('es un bucle: al cerrar la vuelta la base vuelve a quedar vacía', () => {
    const T = ciclo(n);
    expect(estadoEn(T - 0.01, n).fichas.every((f) => !f.visible)).toBe(true);
    expect(estadoEn(T + 1.23, n)).toEqual(estadoEn(1.23, n));
  });

  it('la caída arranca arriba, termina en su lugar y nunca baja de él', () => {
    expect(altura(0)).toBe(ALTURA);
    expect(altura(1)).toBeCloseTo(0, 10);
    for (let p = 0; p <= 1; p += 0.01) expect(altura(p)).toBeGreaterThanOrEqual(0);
  });
});
