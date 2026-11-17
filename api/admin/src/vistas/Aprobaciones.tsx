// Formularios de aprobación que llenan los clientes desde el sitio (por ahora /form-jv/, el
// checklist de IT de la plataforma de inspecciones SST). Cada envío queda como una fila; si la
// persona corrige y vuelve a enviar, aparecen las dos.
import { api, mensajeError, useDatos } from '../api';
import { navegar, ponerQuery, useUbicacion } from '../ruteo';
import { usePuede } from '../sesion';
import { cuenta, fecha, fechaLarga, hace } from '../formato';
import { Boton, Cabecera, Cargando, Datos, FalloCarga, Insignia, Paginacion, PanelLateral, Seccion, Vacio } from '../ui/base';
import { avisar, confirmar } from '../ui/dialogos';

type Estado = 'aprobado' | 'condiciones' | 'rechazado';
const ESTADO: Record<Estado, { texto: string; tono: string }> = {
  aprobado: { texto: 'Aprobado', tono: 'exito' },
  condiciones: { texto: 'Con condiciones', tono: 'alerta' },
  rechazado: { texto: 'Rechazado', tono: 'peligro' },
};

interface Fila {
  id: string;
  creado: number;
  nit: string;
  nombre: string;
  cargo: string;
  correo: string | null;
  fecha: string;
  aprobados: number;
  condiciones: number;
  rechazados: number;
}
interface Respuesta {
  id: string;
  seccion: string;
  texto: string;
  estado: Estado;
  nota: string | null;
}
interface Detalle extends Fila {
  titulo: string;
  observaciones: string | null;
  userAgent: string | null;
  respuestas: Respuesta[];
}

const conteo = (f: Pick<Fila, 'aprobados' | 'condiciones' | 'rechazados'>) => (
  <span class="chat-notas">
    <Insignia tono="exito">{cuenta(f.aprobados, 'aprobado', 'aprobados')}</Insignia>
    {f.condiciones > 0 && <Insignia tono="alerta">{cuenta(f.condiciones, 'con condiciones', 'con condiciones')}</Insignia>}
    {f.rechazados > 0 && <Insignia tono="peligro">{cuenta(f.rechazados, 'rechazado', 'rechazados')}</Insignia>}
  </span>
);

