// "Construye en equipo" (home/ConstruyeEquipo.astro): cambia la foto quieta de la obra por la
// escena 3D que se arma sola (src/lib/fichas/). three solo se pide después de `load` y cuando la
// sección se acerca a la pantalla. Es un bucle de más de 5 s: tiene pausa y se detiene fuera de
// pantalla o con la pestaña oculta. Con movimiento reducido, sin WebGL o si algo falla queda la
// foto (fail-open).
import { pieza } from './core';

export function iniciarFichas(raiz: HTMLElement) {
  const ventana = raiz.querySelector<HTMLElement>('[data-fichas-ventana]');
  const lienzo = raiz.querySelector<HTMLCanvasElement>('[data-fichas-lienzo]');
  const poster = raiz.querySelector<HTMLImageElement>('[data-fichas-poster]');
  const boton = raiz.querySelector<HTMLButtonElement>('[data-fichas-pausa]');
  const contador = raiz.querySelector<HTMLElement>('[data-fichas-contador]');
  const cuenta = raiz.querySelector<HTMLElement>('[data-fichas-cuenta]');
  if (!ventana || !lienzo || !poster) return;

  let liberar: (() => void) | null = null;
  const restaurar = () => {
    liberar?.();
    lienzo.hidden = true;
    poster.style.opacity = '';
    if (boton) boton.hidden = true;
    if (contador) contador.hidden = true;
  };

  pieza(
    'fichas',
    () => {
      const arrancar = async () => {
        const { EscenaObra } = await import('../fichas/escena');
        const escena = new EscenaObra(lienzo, {
          alPoner: (puestas, total) => {
            if (cuenta) cuenta.textContent = `${puestas}/${total}`;
          },
        });
        // Si el navegador pierde el contexto WebGL, vuelve la foto.
        lienzo.addEventListener('webglcontextlost', restaurar, { once: true });

        const ajustar = () => {
          const r = lienzo.getBoundingClientRect();
          escena.ajustar(r.width, r.height);
        };

        // El bucle arranca en el instante de la foto (obra completa, misma cámara): el cambio de la
        // foto al lienzo no se nota, y desde ahí la obra se desarma y se vuelve a armar.
        let t = escena.instantePoster();
        let previo = 0;
        let raf = 0;
        let pausado = false;
        let enPantalla = false;
        const cuadro = (ahora: number) => {
          // Un salto grande (pestaña dormida, depuración) no adelanta la obra de golpe.
          t += Math.min(0.1, (ahora - previo) / 1000);
          previo = ahora;
          escena.pintar(t);
          raf = requestAnimationFrame(cuadro);
        };
        const actualizar = () => {
          const corre = enPantalla && !pausado && !document.hidden;
          if (corre && !raf) {
            previo = performance.now();
            raf = requestAnimationFrame(cuadro);
          } else if (!corre && raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        };

        const ro = new ResizeObserver(() => {
          ajustar();
          if (!raf) escena.pintar(t);
        });
        ro.observe(lienzo);
        const io = new IntersectionObserver(([e]) => {
          enPantalla = e.isIntersecting;
          actualizar();
        });
        io.observe(ventana);
        document.addEventListener('visibilitychange', actualizar);
        liberar = () => {
          cancelAnimationFrame(raf);
          raf = 0;
          ro.disconnect();
          io.disconnect();
          document.removeEventListener('visibilitychange', actualizar);
          escena.liberar();
          liberar = null;
        };

        // El lienzo se muestra antes de medirlo (oculto mide 0) y se pinta antes de soltar la foto.
        lienzo.hidden = false;
        ajustar();
        escena.pintar(t);
        poster.style.opacity = '0';
        if (contador) contador.hidden = false;

        if (boton) {
          boton.hidden = false;
          boton.addEventListener('click', () => {
            pausado = !pausado;
            boton.setAttribute('aria-pressed', String(pausado));
            // El nombre queda fijo ("Pausar animación"): aria-pressed anuncia el estado. El título visible sí cambia.
            boton.title = (pausado ? boton.dataset.reanudar : boton.dataset.pausar) ?? '';
            actualizar();
          });
        }
        actualizar();
      };

      const cargar = () =>
        arrancar().catch((err) => {
          console.warn('[motion] fichas deshabilitadas tras un fallo', err);
          restaurar();
        });
      // Después de `load` y solo cuando la sección se acerca: three no compite con la carga inicial.
      const alAcercarse = () => {
        const io = new IntersectionObserver(
          ([e]) => {
            if (!e.isIntersecting) return;
            io.disconnect();
            cargar();
          },
          { rootMargin: '600px 0px' },
        );
        io.observe(ventana);
      };
      if (document.readyState === 'complete') alAcercarse();
      else addEventListener('load', alAcercarse, { once: true });
    },
    restaurar,
  );
}
