// Gestos comunes a todas las páginas: titulares que se arman, botones magnéticos, entradas de
// grupos, la dosis de líquido en los resaltados y el paralaje de las fotos.
import { gsap, ScrollTrigger, pieza } from './core';
import { ola } from './liquido';
import { llenar } from './llenar';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/** Titulares `[data-titular]`: cada palabra sube desde una máscara. */
export function titulares(raiz: ParentNode = document) {
  raiz.querySelectorAll<HTMLElement>('[data-titular]').forEach((el) => {
    let split: SplitText | null = null;
    pieza(
      'titular',
      () => {
        split = new SplitText(el, { type: 'words', mask: 'words' });
        // El degradado de acento no pasa a las palabras transformadas: cada palabra lo lleva
        // y el contenedor lo suelta (si no, el texto queda transparente).
        split.words.forEach((w) => {
          const acento = w.parentElement?.closest('.texto-acento');
          if (acento) {
            w.classList.add('texto-acento');
            (acento as HTMLElement).style.backgroundImage = 'none';
          }
        });
        gsap.from(split.words, { yPercent: 110, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.1 });
      },
      () => split?.revert(),
    );
  });
}

/**
 * Botones `[data-magnetico]`: la píldora sigue al cursor y su texto se mueve un 45 % de
 * eso, dos capas que dan volumen. Solo con puntero fino (en táctil no hay hover).
 */
export function magneticos(raiz: ParentNode = document) {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  raiz.querySelectorAll<HTMLElement>('[data-magnetico]').forEach((btn) => {
    pieza('magnetico', () => {
      const texto = btn.querySelector<HTMLElement>('[data-magnetico-texto]');
      const x = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const y = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      const tx = texto ? gsap.quickTo(texto, 'x', { duration: 0.5, ease: 'power3.out' }) : null;
      const ty = texto ? gsap.quickTo(texto, 'y', { duration: 0.5, ease: 'power3.out' }) : null;
      const RADIO = 1.35; // atrae un poco antes de tocar el botón

      const mover = (e: PointerEvent) => {
        const r = btn.getBoundingClientRect();
        // El centro se mide sin la traslación propia; si no, el botón se retroalimenta y tiembla.
        const cx = r.left + r.width / 2 - (gsap.getProperty(btn, 'x') as number);
        const cy = r.top + r.height / 2 - (gsap.getProperty(btn, 'y') as number);
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const cerca = Math.abs(dx) < (r.width / 2) * RADIO && Math.abs(dy) < (r.height / 2) * RADIO;
        const fx = cerca ? dx * 0.3 : 0;
        const fy = cerca ? dy * 0.4 : 0;
        x(fx);
        y(fy);
        tx?.(fx * 0.45);
        ty?.(fy * 0.45);
      };
      window.addEventListener('pointermove', mover, { passive: true });
    });
  });
}

/**
 * Grupos `[data-entra]`: sus hijos entran escalonados al asomar el grupo. `clearProps` devuelve
 * el control al CSS al terminar (el hover de las tarjetas usa transform).
 */
export function entradas(raiz: ParentNode = document) {
  raiz.querySelectorAll<HTMLElement>('[data-entra]').forEach((grupo) => {
    const hijos = [...grupo.children] as HTMLElement[];
    pieza(
      'entrada',
      () => {
        gsap.set(hijos, { y: 28, opacity: 0 });
        let hecho = false;
        ScrollTrigger.create({
          trigger: grupo,
          start: 'top 88%',
          onEnter: () => {
            if (hecho) return;
            hecho = true;
            gsap.to(hijos, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity' });
          },
        });
      },
      () => gsap.set(hijos, { clearProps: 'transform,opacity' }),
    );
  });
}

/** Corre `fn` una sola vez cuando `el` asoma. (No `once: true`: ver tropiezos de la skill.) */
export function alAsomar(el: Element, fn: () => void, start = 'top 85%') {
  let hecho = false;
  ScrollTrigger.create({
    trigger: el,
    start,
    onEnter: () => {
      if (hecho) return;
      hecho = true;
      fn();
    },
  });
}

/**
 * Resaltado de un título: el fondo cian se vacía y una copia del texto en tinta sube como
 * líquido; al llenarse se quita la copia y queda el resaltado real. Solo en una línea: si el
 * resaltado se parte, la copia no calzaría y se deja quieto.
 */
export function dosis(res: HTMLElement, cuando: 'asomar' | number) {
  if (res.getClientRects().length > 1) return;
  const quitar = () => {
    res.classList.remove('dosis-pendiente');
    res.querySelector(':scope > .dosis-lleno')?.remove();
  };
  pieza(
    'dosis',
    () => {
      const lleno = document.createElement('span');
      lleno.className = 'dosis-lleno';
      lleno.setAttribute('aria-hidden', 'true');
      lleno.textContent = res.textContent;
      res.classList.add('dosis-pendiente');
      res.appendChild(lleno);
      lleno.style.clipPath = ola(0);
      const correr = (delay = 0) => llenar(lleno, { duracion: 0.9, delay, alTerminar: quitar });
      if (cuando === 'asomar') alAsomar(res, () => correr(0.15), 'top 82%');
      else correr(cuando);
    },
    quitar,
  );
}

/** Resaltados de los títulos de sección: cada uno recibe su dosis al asomar (el del hero la recibe en inicio.ts). */
export function resaltados() {
  document.querySelectorAll<HTMLElement>('main section:not([data-hero]) .resaltado').forEach((r) => dosis(r, 'asomar'));
}

/**
 * Profundidad ligada al scroll (no es un bucle: responde a la persona). Las fotos `[data-paralaje]`
 * se desplazan dentro de su marco, ampliadas lo justo para no dejar huecos.
 */
export function paralaje() {
  document.querySelectorAll<HTMLElement>('[data-paralaje]').forEach((marco) => {
    const fotos = marco.querySelectorAll<HTMLElement>('img');
    pieza(
      'paralaje',
      () => {
        gsap.fromTo(fotos, { yPercent: -7, scale: 1.16 }, { yPercent: 7, scale: 1.16, ease: 'none', scrollTrigger: { trigger: marco, start: 'top bottom', end: 'bottom top', scrub: true } });
      },
      () => gsap.set(fotos, { clearProps: 'transform' }),
    );
  });
}
