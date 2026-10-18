// Build de Vercel: el sitio y la API en un solo proyecto y un solo despliegue, con la Build Output
// API (v3). El sitio (dist/) va como archivos estáticos y la API como una función Node que atiende
// /v1/, /admin/, /portal/, /auth/ y /salud (rutas que el sitio no usa). Vercel publica
// .vercel/output tal cual, así que las redirecciones y cabeceras del sitio viven aquí y no en
// vercel.json.
//
// La API solo entra si el proyecto tiene la base (TURSO_DATABASE_URL, solo en Production): sin
// ella, como en las vistas previas, sale el sitio solo, sin PUBLIC_API_URL. Con la API, el sitio se
// construye con PUBLIC_API_URL en el dominio del despliegue y lee el contenido del panel de la
// misma función levantada en local (CMS_API_URL), porque la API nueva todavía no está publicada.
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const salida = `${raiz}.vercel/output`;
const conApi = !!process.env.TURSO_DATABASE_URL;

/** Rutas de la API. Todo lo demás es del sitio. */
const API = '(?:v1|auth)/|(?:admin|portal|salud)(?:/|$)';

rmSync(salida, { recursive: true, force: true });
mkdirSync(salida, { recursive: true });

const env = { ...process.env };
let servidor = null;

if (conApi) {
  // Panel, conocimiento del asesor, migraciones de producción y la función.
  execFileSync('npm', ['run', 'vercel-build', '--prefix', 'api', '--', salida], { cwd: raiz, stdio: 'inherit' });

  const publica = process.env.PUBLIC_API_URL
    || `https://${process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL}`;
  env.PUBLIC_API_URL = publica.replace(/\/$/, '');

  // La función en este mismo proceso, en un puerto local, para el cargador del CMS. Las imágenes
  // que publica el panel salen con la URL local (APP_URL) para que el build las pueda bajar.
  const { default: manejador } = await import(pathToFileURL(`${salida}/functions/_api.func/index.mjs`).href);
  servidor = createServer((req, res) => {
    manejador(req, res).catch((e) => {
      console.error(e);
      res.statusCode = 500;
      res.end();
    });
  });
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const local = `http://127.0.0.1:${servidor.address().port}`;
  process.env.APP_URL = local;
  env.CMS_API_URL = local;
} else {
  console.warn('Sin TURSO_DATABASE_URL: se publica el sitio sin la API.');
  delete env.PUBLIC_API_URL;
}

// El sitio. Asíncrono: la función local tiene que seguir respondiendo mientras Astro construye.
await new Promise((listo, fallo) => {
  spawn('npm', ['run', 'build'], { cwd: raiz, env, stdio: 'inherit' }).on('exit', (codigo) =>
    codigo === 0 ? listo() : fallo(new Error(`El build del sitio terminó con código ${codigo}`)),
  );
});
servidor?.close();

cpSync(`${raiz}dist`, `${salida}/static`, { recursive: true });

const seguridad = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Origin-Agent-Cluster': '?1',
  'Content-Security-Policy-Report-Only':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self' https://*.vercel.app; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.vercel.app; object-src 'none'; frame-src 'none'; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests",
};

const rutas = [
  // www a sin www.
  { src: '^/(.*)$', has: [{ type: 'host', value: 'www.antidotocolombia.com' }], status: 308, headers: { Location: 'https://antidotocolombia.com/$1' } },
  // trailingSlash del sitio: /ruta a /ruta/ (no toca archivos con extensión ni la API).
  { src: `^/((?!${API})(?:[^/]+/)*[^/.]+)$`, status: 308, headers: { Location: '/$1/' } },
  // Cabeceras de seguridad del sitio. La API pone las suyas (src/panel.ts).
  { src: `^/(?!${API}).*$`, headers: seguridad, continue: true },
  { src: '^/.*$', has: [{ type: 'host', value: '.*\\.vercel\\.app' }], headers: { 'X-Robots-Tag': 'noindex' }, continue: true },
  { src: '^/_astro/.*$', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
  { src: '^/fonts/.*$', headers: { 'Cache-Control': 'public, max-age=2592000' }, continue: true },
  { src: '^/(?:sw\\.js|site\\.webmanifest)$', headers: { 'Cache-Control': 'no-cache' }, continue: true },
  { handle: 'filesystem' },
  // La API, con la ruta original en __ruta (api/src/plataforma/entrada-node.ts).
  ...(conApi ? [{ src: `^/((?:${API}).*)$`, dest: '/_api?__ruta=$1' }] : []),
  { handle: 'error' },
  { src: '^/.*$', status: 404, dest: '/404.html' },
];

writeFileSync(`${salida}/config.json`, JSON.stringify({ version: 3, routes: rutas }, null, 2));
console.log(conApi ? `Sitio y API listos en .vercel/output (PUBLIC_API_URL=${env.PUBLIC_API_URL})` : 'Sitio listo en .vercel/output');
