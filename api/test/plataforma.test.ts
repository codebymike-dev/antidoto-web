// La API en Vercel (src/plataforma/): ruta original de la función, variables, Env, archivos del
// panel desde el disco y almacén en disco para local y pruebas.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assetsDesdeDisco } from '../src/plataforma/assets-fs';
import { almacenEnDisco } from '../src/plataforma/almacen-disco';
import { urlOriginal } from '../src/plataforma/entrada-node';
import { VARS, entornoVercel, variables } from '../src/plataforma/vercel';

describe('API en Vercel', () => {
  it('recupera la ruta original de la función', () => {
    expect(urlOriginal('api.x', '/index?__ruta=admin/api/leads&q=1').href).toBe('https://api.x/admin/api/leads?q=1');
    expect(urlOriginal('api.x', '/index?__ruta=').pathname).toBe('/');
    expect(urlOriginal('api.x', '/v1/leads?__ruta=v1/leads').pathname).toBe('/v1/leads');
    expect(urlOriginal('api.x', '/v1/leads').pathname).toBe('/v1/leads');
  });

  it('las variables del entorno reemplazan los valores por defecto', () => {
    const v = variables({ ORIGENES: 'https://a.co', SAL_IP: 'sal', OTRA: 'x' });
    expect(v.ORIGENES).toBe('https://a.co');
    expect(v.SAL_IP).toBe('sal');
    expect(v.MAIL_FROM).toBe(VARS.MAIL_FROM);
    expect('OTRA' in v).toBe(false);
  });

  it('arma el Env con Turso, Blob y las variables de Vercel', () => {
    const p = { TURSO_DATABASE_URL: 'libsql://x.turso.io', BLOB_STORE_ID: 's', ORIGENES: 'https://a.co', SAL_IP: 'sal' };
    const e = entornoVercel(p);
    expect(e.ORIGENES).toBe('https://a.co');
    expect(e.SAL_IP).toBe('sal');
    expect(e.MAIL_FROM).toBe(VARS.MAIL_FROM);
    expect(e.MEDIOS && e.ARCHIVOS && e.SUBIDA).toBeTruthy();
    expect(entornoVercel({ TURSO_DATABASE_URL: 'libsql://x.turso.io' }).SUBIDA).toBeUndefined();
    expect(() => entornoVercel({})).toThrow('TURSO_DATABASE_URL');
  });
});

describe('Panel desde el disco', () => {
  const assets = assetsDesdeDisco(fileURLToPath(new URL('../dist-admin', import.meta.url)));

  it('sirve los archivos construidos con su tipo', async () => {
    const r = await assets.fetch(new Request('https://api.x/admin/index.html'));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/html');
  });

  it('no sale de dist-admin', async () => {
    expect((await assets.fetch(new Request('https://api.x/admin/%2e%2e/%2e%2e/package.json'))).status).toBe(404);
    expect((await assets.fetch(new Request('https://api.x/admin/no-existe.js'))).status).toBe(404);
  });
});

describe('Almacén en disco', () => {
  it('guarda, lee con su tipo y borra', async () => {
    const a = almacenEnDisco(mkdtempSync(join(tmpdir(), 'antidoto-alm-')));
    await a.put('proyectos/p/1', new TextEncoder().encode('hola'), { contentType: 'text/plain' });
    const o = await a.get('proyectos/p/1');
    expect(o).toMatchObject({ size: 4, contentType: 'text/plain' });
    expect(await new Response(o!.body).text()).toBe('hola');
    await a.delete(['proyectos/p/1']);
    expect(await a.get('proyectos/p/1')).toBeNull();
  });

  it('no sale de su carpeta', async () => {
    const a = almacenEnDisco(mkdtempSync(join(tmpdir(), 'antidoto-alm-')));
    await expect(a.put('../fuera', new Uint8Array([1]))).rejects.toThrow('fuera del almacén');
    expect(await a.get('../../etc/passwd')).toBeNull();
  });
});
