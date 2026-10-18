// Aplica las migraciones de migraciones/ que falten, cada una en una transacción, y las anota en
// la tabla migraciones_aplicadas. Lo corren el build de producción de Vercel (Turso) y npm run dev
// (base local en .local/).
// Uso: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run migrar
import { createClient } from '@libsql/client';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error('Falta TURSO_DATABASE_URL');
  process.exit(1);
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
// Bases creadas antes con la tabla de migraciones de otro nombre: se renombra y conserva su historia.
const vieja = await db.execute("select 1 from sqlite_master where type = 'table' and name = 'd1_migrations'");
if (vieja.rows.length) await db.execute('alter table d1_migrations rename to migraciones_aplicadas');
await db.execute(
  'create table if not exists migraciones_aplicadas (id integer primary key autoincrement, name text unique, applied_at timestamp default current_timestamp not null)',
);
const hechas = new Set((await db.execute('select name from migraciones_aplicadas')).rows.map((f) => String(f.name)));
const dir = fileURLToPath(new URL('../migraciones/', import.meta.url));
const pendientes = readdirSync(dir).filter((f) => f.endsWith('.sql') && !hechas.has(f)).sort();
for (const archivo of pendientes) {
  const sentencias = readFileSync(`${dir}${archivo}`, 'utf8').split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);
  // Una migración entera o nada.
  await db.batch([...sentencias, { sql: 'insert into migraciones_aplicadas (name) values (?)', args: [archivo] }], 'write');
  console.log(`Aplicada ${archivo}`);
}
console.log(pendientes.length ? `${pendientes.length} migraciones aplicadas.` : 'Sin migraciones pendientes.');
db.close();
