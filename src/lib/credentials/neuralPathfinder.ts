import * as THREE from 'three';

export interface CorridorObstacle {
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface EdgeRouteRequest {
  edgeIdx: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromSize: number;
  toSize: number;
  priority: number; // Higher priority routes claim the cleanest central channels first
}

export interface RoutedEdgePath {
  edgeIdx: number;
  /** Flattened [x0, y0, z0, x1, y1, z1, ...] of length (subdivisions + 1) * 3 */
  points: Float32Array;
  /** Normalized progress t in [0..1] for each sample */
  tValues: Float32Array;
}

interface SlabSegment {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
}

/**
 * Exact squared shortest distance between two 3D line segments P(a->b) and Q(c->d).
 * Used by the 3D pathfinder to penalize intersections and maintain clean visual clearance.
 */
function segmentToSegmentDistSq3D(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
  dx: number,
  dy: number,
  dz: number
): number {
  const ux = bx - ax;
  const uy = by - ay;
  const uz = bz - az;
  const vx = dx - cx;
  const vy = dy - cy;
  const vz = dz - cz;
  const wx = ax - cx;
  const wy = ay - cy;
  const wz = az - cz;

  const a = ux * ux + uy * uy + uz * uz;
  const b = ux * vx + uy * vy + uz * vz;
  const c = vx * vx + vy * vy + vz * vz;
  const d = ux * wx + uy * wy + uz * wz;
  const e = vx * wx + vy * wy + vz * wz;
  const D = a * c - b * b;

  let sc: number;
  let sN: number;
  let sD = D;
  let tc: number;
  let tN: number;
  let tD = D;

  const EPS = 1e-6;
  if (D < EPS) {
    sN = 0;
    sD = 1;
    tN = e;
    tD = c;
  } else {
    sN = b * e - c * d;
    tN = a * e - b * d;
    if (sN < 0) {
      sN = 0;
      tN = e;
      tD = c;
    } else if (sN > sD) {
      sN = sD;
      tN = e + b;
      tD = c;
    }
  }

  if (tN < 0) {
    tN = 0;
    if (-d < 0) {
      sN = 0;
    } else if (-d > a) {
      sN = sD;
    } else {
      sN = -d;
      sD = a;
    }
  } else if (tN > tD) {
    tN = tD;
    if (-d + b < 0) {
      sN = 0;
    } else if (-d + b > a) {
      sN = sD;
    } else {
      sN = -d + b;
      sD = a;
    }
  }

  sc = Math.abs(sN) < EPS ? 0 : sN / sD;
  tc = Math.abs(tN) < EPS ? 0 : tN / tD;

  const px = wx + sc * ux - tc * vx;
  const py = wy + sc * uy - tc * vy;
  const pz = wz + sc * uz - tc * vz;
  return px * px + py * py + pz * pz;
}

/**
 * 3D Corridor A* Pathfinding & Channel Allocation Router.
 *
 * Routes all inter-layer connections inside a structured 3D voxel lattice between
 * adjacent neural layers using A* search with:
 *   1. Obstacle avoidance around neighboring 3D cubes
 *   2. Dynamic channel-occupancy spreading so parallel wires bundle into neat lanes
 *   3. 3D segment proximity & front-elevation crossing penalties to avoid X-shaped clutter
 *   4. Centripetal Catmull-Rom spline smoothing for crisp architectural curves
 */
export function routeCorridorEdges3D(
  requests: EdgeRouteRequest[],
  obstacles: CorridorObstacle[],
  subdivisions = 10
): RoutedEdgePath[] {
  if (requests.length === 0) return [];

  // Determine corridor extents from endpoints
  let xFrom = Infinity;
  let xTo = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const r of requests) {
    if (r.fromPos.x < xFrom) xFrom = r.fromPos.x;
    if (r.toPos.x > xTo) xTo = r.toPos.x;
    minY = Math.min(minY, r.fromPos.y, r.toPos.y);
    maxY = Math.max(maxY, r.fromPos.y, r.toPos.y);
    minZ = Math.min(minZ, r.fromPos.z, r.toPos.z);
    maxZ = Math.max(maxZ, r.fromPos.z, r.toPos.z);
  }

  // Expand routing bounds slightly so outer lanes can curve gracefully around dense hubs
  const padY = 0.56;
  const padZ = 0.52;
  const yMin = minY - padY;
  const yMax = maxY + padY;
  const zMin = minZ - padZ;
  const zMax = maxZ + padZ;

