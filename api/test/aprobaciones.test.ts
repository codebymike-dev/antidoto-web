// Formularios de aprobación de clientes: POST /v1/aprobaciones (desde /form-jv/ del sitio) y su
// pantalla en el panel.
import { describe, test, expect } from 'vitest';
import { prepararPruebas } from './ayudas';
import { validarAprobacion, limpiarNit, FORMULARIO } from '../src/aprobaciones';

const SITIO = 'https://antidotocolombia.com';
const p = prepararPruebas();

const puntos = FORMULARIO.secciones.flatMap((s) => s.puntos.map((x) => x.id));

function cuerpo(cambios: Record<string, unknown> = {}) {
  const respuestas: Record<string, unknown> = Object.fromEntries(puntos.map((id) => [id, { estado: 'aprobado' }]));
  respuestas['p1-3'] = { estado: 'condiciones', nota: 'Solo en southamerica-east1' };
  respuestas['p5-1'] = { estado: 'rechazado', nota: 'Pendiente de legal' };
  return { formulario: 'form-jv', nit: '830112317', nombre: 'Ana Pérez', cargo: 'Gerente de IT', correo: 'ana@empresa.co', fecha: '2026-11-17', observaciones: 'Todo bien', respuestas, ...cambios };
}

const enviar = (c: unknown, origen = SITIO) =>
  p.llamar('/v1/aprobaciones', { method: 'POST', body: JSON.stringify(c), ip: '200.2.2.2', headers: { origin: origen, 'content-type': 'text/plain;charset=UTF-8' } });

describe('validarAprobacion', () => {
  test('acepta el NIT del cliente y el de Antídoto, con o sin puntos y dígito', () => {
    expect(limpiarNit('830.112.317-1')).toBe('830112317');
    expect(validarAprobacion(cuerpo()).ok).toBe(true);
    expect(validarAprobacion(cuerpo({ nit: '901.777.384-6' })).ok).toBe(true);
    expect(validarAprobacion(cuerpo({ nit: '123456789' }))).toEqual({ ok: false, errores: ['nit'] });
  });

  test('exige todos los puntos y el motivo de condiciones y rechazos', () => {
    const c = cuerpo();
    delete (c.respuestas as Record<string, unknown>)['p2-4'];
    (c.respuestas as Record<string, unknown>)['p3-1'] = { estado: 'rechazado' };
    (c.respuestas as Record<string, unknown>)['p9-9'] = { estado: 'aprobado' };
    const r = validarAprobacion(c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toEqual(['p2-4.estado', 'p3-1.nota']);
    expect(validarAprobacion(cuerpo({ nombre: ' ', fecha: 'ayer', correo: 'no' }))).toEqual({ ok: false, errores: ['nombre', 'correo', 'fecha'] });
  });
});

describe('POST /v1/aprobaciones', () => {
  test('solo desde el sitio y con un NIT válido', async () => {
    expect((await enviar(cuerpo(), 'https://otro.com')).status).toBe(403);
    expect((await enviar(cuerpo({ nit: '111' }))).status).toBe(403);
    expect((await enviar(cuerpo({ respuestas: {} }))).status).toBe(422);
  });

  test('guarda, avisa al equipo y se ve en el panel', async () => {
    const antes = p.correos.length;
    const res = await enviar(cuerpo());
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };
    const correo = p.correos.slice(antes).find((c) => c.subject.startsWith('Formulario de aprobación'));
    expect(correo?.text).toContain(`/admin/aprobaciones/${id}`);

    const cookie = await p.entrarComo('aprob@antidotocolombia.com', 'lectura');
    const lista = (await (await p.conSesion(cookie, '/admin/api/aprobaciones')).json()) as { aprobaciones: { id: string; aprobados: number; condiciones: number; rechazados: number }[] };
    expect(lista.aprobaciones[0]).toMatchObject({ id, aprobados: puntos.length - 2, condiciones: 1, rechazados: 1 });

    const ver = (await (await p.conSesion(cookie, `/admin/api/aprobaciones/${id}`)).json()) as { aprobacion: { titulo: string; respuestas: { id: string; texto: string; nota: string | null }[]; ipHash?: string } };
    expect(ver.aprobacion.titulo).toBe(FORMULARIO.titulo);
    expect(ver.aprobacion.respuestas).toHaveLength(puntos.length);
    expect(ver.aprobacion.respuestas.find((r) => r.id === 'p1-3')).toMatchObject({ texto: 'Región autorizada para alojar los datos', nota: 'Solo en southamerica-east1' });
    expect(ver.aprobacion.ipHash).toBeUndefined();

    // Solo lectura no borra; admin sí.
    expect((await p.conSesion(cookie, `/admin/api/aprobaciones/${id}`, { method: 'DELETE' })).status).toBe(403);
    const admin = await p.entrarComo('admin-aprob@antidotocolombia.com', 'admin');
    expect((await p.conSesion(admin, `/admin/api/aprobaciones/${id}`, { method: 'DELETE' })).status).toBe(200);
    expect((await p.conSesion(admin, `/admin/api/aprobaciones/${id}`)).status).toBe(404);
  });

  test('contenido no ve aprobaciones', async () => {
    const cookie = await p.entrarComo('cont-aprob@antidotocolombia.com', 'contenido');
    expect((await p.conSesion(cookie, '/admin/api/aprobaciones')).status).toBe(403);
  });
});
