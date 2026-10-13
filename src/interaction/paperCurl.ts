import type { PaperPose, PeelDirection } from './fling';

export const PEEL_DURATION = 820;
export const RETURN_DURATION = 250;
const WIDTH = 400;
const HEIGHT = 350;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type CurlFrame = {
  direction: PeelDirection;
  progress: number;
  radius: number;
  exitX: number;
  exitY: number;
  opacity: number;
};
export type PaperPoint = { x: number; y: number; lift: number; angle: number };
export type CurlPatch = {
  key: string;
  x: number;
  width: number;
  matrix: [number, number, number, number, number, number];
  lift: number;
  lifted: boolean;
  shade: number;
  back: boolean;
};

export function curlFromPose(pose: PaperPose): CurlFrame {
  return {
    direction: pose.x > 0 ? 'right' : 'left',
    progress: clamp(.018 + Math.abs(pose.x) / 420, .018, .68),
    radius: clamp(46 - pose.y * .4, 44, 66),
    exitX: 0, exitY: 0, opacity: 1,
  };
}

// A half-cylinder turns the paper back over itself. Beyond the bend the
// lifted tail continues on the reverse face; the adhered portion stays fixed.
export function paperPoint(x: number, y: number, frame: CurlFrame, vertical = 0): PaperPoint {
  const u = frame.direction === 'left' ? x : WIDTH - x;
  const crease = WIDTH * (1 - frame.progress);
  const s = Math.max(0, u - crease);
  const angle = Math.min(Math.PI, s / frame.radius);
  const tail = Math.max(0, s - Math.PI * frame.radius);
  const rolled = s ? crease + frame.radius * Math.sin(angle) - tail : u;
  const planarX = frame.direction === 'left' ? rolled : WIDTH - rolled;
  const lift = frame.radius * (1 - Math.cos(angle)) + tail * .045;
  return {
    x: 128 + planarX - .30 * y + frame.exitX,
    y: 37 + .12 * planarX + .79 * y + vertical - lift + frame.exitY,
    lift, angle,
  };
}

export function curlPatches(frame: CurlFrame, vertical = 0): CurlPatch[] {
  const crease = WIDTH * (1 - frame.progress);
  const boundary = frame.direction === 'left' ? crease : WIDTH - crease;
  const edges = [0, WIDTH, boundary];
  // Include the crease exactly, and keep the cylindrical arc finely sampled.
  const bentStart = frame.direction === 'left' ? boundary : 0;
  const bentEnd = frame.direction === 'left' ? WIDTH : boundary;
  for (let i = 1; i < 49; i++) edges.push(bentStart + (bentEnd - bentStart) * i / 49);
  const unique = [...new Set(edges)].sort((a, b) => a - b);
  const patches: CurlPatch[] = [];
  for (let i = 0; i < unique.length - 1; i++) {
    const x = unique[i], width = unique[i + 1] - x;
    if (width < .001) continue;
    const left = paperPoint(x, 0, frame, vertical);
    const right = paperPoint(x + width, 0, frame, vertical);
    const center = paperPoint(x + width / 2, 0, frame, vertical);
    const a = (right.x - left.x) / width;
    const b = (right.y - left.y) / width;
    patches.push({
      key: `patch-${i}`, x, width,
      matrix: [a, b, -.30, .79, left.x - a * x, left.y - b * x],
      lift: center.lift,
      lifted: center.angle > 0,
      shade: .035 * (1 - Math.cos(center.angle)) + .12 * Math.sin(center.angle),
      back: center.angle > Math.PI / 2,
    });
  }
  // The elevated reverse face occludes the lower arc and adhered surface.
  return patches.sort((a, b) => a.lift - b.lift);
}

export function peelFrame(start: CurlFrame, time: number): CurlFrame {
  const t = clamp(time, 0, 1);
  const rolling = clamp(t / .72, 0, 1);
  const eased = 1 - (1 - rolling) ** 2;
  const release = clamp((t - .72) / .28, 0, 1);
  const departure = release ** 1.6;
  return {
    ...start,
    progress: start.progress + (1 - start.progress) * eased,
    radius: start.radius + (54 - start.radius) * eased,
    exitX: departure ? (start.direction === 'left' ? -1 : 1) * 650 * departure : 0,
    exitY: departure ? -100 * departure : 0,
    opacity: 1 - clamp((release - .3) / .7, 0, 1),
  };
}

export function returnFrame(start: CurlFrame, time: number): CurlFrame {
  const t = clamp(time, 0, 1);
  return { ...start, progress: start.progress * (1 - t) ** 3, exitX: 0, exitY: 0, opacity: 1 };
}

export function paperEdge(frame: CurlFrame, vertical = 0, surface: 'all' | 'adhered' | 'lifted' = 'all'): string {
  const crease = WIDTH * (frame.direction === 'left' ? 1 - frame.progress : frame.progress);
  const outer = surface === 'all' ? WIDTH
    : (surface === 'lifted') === (frame.direction === 'left') ? WIDTH : 0;
  const inner = surface === 'all' ? 0 : crease;
  if (Math.abs(outer - inner) < .001) return '';
  const points: string[] = [];
  for (const y of [0, HEIGHT]) {
    for (let i = 0; i <= 90; i++) {
      const t = y === 0 ? i / 90 : 1 - i / 90;
      const x = inner + (outer - inner) * t;
      const point = paperPoint(x, y, frame, vertical);
      points.push(`${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
    }
  }
  // The crease is shared, not a cut edge. Leave that side of each section open.
  return `M ${points.join(' L ')}${surface === 'all' ? ' Z' : ''}`;
}
