// Escena 3D de "Construye en equipo": la obra de modelo.ts armándose sola según guion.ts.
// La geometría es la del constructor de la plataforma de misiones (../antidoto,
// src/components/bricks/part-geometry.ts): cuerpo biselado, studs torneados, inclinadas
// extruidas, redondas torneadas y ventanas con el vidrio aparte. Sin postproceso ni oclusión
// ambiental (pesan y aquí no se mira de cerca): luz de estudio, sombras y entorno procedural.
//
// Este módulo trae three (con la escena, unos 146 KB gzip): se importa solo después de `load` y cuando la
// sección se acerca a la pantalla (src/lib/motion/fichas.ts), nunca en la carga inicial.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BASE, COLORES, COLOR_BASE, MEDIDAS, OBRA, PIEZAS, altoObra, tieneStud, type ClavePieza, type Ficha } from './modelo';
import { estadoEn, instanteCompleto } from './guion';

const { placa: PLACA, holgura: HOLGURA, bisel: BISEL } = MEDIDAS;

/** Caja biselada con la esquina mínima en (x, y, z). */
function caja(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const g = new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(BISEL, Math.min(sx, sy, sz) / 2.5));
  g.translate(x + sx / 2, y + sy / 2, z + sz / 2);
  return g;
}

/** Stud con canto redondeado, centrado en su celda y apoyado en y = 0. */
function stud(): THREE.BufferGeometry {
  const { studR: r, studH: h } = MEDIDAS;
  const b = 0.35 / 8;
  const pts = [new THREE.Vector2(0, h)];
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.sin(a) * b, h - b + Math.cos(a) * b));
  }
  pts.push(new THREE.Vector2(r, 0));
  const g = new THREE.LatheGeometry(pts, 14);
  g.translate(0.5, 0, 0.5);
  return g;
}

/** Inclinada de 45°: la fila del fondo (z de 0 a 1) es plana y la rampa baja hacia el frente. */
function inclinada(w: number, d: number, h: number) {
  const H = h * PLACA;
  const labio = PLACA * 0.8;
  const b = BISEL;
  const z0 = HOLGURA + b;
  const z1 = d - HOLGURA - b;
  const zAlto = 1 - HOLGURA;
  const forma = new THREE.Shape([
    new THREE.Vector2(-z0, b),
    new THREE.Vector2(-z1, b),
    new THREE.Vector2(-z1, labio - b),
    new THREE.Vector2(-zAlto, H - b),
    new THREE.Vector2(-z0, H - b),
  ]);
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: w - 2 * HOLGURA - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 1,
    steps: 1,
  });
  g.rotateY(Math.PI / 2);
  g.translate(HOLGURA + b, 0, 0);
  return g;
}

/** Torneado con los cantos redondeados, centrado en su huella. */
function redonda(w: number, d: number, h: number) {
  const H = h * PLACA;
  const r = Math.min(w, d) / 2 - HOLGURA;
  const b = BISEL * 1.4;
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.sin(a) * b, b - Math.cos(a) * b));
  }
  for (let i = 0; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - b + Math.cos(a) * b, H - b + Math.sin(a) * b));
  }
  pts.push(new THREE.Vector2(0, H));
  const g = new THREE.LatheGeometry(pts, 24);
  g.translate(w / 2, 0, d / 2);
  return g;
}

/** Marco de ventana: dintel, alféizar y dos jambas. El vidrio va aparte, translúcido. */
function ventana(w: number, d: number, h: number) {
  const W = w - 2 * HOLGURA;
  const D = d - 2 * HOLGURA;
  const H = h * PLACA;
  const jamba = 0.2;
  const dintel = 0.32;
  const x0 = HOLGURA;
  const z0 = HOLGURA;
  const cuerpo = [
    caja(x0, H - dintel, z0, W, dintel, D),
    caja(x0, 0, z0, W, dintel, D),
    caja(x0, dintel, z0, jamba, H - 2 * dintel, D),
    caja(x0 + W - jamba, dintel, z0, jamba, H - 2 * dintel, D),
  ];
  const vidrio = new THREE.BoxGeometry(W - 2 * jamba, H - 2 * dintel, 0.06);
  vidrio.translate(x0 + W / 2, H / 2, z0 + D / 2);
  return { cuerpo, vidrio };
}

