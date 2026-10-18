// Trabajo pendiente de la API, sin tareas programadas: corre cuando alguien del equipo usa el panel,
// como mucho una vez cada 5 minutos, después de responder. Arranca las campañas programadas cuya
// hora ya pasó, decide las pruebas A/B, manda los lotes y las invitaciones que queden, reintenta
// las publicaciones del sitio, avisa las solicitudes sin respuesta, manda los recordatorios de
// confirmación y borra las conversaciones vencidas.
import type { Db } from './db/conexion';
import type { Env } from './env';
import { dentroDelLimite } from './limite';
import { arrancarProgramadas, decidirPruebas, procesarEnvios } from './marketing/envios';
import { invitaciones, recordatorios } from './marketing/automaticos';
import { reintentarPublicaciones } from './publicacion';
import { seguimiento } from './seguimiento';
import { limpiarConversaciones } from './asesor/guardado';
import { anotarRevision } from './rutas/sistema';
import { ahora } from './util';

export const CADA_MS = 5 * 60_000;
/** Tope de vueltas al mandar una campaña entera: 40 vueltas de hasta 500 correos. */
const MAX_VUELTAS = 40;

/** Manda todos los lotes pendientes de una vez (al pulsar Enviar). Para cuando ya no sale nada. */
export async function enviarTodo(env: Env, db: Db): Promise<{ enviados: number; fallidos: number }> {
  const total = { enviados: 0, fallidos: 0 };
  for (let i = 0; i < MAX_VUELTAS; i++) {
    const r = await procesarEnvios(env, db);
    total.enviados += r.enviados;
    total.fallidos += r.fallidos;
    if (!r.enviados && !r.fallidos) break;
  }
  return total;
}

/** Corre lo pendiente si no se corrió en los últimos 5 minutos. Falla abierto: nunca rompe el panel. */
export async function pendientesSiToca(env: Env, db: Db, appUrl: string, t = ahora()): Promise<void> {
  if (!(await dentroDelLimite(db, `pendientes:${Math.floor(t / CADA_MS)}`, 1, t).catch(() => false))) return;
  await correrPendientes(env, db, appUrl);
}

export async function correrPendientes(env: Env, db: Db, appUrl: string): Promise<void> {
  const fallo = (que: string) => (e: unknown) => (console.error(`[pendientes] ${que}`, e), -1);
  // Primero las programadas y las pruebas A/B: así sus correos salen en esta misma vuelta.
  const programadas = await arrancarProgramadas(env, db).catch(fallo('programadas'));
  const pruebasAb = await decidirPruebas(env, db).catch(fallo('pruebas A/B'));
  const envio = await enviarTodo(env, db).catch((e) => (console.error('[pendientes] envíos', e), { enviados: -1, fallidos: -1 }));
  const invitadas = await invitaciones(env, db, appUrl).catch(fallo('invitaciones'));
  const publicaciones = await reintentarPublicaciones(db, env).catch(fallo('publicaciones'));
  const avisados = await seguimiento(env, db)
    .then((r) => r.avisados)
    .catch(fallo('seguimiento'));
  const recordados = await recordatorios(env, db, appUrl).catch(fallo('recordatorios'));
  const borradas = await limpiarConversaciones(db, ahora()).catch(fallo('limpieza de conversaciones'));
  await anotarRevision(db, {
    programadas,
    abDecididas: pruebasAb,
    enviados: envio.enviados,
    fallidos: envio.fallidos,
    invitaciones: invitadas,
    publicaciones,
    leadsAvisados: avisados,
    recordatorios: recordados,
    conversacionesBorradas: borradas,
  });
}
