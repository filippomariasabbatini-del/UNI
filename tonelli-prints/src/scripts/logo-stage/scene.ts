import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  Plane,
  PointLight,
  Raycaster,
  RingGeometry,
  Scene,
  Shape,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CHIP_RADIUS,
  HEIGHT,
  LAYERS,
  POCKET,
  type SectionKind,
  bedTexture,
  hotEdgeTexture,
  layerBump,
  logoBody,
  logoPerimeter,
  logoSection,
  logoShape,
  sectionTexture,
} from './logo';

/** Tutto ciò che la timeline anima. La scena è una funzione pura di questo stato (più il tempo, per il galleggiamento). */
export interface StageState {
  /** Quota di stampa, da 0 a HEIGHT */
  z: number;
  /** Bordo caldo dello strato attivo, 0..1 */
  hot: number;
  /** Giri dell'ugello lungo il perimetro */
  travel: number;
  /** 0 = ugello in alto fuori scena, 1 = sul pezzo */
  nozzle: number;
  /** 0 = l'ugello segue il perimetro, 1 = parcheggiato di lato */
  park: number;
  /** 0 = tag in alto, 1 = nella sede */
  chip: number;
  /** Onda di conferma dopo l'inserimento, 0..1 */
  pulse: number;
  /** Opacità di piatto e ugello */
  printer: number;
  /** 0 = pezzo sul piatto, 1 = sollevato e in piedi */
  lift: number;
  /** Camera: 0 = tre quarti, 1 = dall'alto sulla sede */
  zoom: number;
  /** Camera: 1 = frontale sul prodotto finito */
  front: number;
}

/** Interazione in fase 4: rotazione data dall'utente e raggi X */
export interface StageView {
  yaw: number;
  pitch: number;
  xray: number;
}

export interface Palette {
  hot: string;
  bed: string;
  bedLine: string;
  brass: string;
  copper: string;
  steel: string;
  ink: string;
  chip: string;
}

export interface Look {
  color: string;
  roughness: number;
  metalness: number;
  /** Rilievo delle linee di layer */
  bump: number;
}

const CHIP_THICKNESS = 0.028;
const XRAY_RADIUS = POCKET.radius * 1.35;
const PARK = new Vector3(1.55, 0.75, 0.95);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export type StageScene = ReturnType<typeof createScene>;

