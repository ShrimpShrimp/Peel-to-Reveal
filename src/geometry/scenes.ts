import { COVER_COLOR, shrimpSlices } from './shrimpSlices.ts';
import { courtyardOpeningShadow, courtyardSlices } from './courtyardSlices.ts';
import { treeOpeningShadow, treeSlices } from './treeSlices.ts';

export type PaperSlice = {
  id: string;
  color: string;
  path: string;
  inlay?: boolean;
  elevation?: number;
  thickness?: number;
};
export type SceneId = 'shrimp' | 'courtyard' | 'tree';
export type PaperScene = {
  id: SceneId;
  label: string;
  caption: string;
  description: string;
  slices: readonly PaperSlice[];
  coverColor: string;
  layerPitch: number;
  sheetThickness: number;
  viewHeight: number;
  ground: { y: number; revealedRadius: number };
  shadows?: readonly { afterSlice: string; path: string; color: string; opacity: number }[];
};

export const scenes: Record<SceneId, PaperScene> = {
  shrimp: {
    id: 'shrimp', label: 'Shrimp', caption: 'A little shrimp, layer by layer.',
    description: 'A sculpted shrimp made from registered salmon, peach, and warm yellow paper slices, with a small dark eye and curved antennae.',
    slices: shrimpSlices.map(slice => ({ ...slice, inlay: slice.id === 'eye-inlay' })),
    coverColor: COVER_COLOR, layerPitch: 3.2, sheetThickness: 2.5,
    viewHeight: 440, ground: { y: 367, revealedRadius: 128 },
  },
  courtyard: {
    id: 'courtyard', label: 'Courtyard', caption: 'A quiet courtyard, layer by layer.',
    description: 'A traditional stone house with three arches and a terracotta roof, opening onto a stepped terrace, four clipped garden trees, and a small round fountain.',
    slices: courtyardSlices, coverColor: '#f8e6ce', layerPitch: 6, sheetThickness: 5.2,
    viewHeight: 480, ground: { y: 419, revealedRadius: 177 },
    shadows: [{ afterSlice: 'courtyard-03', path: courtyardOpeningShadow, color: '#65533f', opacity: .22 }],
  },
  tree: {
    id: 'tree', label: 'Tree', caption: 'Under the canopy, layer by layer.',
    description: 'A broad blue tree with connected, lacy paper foliage sheets, a lower side bough, a continuous bent trunk and fork entering the crown, with root buttresses, and a detailed woodland shelter with a pitched roof, framed openings, porch railings, and stairs.',
    slices: treeSlices, coverColor: '#f8e6ce', layerPitch: 4, sheetThickness: 4.15,
    viewHeight: 520, ground: { y: 460, revealedRadius: 174 },
    shadows: [{ afterSlice: 'tree-wood-03', path: treeOpeningShadow, color: '#4f3827', opacity: .52 }],
  },
};
