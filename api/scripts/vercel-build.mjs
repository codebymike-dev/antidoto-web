// La función de la API para la Build Output API (v3) de Vercel: una sola función Node con todo el
// código empaquetado por esbuild y los archivos del panel (dist-admin/) a su lado. Sin tareas
// programadas (src/pendientes.ts). La arma en <salida>/functions/_api.func (por defecto
// api/.vercel/output); scripts/vercel-build.mjs de la raíz la junta con el sitio en un solo
// despliegue y escribe las rutas. Lo corre `npm run vercel-build`, después de construir el panel y
// el conocimiento del asesor.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const salida = process.argv[2] ?? `${raiz}.vercel/output`;
const funcion = `${salida}/functions/_api.func`;

// Migraciones de la base (Turso) solo en el despliegue de producción: las vistas previas no tocan
// la base de producción.
if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.TURSO_DATABASE_URL) throw new Error('Falta TURSO_DATABASE_URL en producción');
  execFileSync('node', [`${raiz}scripts/migrar.mjs`], { stdio: 'inherit' });
}

rmSync(funcion, { recursive: true, force: true });
mkdirSync(funcion, { recursive: true });

await build({
  entryPoints: [`${raiz}src/plataforma/entrada-node.ts`],
  outfile: `${funcion}/index.mjs`,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: 'linked',
  // Algunas dependencias son CommonJS y usan require: en un módulo ES hay que dárselo.
  banner: { js: "import { createRequire as __crearRequire } from 'node:module'; const require = __crearRequire(import.meta.url);" },
  logLevel: 'warning',
});

cpSync(`${raiz}dist-admin`, `${funcion}/dist-admin`, { recursive: true });

writeFileSync(
  `${funcion}/.vc-config.json`,
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, supportsResponseStreaming: true, maxDuration: 60 }, null, 2),
);
writeFileSync(`${funcion}/package.json`, JSON.stringify({ type: 'module' }));

console.log(`Función de la API lista en ${funcion}`);
