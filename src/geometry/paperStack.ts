import type { PaperScene } from './scenes';

export const PERSPECTIVE = 'matrix(1 .12 -.30 .79 128 37)';
export const PAPER_BOUNDS = 'M 0 0 H 400 V 350 H 0 Z';

export function createPaperStack(scene: PaperScene) {
  const slices = scene.slices.map((slice, index) => ({
    ...slice,
    elevation: slice.elevation ?? index * scene.layerPitch,
    thickness: slice.thickness ?? scene.sheetThickness,
  }));
  const coverElevation = Math.max(...slices.map(slice => slice.elevation)) + scene.layerPitch;
  const layers = [...slices, {
    id: 'cover', color: scene.coverColor, path: '', inlay: false,
    elevation: coverElevation, thickness: scene.sheetThickness,
  }].map(layer => ({ ...layer, vertical: coverElevation - layer.elevation }));
  const sequence = layers.map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => !layer.inlay).map(({ index }) => index).reverse();
  return { layers, sequence };
}
export type PaperStack = ReturnType<typeof createPaperStack>;
