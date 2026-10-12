// Cloudflare Turnstile para el chat con IA: un token por pregunta, que la API verifica si tiene
// TURNSTILE_SECRET. Solo existe si el build trae PUBLIC_TURNSTILE_SITEKEY; sin ella devuelve
// undefined y la pregunta va sin token. El script de Cloudflare se pide la primera vez que alguien
// pregunta, no al cargar la página. El widget solo se ve si Cloudflare necesita que la persona
// confirme algo (appearance: interaction-only).

interface Turnstile {
  render(el: HTMLElement, o: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SITEKEY = String(import.meta.env.PUBLIC_TURNSTILE_SITEKEY ?? '');
const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let carga: Promise<Turnstile | null> | undefined;
let widget: { id: string; esperando: ((t: string | undefined) => void) | null } | undefined;

function cargar(): Promise<Turnstile | null> {
  carga ??= new Promise((resolver) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolver(window.turnstile ?? null);
    s.onerror = () => resolver(null);
    document.head.append(s);
  });
  return carga;
}

/** Un token nuevo de Turnstile, o undefined si no está configurado o no se pudo obtener. */
export async function tokenTurnstile(locale: 'es' | 'en'): Promise<string | undefined> {
  if (!SITEKEY) return undefined;
  const ts = await cargar();
  if (!ts) return undefined;
  if (!widget) {
    const caja = document.createElement('div');
    caja.className = 'turnstile-caja';
    document.body.append(caja);
    const w: { id: string; esperando: ((t: string | undefined) => void) | null } = { id: '', esperando: null };
    const fin = (t: string | undefined) => {
      w.esperando?.(t);
      w.esperando = null;
    };
    w.id = ts.render(caja, {
      sitekey: SITEKEY,
      execution: 'execute',
      appearance: 'interaction-only',
      language: locale,
      callback: (t: string) => fin(t),
      'error-callback': () => fin(undefined),
      'expired-callback': () => fin(undefined),
    });
    widget = w;
  }
  const w = widget;
  return new Promise((resolver) => {
    const tiempo = window.setTimeout(() => {
      w.esperando = null;
      resolver(undefined);
    }, 20_000);
    w.esperando = (t) => {
      window.clearTimeout(tiempo);
      resolver(t);
    };
    ts.reset(w.id);
    ts.execute(w.id);
  });
}
