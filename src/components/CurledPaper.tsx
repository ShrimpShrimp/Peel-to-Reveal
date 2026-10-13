import { useLayoutEffect, useRef, useState } from 'react';
import { PAPER_BOUNDS, PERSPECTIVE } from '../geometry/paperStack';
import type { PaperPose } from '../interaction/fling';
import { curlFromPose, curlPatches, paperEdge, paperPoint, peelFrame, returnFrame, PEEL_DURATION, RETURN_DURATION } from '../interaction/paperCurl';
import type { CurlFrame } from '../interaction/paperCurl';
import type { PeelAnimation } from '../hooks/usePeel';

type Props = {
  id: string;
  mask: string;
  color: string;
  vertical: number;
  pose: PaperPose;
  animation?: PeelAnimation;
  returning: boolean;
  onFinish: (run: number) => void;
};

export function CurledPaper({ id, mask, color, vertical, pose, animation, returning, onFinish }: Props) {
  const held = curlFromPose(pose);
  const [motion, setMotion] = useState<CurlFrame>(held);
  const finish = useRef(onFinish);
  finish.current = onFinish;
  const previous = useRef(held);
  const frame = animation || returning ? motion : held;
  previous.current = frame;

  useLayoutEffect(() => {
    if (!animation && !returning) {
      setMotion(curlFromPose(pose));
      return;
    }
    const start = animation ? { ...curlFromPose(pose), direction: animation.direction } : previous.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 1 : animation ? PEEL_DURATION : RETURN_DURATION;
    const started = performance.now();
    let request = 0;
    setMotion(start);
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      setMotion(animation ? peelFrame(start, progress) : returnFrame(start, progress));
      if (progress < 1) request = requestAnimationFrame(tick);
      else if (animation) finish.current(animation.run);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [animation, returning, pose]);

  const patches = curlPatches(frame, vertical);
  const creaseX = frame.direction === 'left' ? 400 * (1 - frame.progress) : 400 * frame.progress;
  const crease = paperPoint(creaseX, 175, frame, vertical);
  return (
    <g className="curled-paper" pointerEvents="none" opacity={frame.opacity}
      data-curl-progress={frame.progress.toFixed(3)} data-curl-direction={frame.direction}
      data-curl-phase={animation ? 'peeling' : returning ? 'returning' : 'held'}>
      <defs>
        <g id={`${id}-face`} mask={`url(#${mask})`}>
          <path d={PAPER_BOUNDS} fill={color} stroke="#614631" strokeOpacity=".12" strokeWidth=".65" />
        </g>
        <filter id={`${id}-contact-shadow`} x="-300%" y="-20%" width="700%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {patches.map(patch => <clipPath key={patch.key} id={`${id}-${patch.key}`} clipPathUnits="userSpaceOnUse">
          <rect x={patch.x - .06} y="0" width={patch.width + .12} height="350" />
        </clipPath>)}
      </defs>
      <g transform={`translate(${frame.exitX} ${vertical}) ${PERSPECTIVE}`} opacity={1 - Math.abs(frame.exitX) / 650}>
        <ellipse cx={creaseX} cy="175" rx="10" ry="160" fill="#624932" opacity=".13" filter={`url(#${id}-contact-shadow)`} />
      </g>
      {patches.map(patch => <g key={patch.key} transform={`matrix(${patch.matrix.join(' ')})`}>
        <g clipPath={`url(#${id}-${patch.key})`}>
          <use href={`#${id}-face`} />
          <g mask={`url(#${mask})`}>
            <path d={PAPER_BOUNDS} fill="#654a35" opacity={patch.shade} />
            {patch.back && <path d={PAPER_BOUNDS} fill="#fffdf4" opacity=".10" />}
          </g>
        </g>
      </g>)}
      <path d={paperEdge(frame, vertical)} fill="none" stroke="#7e6249" strokeOpacity=".18" strokeWidth=".7" />
      <path d={`M ${crease.x - 52.5} ${crease.y + 138.25} L ${crease.x + 52.5} ${crease.y - 138.25}`}
        stroke="#735740" strokeOpacity=".04" strokeWidth="1" />
    </g>
  );
}
