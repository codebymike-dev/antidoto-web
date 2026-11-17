// Formularios de aprobación que llena un cliente desde el sitio (por ahora /form-jv/, el checklist
// de IT de la plataforma de inspecciones SST). Los puntos salen de src/data/aprobacion-sst.json,
// el mismo archivo que pinta la página, así que la API solo acepta los puntos que existen.
//
// POST /v1/aprobaciones: público (solo orígenes del sitio), en text/plain como los leads. El NIT
// se vuelve a comprobar aquí: la página solo trae sus hashes y eso no protege nada por sí solo.
// El panel los lista y muestra en /admin/aprobaciones (src/rutas/aprobaciones.ts).
import { desc, eq, sql } from 'drizzle-orm';
import formulario from '../../src/data/aprobacion-sst.json';
import type { Db } from './db/conexion';
import type { Env } from './env';
import { aprobaciones } from './db/schema';
import { dentroDelLimite } from './limite';
import { enviar, correoAprobacionEquipo } from './correo';
import { ahora, hashIp, ipCliente, json, uuid } from './util';

/** NIT de la empresa que responde y el de Antídoto, sin puntos ni dígito de verificación. */
export const NITS_APROBACION = ['830112317', '901777384'];
export const ESTADOS_APROBACION = ['aprobado', 'condiciones', 'rechazado'] as const;
export type EstadoAprobacion = (typeof ESTADOS_APROBACION)[number];
export const FORMULARIO = formulario;

/** Envíos por IP y hora. */
export const APROBACIONES_POR_HORA = 10;
const MAX_CUERPO = 64 * 1024;
const MAX_NOTA = 2000;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface Respuesta {
  id: string;
  seccion: string;
  texto: string;
  estado: EstadoAprobacion;
  nota: string | null;
}

export interface AprobacionValida {
  nit: string;
  nombre: string;
  cargo: string;
  correo: string | null;
  fecha: string;
  observaciones: string | null;
  respuestas: Respuesta[];
}

const texto = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** NIT sin puntos, espacios ni dígito de verificación (lo que va después del guion). */
export const limpiarNit = (v: unknown): string => (typeof v === 'string' ? v.split('-')[0]!.replace(/\D/g, '') : '');

/** Valida un envío completo. Función pura, con pruebas. */
export function validarAprobacion(cuerpo: unknown): { ok: true; datos: AprobacionValida } | { ok: false; errores: string[] } {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return { ok: false, errores: ['cuerpo'] };
  const d = cuerpo as Record<string, unknown>;
  const errores: string[] = [];
  if (d.formulario !== formulario.formulario) errores.push('formulario');
  const nit = limpiarNit(d.nit);
  if (!NITS_APROBACION.includes(nit)) errores.push('nit');
  const nombre = texto(d.nombre, 120);
  const cargo = texto(d.cargo, 120);
  const correo = texto(d.correo, 200);
  const fecha = typeof d.fecha === 'string' && FECHA.test(d.fecha) ? d.fecha : null;
  if (!nombre) errores.push('nombre');
  if (!cargo) errores.push('cargo');
  if (correo && !CORREO.test(correo)) errores.push('correo');
  if (!fecha) errores.push('fecha');

  const enviadas = d.respuestas && typeof d.respuestas === 'object' && !Array.isArray(d.respuestas) ? (d.respuestas as Record<string, unknown>) : {};
  const respuestas: Respuesta[] = [];
  for (const s of formulario.secciones) {
    for (const p of s.puntos) {
      const r = enviadas[p.id] as Record<string, unknown> | undefined;
      const estado = r?.estado as EstadoAprobacion;
      if (!ESTADOS_APROBACION.includes(estado)) {
        errores.push(`${p.id}.estado`);
        continue;
      }
      const nota = texto(r?.nota, MAX_NOTA);
      if (estado !== 'aprobado' && !nota) errores.push(`${p.id}.nota`);
      respuestas.push({ id: p.id, seccion: s.titulo, texto: p.texto, estado, nota });
    }
  }
  if (errores.length) return { ok: false, errores };
  return { ok: true, datos: { nit, nombre: nombre!, cargo: cargo!, correo, fecha: fecha!, observaciones: texto(d.observaciones, 5000), respuestas } };
}

