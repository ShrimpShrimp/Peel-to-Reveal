import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessFling } from '../src/interaction/fling.ts';

const start = { x: 300, y: 200, time: 0 };
const right = [{ x: 300, y: 200, time: 160 }, { x: 360, y: 195, time: 200 }, { x: 415, y: 190, time: 240 }];

test('deliberate held flings resolve to the correct direction', () => {
  assert.equal(assessFling(start, right, 250, 500), 'right');
  const left = right.map(point => ({ ...point, x: 600 - point.x }));
  assert.equal(assessFling(start, left, 250, 500), 'left');
});

test('stationary hold time does not dilute the fling velocity', () => {
  assert.equal(assessFling(start, right.map(point => ({ ...point, time: point.time + 2000 })), 2250, 500), 'right');
});

test('a click, short drag, or swipe without a hold does not peel', () => {
  assert.equal(assessFling(start, [start], 250, 500), null);
  assert.equal(assessFling(start, right.map(point => ({ ...point, x: 300 + (point.x - 300) / 4 })), 250, 500), null);
  assert.equal(assessFling(start, right.map(point => ({ ...point, time: point.time - 150 })), 100, 500), null);
});

test('vertical or predominantly vertical pulls do not peel', () => {
  assert.equal(assessFling(start, right.map(point => ({ x: 300 + (point.x - 300) / 4, y: point.x - 100, time: point.time })), 250, 500), null);
  assert.equal(assessFling(start, right.map(point => ({ ...point, y: 200 + (point.x - 300) * 2 })), 250, 500), null);
});

test('wide slow drags and paused releases do not peel', () => {
  const slow = [{ x: 370, y: 200, time: 700 }, { x: 380, y: 200, time: 800 }];
  assert.equal(assessFling(start, slow, 810, 500), null);
  assert.equal(assessFling(start, right, 450, 500), null);
});

test('reversing back toward the starting point cancels the fling', () => {
  const reversed = [{ x: 450, y: 200, time: 190 }, { x: 425, y: 200, time: 230 }, { x: 410, y: 200, time: 250 }];
  assert.equal(assessFling(start, reversed, 260, 500), null);
});

test('travel threshold adapts to smaller scenes', () => {
  const small = [{ x: 300, y: 200, time: 160 }, { x: 330, y: 200, time: 200 }, { x: 356, y: 200, time: 240 }];
  assert.equal(assessFling(start, small, 250, 350), 'right');
  assert.equal(assessFling(start, small, 250, 700), null);
});
