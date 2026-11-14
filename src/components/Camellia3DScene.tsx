import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface Camellia3DSceneProps {
  theme: 'dark' | 'light';
  isStreaming: boolean;
}

interface MoteSeed {
  radius: number;
  angle: number;
  speed: number;
  baseY: number;
  amplitude: number;
  scale: number;
  phase: number;
}

const DARK_BG_HEX = 0x080c14;
const LIGHT_BG_HEX = 0xeaf1f7;

const _dummyObj = new THREE.Object3D();
const _targetColor = new THREE.Color();
const _targetFloorColor = new THREE.Color();
const _targetPlinthColor = new THREE.Color();
const _targetArchColor = new THREE.Color();
const _targetCoreEmissive = new THREE.Color();

function probeSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!gl) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return true;
  }
}

function createPetalShape(length: number, width: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width * 0.65, length * 0.22, width * 0.92, length * 0.68, 0, length);
  s.bezierCurveTo(-width * 0.92, length * 0.68, -width * 0.65, length * 0.22, 0, 0);
  return s;
}

function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 14, 128, 128, 126);
    grad.addColorStop(0, 'rgba(2, 6, 14, 0.55)');
    grad.addColorStop(0.55, 'rgba(2, 6, 14, 0.22)');
    grad.addColorStop(1, 'rgba(2, 6, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Camellia3DScene: React.FC<Camellia3DSceneProps> = ({ theme, isStreaming }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    theme,
    isStreaming,
    pointerX: 0,
    pointerY: 0,
    reducedMotion:
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
  });

  useEffect(() => {
    stateRef.current.theme = theme;
  }, [theme]);

  useEffect(() => {
    stateRef.current.isStreaming = isStreaming;
  }, [isStreaming]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const isSoftwareGl = probeSoftwareWebGL();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialBgHex = stateRef.current.theme === 'dark' ? DARK_BG_HEX : LIGHT_BG_HEX;
    const bgColor = new THREE.Color(initialBgHex);
    scene.background = bgColor;
    const fog = new THREE.FogExp2(initialBgHex, 0.068);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 60);
    camera.position.set(0, 1.85, 7.6);
    camera.lookAt(0, 0.65, 0);

    // Procedural studio reflections via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Warm key + cool sky fill + subtle botanical rim lights
    const hemiLight = new THREE.HemisphereLight(0xdff7ff, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.85);
    keyLight.position.set(4.8, 7.2, 5.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 22;
      keyLight.shadow.camera.left = -5;
      keyLight.shadow.camera.right = 5;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const tealRimLight = new THREE.PointLight(0x2dd4bf, 4.2, 14, 1.5);
    tealRimLight.position.set(-3.2, 2.4, -2.5);
    scene.add(tealRimLight);

    const roseFillLight = new THREE.PointLight(0xfb7185, 2.4, 12, 1.6);
    roseFillLight.position.set(3.1, 1.5, -2.1);
    scene.add(roseFillLight);

    // Track disposable resources
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // 1. Sanctuary Floor & Architectural Pavilion Ring
    const floorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: stateRef.current.theme === 'dark' ? 0x0b121e : 0xdde7f0,
        roughness: 0.9,
        metalness: 0.08
      })
    );
    const floorMesh = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(18, 64)), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1.65;
    floorMesh.receiveShadow = !isSoftwareGl;
    scene.add(floorMesh);

    const shadowTex = createRadialShadowTexture();
    textures.push(shadowTex);
    const contactShadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      })
    );
    const contactShadow = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(2.5, 48)),
      contactShadowMat
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -1.62;
    scene.add(contactShadow);

    // Sculpted Architectural Colonnade Pavilion (6 ribs framing background sanctuary)
    const sanctuaryGroup = new THREE.Group();
    const archMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: stateRef.current.theme === 'dark' ? 0x162235 : 0xcbd8e6,
        roughness: 0.72,
        metalness: 0.28
      })
    );
    const archGeo = trackGeo(new THREE.TorusGeometry(6.8, 0.045, 10, 48, Math.PI));
    for (let i = 0; i < 3; i++) {
      const arch = new THREE.Mesh(archGeo, archMat);
      arch.position.y = -1.65;
      arch.rotation.y = (i * Math.PI) / 3;
      sanctuaryGroup.add(arch);
    }
    const horizonRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(6.8, 0.055, 12, 72)),
      archMat
    );
    horizonRing.rotation.x = Math.PI / 2;
    horizonRing.position.y = -1.58;
    sanctuaryGroup.add(horizonRing);
    scene.add(sanctuaryGroup);

    // 2. Grounded Sculptural Pedestal Plinth (Lathe + Metal Collar + Luminous Halo)
    const plinthGroup = new THREE.Group();
    plinthGroup.position.set(0, -1.65, 0);

    const plinthPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.55, 0.0),
      new THREE.Vector2(1.48, 0.14),
      new THREE.Vector2(1.18, 0.24),
      new THREE.Vector2(1.06, 0.52),
      new THREE.Vector2(0.84, 0.68),
      new THREE.Vector2(0.0, 0.68)
    ];
    const plinthMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: stateRef.current.theme === 'dark' ? 0x131d2e : 0xc7d5e4,
        roughness: 0.62,
        metalness: 0.22
      })
    );
    const plinthBody = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(plinthPoints, 48)), plinthMat);
    plinthBody.castShadow = !isSoftwareGl;
    plinthBody.receiveShadow = !isSoftwareGl;
    plinthGroup.add(plinthBody);

    const brassCollarMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.22,
        metalness: 0.88
      })
    );
    const pedestalCollar = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.96, 0.032, 16, 64)),
      brassCollarMat
    );
    pedestalCollar.rotation.x = Math.PI / 2;
    pedestalCollar.position.y = 0.66;
    plinthGroup.add(pedestalCollar);

    const plinthGlowRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.76, 0.022, 12, 64)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x2dd4bf,
          emissive: 0x14b8a6,
          emissiveIntensity: 1.3,
          roughness: 0.25,
          metalness: 0.35
        })
      )
    );
    plinthGlowRing.rotation.x = Math.PI / 2;
    plinthGlowRing.position.y = 0.7;
    plinthGroup.add(plinthGlowRing);

    scene.add(plinthGroup);

    // 3. Camellia Botanical-Neural Avatar Rig (Floating Above Pedestal)
    const avatarRig = new THREE.Group();
    avatarRig.position.set(0, 0.68, 0);
    scene.add(avatarRig);

    // Inner glowing energy filament sphere
    const innerFilamentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x5eead4,
        emissive: 0x2dd4bf,
        emissiveIntensity: 1.6,
        roughness: 0.2,
        metalness: 0.1
      })
    );
    const innerFilament = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.32, 1)),
      innerFilamentMat
    );
    avatarRig.add(innerFilament);

    // Outer faceted neural core prism
    const coreCrystalMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x99f6e4,
        emissive: 0x0d9488,
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.15,
        clearcoat: 0.9,
        clearcoatRoughness: 0.12,
        transmission: isSoftwareGl ? 0 : 0.72,
        thickness: 0.8,
        ior: 1.45,
        transparent: true,
        opacity: isSoftwareGl ? 0.52 : 0.94
      })
    );
    const coreCrystal = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(0.56, 1)),
      coreCrystalMat
    );
    coreCrystal.castShadow = !isSoftwareGl;
    avatarRig.add(coreCrystal);

    // Botanical Camellia Corolla Petals (2 layered rosettes around core)
    const outerPetalGeo = trackGeo(
      new THREE.ExtrudeGeometry(createPetalShape(1.08, 0.54), {
        depth: 0.045,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.025,
        bevelSegments: 2,
        curveSegments: 16
      })
    );
    outerPetalGeo.translate(0, 0.16, -0.02);

    const outerPetalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfda4af,
        emissive: 0x881337,
        emissiveIntensity: 0.24,
        roughness: 0.42,
        metalness: 0.18
      })
    );

    const outerCorolla = new THREE.Group();
    const outerCount = 6;
    for (let i = 0; i < outerCount; i++) {
      const holder = new THREE.Group();
      holder.rotation.y = (i * Math.PI * 2) / outerCount;
      const petal = new THREE.Mesh(outerPetalGeo, outerPetalMat);
      petal.rotation.x = 1.02;
      petal.castShadow = !isSoftwareGl;
      holder.add(petal);
      outerCorolla.add(holder);
    }
    outerCorolla.position.y = -0.18;
    avatarRig.add(outerCorolla);

    const innerPetalGeo = trackGeo(
      new THREE.ExtrudeGeometry(createPetalShape(0.82, 0.4), {
        depth: 0.035,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 14
      })
    );
    innerPetalGeo.translate(0, 0.12, -0.015);

    const innerPetalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x5eead4,
        emissive: 0x0f766e,
        emissiveIntensity: 0.34,
        roughness: 0.28,
        metalness: 0.36
      })
    );

    const innerCorolla = new THREE.Group();
    const innerCount = 5;
    for (let i = 0; i < innerCount; i++) {
      const holder = new THREE.Group();
      holder.rotation.y = (i * Math.PI * 2) / innerCount + 0.35;
      const petal = new THREE.Mesh(innerPetalGeo, innerPetalMat);
      petal.rotation.x = 0.64;
      petal.castShadow = !isSoftwareGl;
      holder.add(petal);
      innerCorolla.add(holder);
    }
    innerCorolla.position.y = -0.08;
    avatarRig.add(innerCorolla);

    // Concentric Orbital Gyro Rings + Anode Nodes
    const ringMatPrimary = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2dd4bf,
        emissive: 0x0d9488,
        emissiveIntensity: 0.45,
        roughness: 0.24,
        metalness: 0.85
      })
    );
    const ringMatAccent = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.18,
        metalness: 0.92
      })
    );
    const nodeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.15,
        roughness: 0.25,
        metalness: 0.4
      })
    );
    const nodeGeo = trackGeo(new THREE.OctahedronGeometry(0.065, 0));

    const gyroOuter = new THREE.Group();
    const ringA = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.48, 0.022, 12, 84)),
      ringMatPrimary
    );
    gyroOuter.add(ringA);
    for (let i = 0; i < 3; i++) {
      const theta = (i * Math.PI * 2) / 3;
      const n = new THREE.Mesh(nodeGeo, nodeMat);
      n.position.set(Math.cos(theta) * 1.48, Math.sin(theta) * 1.48, 0);
      gyroOuter.add(n);
    }
    gyroOuter.rotation.set(0.75, 0.3, 0.2);
    avatarRig.add(gyroOuter);

    const gyroMid = new THREE.Group();
    const ringB = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.18, 0.018, 12, 72)),
      ringMatAccent
    );
    gyroMid.add(ringB);
    for (let i = 0; i < 2; i++) {
      const theta = i * Math.PI;
      const n = new THREE.Mesh(nodeGeo, nodeMat);
      n.position.set(Math.cos(theta) * 1.18, Math.sin(theta) * 1.18, 0);
      gyroMid.add(n);
    }
    gyroMid.rotation.set(-0.65, 0.55, 0.4);
    avatarRig.add(gyroMid);

    // 4. Instanced Ambient Neural Constellation Field
    const MOTE_COUNT = 44;
    const moteGeo = trackGeo(new THREE.OctahedronGeometry(0.045, 0));
    const moteMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x99f6e4,
        emissive: 0x2dd4bf,
        emissiveIntensity: 1.1,
        roughness: 0.28,
        metalness: 0.25
      })
    );
    const moteMesh = new THREE.InstancedMesh(moteGeo, moteMat, MOTE_COUNT);
    const moteSeeds: MoteSeed[] = [];
    for (let i = 0; i < MOTE_COUNT; i++) {
      const goldenAngle = i * 2.3999632;
      const radius = 2.05 + ((i * 37) % 100) / 28;
      const baseY = -1.2 + ((i * 53) % 100) / 26;
      const seed: MoteSeed = {
        radius,
        angle: goldenAngle,
        speed: 0.08 + ((i * 19) % 10) * 0.012,
        baseY,
        amplitude: 0.18 + ((i * 13) % 7) * 0.04,
        scale: 0.65 + ((i * 17) % 10) * 0.075,
        phase: (i * 0.71) % (Math.PI * 2)
      };
      moteSeeds.push(seed);

      _dummyObj.position.set(
        Math.cos(seed.angle) * seed.radius,
        seed.baseY,
        Math.sin(seed.angle) * seed.radius
      );
      _dummyObj.scale.setScalar(seed.scale);
      _dummyObj.updateMatrix();
      moteMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    moteMesh.instanceMatrix.needsUpdate = true;
    moteMesh.computeBoundingSphere();
    scene.add(moteMesh);

    // Pointer parallax tracking (non-blocking via window listener)
    const handlePointerMove = (e: PointerEvent) => {
      const vw = Math.max(window.innerWidth, 1);
      const vh = Math.max(window.innerHeight, 1);
      stateRef.current.pointerX = (e.clientX / vw) * 2 - 1;
      stateRef.current.pointerY = (e.clientY / vh) * 2 - 1;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Reduced motion listener
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      stateRef.current.reducedMotion = e.matches;
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // Container resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.round(entry.contentRect.width), 1);
        const h = Math.max(Math.round(entry.contentRect.height), 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    // Software-WebGL fence pacing helper (skill-mandated pattern)
    const gl = isSoftwareGl ? (renderer.getContext() as WebGL2RenderingContext) : null;
    let rafId = 0;
    let timeoutId: number | undefined;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (sync) {
          gl.flush();
          const poll = () => {
            if (disposed) {
              gl.deleteSync(sync);
              return;
            }
            const status = gl.clientWaitSync(sync, 0, 0);
            if (status === gl.TIMEOUT_EXPIRED) {
              timeoutId = window.setTimeout(poll, 16);
              return;
            }
            gl.deleteSync(sync);
            rafId = requestAnimationFrame(cb);
          };
          timeoutId = window.setTimeout(poll, 80);
          return;
        }
      }
      rafId = requestAnimationFrame(cb);
    };

    const clock = new THREE.Clock();
    let elapsed = 0;
    let smoothedEnergy = 0;

    const animate = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      const { theme: activeTheme, isStreaming: streaming, pointerX, pointerY, reducedMotion } =
        stateRef.current;

      const motionFactor = reducedMotion ? 0.08 : 1;
      smoothedEnergy = THREE.MathUtils.damp(smoothedEnergy, streaming ? 1 : 0, 4.2, delta);
      const speedMult = (1 + smoothedEnergy * 1.45) * motionFactor;
      elapsed += delta * speedMult;

      // Smoothly adapt scene atmosphere & colors when theme changes
      const isDark = activeTheme === 'dark';
      _targetColor.setHex(isDark ? DARK_BG_HEX : LIGHT_BG_HEX);
      bgColor.lerp(_targetColor, Math.min(delta * 5, 1));
      fog.color.copy(bgColor);

      _targetFloorColor.setHex(isDark ? 0x0b121e : 0xdde7f0);
      floorMat.color.lerp(_targetFloorColor, Math.min(delta * 5, 1));

      _targetPlinthColor.setHex(isDark ? 0x131d2e : 0xc7d5e4);
      plinthMat.color.lerp(_targetPlinthColor, Math.min(delta * 5, 1));

      _targetArchColor.setHex(isDark ? 0x162235 : 0xcbd8e6);
      archMat.color.lerp(_targetArchColor, Math.min(delta * 5, 1));

      hemiLight.intensity = THREE.MathUtils.damp(hemiLight.intensity, isDark ? 0.85 : 1.15, 4, delta);
      contactShadowMat.opacity = THREE.MathUtils.damp(
        contactShadowMat.opacity,
        isDark ? 0.56 : 0.34,
        4,
        delta
      );

      // Avatar levitation & energy cadence
      avatarRig.position.y = 0.68 + Math.sin(elapsed * 1.3) * 0.1 * motionFactor;
      avatarRig.rotation.y += delta * 0.24 * speedMult;

      coreCrystal.rotation.y -= delta * 0.42 * speedMult;
      coreCrystal.rotation.x = Math.sin(elapsed * 0.7) * 0.18;
      innerFilament.rotation.y += delta * 0.9 * speedMult;
      innerFilament.rotation.z += delta * 0.55 * speedMult;

      const pulseScale = 1 + Math.sin(elapsed * 2.6) * (0.04 + smoothedEnergy * 0.05) * motionFactor;
      innerFilament.scale.setScalar(pulseScale);

      _targetCoreEmissive.setHex(streaming ? 0x2dd4bf : 0x0d9488);
      coreCrystalMat.emissive.lerp(_targetCoreEmissive, Math.min(delta * 6, 1));
      coreCrystalMat.emissiveIntensity = 0.52 + smoothedEnergy * 0.75;
      innerFilamentMat.emissiveIntensity = 1.45 + smoothedEnergy * 1.4;
      tealRimLight.intensity = 4.0 + smoothedEnergy * 2.6;

      outerCorolla.rotation.y += delta * 0.12 * speedMult;
      innerCorolla.rotation.y -= delta * 0.18 * speedMult;

      gyroOuter.rotation.z += delta * 0.38 * speedMult;
      gyroOuter.rotation.x = 0.75 + Math.sin(elapsed * 0.55) * 0.12 * motionFactor;
      gyroMid.rotation.z -= delta * 0.52 * speedMult;
      gyroMid.rotation.y = 0.55 + Math.cos(elapsed * 0.48) * 0.14 * motionFactor;

      // Subtle architectural sanctuary drift
      sanctuaryGroup.rotation.y += delta * 0.03 * motionFactor;

      // Update floating neural constellation motes without per-frame allocation
      for (let i = 0; i < MOTE_COUNT; i++) {
        const seed = moteSeeds[i];
        const a = seed.angle + elapsed * seed.speed;
        const y = seed.baseY + Math.sin(elapsed * 0.9 + seed.phase) * seed.amplitude * motionFactor;
        _dummyObj.position.set(Math.cos(a) * seed.radius, y, Math.sin(a) * seed.radius);
        _dummyObj.rotation.set(elapsed * 0.4 + seed.phase, elapsed * 0.6, 0);
        _dummyObj.scale.setScalar(seed.scale * (1 + smoothedEnergy * 0.25));
        _dummyObj.updateMatrix();
        moteMesh.setMatrixAt(i, _dummyObj.matrix);
      }
      moteMesh.instanceMatrix.needsUpdate = true;

      // Smooth camera parallax reacting subtly to cursor position
      const targetCamX = pointerX * 0.55 * motionFactor;
      const targetCamY = 1.85 - pointerY * 0.28 * motionFactor;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 3.2, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 3.2, delta);
      camera.lookAt(0, 0.55, 0);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        rafId = requestAnimationFrame(animate);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(animate);
    } else {
      rafId = requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      motionQuery.removeEventListener('change', handleMotionChange);

      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      envTarget.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="camellia-3d-canvas"
      className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden"
    />
  );
};

export default Camellia3DScene;
