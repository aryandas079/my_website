import {
  InstancedBinaryDustRenderer,
  detectDeviceGpuTier,
} from './InstancedBinaryDust';

interface CardShowerRegistration {
  id: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cardW: number;
  cardH: number;
  padX: number;
  padTop: number;
  padBottom: number;
  isHovered: boolean;
  isVisible: boolean;
  pointerNormX: number;
  pointerNormY: number;
  rngState: number;
  spawnAcc: number;
  needsClear: boolean;
  // Flat typed arrays for zero-GC droplet simulation
  activeCount: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  gravity: Float32Array;
  size: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  isRed: Uint8Array;
  bits: Uint8Array; // 3 glyphs per drop
  flipTimer: Float32Array;
  trailLen: Uint8Array;
}

const MAX_DROPS_PER_CARD = 96;

/**
 * Single shared WebGLRenderer + THREE.InstancedMesh controller driving perimeter
 * binary dust showers for all 6 project cards using only 1 WebGL context.
 * Sleeps at 0% CPU/GPU whenever no card is hovered or settling.
 */
class SharedCardBinaryShowerController {
  private cards = new Map<string, CardShowerRegistration>();
  private gpuRenderer: InstancedBinaryDustRenderer | null = null;
  private isSoftwareGl = false;
  private dpr = 1;
  private curW = 0;
  private curH = 0;
  private rafId = 0;
  private isRunning = false;
  private lastMs = 0;

