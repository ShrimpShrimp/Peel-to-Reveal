export type PeelDirection = 'left' | 'right';
export type PaperPose = { x: number; y: number; angle: number; skew: number; scaleY: number };
export type MotionSample = { x: number; y: number; time: number };

export const REST_POSE: PaperPose = { x: 0, y: 0, angle: 0, skew: 0, scaleY: 1 };
export const HOLD_MS = 120;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function paperPose(dx: number, dy: number): PaperPose {
  const sign = Math.sign(dx);
  return {
    x: dx * .72,
    y: dy * .35 - Math.min(36, 6 + Math.abs(dx) * .1),
    angle: -sign * Math.min(14, Math.abs(dx) * .035),
    skew: -sign * Math.min(12, Math.abs(dx) * .025),
    scaleY: Math.max(.75, 1 - Math.abs(dx) / 1700),
  };
}

// Travel is measured in screen pixels so the feel stays consistent across
// scene sizes. Ignore the initial stationary hold when measuring velocity.
export function assessFling(start: MotionSample, samples: readonly MotionSample[], releaseTime: number, sceneWidth: number): PeelDirection | null {
  const last = samples.at(-1);
  if (!last || releaseTime - start.time < HOLD_MS || releaseTime - last.time > 160) return null;
  const dx = last.x - start.x;
  const dy = last.y - start.y;
  const minimumTravel = clamp(sceneWidth * .14, 44, 96);
  if (Math.abs(dx) < minimumTravel || Math.abs(dx) < Math.abs(dy) * 1.2) return null;
  const recent = samples.filter(sample => sample.time >= last.time - 160);
  const first = recent[0];
  if (!first || last.time - first.time < 8) return null;
  const velocity = (last.x - first.x) / (last.time - first.time);
  if (Math.abs(velocity) < .4 || Math.sign(velocity) !== Math.sign(dx)) return null;
  return dx < 0 ? 'left' : 'right';
}