/** Sin índice y solo con posición y normal: así se pueden fundir piezas de origen distinto. */
const plana = (g: THREE.BufferGeometry) => {
  const out = g.index ? g.toNonIndexed() : g;
  for (const nombre of Object.keys(out.attributes)) if (nombre !== 'position' && nombre !== 'normal') out.deleteAttribute(nombre);
  if (!out.attributes.normal) out.computeVertexNormals();
  return out;
};

const fundir = (gs: THREE.BufferGeometry[]) => {
  const planas = gs.map(plana);
  const g = mergeGeometries(planas, false)!;
  gs.forEach((x) => x.dispose());
  planas.forEach((x) => x.dispose());
  return g;
};

/** Cuerpo con sus studs y, si la tiene, el vidrio, de una ficha sin girar. */
function geometria(clave: ClavePieza, base: THREE.BufferGeometry) {
  const p = PIEZAS[clave];
  const partes: THREE.BufferGeometry[] = [];
  let vidrio: THREE.BufferGeometry | undefined;
  if (p.tipo === 'inclinada') partes.push(inclinada(p.w, p.d, p.h));
  else if (p.tipo === 'redonda') partes.push(redonda(p.w, p.d, p.h));
  else if (p.tipo === 'ventana') {
    const v = ventana(p.w, p.d, p.h);
    partes.push(...v.cuerpo);
    vidrio = v.vidrio;
  } else partes.push(caja(HOLGURA, 0, HOLGURA, p.w - 2 * HOLGURA, p.h * PLACA, p.d - 2 * HOLGURA));
  // Los studs van sobre la pieza sin girar; la media vuelta de la escena los lleva con ella (la
  // inclinada girada queda con su fila alta al frente, como dice tieneStud).
  const ficha: Ficha = { pieza: clave, color: 'blanco', x: 0, y: 0, z: 0 };
  for (let k = 0; k < p.d; k++)
    for (let i = 0; i < p.w; i++)
      if (tieneStud(ficha, i, k)) partes.push(base.clone().translate(i, p.h * PLACA, k));
  return { cuerpo: fundir(partes), vidrio: vidrio ? plana(vidrio) : undefined };
}

export interface OpcionesObra {
  /** Avisa cada vez que cambia el número de fichas encajadas (el contador de la sección). */
  alPoner?: (puestas: number, total: number) => void;
}

/** Una ficha en escena: el grupo se mueve con el guion; dentro va la malla en su lugar. */
interface Viva {
  grupo: THREE.Group;
  /** Centro de la huella en la base de la ficha: el punto alrededor del que se encoge al irse. */
  centro: THREE.Vector3;
}

export class EscenaObra {
  readonly renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
  private luz = new THREE.DirectionalLight('#FFF8EE', 2.6);
  private vivas: Viva[] = [];
  private desechables: { dispose(): void }[] = [];
  private centro: THREE.Vector3;
  private puestas = -1;

  constructor(
    lienzo: HTMLCanvasElement,
    private opciones: OpcionesObra = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // Entorno de estudio procedural: el plástico refleja algo y los colores se ven vivos.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.escena.environment = entorno;
    this.escena.environmentIntensity = 0.5;
    this.desechables.push(entorno);

    this.centro = new THREE.Vector3(BASE / 2, altoObra() * PLACA * 0.18, BASE / 2);

    const span = BASE * 1.2;
    this.luz.position.set(this.centro.x + span * 0.35, span * 1.1, this.centro.z + span * 0.55);
    this.luz.target.position.set(this.centro.x, 0, this.centro.z);
    this.luz.castShadow = true;
    this.luz.shadow.mapSize.set(1024, 1024);
    this.luz.shadow.bias = -0.0005;
    this.luz.shadow.normalBias = 0.03;
    this.luz.shadow.radius = 4;
    Object.assign(this.luz.shadow.camera, { left: -span * 0.6, right: span * 0.6, top: span * 0.6, bottom: -span * 0.6, near: 1, far: span * 3 });
    const relleno = new THREE.DirectionalLight(0xffffff, 0.4);
    relleno.position.set(this.centro.x - span, span * 0.5, this.centro.z - span * 0.4);
    this.escena.add(this.luz, this.luz.target, relleno, new THREE.HemisphereLight(0xffffff, 0xdce7ec, 0.35));

    this.armar();
  }

