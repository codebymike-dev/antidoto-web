// Guion de la animación de "Construye en equipo": en qué punto va cada ficha en un instante del
// bucle. Función pura del tiempo (la escena solo la pinta), así la pausa congela el reloj y el
// póster quieto es el instante en que la obra está completa.
//
// El bucle: las fichas caen una tras otra y encajan, la obra se queda completa un rato y luego
// las fichas suben y desaparecen en orden inverso para volver a empezar.

/** Segundos entre una ficha y la siguiente. */
export const PASO = 0.3;
/** Lo que tarda una ficha en caer y encajar. */
export const CAIDA = 0.55;
/** Desde qué altura cae, en unidades de mundo (studs). */
export const ALTURA = 4.5;
/** Cuánto se queda la obra completa antes de desarmarse. */
export const ESPERA = 4;
/** Lo que tarda cada ficha en irse y el desfase entre una y otra. */
export const SALIDA = 0.5;
export const PASO_SALIDA = 0.035;
/** Respiro con la base vacía antes de la siguiente vuelta. */
export const VACIO = 0.6;

export interface EstadoFicha {
  visible: boolean;
  /** Desplazamiento vertical sobre su lugar, en unidades de mundo. */
  dy: number;
  /** Escala uniforme (1 = tamaño real). */
  escala: number;
}

export interface Estado {
  fichas: EstadoFicha[];
  /** Fichas ya encajadas. */
  puestas: number;
}

/** Cuando termina de encajar la última ficha. */
export const finArmado = (n: number) => (n - 1) * PASO + CAIDA;

/** Duración de una vuelta completa del bucle. */
export const ciclo = (n: number) => finArmado(n) + ESPERA + (n - 1) * PASO_SALIDA + SALIDA + VACIO;

/** El instante del bucle en que la obra se ve completa y quieta: el del póster. */
export const instanteCompleto = (n: number) => finArmado(n) + ESPERA / 2;

const salidaCubica = (p: number) => 1 - (1 - p) ** 3;
const entradaCubica = (p: number) => p ** 3;
/** Altura del saltito al encajar, en unidades de mundo. */
const REBOTE = 0.18;
/**
 * Altura sobre su lugar a la fracción p de la caída: baja acelerando como si pesara y, al tocar,
 * da un saltito corto (el clic del encaje). Nunca pasa por debajo de su lugar.
 */
export function altura(p: number): number {
  const toque = 0.72;
  if (p < toque) return ALTURA * (1 - (p / toque) ** 2);
  return REBOTE * Math.sin(Math.PI * Math.min(1, (p - toque) / (1 - toque)));
}

export function estadoEn(t: number, n: number): Estado {
  const T = ciclo(n);
  const tt = ((t % T) + T) % T;
  const armado = finArmado(n);
  const desarme = armado + ESPERA;
  const fichas: EstadoFicha[] = [];
  let puestas = 0;
  for (let i = 0; i < n; i++) {
    const inicio = i * PASO;
    if (tt < inicio) {
      fichas.push({ visible: false, dy: ALTURA, escala: 1 });
      continue;
    }
    if (tt < inicio + CAIDA) {
      const p = (tt - inicio) / CAIDA;
      fichas.push({ visible: true, dy: altura(p), escala: 1 });
      continue;
    }
    // Se van en orden inverso: la última en llegar es la primera en irse.
    const sale = desarme + (n - 1 - i) * PASO_SALIDA;
    if (tt < sale) {
      puestas++;
      fichas.push({ visible: true, dy: 0, escala: 1 });
      continue;
    }
    const p = Math.min(1, (tt - sale) / SALIDA);
    if (p >= 1) {
      fichas.push({ visible: false, dy: ALTURA, escala: 0 });
      continue;
    }
    fichas.push({ visible: true, dy: ALTURA * 0.6 * entradaCubica(p), escala: 1 - salidaCubica(p) });
  }
  return { fichas, puestas };
}
