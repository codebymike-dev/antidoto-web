// API en local: aplica las migraciones a la base de .local/, empaqueta src/plataforma/local.ts con
// esbuild (lo vuelve a empaquetar al guardar) y lo corre con node --watch, que lo reinicia.
import { context } from 'esbuild';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
process.chdir(raiz);
if (existsSync('.env')) process.loadEnvFile('.env');
mkdirSync('.local', { recursive: true });
process.env.TURSO_DATABASE_URL ||= `file:${raiz}.local/antidoto.db`;
execFileSync('node', ['scripts/migrar.mjs'], { stdio: 'inherit' });

const ctx = await context({
  entryPoints: ['src/plataforma/local.ts'],
  outfile: '.local/servidor.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  packages: 'external',
  sourcemap: 'inline',
  logLevel: 'warning',
});
await ctx.rebuild();
await ctx.watch();
const servidor = spawn('node', ['--enable-source-maps', '--watch', '.local/servidor.mjs'], { stdio: 'inherit' });
const salir = () => {
  servidor.kill();
  ctx.dispose().then(() => process.exit(0));
};
process.on('SIGINT', salir);
process.on('SIGTERM', salir);