  private material(hex: string) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.3, metalness: 0 });
    this.desechables.push(m);
    return m;
  }

  private armar() {
    const base = stud();
    this.desechables.push(base);
    const mats = new Map<string, THREE.Material>();
    const mat = (hex: string) => mats.get(hex) ?? mats.set(hex, this.material(hex)).get(hex)!;
    const vidrio = new THREE.MeshPhysicalMaterial({ color: '#CFEFFA', roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
    this.desechables.push(vidrio);

    // La placa base con sus studs.
    const studs: THREE.BufferGeometry[] = [caja(HOLGURA, -PLACA * 1.5, HOLGURA, BASE - 2 * HOLGURA, PLACA * 1.5, BASE - 2 * HOLGURA)];
    for (let k = 0; k < BASE; k++) for (let i = 0; i < BASE; i++) studs.push(base.clone().translate(i, 0, k));
    const gBase = fundir(studs);
    this.desechables.push(gBase);
    const placaBase = new THREE.Mesh(gBase, this.material(COLOR_BASE));
    placaBase.receiveShadow = true;
    this.escena.add(placaBase);

    const cache = new Map<string, ReturnType<typeof geometria>>();
    for (const f of OBRA) {
      const p = PIEZAS[f.pieza];
      const clave = f.pieza;
      let g = cache.get(clave);
      if (!g) {
        g = geometria(clave, base);
        cache.set(clave, g);
        this.desechables.push(g.cuerpo);
        if (g.vidrio) this.desechables.push(g.vidrio);
      }
      const malla = new THREE.Mesh(g.cuerpo, mat(COLORES[f.color]));
      malla.castShadow = true;
      malla.receiveShadow = true;
      const interior = new THREE.Group();
      interior.add(malla);
      if (g.vidrio) interior.add(new THREE.Mesh(g.vidrio, vidrio));
      // Media vuelta dentro de la misma huella.
      if (f.giro) {
        interior.rotation.y = Math.PI;
        interior.position.set(p.w, 0, p.d);
      }
      // El grupo exterior se ancla en el centro de la huella, al pie de la ficha, para encogerla
      // hacia ese punto al desarmar.
      const centro = new THREE.Vector3(f.x + p.w / 2, f.y * PLACA, f.z + p.d / 2);
      interior.position.x -= p.w / 2;
      interior.position.z -= p.d / 2;
      const grupo = new THREE.Group();
      grupo.position.copy(centro);
      grupo.add(interior);
      grupo.visible = false;
      this.escena.add(grupo);
      this.vivas.push({ grupo, centro });
    }
  }

  /** Ajusta el lienzo a su tamaño en pantalla y encuadra la obra. */
  ajustar(ancho: number, alto: number) {
    if (!ancho || !alto) return;
    this.renderer.setSize(ancho, alto, false);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
  }

  /** Pinta el instante t (segundos) del bucle. */
  pintar(t: number) {
    const { fichas, puestas } = estadoEn(t, this.vivas.length);
    fichas.forEach((e, i) => {
      const v = this.vivas[i];
      v.grupo.visible = e.visible && e.escala > 0.01;
      v.grupo.position.set(v.centro.x, v.centro.y + e.dy, v.centro.z);
      v.grupo.scale.setScalar(Math.max(0.001, e.escala));
    });
    if (puestas !== this.puestas) {
      this.puestas = puestas;
      this.opciones.alPoner?.(puestas, this.vivas.length);
    }
    this.encuadrar(t);
    this.renderer.render(this.escena, this.camara);
  }

  /** El instante del bucle que muestra la foto quieta: la obra completa. */
  instantePoster() {
    return instanteCompleto(this.vivas.length);
  }

  /** La obra completa y quieta: el cuadro del póster. */
  pintarCompleta() {
    this.pintar(this.instantePoster());
  }

  /**
   * Cámara de tres cuartos que se mece despacio alrededor de la obra. La distancia sale del campo
   * angosto (en un lienzo vertical, el horizontal) para que la base quepa siempre.
   */
  private encuadrar(t: number) {
    const angulo = Math.PI / 4 + 0.32 * Math.sin((t / 22) * Math.PI * 2);
    const elev = 0.62;
    const vMedio = THREE.MathUtils.degToRad(this.camara.fov / 2);
    const hMedio = Math.atan(Math.tan(vMedio) * this.camara.aspect);
    const radio = BASE * 0.7;
    const dist = radio / Math.sin(Math.min(vMedio, hMedio));
    this.camara.position.set(
      this.centro.x + Math.sin(angulo) * Math.cos(elev) * dist,
      this.centro.y + Math.sin(elev) * dist,
      this.centro.z + Math.cos(angulo) * Math.cos(elev) * dist,
    );
    this.camara.lookAt(this.centro);
  }

  liberar() {
    this.desechables.forEach((d) => d.dispose());
    this.renderer.dispose();
  }
}
