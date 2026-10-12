// POST /v1/clic: analítica propia del sitio, sin cookies ni datos personales. El sitio avisa un
// clic en WhatsApp, una cotización enviada (por WhatsApp o por correo) o una llamada, y aquí se
// suma 1 al contador del día, el tipo y la página. Lo ve el panel en Métricas.
// Va en text/plain con keepalive, como los leads: sin preflight y sin frenar la apertura de WhatsApp.
import { sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { Env } from './env';
import { clics } from './db/schema';
import { TIPOS_CLIC, type TipoClic } from './dominio';
import { dentroDelLimite } from './limite';
import { hoyBogota } from './asesor/presupuesto';
import { ahora, hashIp, json } from './util';

/** Clics por IP y hora: una persona real no llega ni cerca. */
export const CLICS_POR_HORA = 120;
const RUTA = /^\/[a-z0-9\-/]{0,150}$/;

export function validarClic(cuerpo: unknown): { tipo: TipoClic; pagina: string } | null {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return null;
  const { tipo, pagina } = cuerpo as Record<string, unknown>;
  if (!TIPOS_CLIC.includes(tipo as TipoClic)) return null;
  if (typeof pagina !== 'string' || !RUTA.test(pagina)) return null;
  return { tipo: tipo as TipoClic, pagina };
}

export async function registrarClic(req: Request, env: Env, db: DrizzleD1Database, cors: Record<string, string>): Promise<Response> {
  const bruto = await req.text();
  if (bruto.length > 1024) return json({ ok: false }, 413, cors);
  let datos: unknown;
  try {
    datos = JSON.parse(bruto);
  } catch {
    return json({ ok: false }, 400, cors);
  }
  const clic = validarClic(datos);
  if (!clic) return json({ ok: false }, 422, cors);
  const t = ahora();
  const ipHash = await hashIp(req.headers.get('cf-connecting-ip'), env.SAL_IP, t);
  if (!(await dentroDelLimite(db, `clic:${ipHash ?? 'sin-ip'}`, CLICS_POR_HORA, t))) return json({ ok: false }, 429, cors);
  await db
    .insert(clics)
    .values({ dia: hoyBogota(t), tipo: clic.tipo, pagina: clic.pagina, n: 1 })
    .onConflictDoUpdate({ target: [clics.dia, clics.tipo, clics.pagina], set: { n: sql`${clics.n} + 1` } });
  return new Response(null, { status: 204, headers: cors });
}
