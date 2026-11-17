// Formularios de aprobación de clientes (src/aprobaciones.ts): lista, detalle y borrado.
import { listarAprobaciones, verAprobacion, borrarAprobacion } from '../aprobaciones';
import { auditar, sinPermiso, type Ctx } from './contexto';

const RE = /^\/admin\/api\/aprobaciones\/([0-9a-f-]{36})$/;

export async function rutasAprobaciones(c: Ctx): Promise<Response | null> {
  const { ruta, metodo, url, db } = c;
  if (ruta === '/admin/api/aprobaciones' && metodo === 'GET') return sinPermiso(c, 'proyectos.ver') ?? listarAprobaciones(url, db);
  const m = ruta.match(RE);
  if (!m) return null;
  const id = m[1]!;
  if (metodo === 'GET') return sinPermiso(c, 'proyectos.ver') ?? verAprobacion(id, db);
  if (metodo === 'DELETE') return sinPermiso(c, 'datos.suprimir') ?? auditar(c, await borrarAprobacion(id, db), 'aprobacion.borrar', 'aprobacion', id);
  return null;
}
