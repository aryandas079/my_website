import * as THREE from 'three';

export type ThematicCluster = 'ml' | 'data-science' | 'software';
export type LayoutNodeKind = 'foundation' | 'approach' | 'credential' | 'structural';

export interface ForceLayoutNodeInput {
  id: string;
  layerIdx: number;
  row: number;
  col: number;
  colsInLayer: number;
  cluster: ThematicCluster;
  kind: LayoutNodeKind;
  cubeSize: number;
  anchorX: number;
  anchorY: number;
  anchorZ: number;
  isAlluringRedCert: boolean;
}

export interface ForceLayoutEdgeInput {
  fromIdx: number;
  toIdx: number;
  isSemantic: boolean;
}

export interface ForceLayoutOptions {
  viewportWidth: number;
  viewportHeight: number;
  fovDeg: number;
  baseYaw: number;
  basePitch: number;
  iterations?: number;
}

export interface ForceLayoutBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  halfW: number;
  halfH: number;
  halfD: number;
}

export interface ForceLayoutResult {
  positions: THREE.Vector3[];
  bounds: ForceLayoutBounds;
  recommendedCameraZ: number;
  recommendedCameraY: number;
  recommendedScale: number;
  clusterBandGapY: number;
}

interface SimNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ax: number;
  ay: number;
  az: number;
  /** Physical bounding radius including maximum hover/click scale expansion */
  radius: number;
  layerIdx: number;
  cluster: ThematicCluster;
  kind: LayoutNodeKind;
  isAlluringRedCert: boolean;
}

/**
 * Deterministic 3D Cluster-Separated Force-Directed Layout & Viewport Non-Overlap Solver.
 *
 * Refines the 6-layer neural architecture by combining:
 *   1. Layer-plane harmonic anchors (preserves crisp left-to-right architectural order)
 *   2. Expanded thematic cluster bands & strong inter-cluster repulsion (ML / Data Science / Software)
 *   3. Semantic edge cohesion springs for connected hubs & credentials
 *   4. Hard-sphere 3D pairwise collision repulsion (accounting for hover/click expansion)
 *   5. Viewport-aware camera-plane 2D projection anti-overlap repulsion so nodes never visually
 *      eclipse each other at the 3/4 studio view angle or when the viewport is resized
 *   6. Exact rotated bounding-box framing to derive optimal perspective camera distance
 */