export default function Aprobaciones({ params }: { params: string[] }) {
  const abierta = params[0] ?? null;
  const { query } = useUbicacion();
  const pagina = Number(query.get('pagina')) || 0;
  const d = useDatos<{ aprobaciones: Fila[]; total: number; pagina: number; porPagina: number }>(`/admin/api/aprobaciones${pagina ? `?pagina=${pagina}` : ''}`);
  const sufijo = location.search;

  return (
    <>
      <Cabecera
        titulo="Aprobaciones"
        descripcion="Formularios de aprobación que responden los clientes desde el sitio. Por ahora: el checklist de IT de la plataforma de inspecciones SST (/form-jv/)."
      />
      <div class={`dividido${abierta ? ' con-lateral' : ''}`}>
        <div class="tarjeta sin-relleno lista">
          {d.error ? (
            <FalloCarga error={d.error} reintentar={d.recargar} />
          ) : !d.datos ? (
            <Cargando />
          ) : !d.datos.aprobaciones.length ? (
            <Vacio titulo="Todavía no hay respuestas">Cuando el cliente envíe el formulario desde el sitio, aparece aquí.</Vacio>
          ) : (
            <ul class={`lista-filas${d.cargando ? ' recargando' : ''}`}>
              {d.datos.aprobaciones.map((a) => (
                <li class={a.id === abierta ? 'activa' : ''}>
                  <a class="lf-enlace" href={`/admin/aprobaciones/${a.id}${sufijo}`}>
                    <span class="lf-principal">
                      <span class="lf-titulo">
                        {a.nombre}, {a.cargo}
                      </span>
                      <span class="lf-sub">
                        NIT {a.nit} · {conteoTexto(a)}
                      </span>
                    </span>
                    <ResultadoGeneral f={a} />
                    <span class="lf-meta">{hace(a.creado)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {d.datos && <Paginacion total={d.datos.total} pagina={d.datos.pagina} porPagina={d.datos.porPagina} alCambiar={(p) => ponerQuery({ pagina: p })} />}
        </div>
        {abierta && <VerAprobacion key={abierta} id={abierta} alCerrar={() => navegar(`/admin/aprobaciones${sufijo}`)} alBorrar={d.recargar} />}
      </div>
    </>
  );
}

const conteoTexto = (f: Fila) =>
  [cuenta(f.aprobados, 'aprobado', 'aprobados'), f.condiciones ? `${f.condiciones} con condiciones` : null, f.rechazados ? cuenta(f.rechazados, 'rechazado', 'rechazados') : null].filter(Boolean).join(', ');

function ResultadoGeneral({ f }: { f: Pick<Fila, 'condiciones' | 'rechazados'> }) {
  if (f.rechazados) return <Insignia tono="peligro">Con rechazos</Insignia>;
  if (f.condiciones) return <Insignia tono="alerta">Con condiciones</Insignia>;
  return <Insignia tono="exito">Todo aprobado</Insignia>;
}

function VerAprobacion({ id, alCerrar, alBorrar }: { id: string; alCerrar: () => void; alBorrar: () => void }) {
  const d = useDatos<{ aprobacion: Detalle }>(`/admin/api/aprobaciones/${id}`);
  const puede = usePuede();
  if (d.error) return <PanelLateral titulo="Aprobación" alCerrar={alCerrar}><FalloCarga error={d.error} /></PanelLateral>;
  if (!d.datos) return <PanelLateral titulo="Aprobación" alCerrar={alCerrar}><Cargando /></PanelLateral>;
  const a = d.datos.aprobacion;

  const secciones: { titulo: string; respuestas: Respuesta[] }[] = [];
  for (const r of a.respuestas) {
    const ultima = secciones[secciones.length - 1];
    if (ultima?.titulo === r.seccion) ultima.respuestas.push(r);
    else secciones.push({ titulo: r.seccion, respuestas: [r] });
  }

  const borrar = async () => {
    if (!(await confirmar({ titulo: 'Borrar respuesta', texto: 'Se borra este envío del formulario con todas sus respuestas. No se puede deshacer.', confirmar: 'Borrar', peligro: true }))) return;
    try {
      await api(`/admin/api/aprobaciones/${id}`, { method: 'DELETE' });
      avisar('Respuesta borrada', 'exito');
      alBorrar();
      alCerrar();
    } catch (e) {
      avisar(mensajeError(e), 'error');
    }
  };

  return (
    <PanelLateral etiqueta={a.titulo} titulo={`${a.nombre}, ${a.cargo}`} alCerrar={alCerrar} ancho="ancho">
      <div class="ficha-estado">
        <ResultadoGeneral f={a} />
        {conteo(a)}
      </div>
      <Seccion titulo="Datos">
        <Datos
          filas={[
            ['Responsable', a.nombre],
            ['Cargo', a.cargo],
            ['Correo', a.correo ? <a href={`mailto:${a.correo}`}>{a.correo}</a> : null],
            ['NIT', a.nit],
            ['Fecha del formulario', a.fecha],
            ['Enviado', fechaLarga(a.creado)],
          ]}
        />
      </Seccion>
      {secciones.map((s, i) => (
        <Seccion titulo={`${i + 1}. ${s.titulo}`}>
          <ol class="aprob-puntos">
            {s.respuestas.map((r) => (
              <li class="aprob-punto">
                <div class="aprob-fila">
                  <span class="aprob-texto">
                    <span class="aprob-num">{r.id.slice(1).replace('-', '.')}</span>
                    {r.texto}
                  </span>
                  <Insignia tono={ESTADO[r.estado].tono}>{ESTADO[r.estado].texto}</Insignia>
                </div>
                {r.nota && <p class="mensaje">{r.nota}</p>}
              </li>
            ))}
          </ol>
        </Seccion>
      ))}
      <Seccion titulo="Observaciones generales">
        {a.observaciones ? <p class="mensaje">{a.observaciones}</p> : <p class="suave">Sin observaciones.</p>}
      </Seccion>
      <p class="suave">Enviado el {fecha(a.creado, true)}.</p>
      {puede('datos.suprimir') && (
        <Boton variante="peligro" chico onClick={borrar}>
          Borrar respuesta
        </Boton>
      )}
    </PanelLateral>
  );
}
