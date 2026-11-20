import type { SceneChapterId, StackCategory } from '../data/portfolioData';

export type GeometryMode = 'minimal' | 'exploded' | 'wireframe';
export type CameraAngleId = 'core' | 'orbital' | 'axial' | 'top';

export interface PortfolioStoreState {
  activeChapter: SceneChapterId;
  scrollProgress: number;
  selectedCategory: StackCategory;
  selectedSkillId: string;
  geometryMode: GeometryMode;
  cameraAngle: CameraAngleId;
  explodeRatio: number;
  rotationSpeed: number;
}

type Listener = (state: PortfolioStoreState) => void;

const initialState: PortfolioStoreState = {
  activeChapter: 'hero',
  scrollProgress: 0,
  selectedCategory: 'all',
  selectedSkillId: 'cpp',
  geometryMode: 'minimal',
  cameraAngle: 'core',
  explodeRatio: 0,
  rotationSpeed: 1,
};

let state: PortfolioStoreState = { ...initialState };
const listeners = new Set<Listener>();

function emit(): void {
  const snapshot = { ...state };
  listeners.forEach((fn) => fn(snapshot));
}

export function getPortfolioState(): PortfolioStoreState {
  return { ...state };
}

export function subscribePortfolio(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

export function setScrollState(scrollProgress: number, activeChapter: SceneChapterId): void {
  const clamped = Math.max(0, Math.min(1, scrollProgress));
  if (
    Math.abs(state.scrollProgress - clamped) < 0.002 &&
    state.activeChapter === activeChapter
  ) {
    return;
  }
  state = { ...state, scrollProgress: clamped, activeChapter };
  emit();
}

export function setStackCategory(selectedCategory: StackCategory): void {
  if (state.selectedCategory === selectedCategory) return;
  state = { ...state, selectedCategory };
  emit();
}

export function setSelectedSkill(selectedSkillId: string): void {
  if (state.selectedSkillId === selectedSkillId) return;
  state = { ...state, selectedSkillId };
  emit();
}

export function setGeometryMode(geometryMode: GeometryMode): void {
  const explodeRatio =
    geometryMode === 'exploded' ? 0.78 : geometryMode === 'minimal' ? 0 : state.explodeRatio;
  state = { ...state, geometryMode, explodeRatio };
  emit();
}

export function setCameraAngle(cameraAngle: CameraAngleId): void {
  state = { ...state, cameraAngle };
  emit();
}

export function setExplodeRatio(explodeRatio: number): void {
  const clamped = Math.max(0, Math.min(1, explodeRatio));
  const geometryMode: GeometryMode =
    clamped > 0.15 ? 'exploded' : state.geometryMode === 'wireframe' ? 'wireframe' : 'minimal';
  state = { ...state, explodeRatio: clamped, geometryMode };
  emit();
}

export function resetSpatialStage(): void {
  state = {
    ...state,
    geometryMode: 'minimal',
    cameraAngle: 'core',
    explodeRatio: 0,
    rotationSpeed: 1,
  };
  emit();
}
