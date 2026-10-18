// Entorno de las pruebas de punta a punta: una base libSQL en un archivo temporal (la misma base
// que Turso) con las migraciones aplicadas y archivos en una carpeta temporal.
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type Client, type InStatement, type InValue } from '@libsql/client';
import type { Env } from '../src/env';
import { almacenEnDisco } from '../src/plataforma/almacen-disco';

export async function crearEntorno() {
  const dir = mkdtempSync(join(tmpdir(), 'antidoto-prueba-'));
  const env: Env = {
    DB: createClient({ url: `file:${join(dir, 'prueba.db')}` }),
    MEDIOS: almacenEnDisco(join(dir, 'medios')),
    ARCHIVOS: almacenEnDisco(join(dir, 'archivos')),
    ENTORNO: 'produccion',
    ORIGENES: 'https://antidotocolombia.com,https://antidoto-web.vercel.app',
    MAIL_FROM: 'Antídoto <hola@antidotocolombia.com>',
    MAIL_FROM_NOVEDADES: 'Antídoto <novedades@antidotocolombia.com>',
    MAIL_EQUIPO: 'equipo@antidoto.test',
    HORAS_SEGUIMIENTO: '24',
    SITIO_URL: 'https://antidotocolombia.com',
  };
  const migraciones = fileURLToPath(import.meta.resolve('../migraciones/'));
  for (const archivo of readdirSync(migraciones).filter((f) => f.endsWith('.sql')).sort()) {
    const sentencias = readFileSync(`${migraciones}${archivo}`, 'utf8').split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
    await env.DB.batch(sentencias, 'write');
  }
  return { env, cerrar: async () => env.DB.close() };
}

/** SQL crudo en las pruebas: consulta(db, sql, ...args).first() | .first('col') | .all() | .run(). */
export function consulta(db: Client, sql: string, ...args: unknown[]) {
  const instruccion = { sql, args: args.map((a) => (a === undefined ? null : a)) as InValue[] };
  const filas = async () => (await db.execute(instruccion)).rows.map((f) => ({ ...f }) as Record<string, unknown>);
  return {
    instruccion,
    async first<T = Record<string, unknown>>(columna?: string): Promise<T | null> {
      const [fila] = await filas();
      if (!fila) return null;
      return (columna ? fila[columna] : fila) as T;
    },
    async all<T = Record<string, unknown>>() {
      return { results: (await filas()) as T[] };
    },
    async run() {
      await db.execute(instruccion);
    },
  };
}

/** Varias consultas en una transacción. */
export const lote = (db: Client, consultas: { instruccion: InStatement }[]) => db.batch(consultas.map((c) => c.instruccion), 'write');
