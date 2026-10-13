// Sala de la actividad: un equipo de cinco personas arma con bloques el modelo que muestra la
// pantalla, junto al facilitador de Antídoto. Por tandas, cada quien va a un cajón, carga una
// ficha y la pone en la mesa en el orden del plano; entre tandas hablan de cómo lo están haciendo
// y, con el último bloque, celebran. El facilitador llega desde el hero (el paseo lo deja en la
// sala) o, si nadie tocó el botón, entra por la puerta cuando la sala asoma. Los textos los pone
// la página: la escena solo dice quién habla y qué línea toca. Sin DOM, corre también en Node.

import { PixelBuffer, hex } from '../buffer.ts';
import { STAND, drawAvatar, poseRig, type Expression, type Look, type Pose } from '../avatar.ts';
import { Timeline, act, actorPose, poseTo, walkTo, type Actor, type Step } from '../actor.ts';
import type { Pt } from '../iso.ts';
import { C } from '../cuarto.ts';
import { FACILITADOR } from './estudio.ts';
import * as arte from './sala-arte.ts';

export { PLAN } from './sala-arte.ts';

/** Tandas de construcción: quién carga cada bloque del plano, en orden. */
export const TANDAS: number[][] = [
  [1, 4, 2, 5, 3],
  [3, 5, 2, 4],
  [1],
];

/** Línea del guion: la página la cambia por el texto en su idioma. */
export type LineaSala = 'abre' | 'idea' | 'pregunta' | 'responde' | 'cierra';

export interface EventosSala {
  di?: (quien: number, linea: LineaSala) => void;
  calla?: () => void;
}

const pose = (p: Partial<Pose>): Pose => ({ ...STAND, ...p });
const EXPLICA = pose({ armN: 70, foreN: 40, armF: 50, foreF: 30, headTilt: -4 });
const SENALA = pose({ armN: 96, foreN: 84, armF: -4, foreF: 6, headTilt: -6 });
const FESTEJA = pose({ armN: 160, foreN: 170, armF: 150, foreF: 165, headTilt: -8 });
const DUDA = pose({ armN: 40, foreN: 120, armF: 30, foreF: 110, headTilt: 10 });
const AGACHA = pose({ lean: 10, thighN: 50, shinN: -30, thighF: 30, shinF: -40, armN: 30, foreN: 40, armF: 20, foreF: 30, headTilt: 10 });
/** Ficha en las manos, a la altura del pecho. */
const CARGA = pose({ armN: 40, foreN: 95, armF: 34, foreF: 90 });
/** Inclinado sobre la mesa, poniendo la ficha. */
const PONE = pose({ lean: 12, armN: 70, foreN: 100, armF: 62, foreF: 96, headTilt: 14 });

const piel = [hex('#e8b48f'), hex('#8d5a3b'), hex('#c98d5f'), hex('#f0c9a5'), hex('#a8714a')];
const look = (o: Partial<Look> & { shirt: Look['shirt'] }, n: number): Look => ({
  shirtDark: o.shirt,
  shirtLine: o.shirt,
  pants: hex('#3c4f5a'),
  pantsDark: hex('#2c3a43'),
  skin: piel[n],
  skinDark: piel[n],
  hat: C.deep,
  hatDark: C.deepDark,
  band: C.ink,
  hair: hex('#2a1d17'),
  shoes: 'tenis',
  headwear: 'ninguno',
  mustache: false,
  pattern: 'liso',
  ...o,
});