  private ensureGpuRenderer(): void {
    if (this.gpuRenderer || typeof window === 'undefined') return;
    const gpuTier = detectDeviceGpuTier();
    this.isSoftwareGl = gpuTier.isSoftwareGl;
    this.dpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, gpuTier.recommendedMaxDpr);
    this.gpuRenderer = new InstancedBinaryDustRenderer({
      maxInstances: MAX_DROPS_PER_CARD * 3 + 16,
      width: 480,
      height: 640,
      maxDpr: gpuTier.recommendedMaxDpr,
    });
  }

  public registerCard(cfg: {
    id: string;
    canvas: HTMLCanvasElement;
    cardW: number;
    cardH: number;
    padX: number;
    padTop: number;
    padBottom: number;
  }): void {
    const ctx = cfg.canvas.getContext('2d');
    if (!ctx) return;
    this.ensureGpuRenderer();

    let seed = 1337;
    for (let i = 0; i < cfg.id.length; i++) {
      seed = (seed * 31 + cfg.id.charCodeAt(i)) % 2147483647;
    }

    const card: CardShowerRegistration = {
      id: cfg.id,
      canvas: cfg.canvas,
      ctx,
      cardW: cfg.cardW,
      cardH: cfg.cardH,
      padX: cfg.padX,
      padTop: cfg.padTop,
      padBottom: cfg.padBottom,
      isHovered: false,
      isVisible: true,
      pointerNormX: 0,
      pointerNormY: 0,
      rngState: seed,
      spawnAcc: 0,
      needsClear: false,
      activeCount: 0,
      x: new Float32Array(MAX_DROPS_PER_CARD),
      y: new Float32Array(MAX_DROPS_PER_CARD),
      vx: new Float32Array(MAX_DROPS_PER_CARD),
      vy: new Float32Array(MAX_DROPS_PER_CARD),
      gravity: new Float32Array(MAX_DROPS_PER_CARD),
      size: new Float32Array(MAX_DROPS_PER_CARD),
      life: new Float32Array(MAX_DROPS_PER_CARD),
      maxLife: new Float32Array(MAX_DROPS_PER_CARD),
      isRed: new Uint8Array(MAX_DROPS_PER_CARD),
      bits: new Uint8Array(MAX_DROPS_PER_CARD * 3),
      flipTimer: new Float32Array(MAX_DROPS_PER_CARD),
      trailLen: new Uint8Array(MAX_DROPS_PER_CARD),
    };

    this.resizeCardCanvas(card, cfg.cardW, cfg.cardH);
    this.cards.set(cfg.id, card);
  }

  public unregisterCard(id: string): void {
    this.cards.delete(id);
    if (this.cards.size === 0 && this.isRunning) {
      cancelAnimationFrame(this.frameIdFromLoop);
      clearTimeout(this.frameIdFromLoop);
      this.isRunning = false;
    }
  }

  public resizeCard(id: string, cardW: number, cardH: number): void {
    const card = this.cards.get(id);
    if (!card) return;
    this.resizeCardCanvas(card, cardW, cardH);
    if (card.isHovered || card.activeCount > 0) {
      this.wakeLoop();
    }
  }

  private resizeCardCanvas(card: CardShowerRegistration, cardW: number, cardH: number): void {
    card.cardW = cardW;
    card.cardH = cardH;
    const cw = cardW + card.padX * 2;
    const ch = cardH + card.padTop + card.padBottom;
    const dpr = this.dpr || 1;
    card.canvas.width = Math.round(cw * dpr);
    card.canvas.height = Math.round(ch * dpr);
    card.canvas.style.width = `${cw}px`;
    card.canvas.style.height = `${ch}px`;
  }

  public updateCardState(
    id: string,
    state: {
      isHovered: boolean;
      isVisible: boolean;
      pointerNormX: number;
      pointerNormY: number;
    }
  ): void {
    const card = this.cards.get(id);
    if (!card) return;
    const wasHovered = card.isHovered;
    card.isHovered = state.isHovered;
    card.isVisible = state.isVisible;
    card.pointerNormX = state.pointerNormX;
    card.pointerNormY = state.pointerNormY;
    if (state.isHovered || wasHovered || card.activeCount > 0) {
      this.wakeLoop();
    }
  }

  private get frameIdFromLoop(): number {
    return this.rafId;
  }

  private nextRand(card: CardShowerRegistration): number {
    card.rngState = (card.rngState * 48271) % 2147483647;
    return (card.rngState - 1) / 2147483646;
  }

  private spawnDrop(card: CardShowerRegistration, burst: boolean): void {
    const idx = card.activeCount;
    if (idx >= MAX_DROPS_PER_CARD) return;

    const zone = this.nextRand(card);
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;

    if (zone < 0.46) {
      x = card.padX + 14 + this.nextRand(card) * Math.max(40, card.cardW - 28);
      y = card.padTop + card.cardH - 6 + this.nextRand(card) * 8;
      vx = (this.nextRand(card) - 0.5) * 14 + card.pointerNormX * 22;
      vy = 92 + this.nextRand(card) * 125;
    } else if (zone < 0.78) {
      const onRight = this.nextRand(card) > 0.5;
      const offset = 6 + this.nextRand(card) * 38;
      x = onRight ? card.padX + card.cardW + offset : card.padX - offset;
      y = card.padTop + 8 + this.nextRand(card) * (card.cardH * 0.88);
      vx = (onRight ? 1 : -1) * (4 + this.nextRand(card) * 14) + card.pointerNormX * 16;
      vy = 85 + this.nextRand(card) * 115;
    } else {
      x = card.padX - 18 + this.nextRand(card) * (card.cardW + 36);
      y = card.padTop - 6 - this.nextRand(card) * 26;
      vx = (this.nextRand(card) - 0.5) * 20 + card.pointerNormX * 18;
      vy = 62 + this.nextRand(card) * 88;
    }

    const pointerCanvasX = card.padX + (card.pointerNormX * 0.5 + 0.5) * card.cardW;
    const distToPointer = Math.abs(x - pointerCanvasX) / Math.max(1, card.cardW);
    const redChance = distToPointer < 0.3 ? 0.42 : 0.22;

    card.x[idx] = x;
    card.y[idx] = y;
    card.vx[idx] = vx;
    card.vy[idx] = burst ? vy * 1.15 : vy;
    card.gravity[idx] = 135 + this.nextRand(card) * 110;
    card.size[idx] = 10 + Math.floor(this.nextRand(card) * 3.5);
    card.life[idx] = 0;
    card.maxLife[idx] = 0.72 + this.nextRand(card) * 0.78;
    card.isRed[idx] = this.nextRand(card) < redChance ? 1 : 0;
    const bIdx = idx * 3;
    card.bits[bIdx] = this.nextRand(card) > 0.48 ? 1 : 0;
    card.bits[bIdx + 1] = this.nextRand(card) > 0.48 ? 1 : 0;
    card.bits[bIdx + 2] = this.nextRand(card) > 0.48 ? 1 : 0;
    card.flipTimer[idx] = 0.06 + this.nextRand(card) * 0.12;
    card.trailLen[idx] = this.nextRand(card) > 0.35 ? 3 : 2;
    card.activeCount = idx + 1;
  }

  private removeDropSwap(card: CardShowerRegistration, i: number): void {
    const last = card.activeCount - 1;
    if (i !== last) {
      card.x[i] = card.x[last];
      card.y[i] = card.y[last];
      card.vx[i] = card.vx[last];
      card.vy[i] = card.vy[last];
      card.gravity[i] = card.gravity[last];
      card.size[i] = card.size[last];
      card.life[i] = card.life[last];
      card.maxLife[i] = card.maxLife[last];
      card.isRed[i] = card.isRed[last];
      card.flipTimer[i] = card.flipTimer[last];
      card.trailLen[i] = card.trailLen[last];
      const bi = i * 3;
      const bl = last * 3;
      card.bits[bi] = card.bits[bl];
      card.bits[bi + 1] = card.bits[bl + 1];
      card.bits[bi + 2] = card.bits[bl + 2];
    }
    card.activeCount = last;
  }

  private wakeLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastMs = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private afterDraw(cb: () => void): void {
    if (!this.gpuRenderer) return;
    const gl = this.gpuRenderer.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.rafId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.rafId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.rafId = window.setTimeout(cb, 80);
      }
    };
    this.rafId = window.setTimeout(poll, 5);
  }

  private tick = (nowMs: number): void => {
    const dt = Math.min((nowMs - this.lastMs) / 1000, 0.05);
    this.lastMs = nowMs;

    let anyActive = false;

    for (const card of this.cards.values()) {
      if (!card.isVisible) {
        if (card.needsClear) {
          card.ctx.clearRect(0, 0, card.canvas.width, card.canvas.height);
          card.needsClear = false;
        }
        continue;
      }

      if (card.isHovered) {
        if (card.activeCount < 18) {
          for (let b = 0; b < 8; b++) this.spawnDrop(card, true);
        }
        card.spawnAcc += dt * 74;
        while (card.spawnAcc >= 1) {
          card.spawnAcc -= 1;
          this.spawnDrop(card, false);
        }
      } else {
        card.spawnAcc = 0;
      }

      if (!card.isHovered && card.activeCount === 0) {
        if (card.needsClear) {
          card.ctx.clearRect(0, 0, card.canvas.width, card.canvas.height);
          card.needsClear = false;
        }
        continue;
      }

      anyActive = true;
      card.needsClear = true;
      this.simulateAndRenderCard(card, dt);
    }

    if (!anyActive) {
      this.isRunning = false;
      return;
    }

    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (this.isRunning) this.tick(performance.now());
      });
    } else {
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  private simulateAndRenderCard(card: CardShowerRegistration, dt: number): void {
    const gpu = this.gpuRenderer;
    if (!gpu) return;

    const canvasW = card.cardW + card.padX * 2;
    const canvasH = card.cardH + card.padTop + card.padBottom;
    if (canvasW !== this.curW || canvasH !== this.curH) {
      this.curW = canvasW;
      this.curH = canvasH;
      gpu.resize(canvasW, canvasH, false);
    }

    const windX = card.pointerNormX * 26;
    const pointerPullY = card.pointerNormY * 14;
    const dampRate = Math.min(1, dt * 1.8);

    gpu.beginFrame();

    for (let i = card.activeCount - 1; i >= 0; i--) {
      card.life[i] += dt;
      card.vy[i] += (card.gravity[i] + pointerPullY) * dt;
      card.vx[i] += (windX - card.vx[i]) * dampRate;
      card.x[i] += card.vx[i] * dt;
      card.y[i] += card.vy[i] * dt;

      card.flipTimer[i] -= dt;
      if (card.flipTimer[i] <= 0) {
        card.flipTimer[i] = 0.08 + this.nextRand(card) * 0.14;
        const bIdx = i * 3;
        card.bits[bIdx + 2] = card.bits[bIdx + 1];
        card.bits[bIdx + 1] = card.bits[bIdx];
        card.bits[bIdx] = card.bits[bIdx] === 1 ? 0 : 1;
      }

      const progress = card.life[i] / card.maxLife[i];
      const px = card.x[i];
      const py = card.y[i];
      if (progress >= 1 || py > canvasH - 4 || px < 4 || px > canvasW - 4) {
        this.removeDropSwap(card, i);
        continue;
      }

      const fadeIn = Math.min(1, progress / 0.14);
      const fadeOut = Math.max(0, 1 - Math.max(0, (progress - 0.55) / 0.45));
      const baseAlpha = fadeIn * fadeOut * (card.isHovered ? 0.94 : 0.72);
      if (baseAlpha <= 0.02) continue;

      const sz = card.size[i];
      const stepY = sz * 1.18;
      const tLen = card.trailLen[i];
      const bIdx = i * 3;
      const isRed = card.isRed[i] === 1;

      for (let t = tLen - 1; t >= 0; t--) {
        const ty = py - t * stepY;
        if (ty < 4 || ty > canvasH - 4) continue;
        const trailFactor = t === 0 ? 1 : t === 1 ? 0.48 : 0.2;
        const a = baseAlpha * trailFactor;
        if (a <= 0.02) continue;

        const bit = card.bits[bIdx + t] === 1 ? 1 : 0;
        if (isRed && t === 0) {
          gpu.push(px, ty, sz * 1.28, bit, 1.0, 0.149, 0.106, a);
        } else if (isRed) {
          gpu.push(px, ty, sz * 1.24, bit, 1.0, 0.251, 0.212, a * 0.85);
        } else {
          gpu.push(px, ty, sz * 1.24, bit, 0.086, 0.086, 0.078, a * 0.88);
        }
      }
    }

    gpu.render();
    card.ctx.clearRect(0, 0, card.canvas.width, card.canvas.height);
    if (gpu.batch.count > 0) {
      card.ctx.drawImage(
        gpu.domElement,
        0,
        0,
        gpu.domElement.width,
        gpu.domElement.height,
        0,
        0,
        card.canvas.width,
        card.canvas.height
      );
    }
  }
}

export const sharedCardBinaryShower = new SharedCardBinaryShowerController();
