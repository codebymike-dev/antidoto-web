// Solo el sitio (y sus vistas previas de rama en Vercel) puede enviar leads.
import type { Env } from './env';

// Vercel: antidoto-web-<hash>-<equipo>.vercel.app y antidoto-web-git-<rama>-<equipo>.vercel.app.
// El sufijo del equipo es obligatorio: cualquiera puede crear en su cuenta un proyecto llamado
// antidoto-web-algo, pero Vercel reserva el sufijo -<equipo> para ese equipo. Si el proyecto pasa
// a la cuenta de Antídoto, cambia aquí el nombre del equipo.
const EQUIPO_VERCEL = 'code-by-mike-sandbox';
const PREVIEW_VERCEL = new RegExp(`^https://antidoto-web-[a-z0-9-]+-${EQUIPO_VERCEL}\\.vercel\\.app$`);
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

export function origenPermitido(origen: string | null, env: Pick<Env, 'ORIGENES'>, local = false): boolean {
  if (!origen) return false;
  const lista = env.ORIGENES.split(',').map((o) => o.trim()).filter(Boolean);
  return lista.includes(origen) || PREVIEW_VERCEL.test(origen) || (local && LOCAL.test(origen));
}

export function cabecerasCors(origen: string): Record<string, string> {
  return {
    'access-control-allow-origin': origen,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}