  // 3 intermediate routing planes between source port exit and target port entry
  const SLICES = 3;
  const NY = 13;
  const NZ = 7;
  const planeSize = NY * NZ;
  const totalVoxels = SLICES * planeSize;

  const spanX = Math.max(0.6, xTo - xFrom);
  const sliceX: number[] = [];
  for (let ix = 0; ix < SLICES; ix++) {
    const frac = 0.24 + (ix / (SLICES - 1)) * 0.52;
    sliceX.push(xFrom + spanX * frac);
  }

  const laneY: number[] = [];
  for (let iy = 0; iy < NY; iy++) {
    laneY.push(yMin + (iy / (NY - 1)) * (yMax - yMin));
  }

  const laneZ: number[] = [];
  for (let iz = 0; iz < NZ; iz++) {
    laneZ.push(zMin + (iz / (NZ - 1)) * (zMax - zMin));
  }

  // Precompute voxel obstacle costs
  const obstacleCost = new Float32Array(totalVoxels);
  for (let ix = 0; ix < SLICES; ix++) {
    const vx = sliceX[ix];
    for (let iy = 0; iy < NY; iy++) {
      const vy = laneY[iy];
      for (let iz = 0; iz < NZ; iz++) {
        const vz = laneZ[iz];
        let cost = 0;
        for (let oi = 0; oi < obstacles.length; oi++) {
          const ob = obstacles[oi];
          const dx = vx - ob.x;
          const dy = vy - ob.y;
          const dz = vz - ob.z;
          const d = Math.hypot(dx, dy, dz);
          const safeR = ob.radius * 1.45;
          if (d < safeR) {
            cost += (1 - d / safeR) * 18;
          }
        }
        obstacleCost[ix * planeSize + iy * NZ + iz] = cost;
      }
    }
  }

  // Dynamic routing state shared across this corridor
  const voxelOccupancy = new Uint16Array(totalVoxels);
  // Slabs: 0 = portStart->s0, 1 = s0->s1, 2 = s1->s2, 3 = s2->portEnd
  const slabSegments: SlabSegment[][] = [[], [], [], []];

