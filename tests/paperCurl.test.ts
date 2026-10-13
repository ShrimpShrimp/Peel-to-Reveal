import { test } from 'node:test';
import assert from 'node:assert/strict';
import { curlPatches, paperEdge, paperPoint, peelFrame, returnFrame } from '../src/interaction/paperCurl.ts';
import type { CurlFrame } from '../src/interaction/paperCurl.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
const base: CurlFrame = { direction: 'left', progress: 0, radius: 54, exitX: 0, exitY: 0, opacity: 1 };

test('a flat sheet exactly matches the registered sculpture projection', () => {
  for (const x of [0, 85, 200, 400]) for (const y of [0, 175, 350]) {
    const point = paperPoint(x, y, base, 48);
    close(point.x, 128 + x - .30 * y);
    close(point.y, 37 + .12 * x + .79 * y + 48);
    assert.equal(point.lift, 0);
  }
});

test('the adhered portion remains on the surface in both peel directions', () => {
  for (const direction of ['left', 'right'] as const) {
    const frame = { ...base, direction, progress: .45 };
    const x = direction === 'left' ? 80 : 320;
    const point = paperPoint(x, 175, frame);
    close(point.x, 128 + x - .30 * 175);
    close(point.y, 37 + .12 * x + .79 * 175);
    assert.equal(point.lift, 0);
  }
});

test('detached paper curves upward and doubles back past the crease', () => {
  const frame = { ...base, progress: .6 };
  const point = paperPoint(400, 0, frame);
  assert.ok(point.lift > 100);
  assert.ok(point.x - 128 < 400 * (1 - frame.progress));
  assert.equal(point.angle, Math.PI);
});

test('left and right curls are exact mirrors in the paper coordinate system', () => {
  for (const progress of [.05, .3, .6, 1]) for (const x of [0, 97, 240, 400]) {
    const left = paperPoint(x, 150, { ...base, progress });
    const right = paperPoint(400 - x, 150, { ...base, progress, direction: 'right' });
    const planarLeft = left.x - 128 + .3 * 150;
    const planarRight = right.x - 128 + .3 * 150;
    close(planarLeft + planarRight, 400);
    close(left.lift, right.lift);
    close(left.y - .12 * planarLeft, right.y - .12 * planarRight);
  }
});

test('the deformation covers the whole sheet and uses continuous shared edges', () => {
  for (const direction of ['left', 'right'] as const) for (const progress of [.018, .4, 1]) {
    const frame = { ...base, direction, progress };
    const patches = curlPatches(frame, 32).sort((a, b) => a.x - b.x);
    close(patches.reduce((sum, patch) => sum + patch.width, 0), 400);
    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i];
      assert.ok(patch.matrix.every(Number.isFinite));
      if (i) close(patches[i - 1].x + patches[i - 1].width, patch.x);
      const [a, b, c, d, e, f] = patch.matrix;
      for (const x of [patch.x, patch.x + patch.width]) {
        const point = paperPoint(x, 350, frame, 32);
        close(a * x + c * 350 + e, point.x);
        close(b * x + d * 350 + f, point.y);
      }
    }
  }
});

test('paper rolls off the surface before its detached exit begins', () => {
  const start = { ...base, progress: .35 };
  assert.deepEqual(peelFrame(start, 0), start);
  assert.equal(peelFrame(start, .6).exitX, 0);
  assert.equal(peelFrame(start, .72).progress, 1);
  assert.ok(peelFrame(start, .85).exitX < 0);
  assert.ok(peelFrame({ ...start, direction: 'right' }, .85).exitX > 0);
  assert.equal(peelFrame(start, 1).opacity, 0);
});

test('only detached material belongs in front of the sculpture, including during rollback', () => {
  for (const direction of ['left', 'right'] as const) for (const progress of [0, .018, .4, .85, 1]) {
    const frame = { ...base, direction, progress };
    const patches = curlPatches(frame);
    const adhered = patches.filter(patch => !patch.lifted);
    const lifted = patches.filter(patch => patch.lifted);
    close(adhered.reduce((sum, patch) => sum + patch.width, 0), 400 * (1 - progress));
    close(lifted.reduce((sum, patch) => sum + patch.width, 0), 400 * progress);
    assert.ok(adhered.every(patch => patch.lift === 0));
    assert.ok(lifted.every(patch => patch.lift > 0));
    const returned = returnFrame(frame, 1);
    assert.ok(curlPatches(returned).every(patch => !patch.lifted));
  }
});

test('section outlines omit the shared crease and disappear with their section', () => {
  for (const direction of ['left', 'right'] as const) {
    const frame = { ...base, direction, progress: .4 };
    for (const surface of ['adhered', 'lifted'] as const) {
      const edge = paperEdge(frame, 32, surface);
      assert.ok(edge.startsWith('M '));
      assert.ok(!edge.endsWith('Z'));
      assert.ok(!edge.includes('NaN'));
    }
    assert.equal(paperEdge({ ...frame, progress: 0 }, 0, 'lifted'), '');
    assert.equal(paperEdge({ ...frame, progress: 1 }, 0, 'adhered'), '');
  }
});

test('an unsuccessful peel unrolls back into perfect registration', () => {
  for (const direction of ['left', 'right'] as const) {
    const returned = returnFrame({ ...base, direction, progress: .6 }, 1);
    assert.equal(returned.direction, direction);
    assert.equal(returned.progress, 0);
    assert.equal(paperPoint(220, 175, returned).lift, 0);
  }
});
