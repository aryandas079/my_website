import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { detectDeviceGpuTier } from './InstancedBinaryDust';

export type ComputeNodeTier = 'control' | 'compute' | 'edge';

export interface ComputeNodeSpec {
  id: string;
  label: string;
  role: string;
  tier: ComputeNodeTier;
  spec: string;
  region: string;
  position: [number, number, number];
  neighbors: string[];
}

export const CLUSTER_NODES: ComputeNodeSpec[] = [
  {
    id: 'ctrl-01',
    label: 'control-plane-01',
    role: 'Cluster Orchestrator',
    tier: 'control',
    spec: '64 vCPU · Raft Consensus · Mesh Root',
    region: 'ap-south-1a',
    position: [0, 0.25, 0],
    neighbors: ['gpu-01', 'gpu-02', 'gpu-03', 'vec-01', 'bus-01'],
  },
  {
    id: 'gpu-01',
    label: 'gpu-worker-01',
    role: 'Tensor Compute Node',
    tier: 'compute',
    spec: '8× Accelerator · NVLink Fabric · 640GB HBM',
    region: 'ap-south-1a',
    position: [-3.1, 1.45, 1.75],
    neighbors: ['ctrl-01', 'gpu-02', 'edge-01', 'edge-02'],
  },
  {
    id: 'gpu-02',
    label: 'gpu-worker-02',
    role: 'Inference Engine',
    tier: 'compute',
    spec: '8× Accelerator · FP8 Pipeline · 120 Gbps',
    region: 'ap-south-1b',
    position: [3.2, 1.35, 1.55],
    neighbors: ['ctrl-01', 'gpu-01', 'gpu-03', 'edge-03'],
  },
  {
    id: 'gpu-03',
    label: 'gpu-worker-03',
    role: 'Training Shard',
    tier: 'compute',
    spec: '8× Accelerator · RDMA RoCEv2 · 200 Gbps',
    region: 'ap-south-1b',
    position: [2.55, -1.55, -2.2],
    neighbors: ['ctrl-01', 'gpu-02', 'vec-01', 'edge-04'],
  },
  {
    id: 'vec-01',
    label: 'vector-store-01',
    role: 'Embedding Index',
    tier: 'compute',
    spec: 'NVMe RAID-10 · HNSW Shards · 512GB RAM',
    region: 'ap-south-1c',
    position: [-2.65, -1.45, -2.35],
    neighbors: ['ctrl-01', 'gpu-03', 'bus-01', 'edge-05'],
  },
  {
    id: 'bus-01',
    label: 'stream-broker-01',
    role: 'Event Mesh Bus',
    tier: 'compute',
    spec: 'Zero-Copy Ring · 1.2M msg/s · Quic Transport',
    region: 'ap-south-1a',
    position: [0.1, 2.35, -2.75],
    neighbors: ['ctrl-01', 'vec-01', 'gpu-01', 'edge-06'],
  },
  {
    id: 'edge-01',
    label: 'edge-gateway-01',
    role: 'Ingress Proxy',
    tier: 'edge',
    spec: 'eBPF L4/L7 · Anycast TLS · 40 Gbps',
    region: 'edge-sin',
    position: [-5.8, 0.55, 3.3],
    neighbors: ['gpu-01', 'edge-02'],
  },
  {
    id: 'edge-02',
    label: 'edge-cache-02',
    role: 'Distributed KV Cache',
    tier: 'edge',
    spec: 'In-Memory Shards · Sub-ms Read · 256GB',
    region: 'edge-bom',
    position: [-4.9, -2.35, 1.35],
    neighbors: ['gpu-01', 'edge-01', 'vec-01'],
  },
  {
    id: 'edge-03',
    label: 'edge-gateway-03',
    role: 'API Mesh Router',
    tier: 'edge',
    spec: 'gRPC Multiplex · Circuit Breaker · mTLS',
    region: 'edge-nrt',
    position: [5.85, 0.75, 3.1],
    neighbors: ['gpu-02', 'edge-04'],
  },
  {
    id: 'edge-04',
    label: 'storage-vault-04',
    role: 'Object Store Node',
    tier: 'edge',
    spec: 'Erasure Coded · 128TB NVMe · Immutable',
    region: 'edge-syd',
    position: [5.2, -2.4, -0.75],
    neighbors: ['gpu-03', 'edge-03'],
  },
  {
    id: 'edge-05',
    label: 'telemetry-sink-05',
    role: 'Trace Aggregator',
    tier: 'edge',
    spec: 'Columnar Ring · OpenTelemetry · 64 vCPU',
    region: 'edge-fra',
    position: [-4.6, 2.8, -3.5],
    neighbors: ['vec-01', 'bus-01', 'edge-06'],
  },
  {
    id: 'edge-06',
    label: 'edge-compute-06',
    role: 'Worker Relay',
    tier: 'edge',
    spec: 'WASM Sandbox · Cold-Start <4ms · 32 vCPU',
    region: 'edge-iad',
    position: [3.9, 3.1, -3.7],
    neighbors: ['bus-01', 'gpu-02', 'edge-05'],
  },
];