export function createScene(canvas: HTMLCanvasElement, palette: Palette) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    // Niente rendering software: lì resta il logo statico
    failIfMajorPerformanceCaveat: true,
  });
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = NeutralToneMapping;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new PerspectiveCamera(30, 1, 0.1, 40);
  scene.add(new HemisphereLight('#ffffff', '#d9cfc2', 0.45));
  const key = new DirectionalLight('#fff0dc', 2.2);
  key.position.set(-2.4, 5, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2.4;
  key.shadow.camera.right = 2.4;
  key.shadow.camera.top = 2.4;
  key.shadow.camera.bottom = -2.4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 12;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  scene.add(key);

  // Piano di taglio: tutto ciò che sta sopra la quota di stampa non esiste ancora
  const cut = new Plane(new Vector3(0, -1, 0), 0);
  const xray = { value: 0 };

  /** Raggi X: il materiale diventa trasparente in un cerchio attorno al tag. */
  const withXray = (material: MeshStandardMaterial): MeshStandardMaterial => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms['uXray'] = xray;
      shader.uniforms['uChip'] = { value: new Vector3(POCKET.x, POCKET.y, XRAY_RADIUS) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform float uXray;\nuniform vec3 uChip;\nvarying vec3 vLocal;',
        )
        .replace(
          '#include <dithering_fragment>',
          '#include <dithering_fragment>\ngl_FragColor.a *= 1. - .9 * uXray * (1. - smoothstep(uChip.z * .8, uChip.z, distance(vLocal.xy, uChip.xy)));',
        );
    };
    return material;
  };

  const shape = logoShape();
  const sideMaterial = withXray(
    new MeshStandardMaterial({
      bumpMap: layerBump(1, LAYERS / HEIGHT),
      clippingPlanes: [cut],
      clipShadows: true,
    }),
  );
  const topMaterial = withXray(
    new MeshStandardMaterial({
      bumpMap: layerBump(30, 30, Math.PI / 4),
      clippingPlanes: [cut],
      clipShadows: true,
    }),
  );
  const body = new Mesh(logoBody(shape), [topMaterial, sideMaterial]);
  body.castShadow = true;

  // Sezione dello strato in stampa
  const sections: Record<SectionKind, ReturnType<typeof sectionTexture>> = {
    infill: sectionTexture('infill'),
    pocket: sectionTexture('pocket'),
    bridge: sectionTexture('bridge'),
    solid: sectionTexture('solid'),
  };
  const sectionGeometry = logoSection(shape);
  const sectionMaterial = new MeshStandardMaterial({
    map: sections.infill,
    alphaTest: 0.5,
    roughness: 0.9,
  });
  const section = new Mesh(sectionGeometry, sectionMaterial);
  section.receiveShadow = true;
  const edgeMaterial = new MeshBasicMaterial({
    map: hotEdgeTexture(),
    color: palette.hot,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const edge = new Mesh(sectionGeometry, edgeMaterial);

  // Sede del tag: fondo e parete, visibili attraverso il foro della sezione
  const pocketMaterial = new MeshStandardMaterial({ roughness: 0.95, side: DoubleSide });
  const pocketFloor = new Mesh(new CircleGeometry(POCKET.radius, 48), pocketMaterial);
  pocketFloor.position.set(POCKET.x, POCKET.y, HEIGHT / 2 - POCKET.depth);
  pocketFloor.receiveShadow = true;
  const pocketWallMaterial = new MeshStandardMaterial({ roughness: 0.95, side: BackSide });
  const pocketWall = new Mesh(
    new CylinderGeometry(POCKET.radius, POCKET.radius, POCKET.depth, 48, 1, true).rotateX(
      Math.PI / 2,
    ),
    pocketWallMaterial,
  );
  pocketWall.position.set(POCKET.x, POCKET.y, HEIGHT / 2 - POCKET.depth / 2);

  // Tag NFC: disco chiaro, antenna in rame su entrambe le facce, circuito integrato
  const chip = new Group();
  chip.add(
    new Mesh(
      new CylinderGeometry(CHIP_RADIUS, CHIP_RADIUS, CHIP_THICKNESS, 48).rotateX(Math.PI / 2),
      new MeshStandardMaterial({ color: palette.chip, roughness: 0.45 }),
    ),
  );
  const copper = new MeshStandardMaterial({
    color: palette.copper,
    metalness: 1,
    roughness: 0.28,
    side: DoubleSide,
  });
  for (const face of [1, -1]) {
    const antenna = new Group();
    for (let turn = 0; turn < 6; turn += 1) {
      const radius = CHIP_RADIUS * (0.92 - turn * 0.085);
      antenna.add(new Mesh(new RingGeometry(radius - 0.011, radius, 48), copper));
    }
    const pad = new Mesh(new BoxGeometry(0.05, 0.012, 0.002), copper);
    pad.position.set(0.045, 0, 0);
    const die = new Mesh(
      new BoxGeometry(0.06, 0.06, 0.008),
      new MeshStandardMaterial({ color: palette.ink, roughness: 0.4, metalness: 0.3 }),
    );
    antenna.add(pad, die);
    antenna.position.z = face * (CHIP_THICKNESS / 2 + 0.002);
    chip.add(antenna);
  }
  chip.traverse((object) => {
    object.castShadow = true;
  });
  const chipSeat = HEIGHT / 2 - POCKET.depth + CHIP_THICKNESS / 2 + 0.004;

  // Onde di conferma e anello dei raggi X
  const ringMaterial = (): MeshBasicMaterial =>
    new MeshBasicMaterial({
      color: palette.hot,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      side: DoubleSide,
    });
  const pulses = [0, 1].map(() => {
    const ring = new Mesh(
      new RingGeometry(POCKET.radius * 0.95, POCKET.radius, 64),
      ringMaterial(),
    );
    ring.position.set(POCKET.x, POCKET.y, HEIGHT / 2 + 0.006);
    return ring;
  });
  const xrayRings = [HEIGHT + 0.004, -0.004].map((z) => {
    const ring = new Mesh(new RingGeometry(XRAY_RADIUS * 0.965, XRAY_RADIUS, 64), ringMaterial());
    ring.position.set(POCKET.x, POCKET.y, z);
    return ring;
  });

  const logoStand = new Group();
  logoStand.add(body, section, edge, pocketFloor, pocketWall, chip, ...pulses, ...xrayRings);
  const logoSpin = new Group();
  logoSpin.add(logoStand);
  const logoRoot = new Group();
  logoRoot.add(logoSpin);
  scene.add(logoRoot);

  // Stampante: piatto e ugello, nello stesso spazio del logo quando è steso (z verso l'alto)
  const printer = new Group();
  printer.rotation.x = -Math.PI / 2;
  scene.add(printer);

  const BED = 3.5;
  const plate = new Shape();
  const half = BED / 2;
  const corner = 0.22;
  plate.moveTo(-half + corner, -half);
  plate.lineTo(half - corner, -half);
  plate.quadraticCurveTo(half, -half, half, -half + corner);
  plate.lineTo(half, half - corner);
  plate.quadraticCurveTo(half, half, half - corner, half);
  plate.lineTo(-half + corner, half);
  plate.quadraticCurveTo(-half, half, -half, half - corner);
  plate.lineTo(-half, -half + corner);
  plate.quadraticCurveTo(-half, -half, -half + corner, -half);
  const bedMap = bedTexture(palette.bed, palette.bedLine);
  bedMap.repeat.set(1 / BED, 1 / BED);
  bedMap.offset.set(0.5, 0.5);
  const bedMaterial = new MeshStandardMaterial({ map: bedMap, roughness: 0.88, transparent: true });
  const bed = new Mesh(
    new ExtrudeGeometry(plate, { depth: 0.06, bevelEnabled: false, curveSegments: 8 }).translate(
      0,
      0,
      -0.062,
    ),
    bedMaterial,
  );
  bed.receiveShadow = true;
  printer.add(bed);

  const metal = (color: string, roughness: number): MeshStandardMaterial =>
    new MeshStandardMaterial({ color, metalness: 1, roughness, transparent: true });
  const brass = metal(palette.brass, 0.3);
  const block = metal(palette.ink, 0.5);
  const steel = metal(palette.steel, 0.35);
  const strandMaterial = new MeshStandardMaterial({ roughness: 0.6, transparent: true });
  /** Cilindro con l'asse lungo z, la base a `from` */
  const column = (top: number, bottom: number, height: number, from: number, sides = 32) =>
    new CylinderGeometry(top, bottom, height, sides)
      .rotateX(Math.PI / 2)
      .translate(0, 0, from + height / 2);
  const nozzle = new Group();
  nozzle.add(
    new Mesh(column(0.075, 0.014, 0.12, 0), brass),
    new Mesh(column(0.085, 0.085, 0.05, 0.12, 6), brass),
    new Mesh(new BoxGeometry(0.3, 0.22, 0.17).translate(0.03, 0, 0.255), block),
    new Mesh(column(0.04, 0.04, 0.1, 0.34), steel),
    ...[0, 1, 2, 3, 4].map((fin) => new Mesh(column(0.12, 0.12, 0.022, 0.44 + fin * 0.05), steel)),
    new Mesh(column(0.016, 0.016, 2.6, 0.68, 12), strandMaterial),
  );
  nozzle.traverse((object) => {
    object.castShadow = true;
  });
  const tipLight = new PointLight(palette.hot, 0, 1.1, 2);
  tipLight.position.z = 0.03;
  nozzle.add(tipLight);
  printer.add(nozzle);
  const printerMaterials: Material[] = [bedMaterial, brass, block, steel, strandMaterial];

  const perimeter = logoPerimeter(shape);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const hit = new Vector3();
  const pocketWorld = new Vector3();
  const position = new Vector3();
  const target = new Vector3();
  const tint = new Color();
  let aspect = 1;
  let xrayOn = false;

  const sectionKind = (z: number, chipIn: boolean): SectionKind => {
    if (z > HEIGHT - 0.07) return 'solid';
    if (z > HEIGHT / 2 + 0.03) return 'infill';
    if (z > HEIGHT / 2 + 0.001) return chipIn ? 'bridge' : 'pocket';
    return z > HEIGHT / 2 - POCKET.depth ? 'pocket' : 'infill';
  };

  return {
    /** Dimensione in pixel CSS e densità: il canvas resta nitido senza superare 2x */
    resize(width: number, height: number, ratio: number): void {
      renderer.setPixelRatio(ratio);
      renderer.setSize(width, height, false);
      aspect = width / Math.max(1, height);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },

    setLook(look: Look): void {
      for (const material of [sideMaterial, topMaterial, sectionMaterial, strandMaterial]) {
        material.color.set(look.color);
      }
      tint.set(look.color).multiplyScalar(0.55);
      pocketMaterial.color.copy(tint);
      pocketWallMaterial.color.copy(tint);
      for (const material of [sideMaterial, topMaterial]) {
        material.roughness = look.roughness;
        material.metalness = look.metalness;
      }
      sideMaterial.bumpScale = look.bump;
      // Sulla faccia le passate sono appena accennate: più marcate creano moiré
      topMaterial.bumpScale = look.bump * 0.18;
    },

    /** Il raggio dal puntatore (coordinate normalizzate -1..1) colpisce il logo sopra il tag? */
    overChip(x: number, y: number): boolean {
      pointer.set(x, y);
      raycaster.setFromCamera(pointer, camera);
      const [first] = raycaster.intersectObject(body);
      if (!first) return false;
      logoStand.worldToLocal(hit.copy(first.point));
      return Math.hypot(hit.x - POCKET.x, hit.y - POCKET.y) < XRAY_RADIUS;
    },

    render(state: StageState, view: StageView, time: number): void {
      const printing = state.lift < 0.001;
      const z = Math.min(state.z, HEIGHT);

      cut.constant = printing && z < HEIGHT - 0.001 ? z : 99;
      // A quota zero il fondo del pezzo coincide con il piano di taglio: meglio nasconderlo
      body.visible = !printing || z > 0.004;
      section.visible = printing && z > 0.004 && z < HEIGHT - 0.001;
      section.position.z = z;
      sectionMaterial.map = sections[sectionKind(z, state.chip > 0.98)];
      edge.visible = section.visible && state.hot > 0.01;
      edge.position.z = z + 0.003;
      edgeMaterial.opacity = state.hot;

      const pocketOpen = z > HEIGHT / 2 - POCKET.depth;
      pocketFloor.visible = pocketOpen;
      pocketWall.visible = pocketOpen;
      chip.visible = state.chip > 0.001;
      chip.position.set(POCKET.x, POCKET.y, chipSeat + (1 - state.chip) * 1.7);

      pulses.forEach((ring, index) => {
        const wave = Math.min(1, Math.max(0, state.pulse * 1.6 - index * 0.5));
        ring.visible = wave > 0 && wave < 1;
        ring.scale.setScalar(1 + wave * 2.6);
        ring.material.opacity = (1 - wave) * 0.55;
      });

      // Raggi X: il corpo diventa trasparente solo quando serve, per non pagare l'ordinamento
      xray.value = view.xray;
      const needXray = view.xray > 0.002;
      if (needXray !== xrayOn) {
        xrayOn = needXray;
        for (const material of [sideMaterial, topMaterial]) {
          material.transparent = needXray;
          material.needsUpdate = true;
        }
      }
      for (const ring of xrayRings) {
        ring.visible = needXray;
        ring.material.opacity = view.xray * (0.55 + 0.35 * Math.sin(time * 5));
      }

      // Stampante
      printer.visible = state.printer > 0.002;
      for (const material of printerMaterials) material.opacity = state.printer;
      const turn = state.travel % 1;
      const along = perimeter[Math.floor(turn * perimeter.length)] ?? perimeter[0];
      nozzle.position.set(
        lerp(along?.x ?? 0, PARK.x, state.park),
        lerp(along?.y ?? 0, PARK.y, state.park),
        z + 0.012 + (1 - state.nozzle) * 2.4 + state.park * PARK.z,
      );
      tipLight.intensity = state.hot * (1 - state.park) * 1.4;

      // Prodotto finito: si alza, si mette in piedi, galleggia e segue la rotazione dell'utente
      logoRoot.position.y = state.lift * (1.3 + 0.045 * Math.sin(time * 1.3));
      logoStand.rotation.x = (-Math.PI / 2) * (1 - state.lift);
      logoSpin.rotation.set(view.pitch * state.lift, view.yaw * state.lift, 0);

      // Camera: tre quarti → dall'alto sulla sede → frontale. In verticale si allontana.
      const reach = Math.max(1, 1.04 / aspect);
      logoRoot.updateWorldMatrix(false, true);
      logoStand.localToWorld(pocketWorld.set(POCKET.x, POCKET.y, HEIGHT / 2));
      position.set(2.8 * reach, 0.2 + 3.1 * reach, 0.1 + 4.5 * reach);
      target.set(0, 0.2, 0.1);
      position.lerp(
        hit.set(
          pocketWorld.x + 0.4 * reach,
          pocketWorld.y + 3.6 * reach,
          pocketWorld.z + 1.3 * reach,
        ),
        state.zoom,
      );
      target.lerp(pocketWorld, state.zoom);
      position.lerp(hit.set(0, 1.3, 5.9 * reach), state.front);
      target.lerp(hit.set(0, 1.3, 0), state.front);
      camera.position.copy(position);
      camera.lookAt(target);

      renderer.render(scene, camera);
    },

    dispose(): void {
      renderer.dispose();
    },
  };
}
