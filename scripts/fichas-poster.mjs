// Genera la foto quieta de "Construye en equipo" (src/assets/fichas/obra.png): la obra completa
// tal como la pinta la escena 3D (src/lib/fichas/escena.ts). Es lo que se ve antes de que cargue
// three, sin JS, sin WebGL o con movimiento reducido. Uso: npm run fichas:poster
//
// Empaqueta la escena con esbuild, la abre en Chromium sin pantalla con WebGL por software
// (SwiftShader) y guarda el cuadro. Si el Chromium de Playwright no está instalado, pasa otro con
// CHROMIUM=/ruta/al/chrome.
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const ANCHO = 1200;
const ALTO = 960;
const salida = new URL('../src/assets/fichas/obra.png', import.meta.url);

const { outputFiles } = await build({
  stdin: {
    contents: `
      import { EscenaObra } from './src/lib/fichas/escena.ts';
      const lienzo = document.querySelector('canvas');
      const escena = new EscenaObra(lienzo);
      escena.renderer.setPixelRatio(1);
      escena.ajustar(${ANCHO}, ${ALTO});
      escena.pintarCompleta();
      window.listo = lienzo.toDataURL('image/png');
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  write: false,
});

const navegador = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const pagina = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 1 });
  pagina.on('pageerror', (e) => console.error(e));
  await pagina.setContent(`<!doctype html><canvas width="${ANCHO}" height="${ALTO}" style="width:${ANCHO}px;height:${ALTO}px"></canvas>`);
  // preserveDrawingBuffer no hace falta: el cuadro se lee en la misma tarea en que se pinta.
  await pagina.addScriptTag({ content: outputFiles[0].text, type: 'module' });
  const url = await pagina.waitForFunction(() => window.listo, null, { timeout: 60_000 }).then((h) => h.jsonValue());
  mkdirSync(new URL('.', salida), { recursive: true });
  const datos = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(salida, datos);
  console.log(`src/assets/fichas/obra.png: ${datos.length} bytes`);
} finally {
  await navegador.close();
}