export function solveNeuralForceLayout(
  inputs: ForceLayoutNodeInput[],
  edges: ForceLayoutEdgeInput[],
  options: ForceLayoutOptions
): ForceLayoutResult {
  const n = inputs.length;
  if (n === 0) {
    return {
      positions: [],
      bounds: {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        minZ: 0,
        maxZ: 0,
        halfW: 1,
        halfH: 1,
        halfD: 1,
      },
      recommendedCameraZ: 17.5,
      recommendedCameraY: 0.95,
      recommendedScale: 1,
      clusterBandGapY: 1.0,
    };
  }

  const vw = Math.max(320, options.viewportWidth);
  const vh = Math.max(320, options.viewportHeight);
  const aspect = THREE.MathUtils.clamp(vw / vh, 0.44, 2.6);
  const iterations = options.iterations ?? 135;

  // Viewport-adaptive spatial spread:
  // - Narrow/portrait screens gently compact horizontal layer pitch while expanding vertical
  //   cluster separation so the 3D network fills portrait viewports cleanly without clipping
  // - Standard & wide screens maximize balanced horizontal & vertical cluster presence
  const isNarrow = aspect < 1.15;
  const isUltrawide = aspect > 1.95;

  const spreadX = isNarrow
    ? THREE.MathUtils.lerp(0.74, 0.98, THREE.MathUtils.clamp((aspect - 0.44) / (1.15 - 0.44), 0, 1))
    : isUltrawide
      ? 1.06
      : 1.0;

  const spreadY = isNarrow
    ? THREE.MathUtils.lerp(1.16, 1.04, THREE.MathUtils.clamp((aspect - 0.44) / (1.15 - 0.44), 0, 1))
    : isUltrawide
      ? 0.96
      : 1.0;

  const spreadZ = isNarrow ? 0.96 : 1.06;

  // Dedicated Y-band corridors guaranteeing a crisp, unmistakable gap between ML, Data Science, and Software
  // while keeping each cluster's outer bounds sculptural and bold inside the camera frustum.
  const mlFloorY = 1.48 * spreadY;
  const mlCeilY = 2.74 * spreadY;
  const dsBandHalfY = 0.34 * spreadY;
  const swCeilY = -1.48 * spreadY;
  const swFloorY = -2.74 * spreadY;
  const clusterBandGapY = mlFloorY - dsBandHalfY;

  // Build simulation nodes with aspect-adapted anchors and hover-expanded collision radii
  const sim: SimNode[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const inp = inputs[i];
    // Cluster-aware vertical shift widens the inter-cluster corridor cleanly
    const clusterShiftY =
      inp.cluster === 'ml' ? 0.34 : inp.cluster === 'software' ? -0.34 : 0;

    // Subtle deterministic column elevation stagger prevents exact front-back eclipse at 3/4 yaw
    const colCenter = (inp.colsInLayer - 1) * 0.5;
    const colStaggerY = (inp.col - colCenter) * 0.095;

    const ax = inp.anchorX * spreadX;
    const rawY = (inp.anchorY + clusterShiftY) * spreadY + colStaggerY;
    const ay =
      inp.cluster === 'ml'
        ? THREE.MathUtils.clamp(rawY, mlFloorY, mlCeilY)
        : inp.cluster === 'software'
          ? THREE.MathUtils.clamp(rawY, swFloorY, swCeilY)
          : THREE.MathUtils.clamp(rawY, -dsBandHalfY, dsBandHalfY);
    const az = inp.anchorZ * spreadZ;

    // Effective collision radius includes interactive hover/click expansion + bevel headroom
    const expandFactor = inp.kind === 'structural' ? 1.15 : inp.isAlluringRedCert ? 1.4 : 1.32;
    const radius = inp.cubeSize * 0.5 * expandFactor;

    sim[i] = {
      x: ax,
      y: ay,
      z: az,
      vx: 0,
      vy: 0,
      vz: 0,
      ax,
      ay,
      az,
      radius,
      layerIdx: inp.layerIdx,
      cluster: inp.cluster,
      kind: inp.kind,
      isAlluringRedCert: inp.isAlluringRedCert,
    };
  }

  // Compute camera-plane right (U) and up (V) basis vectors under the nominal 3/4 architectural rotation
  // so 2D screen-projection anti-overlap aligns with what the viewer actually sees.
  const rotEuler = new THREE.Euler(options.basePitch, options.baseYaw, 0, 'XYZ');
  const rotMat = new THREE.Matrix4().makeRotationFromEuler(rotEuler);
  const invRotMat = rotMat.clone().invert();

  // Camera right (+X in view space) and up (+Y in view space) mapped into network-local coordinates
  const viewRightLocal = new THREE.Vector3(1, 0, 0).applyMatrix4(invRotMat).normalize();
  const viewUpLocal = new THREE.Vector3(0, 1, 0).applyMatrix4(invRotMat).normalize();
  const ruX = viewRightLocal.x;
  const ruY = viewRightLocal.y;
  const ruZ = viewRightLocal.z;
  const vuX = viewUpLocal.x;
  const vuY = viewUpLocal.y;
  const vuZ = viewUpLocal.z;

  // Extra pixel-safety padding when viewport is smaller so projected nodes stay visually distinct
  const minViewportDim = Math.min(vw, vh);
  const compactViewportBoost =
    minViewportDim < 720 ? THREE.MathUtils.lerp(1.18, 1.0, (minViewportDim - 320) / 400) : 1.0;

  // Force-directed simulation constants
  const kAnchorX = 0.42;
  const kAnchorY = 0.2;
  const kAnchorZ = 0.2;
  const kSemanticEdge = 0.011;
  const damping = 0.72;

  for (let iter = 0; iter < iterations; iter++) {
    const cool = 1 - (iter / iterations) * 0.55;
    const stepScale = 0.34 * cool;

    // 1. Harmonic Layer & Cluster Anchor Forces
    for (let i = 0; i < n; i++) {
      const a = sim[i];
      const fx = (a.ax - a.x) * kAnchorX;
      let fy = (a.ay - a.y) * kAnchorY;
      const fz = (a.az - a.z) * kAnchorZ;

      // Soft cluster-band containment spring keeping ML / Data Science / Software cleanly separated
      if (a.cluster === 'ml') {
        if (a.y < mlFloorY) fy += (mlFloorY - a.y) * 0.72;
        else if (a.y > mlCeilY) fy += (mlCeilY - a.y) * 0.6;
      } else if (a.cluster === 'software') {
        if (a.y > swCeilY) fy += (swCeilY - a.y) * 0.72;
        else if (a.y < swFloorY) fy += (swFloorY - a.y) * 0.6;
      } else {
        if (a.y > dsBandHalfY) fy += (dsBandHalfY - a.y) * 0.72;
        else if (a.y < -dsBandHalfY) fy += (-dsBandHalfY - a.y) * 0.72;
      }

      a.vx = (a.vx + fx * stepScale) * damping;
      a.vy = (a.vy + fy * stepScale) * damping;
      a.vz = (a.vz + fz * stepScale) * damping;
    }

    // 2. Semantic Edge Cohesion Springs (aligns connected nodes smoothly in Y/Z within their cluster)
    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      if (!edge.isSemantic) continue;
      const a = sim[edge.fromIdx];
      const b = sim[edge.toIdx];
      if (a.cluster !== b.cluster) continue;

      const dy = (b.y - a.y) * kSemanticEdge * stepScale;
      const dz = (b.z - a.z) * kSemanticEdge * 0.85 * stepScale;
      a.vy += dy;
      b.vy -= dy;
      a.vz += dz;
      b.vz -= dz;
    }

    // 3. Pairwise 3D Collision Repulsion + Inter-Cluster Repulsion + Camera-Plane 2D Anti-Overlap
    for (let i = 0; i < n; i++) {
      const a = sim[i];
      for (let j = i + 1; j < n; j++) {
        const b = sim[j];
        const sameLayer = a.layerIdx === b.layerIdx;
        const adjacentLayer = Math.abs(a.layerIdx - b.layerIdx) === 1;
        const sameCluster = a.cluster === b.cluster;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        // Generous minimum 3D center-to-center distance
        const sumR = a.radius + b.radius;
        const minDist3D = sameCluster
          ? (sumR * 1.38 + 0.28) * compactViewportBoost
          : (sumR * 1.65 + 0.98) * compactViewportBoost;

        if (distSq < minDist3D * minDist3D) {
          const dist = Math.max(0.001, Math.sqrt(distSq));
          const overlap = (minDist3D - dist) / minDist3D;
          const force = overlap * (sameCluster ? 0.5 : 0.86) * stepScale;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Keep X displacement minimal so architectural layer columns stay crisp & aligned
          const xWeight = sameLayer ? 0.04 : 0.12;
          a.vx -= nx * force * xWeight;
          b.vx += nx * force * xWeight;
          a.vy -= ny * force * 0.96;
          b.vy += ny * force * 0.96;
          a.vz -= nz * force * 1.02;
          b.vz += nz * force * 1.02;
        }

        // Extra inter-cluster vertical repulsion across nearby layers to guarantee crisp horizontal channels
        if (!sameCluster && Math.abs(a.layerIdx - b.layerIdx) <= 1) {
          const absDy = Math.abs(dy);
          const minBandSep = (sumR + 1.1) * spreadY;
          if (absDy < minBandSep) {
            const push = ((minBandSep - absDy) / minBandSep) * 0.44 * stepScale;
            const signY = dy >= 0 ? 1 : -1;
            a.vy -= signY * push;
            b.vy += signY * push;
          }
        }

        // Camera-plane 2D projected silhouette anti-overlap (prevents visual occlusion on screen!)
        if (sameLayer || adjacentLayer) {
          const du = dx * ruX + dy * ruY + dz * ruZ;
          const dv = dx * vuX + dy * vuY + dz * vuZ;
          const d2Sq = du * du + dv * dv;
          const minProjDist =
            (sumR * (sameLayer ? 1.34 : 1.15) + (sameLayer ? 0.15 : 0.08)) *
            compactViewportBoost;

          if (d2Sq < minProjDist * minProjDist) {
            const d2 = Math.max(0.001, Math.sqrt(d2Sq));
            const pen = (minProjDist - d2) / minProjDist;
            const pForce = pen * (sameLayer ? 0.42 : 0.22) * stepScale;

            // Push along camera-up & local Z/Y without breaking the left-to-right X layer structure
            const dirU = du / d2;
            const dirV = dv / d2;
            const pushY = dirU * ruY + dirV * vuY;
            const pushZ = dirU * ruZ + dirV * vuZ;
            const pLen = Math.hypot(pushY, pushZ);
            const ny2 = pLen > 0.001 ? pushY / pLen : dy >= 0 ? 1 : -1;
            const nz2 = pLen > 0.001 ? pushZ / pLen : dz >= 0 ? 1 : -1;

            a.vy -= ny2 * pForce;
            b.vy += ny2 * pForce;
            a.vz -= nz2 * pForce * 0.9;
            b.vz += nz2 * pForce * 0.9;
          }
        }
      }
    }

    // Integrate velocity & clamp gentle local drift so layers remain sculpturally organized
    for (let i = 0; i < n; i++) {
      const a = sim[i];
      a.x += a.vx;
      a.y += a.vy;
      a.z += a.vz;

      // Bound X strictly close to layer plane so 6-layer feed-forward silhouette is unmistakable
      a.x = THREE.MathUtils.clamp(a.x, a.ax - 0.14, a.ax + 0.14);
      // Bound Z depth gracefully so outer layers don't drift too far toward/away from camera
      a.z = THREE.MathUtils.clamp(a.z, -2.0 * spreadZ, 2.0 * spreadZ);
    }
  }

  // 4. Deterministic Gauss-Seidel Hard Non-Overlap & Cluster-Channel Projection Pass
  for (let pass = 0; pass < 16; pass++) {
    // Resolve any residual 3D or same-layer projected 2D overlap directly
    for (let i = 0; i < n; i++) {
      const a = sim[i];
      for (let j = i + 1; j < n; j++) {
        const b = sim[j];
        const sameLayer = a.layerIdx === b.layerIdx;
        const sameCluster = a.cluster === b.cluster;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const sumR = a.radius + b.radius;
        const hardMin3D = (sumR * 1.28 + 0.22) * compactViewportBoost;

        if (distSq < hardMin3D * hardMin3D) {
          const dist = Math.max(0.001, Math.sqrt(distSq));
          const corr = (hardMin3D - dist) * 0.52;
          const ny = dy / dist;
          const nz = dz / dist;
          const yzLen = Math.max(0.001, Math.hypot(ny, nz));
          a.y -= (ny / yzLen) * corr;
          b.y += (ny / yzLen) * corr;
          a.z -= (nz / yzLen) * corr * 0.9;
          b.z += (nz / yzLen) * corr * 0.9;
        }

        if (sameLayer && sameCluster) {
          const du = (b.x - a.x) * ruX + (b.y - a.y) * ruY + (b.z - a.z) * ruZ;
          const dv = (b.x - a.x) * vuX + (b.y - a.y) * vuY + (b.z - a.z) * vuZ;
          const d2Sq = du * du + dv * dv;
          const hardProj = (sumR * 1.24 + 0.12) * compactViewportBoost;
          if (d2Sq < hardProj * hardProj) {
            const d2 = Math.max(0.001, Math.sqrt(d2Sq));
            const corr = (hardProj - d2) * 0.46;
            const py = (du / d2) * ruY + (dv / d2) * vuY;
            const pz = (du / d2) * ruZ + (dv / d2) * vuZ;
            const pLen = Math.max(0.001, Math.hypot(py, pz));
            a.y -= (py / pLen) * corr;
            b.y += (py / pLen) * corr;
            a.z -= (pz / pLen) * corr * 0.85;
            b.z += (pz / pLen) * corr * 0.85;
          }
        }
      }
    }

    // Enforce hard cluster band separation channels & outer ceilings after each sweep
    for (let i = 0; i < n; i++) {
      const a = sim[i];
      if (a.cluster === 'ml') {
        a.y = THREE.MathUtils.clamp(a.y, mlFloorY, mlCeilY);
      } else if (a.cluster === 'software') {
        a.y = THREE.MathUtils.clamp(a.y, swFloorY, swCeilY);
      } else {
        a.y = THREE.MathUtils.clamp(a.y, -dsBandHalfY, dsBandHalfY);
      }
    }
  }

  // Re-center Y slightly around 0 while preserving exact cluster symmetry
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < n; i++) {
    const a = sim[i];
    const r = a.radius;
    if (a.x - r < minX) minX = a.x - r;
    if (a.x + r > maxX) maxX = a.x + r;
    if (a.y - r < minY) minY = a.y - r;
    if (a.y + r > maxY) maxY = a.y + r;
    if (a.z - r < minZ) minZ = a.z - r;
    if (a.z + r > maxZ) maxZ = a.z + r;
  }

  const centerOffsetY = (minY + maxY) * 0.5;
  const positions: THREE.Vector3[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = sim[i];
    a.y -= centerOffsetY;
    positions[i] = new THREE.Vector3(a.x, a.y, a.z);
  }
  minY -= centerOffsetY;
  maxY -= centerOffsetY;

  // 5. Compute exact worst-case rotated bounding extents across breathing yaw/pitch angles
  // to guarantee zero viewport clipping and crisp breathing margins on every resize.
  const testAngles: ReadonlyArray<[number, number]> = [
    [options.basePitch - 0.05, options.baseYaw - 0.1],
    [options.basePitch + 0.05, options.baseYaw + 0.1],
    [options.basePitch + 0.04, options.baseYaw - 0.1],
    [options.basePitch - 0.04, options.baseYaw + 0.1],
  ];

  let rotMaxX = 0;
  let rotMaxY = 0;
  let rotMaxZ = 0;
  const tmpV = new THREE.Vector3();
  const tmpEuler = new THREE.Euler(0, 0, 0, 'XYZ');

  for (let ai = 0; ai < testAngles.length; ai++) {
    tmpEuler.set(testAngles[ai][0], testAngles[ai][1], 0, 'XYZ');
    for (let i = 0; i < n; i++) {
      const a = sim[i];
      tmpV.set(a.x, a.y, a.z).applyEuler(tmpEuler);
      const pad = a.radius * 1.08 + 0.12;
      rotMaxX = Math.max(rotMaxX, Math.abs(tmpV.x) + pad);
      rotMaxY = Math.max(rotMaxY, Math.abs(tmpV.y) + pad);
      rotMaxZ = Math.max(rotMaxZ, Math.abs(tmpV.z) + pad);
    }
  }

  // Exact perspective frustum fit with clean UI headroom (top margin + bottom approach filter bar)
  const tanHalfV = Math.tan(THREE.MathUtils.degToRad(options.fovDeg * 0.5));
  const tanHalfH = tanHalfV * aspect;

  const horizontalFill = isNarrow ? 0.9 : 0.86;
  const verticalFill = vh < 680 ? 0.76 : 0.8;

  const zForWidth = rotMaxX / Math.max(0.08, tanHalfH * horizontalFill) + rotMaxZ;
  const zForHeight = rotMaxY / Math.max(0.08, tanHalfV * verticalFill) + rotMaxZ;

  const recommendedCameraZ = THREE.MathUtils.clamp(Math.max(zForWidth, zForHeight), 15.6, 44.0);
  const recommendedCameraY = recommendedCameraZ * 0.054;

  return {
    positions,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      halfW: Math.max(1, (maxX - minX) * 0.5),
      halfH: Math.max(1, (maxY - minY) * 0.5),
      halfD: Math.max(1, (maxZ - minZ) * 0.5),
    },
    recommendedCameraZ,
    recommendedCameraY,
    recommendedScale: 1,
    clusterBandGapY,
  };
}