interface EdgePair {
  fromId: string;
  toId: string;
  a: THREE.Vector3;
  b: THREE.Vector3;
  isControlLink: boolean;
  bufferOffset: number;
}

interface PacketState {
  edgeIndex: number;
  t: number;
  speed: number;
  dir: 1 | -1;
}

export interface ClusterTopologyCallbacks {
  onSelectNode?: (node: ComputeNodeSpec | null) => void;
  onHoverNode?: (node: ComputeNodeSpec | null) => void;
  onDragNode?: (node: ComputeNodeSpec | null, isDragging: boolean) => void;
  onLayoutChange?: (hasCustomLayout: boolean) => void;
}

const DEFAULT_CAMERA_POS = new THREE.Vector3(0.4, 4.6, 13.8);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.15, 0);
const FLOOR_Y = -4.3;
const GRID_SNAP_STEP = 0.5;

// Reusable scratch objects (zero per-frame GC)
const _dummy = new THREE.Object3D();
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _focusCamPos = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();
const _planeNormal = new THREE.Vector3();
const _dragIntersect = new THREE.Vector3();
const _dragTarget = new THREE.Vector3();

/**
 * Interactive Three.js 3D Cluster Topology Network controller.
 * Strict obsidian black, crisp white, and signature #FF261B crimson palette.
 * Supports OrbitControls 360° rotation, pinch/wheel zoom, raycast node hover,
 * GSAP camera fly-to zoom, and full 3D drag-and-drop node reconfiguration
 * with live link topology updates, snap-to-grid, and floor projection guides.
 */