  // Deterministic priority sort: semantic pathways & shorter central runs claim prime lanes first
  const ordered = [...requests].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const da = a.fromPos.distanceToSquared(a.toPos);
    const db = b.fromPos.distanceToSquared(b.toPos);
    if (Math.abs(da - db) > 0.001) return da - db;
    return a.edgeIdx - b.edgeIdx;
  });

  const CLEARANCE = 0.28;
  const CLEARANCE_SQ = CLEARANCE * CLEARANCE;

  function evaluateSlabPenalty(
    slabIdx: number,
    ax: number,
    ay: number,
    az: number,
    bx: number,
    by: number,
    bz: number
  ): number {
    const segs = slabSegments[slabIdx];
    let penalty = 0;
    const midZ = (az + bz) * 0.5;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      // Fast 3D bounding reject
      const sMidZ = (s.az + s.bz) * 0.5;
      const dzMid = Math.abs(midZ - sMidZ);
      if (dzMid > 0.65) continue;

      const dSq = segmentToSegmentDistSq3D(
        ax,
        ay,
        az,
        bx,
        by,
        bz,
        s.ax,
        s.ay,
        s.az,
        s.bx,
        s.by,
        s.bz
      );
      if (dSq < CLEARANCE_SQ) {
        const d = Math.sqrt(dSq);
        penalty += (1 - d / CLEARANCE) * 3.6;
      }

      // Front-view elevation crossing penalty when in similar depth plane
      if (dzMid < 0.34) {
        const diffStart = ay - s.ay;
        const diffEnd = by - s.by;
        if (diffStart * diffEnd < -0.006) {
          penalty += 1.65;
        }
      }
    }
    return penalty;
  }

  function nearestLane(val: number, lanes: number[]): number {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < lanes.length; i++) {
      const d = Math.abs(val - lanes[i]);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  const results: RoutedEdgePath[] = [];

  // Scratch A* arrays (reused across all requests in this corridor)
  const gScore = new Float32Array(totalVoxels);
  const fScore = new Float32Array(totalVoxels);
  const parent = new Int32Array(totalVoxels);
  const closed = new Uint8Array(totalVoxels);
  const inOpen = new Uint8Array(totalVoxels);

  for (let ri = 0; ri < ordered.length; ri++) {
    const req = ordered[ri];

    // Exact clean docking ports on +X face of source cube and -X face of destination cube
    const fromFaceX = req.fromPos.x + req.fromSize * 0.49;
    const toFaceX = req.toPos.x - req.toSize * 0.49;
    const fromPortX = req.fromPos.x + req.fromSize * 0.68;
    const toPortX = req.toPos.x - req.toSize * 0.68;

    const sx = fromPortX;
    const sy = req.fromPos.y;
    const sz = req.fromPos.z;
    const tx = toPortX;
    const ty = req.toPos.y;
    const tz = req.toPos.z;

    gScore.fill(Infinity);
    fScore.fill(Infinity);
    parent.fill(-1);
    closed.fill(0);
    inOpen.fill(0);

    const openList: number[] = [];

    // Seed Slice 0 candidates near source port (within ±2 Y/Z lanes)
    const startIy = nearestLane(sy, laneY);
    const startIz = nearestLane(sz, laneZ);

    for (let dy = -2; dy <= 2; dy++) {
      const iy = startIy + dy;
      if (iy < 0 || iy >= NY) continue;
      for (let dz = -2; dz <= 2; dz++) {
        const iz = startIz + dz;
        if (iz < 0 || iz >= NZ) continue;
        const vid = iy * NZ + iz;
        const vx = sliceX[0];
        const vy = laneY[iy];
        const vz = laneZ[iz];

        const dist = Math.hypot(vx - sx, vy - sy, vz - sz);
        const occ = voxelOccupancy[vid] * 1.45;
        const cross = evaluateSlabPenalty(0, sx, sy, sz, vx, vy, vz);
        // Gentle alignment preference so exit feels crisp and horizontal
        const exitBend = (Math.abs(vy - sy) * 0.35 + Math.abs(vz - sz) * 0.35);
        const g = dist + occ + cross + obstacleCost[vid] + exitBend;
        const h = Math.hypot(tx - vx, ty - vy, tz - vz);

        gScore[vid] = g;
        fScore[vid] = g + h;
        openList.push(vid);
        inOpen[vid] = 1;
      }
    }

    let bestGoalVid = -1;
    let bestGoalCost = Infinity;

    // A* search forward across the 3D corridor lattice (Slice 0 -> Slice 1 -> Slice 2 -> Target Port)
    while (openList.length > 0) {
      // Pop lowest fScore
      let bestOpenIdx = 0;
      let curVid = openList[0];
      let curF = fScore[curVid];
      for (let i = 1; i < openList.length; i++) {
        const vid = openList[i];
        if (fScore[vid] < curF) {
          curF = fScore[vid];
          curVid = vid;
          bestOpenIdx = i;
        }
      }
      openList[bestOpenIdx] = openList[openList.length - 1];
      openList.pop();
      inOpen[curVid] = 0;

      if (curF >= bestGoalCost) break;
      if (closed[curVid]) continue;
      closed[curVid] = 1;

      const ix = Math.floor(curVid / planeSize);
      const rem = curVid - ix * planeSize;
      const iy = Math.floor(rem / NZ);
      const iz = rem - iy * NZ;

      const cx = sliceX[ix];
      const cy = laneY[iy];
      const cz = laneZ[iz];

      // If at final internal slice, evaluate docking straight into target port
      if (ix === SLICES - 1) {
        const distToGoal = Math.hypot(tx - cx, ty - cy, tz - cz);
        const crossGoal = evaluateSlabPenalty(SLICES, cx, cy, cz, tx, ty, tz);
        const entryBend = Math.abs(ty - cy) * 0.32 + Math.abs(tz - cz) * 0.32;
        const totalCost = gScore[curVid] + distToGoal + crossGoal + entryBend;
        if (totalCost < bestGoalCost) {
          bestGoalCost = totalCost;
          bestGoalVid = curVid;
        }
        continue;
      }

      // Compute previous step vector for smooth curvature preservation
      let prevDy = cy - sy;
      let prevDz = cz - sz;
      const pVid = parent[curVid];
      if (pVid >= 0) {
        const pRem = pVid % planeSize;
        const pIy = Math.floor(pRem / NZ);
        const pIz = pRem - pIy * NZ;
        prevDy = cy - laneY[pIy];
        prevDz = cz - laneZ[pIz];
      }

      // Expand forward into Slice ix + 1 within bounded lateral cone (prevents sharp chaotic kinks)
      const nextIx = ix + 1;
      const nx = sliceX[nextIx];
      const targetIy = nearestLane(ty, laneY);
      const targetIz = nearestLane(tz, laneZ);

      for (let dY = -4; dY <= 4; dY++) {
        const nIy = iy + dY;
        if (nIy < 0 || nIy >= NY) continue;
        // On last internal slice, keep within reachable docking cone of target
        if (nextIx === SLICES - 1 && Math.abs(nIy - targetIy) > 4) continue;

        for (let dZ = -2; dZ <= 2; dZ++) {
          const nIz = iz + dZ;
          if (nIz < 0 || nIz >= NZ) continue;
          if (nextIx === SLICES - 1 && Math.abs(nIz - targetIz) > 2) continue;

          const nVid = nextIx * planeSize + nIy * NZ + nIz;
          if (closed[nVid]) continue;

          const ny = laneY[nIy];
          const nz = laneZ[nIz];

          const stepDist = Math.hypot(nx - cx, ny - cy, nz - cz);
          const occ = voxelOccupancy[nVid] * 1.45;
          const cross = evaluateSlabPenalty(nextIx, cx, cy, cz, nx, ny, nz);

          // Turn smoothness penalty: gently rewards consistent slope
          const curDy = ny - cy;
          const curDz = nz - cz;
          const turnCost = (Math.abs(curDy - prevDy) + Math.abs(curDz - prevDz)) * 0.22;

          const tentativeG = gScore[curVid] + stepDist + occ + cross + obstacleCost[nVid] + turnCost;
          if (tentativeG < gScore[nVid]) {
            parent[nVid] = curVid;
            gScore[nVid] = tentativeG;
            fScore[nVid] = tentativeG + Math.hypot(tx - nx, ty - ny, tz - nz);
            if (!inOpen[nVid]) {
              openList.push(nVid);
              inOpen[nVid] = 1;
            }
          }
        }
      }
    }

    // Reconstruct chosen 3D waypoints
    const waypoints: THREE.Vector3[] = [];
    const chosenVids: number[] = [];
    if (bestGoalVid >= 0) {
      let cur = bestGoalVid;
      while (cur >= 0) {
        chosenVids.push(cur);
        cur = parent[cur];
      }
      chosenVids.reverse();
    }

    // Commit chosen path into occupancy & slab segment registries for subsequent routes
    const controlPts: THREE.Vector3[] = [
      new THREE.Vector3(fromFaceX, req.fromPos.y, req.fromPos.z),
      new THREE.Vector3(sx, sy, sz),
    ];

    let prevX = sx;
    let prevY = sy;
    let prevZ = sz;

    for (let i = 0; i < chosenVids.length; i++) {
      const vid = chosenVids[i];
      voxelOccupancy[vid] += 1;
      const ix = Math.floor(vid / planeSize);
      const rem = vid - ix * planeSize;
      const iy = Math.floor(rem / NZ);
      const iz = rem - iy * NZ;
      const wx = sliceX[ix];
      const wy = laneY[iy];
      const wz = laneZ[iz];

      slabSegments[i].push({
        ax: prevX,
        ay: prevY,
        az: prevZ,
        bx: wx,
        by: wy,
        bz: wz,
      });

      const wp = new THREE.Vector3(wx, wy, wz);
      waypoints.push(wp);
      controlPts.push(wp);

      prevX = wx;
      prevY = wy;
      prevZ = wz;
    }

    slabSegments[Math.min(SLICES, chosenVids.length)].push({
      ax: prevX,
      ay: prevY,
      az: prevZ,
      bx: tx,
      by: ty,
      bz: tz,
    });

    controlPts.push(
      new THREE.Vector3(tx, ty, tz),
      new THREE.Vector3(toFaceX, req.toPos.y, req.toPos.z)
    );

    // Smooth centripetal Catmull-Rom spline sampling for clean, organized 3D curves
    const curve = new THREE.CatmullRomCurve3(controlPts, false, 'centripetal', 0.42);
    const sampled = curve.getSpacedPoints(subdivisions);

    const points = new Float32Array((subdivisions + 1) * 3);
    const tValues = new Float32Array(subdivisions + 1);
    for (let s = 0; s <= subdivisions; s++) {
      const p = sampled[s];
      points[s * 3] = p.x;
      points[s * 3 + 1] = p.y;
      points[s * 3 + 2] = p.z;
      tValues[s] = s / subdivisions;
    }

    results.push({
      edgeIdx: req.edgeIdx,
      points,
      tValues,
    });
  }

  return results;
}
