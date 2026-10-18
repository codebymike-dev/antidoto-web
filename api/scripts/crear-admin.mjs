// Crea (o reactiva como admin) a una persona del equipo. Sin TURSO_DATABASE_URL usa la base local
// de npm run dev (.local/antidoto.db).
// Uso: npm run crear-admin -- correo@dominio.com "Nombre"
import { createClient } from '@libsql/client';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
if (existsSync(`${raiz}.env`)) process.loadEnvFile(`${raiz}.env`);
const [email, nombre] = process.argv.slice(2);
if (!email || !nombre) {
  console.error('Uso: npm run crear-admin -- correo@dominio.com "Nombre"');
  process.exit(1);
}
const db = createClient({ url: process.env.TURSO_DATABASE_URL || `file:${raiz}.local/antidoto.db`, authToken: process.env.TURSO_AUTH_TOKEN });
await db.execute({
  sql: `insert into usuarios (id, email, nombre, rol, activo, creado) values (?, ?, ?, 'admin', 1, ?)
        on conflict (email) do update set rol = 'admin', activo = 1`,
  args: [crypto.randomUUID(), email.trim().toLowerCase(), nombre, Date.now()],
});
console.log(`${email} es admin.`);
db.close();