export class ClusterTopologyController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private callbacks: ClusterTopologyCallbacks;

  private nodePositions = new Map<string, THREE.Vector3>();
  private nodeGroups = new Map<string, THREE.Group>();
  private pickMeshes: THREE.Mesh[] = [];
  private ringMeshes = new Map<string, THREE.Mesh>();
  private coreMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private redRimLight: THREE.PointLight;

  private edges: EdgePair[] = [];
  private controlLinkPosAttr: THREE.BufferAttribute | null = null;
  private peerLinkPosAttr: THREE.BufferAttribute | null = null;
  private packetInstancedMesh: THREE.InstancedMesh;
  private packets: PacketState[] = [];
  private gridHelper: THREE.GridHelper;
  private starPoints: THREE.Points;

  // Spatial drag-and-drop visual guides (vertical drop tether + floor reticle)
  private dropGuideGroup: THREE.Group;
  private dropLinePosAttr: THREE.BufferAttribute;
  private dropReticleMesh: THREE.Mesh;

  private selectedNodeId: string | null = null;
  private hoveredNodeId: string | null = null;
  private pendingDragNodeId: string | null = null;
  private draggingNodeId: string | null = null;
  private dragPointerId: number | null = null;
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private snapToGrid = true;
  private hasCustomLayout = false;

  private cameraTween: gsap.core.Tween | null = null;
  private targetTween: gsap.core.Tween | null = null;
  private layoutTweens: gsap.core.Tween[] = [];

  private pointerDownX = 0;
  private pointerDownY = 0;
  private isSoftwareGl: boolean;
  private rafId = 0;
  private syncTimerId = 0;
  private lastMs = performance.now();
  private clock = 0;
  private disposed = false;
  private paused = false;

  private resizeObserver: ResizeObserver;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(container: HTMLElement, callbacks: ClusterTopologyCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    for (const spec of CLUSTER_NODES) {
      this.nodePositions.set(
        spec.id,
        new THREE.Vector3(spec.position[0], spec.position[1], spec.position[2])
      );
    }

    const tier = detectDeviceGpuTier();
    this.isSoftwareGl = tier.isSoftwareGl;

    const width = Math.max(260, container.clientWidth || window.innerWidth);
    const height = Math.max(240, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !tier.isLowEndMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      tier.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, tier.recommendedMaxDpr)
    );
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x050505, 1);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.style.cursor = 'grab';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050505, 0.026);

    const aspect = width / height;
    const baseFov = aspect < 0.85 ? 52 : aspect > 2.2 ? 38 : 42;
    this.camera = new THREE.PerspectiveCamera(baseFov, aspect, 0.1, 120);
    const distScale = aspect < 0.75 ? 1.42 : aspect < 1.0 ? 1.2 : aspect > 2.2 ? 0.92 : 1.0;
    this.camera.position.copy(DEFAULT_CAMERA_POS).multiplyScalar(distScale);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = true;
    this.controls.rotateSpeed = 0.72;
    this.controls.zoomSpeed = 0.92;
    this.controls.minDistance = 2.6;
    this.controls.maxDistance = 24;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.52;
    this.controls.target.copy(DEFAULT_TARGET);
    this.controls.update();

    this.controls.addEventListener('start', this.onControlsStart);

    // High-contrast monochrome + red studio lighting rig
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(8, 12, 10);
    this.scene.add(keyLight);

    this.redRimLight = new THREE.PointLight(0xff261b, 18, 22, 1.5);
    this.redRimLight.position.set(0, 0.5, 0);
    this.scene.add(this.redRimLight);

    const coolFill = new THREE.DirectionalLight(0xd8dde8, 0.95);
    coolFill.position.set(-10, -5, -8);
    this.scene.add(coolFill);

    // Architectural dark reference floor grid
    this.gridHelper = new THREE.GridHelper(26, 26, 0x262626, 0x121212);
    this.gridHelper.position.y = FLOOR_Y;
    this.scene.add(this.gridHelper);

    // Spatial planning drop guide (vertical tether line + floor reticle)
    this.dropGuideGroup = new THREE.Group();
    this.dropGuideGroup.visible = false;

    const dropLineGeo = new THREE.BufferGeometry();
    this.dropLinePosAttr = new THREE.Float32BufferAttribute(new Float32Array(6), 3);
    dropLineGeo.setAttribute('position', this.dropLinePosAttr);
    const dropLineMat = new THREE.LineBasicMaterial({
      color: 0xff261b,
      transparent: true,
      opacity: 0.85,
    });
    const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
    this.dropGuideGroup.add(dropLine);

    const reticleGeo = new THREE.RingGeometry(0.42, 0.56, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0xff261b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.dropReticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    this.dropReticleMesh.rotation.x = -Math.PI * 0.5;
    this.dropGuideGroup.add(this.dropReticleMesh);

    const reticleInnerGeo = new THREE.CircleGeometry(0.11, 16);
    const reticleInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    const reticleInner = new THREE.Mesh(reticleInnerGeo, reticleInnerMat);
    reticleInner.position.z = 0.01;
    this.dropReticleMesh.add(reticleInner);

    this.disposables.push(
      dropLineGeo,
      dropLineMat,
      reticleGeo,
      reticleMat,
      reticleInnerGeo,
      reticleInnerMat
    );
    this.scene.add(this.dropGuideGroup);

    // Subtle spatial depth particles
    this.starPoints = this.buildSpatialGridDust();
    this.scene.add(this.starPoints);

    // Build compute nodes + topology links + instanced data packets
    this.buildComputeNodes();
    this.buildTopologyLinks();
    this.packetInstancedMesh = this.buildDataPackets();
    this.scene.add(this.packetInstancedMesh);

    // Pointer interaction listeners for hover, click-to-zoom, and 3D drag-and-drop
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.lastMs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private getNodeSnapshot(nodeId: string): ComputeNodeSpec | null {
    const base = CLUSTER_NODES.find((n) => n.id === nodeId);
    if (!base) return null;
    const pos = this.nodePositions.get(nodeId);
    if (!pos) return { ...base };
    return {
      ...base,
      position: [
        Math.round(pos.x * 100) / 100,
        Math.round(pos.y * 100) / 100,
        Math.round(pos.z * 100) / 100,
      ],
    };
  }

  private buildSpatialGridDust(): THREE.Points {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 7.5 + ((i * 73.13) % 100) * 0.14;
      const theta = ((i * 0.61803398875) % 1) * Math.PI * 2;
      const phi = Math.acos(1 - 2 * ((i + 0.5) / count));
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.72;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.055,
      transparent: true,
      opacity: 0.28,
      sizeAttenuation: true,
    });
    this.disposables.push(geo, mat);
    return new THREE.Points(geo, mat);
  }

  private buildComputeNodes(): void {
    const controlGeo = new THREE.OctahedronGeometry(0.66, 1);
    const computeGeo = new THREE.BoxGeometry(0.76, 0.52, 0.76);
    const edgeGeo = new THREE.OctahedronGeometry(0.42, 0);
    const ringGeo = new THREE.TorusGeometry(0.78, 0.022, 10, 42);
    const controlRingGeo = new THREE.TorusGeometry(1.12, 0.028, 12, 48);
    const wireBoxGeo = new THREE.EdgesGeometry(computeGeo);
    const wireOctGeo = new THREE.EdgesGeometry(controlGeo);
    const wireEdgeGeo = new THREE.EdgesGeometry(edgeGeo);
    const hitSphereGeo = new THREE.SphereGeometry(0.98, 12, 12);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    this.disposables.push(
      controlGeo,
      computeGeo,
      edgeGeo,
      ringGeo,
      controlRingGeo,
      wireBoxGeo,
      wireOctGeo,
      wireEdgeGeo,
      hitSphereGeo,
      hitMat
    );

    for (const spec of CLUSTER_NODES) {
      const group = new THREE.Group();
      const pos = this.nodePositions.get(spec.id)!;
      group.position.copy(pos);

      const isControl = spec.tier === 'control';
      const isCompute = spec.tier === 'compute';

      const coreMat = new THREE.MeshStandardMaterial({
        color: isControl ? 0xff261b : isCompute ? 0xf5f5f2 : 0x1a1a1c,
        emissive: isControl ? 0xff261b : isCompute ? 0x181818 : 0x0a0a0a,
        emissiveIntensity: isControl ? 0.55 : 0.22,
        roughness: isControl ? 0.22 : isCompute ? 0.28 : 0.35,
        metalness: isControl ? 0.35 : isCompute ? 0.55 : 0.72,
      });
      this.coreMaterials.set(spec.id, coreMat);
      this.disposables.push(coreMat);

      const coreMesh = new THREE.Mesh(
        isControl ? controlGeo : isCompute ? computeGeo : edgeGeo,
        coreMat
      );
      group.add(coreMesh);

      const wireMat = new THREE.LineBasicMaterial({
        color: isControl ? 0xffffff : isCompute ? 0xff261b : 0xf5f5f2,
        transparent: true,
        opacity: isControl ? 0.85 : isCompute ? 0.75 : 0.55,
      });
      this.disposables.push(wireMat);
      const wireSegs = new THREE.LineSegments(
        isControl ? wireOctGeo : isCompute ? wireBoxGeo : wireEdgeGeo,
        wireMat
      );
      wireSegs.scale.setScalar(1.16);
      group.add(wireSegs);

      // Equatorial orbital ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: isControl ? 0xff261b : 0xffffff,
        transparent: true,
        opacity: isControl ? 0.85 : 0.34,
      });
      this.disposables.push(ringMat);
      const ringMesh = new THREE.Mesh(isControl ? controlRingGeo : ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI * 0.5;
      ringMesh.scale.setScalar(isControl ? 1.0 : isCompute ? 0.92 : 0.74);
      group.add(ringMesh);
      this.ringMeshes.set(spec.id, ringMesh);

      // Generous invisible raycast hit sphere for effortless touch/mouse picking & dragging
      const pickMesh = new THREE.Mesh(hitSphereGeo, hitMat);
      pickMesh.userData.nodeId = spec.id;
      group.add(pickMesh);
      this.pickMeshes.push(pickMesh);

      this.nodeGroups.set(spec.id, group);
      this.scene.add(group);
    }
  }

  private buildTopologyLinks(): void {
    const nodeMap = new Map<string, ComputeNodeSpec>();
    for (const n of CLUSTER_NODES) nodeMap.set(n.id, n);

    const seen = new Set<string>();
    const controlPositions: number[] = [];
    const peerPositions: number[] = [];

    for (const node of CLUSTER_NODES) {
      for (const nId of node.neighbors) {
        const key = node.id < nId ? `${node.id}:${nId}` : `${nId}:${node.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const other = nodeMap.get(nId);
        if (!other) continue;

        const a = this.nodePositions.get(node.id)!.clone();
        const b = this.nodePositions.get(other.id)!.clone();
        const isControlLink = node.tier === 'control' || other.tier === 'control';
        const bufferOffset = isControlLink ? controlPositions.length : peerPositions.length;

        this.edges.push({
          fromId: node.id,
          toId: other.id,
          a,
          b,
          isControlLink,
          bufferOffset,
        });

        if (isControlLink) {
          controlPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        } else {
          peerPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }

    if (controlPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      this.controlLinkPosAttr = new THREE.Float32BufferAttribute(controlPositions, 3);
      this.controlLinkPosAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', this.controlLinkPosAttr);
      const mat = new THREE.LineBasicMaterial({
        color: 0xff261b,
        transparent: true,
        opacity: 0.72,
      });
      this.disposables.push(geo, mat);
      this.scene.add(new THREE.LineSegments(geo, mat));
    }

    if (peerPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      this.peerLinkPosAttr = new THREE.Float32BufferAttribute(peerPositions, 3);
      this.peerLinkPosAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', this.peerLinkPosAttr);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
      });
      this.disposables.push(geo, mat);
      this.scene.add(new THREE.LineSegments(geo, mat));
    }
  }

  private syncTopologyEdgesFromPositions(): void {
    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      const posA = this.nodePositions.get(edge.fromId);
      const posB = this.nodePositions.get(edge.toId);
      if (!posA || !posB) continue;

      edge.a.copy(posA);
      edge.b.copy(posB);

      const attr = edge.isControlLink ? this.controlLinkPosAttr : this.peerLinkPosAttr;
      if (attr) {
        const arr = attr.array as Float32Array;
        const off = edge.bufferOffset;
        arr[off] = posA.x;
        arr[off + 1] = posA.y;
        arr[off + 2] = posA.z;
        arr[off + 3] = posB.x;
        arr[off + 4] = posB.y;
        arr[off + 5] = posB.z;
      }
    }

    if (this.controlLinkPosAttr) this.controlLinkPosAttr.needsUpdate = true;
    if (this.peerLinkPosAttr) this.peerLinkPosAttr.needsUpdate = true;

    const ctrlPos = this.nodePositions.get('ctrl-01');
    if (ctrlPos) {
      this.redRimLight.position.set(ctrlPos.x, ctrlPos.y + 0.25, ctrlPos.z);
    }
  }

  private updateDropGuide(pos: THREE.Vector3): void {
    const arr = this.dropLinePosAttr.array as Float32Array;
    arr[0] = pos.x;
    arr[1] = pos.y;
    arr[2] = pos.z;
    arr[3] = pos.x;
    arr[4] = FLOOR_Y + 0.02;
    arr[5] = pos.z;
    this.dropLinePosAttr.needsUpdate = true;
    this.dropReticleMesh.position.set(pos.x, FLOOR_Y + 0.02, pos.z);
  }

  private buildDataPackets(): THREE.InstancedMesh {
    const packetCount = Math.min(48, Math.max(16, this.edges.length * 2));
    const geo = new THREE.SphereGeometry(0.068, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instanced = new THREE.InstancedMesh(geo, mat, packetCount);
    instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const redColor = new THREE.Color(0xff261b);
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < packetCount; i++) {
      const edgeIndex = i % Math.max(1, this.edges.length);
      this.packets.push({
        edgeIndex,
        t: (i * 0.61803398875) % 1,
        speed: 0.24 + ((i * 19) % 11) * 0.028,
        dir: i % 2 === 0 ? 1 : -1,
      });
      const isRed = this.edges[edgeIndex]?.isControlLink || i % 3 === 0;
      instanced.setColorAt(i, isRed ? redColor : whiteColor);
    }
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

    this.disposables.push(geo, mat);
    return instanced;
  }

  private onControlsStart = (): void => {
    this.controls.autoRotate = false;
    this.cameraTween?.kill();
    this.targetTween?.kill();
  };

  private setRayFromClient(clientX: number, clientY: number): boolean {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(_pointerNdc, this.camera);
    return true;
  }

  private pickNodeIdAtClient(clientX: number, clientY: number): string | null {
    if (!this.setRayFromClient(clientX, clientY)) return null;
    const hits = this.raycaster.intersectObjects(this.pickMeshes, false);
    if (hits.length === 0) return null;
    return (hits[0].object.userData.nodeId as string | undefined) ?? null;
  }

  private beginNodeDrag(nodeId: string, clientX: number, clientY: number, shiftHorizontal: boolean): void {
    const pos = this.nodePositions.get(nodeId);
    if (!pos) return;

    this.draggingNodeId = nodeId;
    this.selectedNodeId = nodeId;
    this.controls.autoRotate = false;
    this.controls.enabled = false;
    this.cameraTween?.kill();
    this.targetTween?.kill();
    for (const tw of this.layoutTweens) tw.kill();
    this.layoutTweens.length = 0;

    if (shiftHorizontal) {
      _planeNormal.set(0, 1, 0);
    } else {
      this.camera.getWorldDirection(_planeNormal).negate();
    }
    this.dragPlane.setFromNormalAndCoplanarPoint(_planeNormal, pos);

    if (
      this.setRayFromClient(clientX, clientY) &&
      this.raycaster.ray.intersectPlane(this.dragPlane, _dragIntersect)
    ) {
      this.dragOffset.copy(pos).sub(_dragIntersect);
    } else {
      this.dragOffset.set(0, 0, 0);
    }

    this.dropGuideGroup.visible = true;
    this.updateDropGuide(pos);
    this.renderer.domElement.style.cursor = 'grabbing';

    const snap = this.getNodeSnapshot(nodeId);
    this.callbacks.onSelectNode?.(snap);
    this.callbacks.onDragNode?.(snap, true);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;

    const hitId = this.pickNodeIdAtClient(e.clientX, e.clientY);
    if (hitId) {
      this.pendingDragNodeId = hitId;
      this.dragPointerId = e.pointerId;
      this.controls.enabled = false;
      try {
        this.renderer.domElement.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if capture is unsupported
      }
      this.renderer.domElement.style.cursor = 'grabbing';
    } else {
      this.pendingDragNodeId = null;
      this.draggingNodeId = null;
      this.dragPointerId = null;
      this.controls.enabled = true;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    // Handle active or pending node drag-and-drop
    if (this.pendingDragNodeId && this.dragPointerId === e.pointerId) {
      const moveDist = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
      if (!this.draggingNodeId && moveDist >= 6) {
        this.beginNodeDrag(this.pendingDragNodeId, e.clientX, e.clientY, e.shiftKey);
      }

      if (this.draggingNodeId) {
        const pos = this.nodePositions.get(this.draggingNodeId);
        if (pos && this.setRayFromClient(e.clientX, e.clientY)) {
          if (this.raycaster.ray.intersectPlane(this.dragPlane, _dragIntersect)) {
            _dragTarget.copy(_dragIntersect).add(this.dragOffset);

            let nx = THREE.MathUtils.clamp(_dragTarget.x, -9.0, 9.0);
            let ny = THREE.MathUtils.clamp(_dragTarget.y, -3.4, 5.2);
            let nz = THREE.MathUtils.clamp(_dragTarget.z, -9.0, 9.0);

            if (this.snapToGrid) {
              nx = Math.round(nx / GRID_SNAP_STEP) * GRID_SNAP_STEP;
              ny = Math.round(ny / GRID_SNAP_STEP) * GRID_SNAP_STEP;
              nz = Math.round(nz / GRID_SNAP_STEP) * GRID_SNAP_STEP;
            }

            pos.set(nx, ny, nz);
            const grp = this.nodeGroups.get(this.draggingNodeId);
            if (grp) {
              grp.position.copy(pos);
            }
            this.syncTopologyEdgesFromPositions();
            this.updateDropGuide(pos);

            if (!this.hasCustomLayout) {
              this.hasCustomLayout = true;
              this.callbacks.onLayoutChange?.(true);
            }

            const snap = this.getNodeSnapshot(this.draggingNodeId);
            this.callbacks.onDragNode?.(snap, true);
            this.callbacks.onSelectNode?.(snap);
          }
        }
      }
      return;
    }

    // Standard hover picking when not dragging
    if (e.pointerType === 'touch') return;
    const hitId = this.pickNodeIdAtClient(e.clientX, e.clientY);
    if (hitId !== this.hoveredNodeId) {
      this.hoveredNodeId = hitId;
      this.renderer.domElement.style.cursor = hitId ? 'grab' : 'default';
      this.callbacks.onHoverNode?.(hitId ? this.getNodeSnapshot(hitId) : null);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const wasDraggingId = this.draggingNodeId;
    const pendingId = this.pendingDragNodeId;

    if (this.dragPointerId === e.pointerId) {
      try {
        if (this.renderer.domElement.hasPointerCapture(e.pointerId)) {
          this.renderer.domElement.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }
      this.dragPointerId = null;
    }

    this.pendingDragNodeId = null;
    this.draggingNodeId = null;
    this.controls.enabled = true;
    this.dropGuideGroup.visible = false;

    if (wasDraggingId) {
      const snap = this.getNodeSnapshot(wasDraggingId);
      this.callbacks.onDragNode?.(snap, false);
      this.callbacks.onSelectNode?.(snap);
      this.renderer.domElement.style.cursor = 'grab';
      return;
    }

    const moveDist = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
    if (moveDist > 7) return;

    const hitId = pendingId ?? this.pickNodeIdAtClient(e.clientX, e.clientY);
    if (hitId) {
      this.focusNodeById(hitId);
    } else if (this.selectedNodeId !== null) {
      this.resetCameraView();
    }
  };

  public setSnapToGrid(enabled: boolean): void {
    this.snapToGrid = enabled;
  }

  /**
   * Smoothly animates all compute nodes back to their default spatial coordinates.
   */
  public resetLayout(): void {
    for (const tw of this.layoutTweens) tw.kill();
    this.layoutTweens.length = 0;

    let remaining = CLUSTER_NODES.length;
    for (const spec of CLUSTER_NODES) {
      const pos = this.nodePositions.get(spec.id);
      if (!pos) continue;
      const tw = gsap.to(pos, {
        x: spec.position[0],
        y: spec.position[1],
        z: spec.position[2],
        duration: 0.72,
        ease: 'expo.out',
        onUpdate: () => {
          const grp = this.nodeGroups.get(spec.id);
          if (grp) grp.position.set(pos.x, pos.y, pos.z);
          this.syncTopologyEdgesFromPositions();
        },
        onComplete: () => {
          remaining -= 1;
          if (remaining === 0 && !this.disposed) {
            this.hasCustomLayout = false;
            this.callbacks.onLayoutChange?.(false);
            if (this.selectedNodeId) {
              this.callbacks.onSelectNode?.(this.getNodeSnapshot(this.selectedNodeId));
            }
          }
        },
      });
      this.layoutTweens.push(tw);
    }
  }

  /**
   * Smoothly zooms and frames the camera directly onto an individual compute node.
   */
  public focusNodeById(nodeId: string): void {
    const spec = this.getNodeSnapshot(nodeId);
    const pos = this.nodePositions.get(nodeId);
    if (!spec || !pos) return;

    this.selectedNodeId = spec.id;
    this.controls.autoRotate = false;
    this.callbacks.onSelectNode?.(spec);

    _vecA.copy(pos);
    _dir.copy(this.camera.position).sub(_vecA);
    if (_dir.lengthSq() < 0.01) _dir.set(0.4, 0.35, 1);
    _dir.normalize();
    _dir.y = Math.max(0.22, Math.min(0.68, _dir.y));
    _dir.normalize();

    const focusDist = spec.tier === 'control' ? 4.2 : 3.5;
    _focusCamPos.copy(_vecA).addScaledVector(_dir, focusDist);

    this.cameraTween?.kill();
    this.targetTween?.kill();

    this.cameraTween = gsap.to(this.camera.position, {
      x: _focusCamPos.x,
      y: _focusCamPos.y,
      z: _focusCamPos.z,
      duration: 0.92,
      ease: 'expo.out',
      overwrite: 'auto',
    });

    this.targetTween = gsap.to(this.controls.target, {
      x: _vecA.x,
      y: _vecA.y,
      z: _vecA.z,
      duration: 0.92,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  }

  public resetCameraView(): void {
    this.selectedNodeId = null;
    this.callbacks.onSelectNode?.(null);

    this.cameraTween?.kill();
    this.targetTween?.kill();

    const aspect = this.camera.aspect || 1.6;
    const distScale = aspect < 0.75 ? 1.42 : aspect < 1.0 ? 1.2 : aspect > 2.2 ? 0.92 : 1.0;

    this.cameraTween = gsap.to(this.camera.position, {
      x: DEFAULT_CAMERA_POS.x * distScale,
      y: DEFAULT_CAMERA_POS.y * distScale,
      z: DEFAULT_CAMERA_POS.z * distScale,
      duration: 0.95,
      ease: 'expo.out',
      overwrite: 'auto',
      onComplete: () => {
        if (!this.disposed && this.selectedNodeId === null) {
          this.controls.autoRotate = true;
        }
      },
    });

    this.targetTween = gsap.to(this.controls.target, {
      x: DEFAULT_TARGET.x,
      y: DEFAULT_TARGET.y,
      z: DEFAULT_TARGET.z,
      duration: 0.95,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  }

  public zoomByFactor(factor: number): void {
    this.controls.autoRotate = false;
    this.cameraTween?.kill();
    _dir.copy(this.camera.position).sub(this.controls.target);
    const nextDist = THREE.MathUtils.clamp(
      _dir.length() * factor,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    _dir.normalize().multiplyScalar(nextDist).add(this.controls.target);

    this.cameraTween = gsap.to(this.camera.position, {
      x: _dir.x,
      y: _dir.y,
      z: _dir.z,
      duration: 0.42,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(260, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);
    const aspect = width / height;
    this.camera.fov = aspect < 0.85 ? 52 : aspect > 2.2 ? 38 : 42;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
  }

  private onVisibilityChange = (): void => {
    this.paused = document.hidden;
    if (!this.paused && this.rafId === 0 && !this.disposed) {
      this.lastMs = performance.now();
      this.rafId = requestAnimationFrame(this.tick);
    } else if (this.paused && this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.syncTimerId = window.setTimeout(cb, 48);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed || this.paused) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.syncTimerId = window.setTimeout(poll, 4);
      } else {
        if (sync) gl.deleteSync(sync);
        this.syncTimerId = window.setTimeout(cb, 32);
      }
    };
    this.syncTimerId = window.setTimeout(poll, 4);
  }

  private tick = (nowMs: number): void => {
    if (this.disposed || this.paused) {
      this.rafId = 0;
      return;
    }

    const dt = Math.min((nowMs - this.lastMs) / 1000, 0.033);
    this.lastMs = nowMs;
    this.clock += dt;

    this.controls.update();

    // Animate compute node rotation, hover/selection/drag scale, and orbital rings
    let idx = 0;
    for (const spec of CLUSTER_NODES) {
      const grp = this.nodeGroups.get(spec.id);
      const ring = this.ringMeshes.get(spec.id);
      const mat = this.coreMaterials.get(spec.id);
      const basePos = this.nodePositions.get(spec.id);
      const isDragged = this.draggingNodeId === spec.id;
      const isSelected = this.selectedNodeId === spec.id;
      const isHovered = this.hoveredNodeId === spec.id;

      if (grp && basePos) {
        const bob = isDragged ? 0 : Math.sin(this.clock * 1.15 + idx * 0.9) * 0.08;
        grp.position.set(basePos.x, basePos.y + bob, basePos.z);

        const targetScale = isDragged ? 1.38 : isSelected ? 1.28 : isHovered ? 1.14 : 1.0;
        const s = grp.scale.x + (targetScale - grp.scale.x) * Math.min(1, dt * 12);
        grp.scale.setScalar(s);

        const core = grp.children[0];
        if (core) {
          core.rotation.y += dt * (isDragged ? 1.4 : spec.tier === 'control' ? 0.45 : 0.28);
          if (spec.tier !== 'compute') {
            core.rotation.x += dt * 0.16;
          }
        }
      }

      if (ring) {
        ring.rotation.z += dt * (isDragged ? 2.8 : isSelected ? 1.4 : 0.45);
        const rMat = ring.material as THREE.MeshBasicMaterial;
        rMat.color.setHex(
          isDragged || isSelected || isHovered || spec.tier === 'control' ? 0xff261b : 0xffffff
        );
        rMat.opacity = isDragged
          ? 1.0
          : isSelected
            ? 0.98
            : isHovered
              ? 0.85
              : spec.tier === 'control'
                ? 0.82
                : 0.3;
      }

      if (mat) {
        const targetEmissive = isDragged
          ? 1.25
          : isSelected
            ? 0.95
            : isHovered
              ? 0.55
              : spec.tier === 'control'
                ? 0.5
                : 0.18;
        mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * Math.min(1, dt * 10);
        if (spec.tier !== 'control') {
          mat.emissive.setHex(isDragged || isSelected || isHovered ? 0xff261b : 0x161616);
        }
      }
      idx++;
    }

    if (this.dropGuideGroup.visible) {
      const pulse = 1 + Math.sin(this.clock * 8.0) * 0.12;
      this.dropReticleMesh.scale.setScalar(pulse);
    }

    // Advance instanced data packets along cluster links (ZERO per-frame GC)
    for (let i = 0; i < this.packets.length; i++) {
      const p = this.packets[i];
      p.t += p.speed * dt * p.dir;
      if (p.t > 1) p.t -= 1;
      if (p.t < 0) p.t += 1;

      const edge = this.edges[p.edgeIndex];
      if (!edge) continue;
      _vecB.lerpVectors(edge.a, edge.b, p.t);
      _dummy.position.copy(_vecB);
      const pulse = 0.8 + 0.35 * Math.sin(this.clock * 6.0 + i);
      _dummy.scale.setScalar(pulse);
      _dummy.updateMatrix();
      this.packetInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.packetInstancedMesh.instanceMatrix.needsUpdate = true;

    this.starPoints.rotation.y += dt * 0.025;
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.disposed && !this.paused) {
          this.rafId = requestAnimationFrame(this.tick);
        }
      });
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId !== 0) cancelAnimationFrame(this.rafId);
    window.clearTimeout(this.syncTimerId);
    this.cameraTween?.kill();
    this.targetTween?.kill();
    for (const tw of this.layoutTweens) tw.kill();
    this.layoutTweens.length = 0;
    this.resizeObserver.disconnect();
    this.controls.removeEventListener('start', this.onControlsStart);
    this.controls.dispose();

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    for (const item of this.disposables) {
      item.dispose();
    }
    this.disposables.length = 0;
    this.renderer.dispose();
    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
