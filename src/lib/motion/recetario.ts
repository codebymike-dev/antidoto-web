// Recetario de una línea de servicio: cada oferta es una dosis. Un solo scrub sobre la lista
// llena el nivel de cada fila en orden, marca las dosis servidas, sube el líquido del frasco del
// logo (con la ola de liquido.ts, que se mueve con el scroll y no con un reloj) y cuenta las
// servidas. El HTML trae todo lleno; si algo falla, se devuelve ese estado (fail-open).
import { gsap, ScrollTrigger, pieza } from './core';
import { olaRuta } from './liquido';
import { CAJA_LIQUIDO } from '../../data/logo';

const acotar = (v: number) => Math.min(1, Math.max(0, v));

export function iniciarRecetario(raiz: HTMLElement) {
  const lista = raiz.querySelector<HTMLElement>('ol');
  const filas = [...raiz.querySelectorAll<HTMLElement>('[data-dosis]')];
  const niveles = filas.map((f) => f.querySelector<HTMLElement>('[data-nivel]'));
  const liquido = raiz.querySelector<SVGPathElement>('[data-liquido]');
  const contador = raiz.querySelector<HTMLElement>('[data-contador]');
  const n = filas.length;
  if (!lista || !n) return;
  const lleno = liquido?.getAttribute('d') ?? '';
  const total = contador?.textContent ?? '';

  pieza(
    'recetario',
    () => {
      const pintar = (avance: number) => {
        let servidas = 0;
        filas.forEach((fila, i) => {
          const v = acotar(avance * n - i);
          if (niveles[i]) gsap.set(niveles[i], { scaleX: v });
          fila.classList.toggle('servida', v >= 1);
          if (v >= 1) servidas++;
        });
        // Tres vueltas de ola en todo el recorrido: el líquido se mece solo mientras alguien baja.
        liquido?.setAttribute('d', olaRuta(avance, CAJA_LIQUIDO, avance * Math.PI * 6, 14));
        if (contador) contador.textContent = String(servidas).padStart(2, '0');
      };
      raiz.classList.add('en-curso');
      pintar(0);
      ScrollTrigger.create({ trigger: lista, start: 'top 70%', end: 'bottom 62%', onUpdate: (st) => pintar(st.progress) });
    },
    () => {
      raiz.classList.remove('en-curso');
      filas.forEach((f) => f.classList.remove('servida'));
      gsap.set(niveles, { clearProps: 'transform' });
      if (liquido && lleno) liquido.setAttribute('d', lleno);
      if (contador) contador.textContent = total;
    },
  );
}

/**
 * "Para quién": al apuntar o enfocar un área, sus ofertas de esta línea se señalan en el
 * recetario. No es movimiento (es un estado), así que corre también con movimiento reducido.
 */
export function senalarDosis(tarjetas: Iterable<HTMLElement>, recetario: HTMLElement) {
  const filas = [...recetario.querySelectorAll<HTMLElement>('[data-dosis]')];
  for (const t of tarjetas) {
    const claves = (t.dataset.ofertas ?? '').split(' ').filter(Boolean);
    const marcar = (si: boolean) => filas.forEach((f) => f.classList.toggle('senalada', si && claves.includes(f.dataset.dosis ?? '')));
    t.addEventListener('pointerenter', () => marcar(true));
    t.addEventListener('pointerleave', () => marcar(false));
    t.addEventListener('focusin', () => marcar(true));
    t.addEventListener('focusout', () => marcar(false));
  }
}
