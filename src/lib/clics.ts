// Analítica propia, gratuita y sin cookies: cuenta clics en WhatsApp, cotizaciones enviadas (por
// WhatsApp o por correo) y llamadas. Manda a la API solo el tipo y la ruta de la página
// (api/src/clics.ts); el panel los muestra en Métricas. Sin PUBLIC_API_URL no hace nada.
// Un enlace puede fijar su tipo con data-clic (el botón de enviar del cotizador).

export type TipoClic = 'whatsapp' | 'cotizacion_whatsapp' | 'cotizacion_correo' | 'llamada';

const API = String(import.meta.env.PUBLIC_API_URL ?? '').replace(/\/$/, '');

export function contarClic(tipo: TipoClic) {
  if (!API) return;
  // text/plain evita el preflight y keepalive deja terminar el envío aunque se abra otra app.
  fetch(`${API}/v1/clic`, {
    method: 'POST',
    body: JSON.stringify({ tipo, pagina: location.pathname.toLowerCase().slice(0, 150) }),
    keepalive: true,
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
  }).catch(() => {});
}

/** Tipo de un enlace: el de data-clic, o WhatsApp y llamada por su dirección. */
export function tipoDeEnlace(a: HTMLAnchorElement): TipoClic | null {
  const fijo = a.dataset.clic as TipoClic | undefined;
  if (fijo) return fijo;
  if (a.href.startsWith('https://wa.me/')) return 'whatsapp';
  if (a.href.startsWith('tel:')) return 'llamada';
  return null;
}

/** Escucha los clics de toda la página (una vez, desde Base.astro). */
export function iniciarClics() {
  if (!API) return;
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element | null)?.closest?.('a');
      const tipo = a instanceof HTMLAnchorElement ? tipoDeEnlace(a) : null;
      if (tipo) contarClic(tipo);
    },
    { capture: true },
  );
}
