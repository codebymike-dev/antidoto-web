// La API en local (npm run dev): un servidor de Node en http://127.0.0.1:8787 con la base en un
// archivo SQLite y los archivos en el disco, ambos en .local/. Las variables salen de .env
// (copia de .env.ejemplo). scripts/dev.mjs lo empaqueta y lo vuelve a arrancar al guardar.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { manejar } from '../index';
import type { Env } from '../env';
import { json } from '../util';
import { assetsDesdeDisco } from './assets-fs';
import { almacenEnDisco } from './almacen-disco';
import { aWeb, responder } from './entrada-node';
import { variables } from './vercel';

if (existsSync('.env')) process.loadEnvFile('.env');
const raiz = process.cwd();
const env: Env = {
  ...variables({ ENTORNO: 'local', ...process.env }),
  DB: createClient({ url: process.env.TURSO_DATABASE_URL || `file:${join(raiz, '.local/antidoto.db')}` }),
  ASSETS: assetsDesdeDisco(join(raiz, 'dist-admin')),
  MEDIOS: almacenEnDisco(join(raiz, '.local/medios')),
  ARCHIVOS: almacenEnDisco(join(raiz, '.local/archivos')),
};
const puerto = Number(process.env.PUERTO || 8787);

createServer(async (req, res) => {
  const peticion = aWeb(req, new URL(req.url ?? '/', `http://127.0.0.1:${puerto}`));
  // En local la IP es la de la conexión; en Vercel la pone la plataforma.
  peticion.headers.set('x-real-ip', req.socket.remoteAddress ?? '127.0.0.1');
  const r = await manejar(peticion, env, (p) => void p.catch((e) => console.error('[diferido]', e))).catch((e) => {
    console.error('[api] error sin manejar', e);
    return json({ ok: false, error: 'interno' }, 500);
  });
  await responder(r, res, req.method ?? 'GET');
}).listen(puerto, '127.0.0.1', () => console.log(`API en http://127.0.0.1:${puerto} (panel en /admin/)`));