function oscuro(c: number, k = 0.22) {
  const ch = (s: number) => Math.round(((c >>> s) & 255) * (1 - k));
  return ((255 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0;
}

function conSombras(l: Look): Look {
  return { ...l, shirtDark: oscuro(l.shirt), shirtLine: oscuro(l.shirt, 0.45), skinDark: oscuro(l.skin, 0.18) };
}

export const EQUIPO: Look[] = [
  conSombras(look({ shirt: C.yellow, hairStyle: 'suelto', hair: hex('#5a3a22') }, 0)),
  conSombras(look({ shirt: C.reto, mustache: true }, 1)),
  conSombras(look({ shirt: C.green, hairStyle: 'recogido' }, 2)),
  conSombras(look({ shirt: C.paper, headwear: 'gorra', hat: C.deep, hatDark: C.deepDark, band: C.antidote }, 3)),
  conSombras(look({ shirt: C.deep, pants: hex('#2c3e4a'), hair: hex('#1b1411') }, 4)),
];

/** Dónde se para cada quien en la mesa (i, j); el facilitador espera junto a la pantalla. */
const CASA: { i: number; j: number }[] = [
  { i: 12.2, j: 1.6 },
  { i: 6.2, j: 2.4 },
  { i: 7.3, j: 1.6 },
  { i: 10.9, j: 2.0 },
  { i: 7.2, j: 4.6 },
  { i: 11.4, j: 4.0 },
];

/** Dónde se agacha cada quien a sacar fichas: cajón 0 a la izquierda, cajón 1 a la derecha. */
const FICHAS: { i: number; j: number }[] = [
  { i: 0, j: 0 },
  { i: 5.4, j: 3.6 },
  { i: 4.6, j: 2.8 },
  { i: 13.2, j: 4.1 },
  { i: 4.6, j: 4.3 },
  { i: 12.2, j: 4.7 },
];

/** Puerta (si entra solo), un desvío para no cruzar la mesa y el punto donde lo deja el paseo. */
const PUERTA = { i: 0.2, j: (arte.DOOR.j0 + arte.DOOR.j1) / 2 };
const DESVIO = { i: 5.5, j: 1.2 };
export const LLEGADA = { i: 14.6, j: 3.4 };

const VEL = 44;

interface Persona {
  a: Actor;
  look: Look;
  tl: Timeline;
  festeja: boolean;
  /** Color de la ficha que carga, si carga una. */
  ficha: number | null;
}

/** Paso del director: corre `hacer` y espera `dur` segundos y, si hay, a que `hasta` se cumpla. */
interface Paso {
  hacer?: () => void;
  dur?: number;
  hasta?: () => boolean;
}

/** Hacia dónde mira quien está en (i, j) para ver la obra. */
function haciaObra(i: number, j: number): 1 | -1 {
  return arte.iso.P(arte.OBRA.i, arte.OBRA.j).x >= arte.iso.P(i, j).x ? 1 : -1;
}

export class Sala {
  readonly width = arte.W;
  readonly height = arte.H;
  private fondo = new PixelBuffer(arte.W, arte.H);
  private gente: Persona[];
  private presente = false;
  private cola: Paso[] = [];
  private paso: Paso | null = null;
  private tPaso = 0;
  private t = 0;
  private obra = { encendida: false, puestos: 0, completo: false, inicio: 0 };
  private eventos: EventosSala;
  private enCharla = false;

  constructor(eventos: EventosSala = {}) {
    this.eventos = eventos;
    arte.drawFondo(this.fondo);
    this.gente = [FACILITADOR, ...EQUIPO].map((l, n) => {
      const c = CASA[n];
      const p = arte.iso.P(c.i, c.j);
      const mira = n === 0 ? -1 : haciaObra(c.i, c.j);
      return { a: { x: p.x, y: p.y, facing: mira, pose: STAND, expr: 'normal' as Expression, walking: false, walkPhase: 0, carrying: false }, look: l, tl: new Timeline(), festeja: false, ficha: null };
    });
  }

  get llego() {
    return this.presente;
  }

  /** Punto del piso donde el paseo deja al facilitador, en px del lienzo. */
  llegada(): Pt {
    return arte.iso.P(LLEGADA.i, LLEGADA.j);
  }

  /** Cabeza de una persona: ahí apunta la burbuja. */
  cabeza(quien: number): Pt {
    const a = this.gente[quien].a;
    return { x: a.x, y: a.y - 58 };
  }

  /** Llega el facilitador (desde el paseo, en el borde; o por la puerta) y arranca la actividad. */
  llegar(desdeElPaseo: boolean) {
    if (this.presente) {
      // Ya había entrado por la puerta: el que baja con el paseo toma su lugar (no hay dos).
      if (!desdeElPaseo) return;
      const f = this.gente[0];
      const d = this.llegada();
      f.tl.clear();
      Object.assign(f.a, { x: d.x, y: d.y, facing: -1, walking: false, pose: STAND });
      this.irA(0, [CASA[0]], -1);
      return;
    }
    this.presente = true;
    const f = this.gente[0];
    const d = desdeElPaseo ? this.llegada() : arte.iso.P(PUERTA.i, PUERTA.j);
    f.a.x = d.x;
    f.a.y = d.y;
    f.a.facing = -1;
    this.irA(0, desdeElPaseo ? [CASA[0]] : [DESVIO, CASA[0]], -1);
    // El equipo lo saluda.
    for (let n = 1; n < 6; n++) this.gente[n].tl.push(poseTo(this.gente[n].a, SENALA, 0.3, 'feliz'), { dur: 1.2 }, poseTo(this.gente[n].a, STAND, 0.3, 'normal'));
    this.push({ hasta: () => this.quietos() });
    this.jugar();
  }

  /**
   * Alguien le pregunta al facilitador (el asesor de IA): la actividad se detiene donde va, él se
   * queda pensando o explicando y, al soltar, sigue. Si aún no había llegado, entra.
   */
  charla(estado: 'piensa' | 'explica' | null) {
    if (estado && !this.presente) this.llegar(false);
    this.enCharla = estado !== null;
    const f = this.gente[0];
    if (estado === 'piensa') f.tl.push(poseTo(f.a, DUDA, 0.3, 'normal'));
    else if (estado === 'explica') f.tl.push(poseTo(f.a, EXPLICA, 0.3, 'feliz'));
    else f.tl.push(poseTo(f.a, STAND, 0.3, 'normal'));
  }

  /** Estado del PNG quieto: el modelo terminado, el equipo celebra y el facilitador cierra. */
  cuadroQuieto(): { quien: number; linea: LineaSala } {
    this.presente = true;
    this.gente.forEach((p, n) => {
      const c = CASA[n];
      const q = arte.iso.P(c.i, c.j);
      Object.assign(p.a, { x: q.x, y: q.y, facing: n === 0 ? -1 : haciaObra(c.i, c.j), pose: n === 0 ? EXPLICA : FESTEJA, expr: 'feliz' });
    });
    this.obra = { encendida: true, puestos: arte.PLAN.length, completo: true, inicio: 0 };
    return { quien: 0, linea: 'cierra' };
  }

  private quietos() {
    return this.gente.every((p) => !p.tl.busy);
  }

  private push(...p: Paso[]) {
    this.cola.push(...p);
  }

  /** Camina por los puntos dados y termina mirando a `mira` en la pose `final`. */
  private irA(n: number, ruta: { i: number; j: number }[], mira: 1 | -1, final: Pose = STAND, expr: Expression = 'normal', andar: Pose = STAND) {
    const p = this.gente[n];
    const pasos: Step[] = ruta.map((r) => {
      const q = arte.iso.P(r.i, r.j);
      return walkTo(p.a, q.x, q.y, VEL);
    });
    p.tl.push(poseTo(p.a, andar, 0.2), ...pasos, act(() => (p.a.facing = mira)), poseTo(p.a, final, 0.3, expr));
  }

  private di(quien: number, linea: LineaSala, dur: number, gesto?: Pose): Paso[] {
    const p = this.gente[quien];
    return [
      { hacer: () => (gesto && p.tl.push(poseTo(p.a, gesto, 0.25)), this.eventos.di?.(quien, linea)), dur },
      { hacer: () => (gesto && p.tl.push(poseTo(p.a, STAND, 0.25)), this.eventos.calla?.()), dur: 0.35 },
    ];
  }

  /** Una tanda: cada quien va por su ficha y vuelve; después ponen los bloques en orden. */
  private tanda(quienes: number[]) {
    this.push({
      hacer: () => {
        quienes.forEach((n, k) => {
          const p = this.gente[n];
          const f = FICHAS[n];
          const c = CASA[n];
          const color = arte.PLAN[this.obra.puestos + k].color;
          p.tl.push({ dur: k * 0.3 });
          this.irA(n, [f], arte.iso.P(f.i, f.j).x > arte.iso.P(c.i, c.j).x ? 1 : -1, AGACHA);
          p.tl.push(
            { dur: 0.5 },
            act(() => {
              p.ficha = color;
              p.a.carrying = true;
            }),
          );
          this.irA(n, [c], haciaObra(c.i, c.j), CARGA, 'feliz', CARGA);
        });
      },
      hasta: () => this.quietos(),
    });
    quienes.forEach((n) => {
      const p = this.gente[n];
      this.push(
        { hacer: () => p.tl.push(poseTo(p.a, PONE, 0.25)), dur: 0.3 },
        {
          hacer: () => {
            this.obra.puestos++;
            p.ficha = null;
            p.a.carrying = false;
            p.tl.push(poseTo(p.a, STAND, 0.3, 'normal'));
          },
          dur: 0.25,
        },
      );
    });
    this.push({ hasta: () => this.quietos() });
  }

  /** La construcción completa y el cierre; al terminar vuelve a empezar. */
  private jugar() {
    this.push({
      hacer: () => {
        this.obra = { encendida: true, puestos: 0, completo: false, inicio: this.t };
      },
    });
    this.push(...this.di(0, 'abre', 3.8, SENALA));
    this.tanda(TANDAS[0]);
    this.push(...this.di(3, 'idea', 3.2, EXPLICA));
    this.tanda(TANDAS[1]);
    this.push(...this.di(0, 'pregunta', 3.2, SENALA));
    this.push(...this.di(4, 'responde', 4.2, EXPLICA));
    this.tanda(TANDAS[2]);
    this.push({
      hacer: () => {
        this.obra.completo = true;
        for (let n = 1; n < 6; n++) {
          const p = this.gente[n];
          p.festeja = true;
          p.tl.push(poseTo(p.a, FESTEJA, 0.3, 'feliz'));
        }
      },
      dur: 0.8,
    });
    this.push(...this.di(0, 'cierra', 4.4, EXPLICA));
    this.push({
      hacer: () => {
        for (let n = 1; n < 6; n++) {
          const p = this.gente[n];
          p.festeja = false;
          p.tl.push(poseTo(p.a, STAND, 0.3, 'normal'));
        }
      },
      dur: 1.2,
    });
    // Desarman el modelo y la pantalla se apaga un momento antes de la siguiente.
    this.push({ hacer: () => (this.obra = { encendida: false, puestos: 0, completo: false, inicio: this.t }), dur: 1.5 });
    this.push({ hacer: () => this.jugar() });
  }

  update(dt: number) {
    this.t += dt;
    for (const p of this.gente) p.tl.update(dt);
    for (let guarda = 0; guarda < 20 && !this.enCharla; guarda++) {
      if (!this.paso) {
        const sig = this.cola.shift();
        if (!sig) break;
        this.paso = sig;
        this.tPaso = 0;
        sig.hacer?.();
      }
      this.tPaso += guarda === 0 ? dt : 0;
      const listo = this.tPaso >= (this.paso.dur ?? 0) && (this.paso.hasta?.() ?? true);
      if (!listo) break;
      this.paso = null;
    }
  }

  render(out: PixelBuffer) {
    out.data.set(this.fondo.data);
    const o = this.obra;
    // La barra del tiempo del reto baja en 75 s.
    const tiempo = Math.max(0.05, 1 - (this.t - o.inicio) / 75);
    arte.drawPantalla(out, { encendida: o.encendida, puestos: o.puestos, tiempo, completo: o.completo, t: this.t });
    const capas: [number, () => void][] = arte.PLANTAS.map((p) => [p.i + p.j + 0.25, () => arte.drawPlanta(out, p.i, p.j)]);
    capas.push([arte.OBRA.i + arte.OBRA.j, () => arte.drawMesa(out, o.puestos, o.completo, this.t)]);
    arte.CAJONES.forEach((k, n) => capas.push([k.i + k.j, () => arte.drawCajon(out, n)]));
    this.gente.forEach((p, n) => {
      if (n === 0 && !this.presente) return;
      const { i, j } = arte.iso.floorAt(p.a.x, p.a.y);
      capas.push([
        i + j,
        () => {
          const salto = p.festeja ? Math.round(Math.abs(Math.sin(this.t * 7 + n)) * 4) : 0;
          const respira = !p.a.walking && !p.festeja && Math.sin(this.t * 2.2 + n * 1.7) > 0.6 ? 1 : 0;
          const pz = { ...actorPose(p.a), bob: respira };
          const y = p.a.y - salto;
          out.shadow(p.a.x, p.a.y + 1, 9 - salto / 2, 3, C.shadow, 0.3);
          const ficha = p.ficha;
          drawAvatar(out, pz, p.look, p.a.x, y, p.a.facing, p.a.expr, {
            held:
              ficha === null
                ? undefined
                : () => {
                    const r = poseRig(pz, p.a.x, y, p.a.facing);
                    arte.drawFicha(out, Math.round((r.handN.x + r.handF.x) / 2), Math.round((r.handN.y + r.handF.y) / 2) - 1, ficha);
                  },
          });
        },
      ]);
    });
    capas.sort((a, b) => a[0] - b[0]).forEach(([, dibujar]) => dibujar());
  }
}
