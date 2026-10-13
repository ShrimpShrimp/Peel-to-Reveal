import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaperStack } from '../src/geometry/paperStack.ts';
import { scenes } from '../src/geometry/scenes.ts';

for (const scene of Object.values(scenes)) {
  test(`${scene.label} begins with an opaque cover and peels each surrounding sheet once`, () => {
    const { layers, sequence } = createPaperStack(scene);
    const cover = layers[sequence[0]];
    assert.equal(cover.id, 'cover');
    assert.equal(cover.path, '');
    assert.equal(cover.vertical, 0);
    assert.equal(sequence.length, scene.id === 'tree' ? 35 : 15);
    assert.equal(new Set(sequence).size, sequence.length);
    assert.ok(sequence.every(index => !layers[index].inlay));
    assert.ok(sequence.every((index, position) => !position || layers[index].vertical > layers[sequence[position - 1]].vertical));
  });
}

test('the approved shrimp keeps exactly the same slice positions and thickness', () => {
  const { layers } = createPaperStack(scenes.shrimp);
  layers.forEach((layer, index) => {
    assert.ok(Math.abs(layer.vertical - (layers.length - 1 - index) * 3.2) < 1e-10);
    assert.equal(layer.thickness, 2.5);
  });
});

test('courtyard inlays do not create empty courses or move the roof', () => {
  const withInlays = createPaperStack(scenes.courtyard);
  const withoutInlays = createPaperStack({ ...scenes.courtyard, slices: scenes.courtyard.slices.filter(slice => !slice.inlay) });
  for (const layer of withoutInlays.layers) {
    assert.equal(withInlays.layers.find(other => other.id === layer.id)?.vertical, layer.vertical);
  }
  assert.equal(withInlays.layers.filter(layer => layer.inlay).length, 2);
});

function contours(path: string): [number, number][][] {
  return [...path.matchAll(/M .*? Z/g)].map(match => {
    const numbers = match[0].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const points: [number, number][] = [];
    for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
    return points;
  });
}
function area(points: [number, number][]) {
  return points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
}
function contains(points: [number, number][], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

test('each foliage sheet has one connected outer contour with real apertures', () => {
  const canopy = scenes.tree.slices.filter(slice => slice.id.startsWith('tree-canopy-'));
  assert.equal(canopy.length, 17);
  assert.equal(new Set(canopy.map(slice => slice.path)).size, canopy.length);
  for (const slice of canopy) {
    const rings = contours(slice.path);
    assert.equal(rings.filter(ring => area(ring) > 0).length, 1, slice.id);
    assert.ok(rings.filter(ring => area(ring) < 0).length >= 5, slice.id);
    assert.equal(rings.reduce((winding, ring) => winding + (contains(ring, 239, 184) ? Math.sign(area(ring)) : 0), 0), 1, `${slice.id} retains its fork seat`);
  }
  const stack = createPaperStack(scenes.tree);
  const woodInlays = scenes.tree.slices.filter(slice => slice.inlay);
  assert.equal(woodInlays.length, 13);
  assert.ok(woodInlays.every(slice => !stack.sequence.some(index => stack.layers[index].id === slice.id)));
});

test('adjacent tree wood courses overlap vertically from the root flare to the branch fork', () => {
  const wood = scenes.tree.slices.filter(slice => slice.id.startsWith('tree-wood-'));
  for (let i = 1; i < wood.length; i++) {
    assert.ok(wood[i].elevation! - wood[i - 1].elevation! <= wood[i].thickness!);
  }
});

test('wood courses overlap in plan from roots through the bent upper fork', () => {
  const wood = scenes.tree.slices.filter(slice => slice.id.startsWith('tree-wood-') && slice.id !== 'tree-wood-01');
  const rings = wood.map(slice => contours(slice.path)[0]);
  const centers = rings.map(ring => ring.reduce((sum, p) => [sum[0] + p[0] / ring.length, sum[1] + p[1] / ring.length], [0, 0]));
  for (let i = 1; i < rings.length; i++) {
    const x = (centers[i][0] + centers[i - 1][0]) / 2;
    const y = (centers[i][1] + centers[i - 1][1]) / 2;
    assert.ok(contains(rings[i], x, y) && contains(rings[i - 1], x, y), wood[i].id);
  }
  for (const ring of rings.slice(-3)) assert.ok(contains(ring, 239, 184), 'Upper wood physically reaches the shared canopy seat');
});