const contar = (rs: Respuesta[], e: EstadoAprobacion) => rs.filter((r) => r.estado === e).length;

export async function crearAprobacion(req: Request, env: Env, db: Db, appUrl: string, diferir: (p: Promise<unknown>) => void, cors: Record<string, string>): Promise<Response> {
  const bruto = await req.text();
  if (bruto.length > MAX_CUERPO) return json({ ok: false, error: 'cuerpo' }, 413, cors);
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(bruto);
  } catch {
    return json({ ok: false, error: 'json' }, 400, cors);
  }
  const t = ahora();
  const ipHash = await hashIp(ipCliente(req), env.SAL_IP, t);
  if (!(await dentroDelLimite(db, `aprobacion:${ipHash ?? 'sin-ip'}`, APROBACIONES_POR_HORA, t))) return json({ ok: false, error: 'limite' }, 429, cors);

  const r = validarAprobacion(cuerpo);
  if (!r.ok) return json({ ok: false, errores: r.errores }, r.errores.includes('nit') ? 403 : 422, cors);
  const { datos } = r;
  const fila = {
    id: uuid(),
    creado: t,
    formulario: formulario.formulario,
    nit: datos.nit,
    nombre: datos.nombre,
    cargo: datos.cargo,
    correo: datos.correo,
    fecha: datos.fecha,
    respuestas: JSON.stringify(datos.respuestas),
    observaciones: datos.observaciones,
    aprobados: contar(datos.respuestas, 'aprobado'),
    condiciones: contar(datos.respuestas, 'condiciones'),
    rechazados: contar(datos.respuestas, 'rechazado'),
    ipHash,
    userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
  };
  await db.insert(aprobaciones).values(fila);

  diferir(
    enviar(env, { para: env.MAIL_EQUIPO, ...correoAprobacionEquipo({ ...fila, titulo: formulario.titulo, appUrl }) }).catch((e) => console.error('[aprobaciones] correo', e)),
  );
  return json({ ok: true, id: fila.id }, 201, cors);
}

// Panel

const COLUMNAS_LISTA = {
  id: aprobaciones.id,
  creado: aprobaciones.creado,
  formulario: aprobaciones.formulario,
  nit: aprobaciones.nit,
  nombre: aprobaciones.nombre,
  cargo: aprobaciones.cargo,
  correo: aprobaciones.correo,
  fecha: aprobaciones.fecha,
  aprobados: aprobaciones.aprobados,
  condiciones: aprobaciones.condiciones,
  rechazados: aprobaciones.rechazados,
};

export async function listarAprobaciones(url: URL, db: Db): Promise<Response> {
  const porPagina = 50;
  const pagina = Math.max(0, Number(url.searchParams.get('pagina')) || 0);
  const [filas, [total]] = await Promise.all([
    db.select(COLUMNAS_LISTA).from(aprobaciones).orderBy(desc(aprobaciones.creado)).limit(porPagina).offset(pagina * porPagina),
    db.select({ n: sql<number>`count(*)` }).from(aprobaciones),
  ]);
  return json({ aprobaciones: filas, total: total?.n ?? 0, pagina, porPagina });
}

export async function verAprobacion(id: string, db: Db): Promise<Response> {
  const [fila] = await db.select().from(aprobaciones).where(eq(aprobaciones.id, id));
  if (!fila) return json({ error: 'no existe' }, 404);
  const { ipHash: _ip, respuestas, ...resto } = fila;
  return json({ aprobacion: { ...resto, titulo: fila.formulario === formulario.formulario ? formulario.titulo : fila.formulario, respuestas: JSON.parse(respuestas) as Respuesta[] } });
}

export async function borrarAprobacion(id: string, db: Db): Promise<Response> {
  const borradas = await db.delete(aprobaciones).where(eq(aprobaciones.id, id)).returning({ id: aprobaciones.id });
  return borradas.length ? json({ ok: true }) : json({ error: 'no existe' }, 404);
}
