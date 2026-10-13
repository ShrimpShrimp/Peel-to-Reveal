import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { PAPER_BOUNDS, PERSPECTIVE } from '../geometry/paperStack';
import type { PaperStack } from '../geometry/paperStack';
import type { PaperScene } from '../geometry/scenes';
import type { PeelAnimation } from '../hooks/usePeel';
import { usePaperGesture } from '../hooks/usePaperGesture';
import type { PaperPose, PeelDirection } from '../interaction/fling';

type Props = {
  scene: PaperScene;
  stack: PaperStack;
  peeled: number;
  animation: PeelAnimation | null;
  resetRevision: number;
  onPeel: (direction: PeelDirection, pose: PaperPose) => void;
  onFinish: (run: number) => void;
  onCompleteFocus: () => void;
};

function FoldedCorner() {
  return (
    <g className="corner-fold">
      <path d="M 355 0 L 400 45 L 355 45 Z" fill="#614631" opacity=".12" />
      <path d="M 355 0 Q 357 40 400 45 L 355 45 Z" fill="currentColor" />
      <path d="M 355 0 Q 357 40 400 45" fill="none" stroke="#806f57" strokeOpacity=".3" strokeWidth=".9" />
    </g>
  );
}

export function PaperSculpture({ scene, stack, peeled, animation, resetRevision, onPeel, onFinish, onCompleteFocus }: Props) {
  const { layers: paperLayers, sequence: peelSequence } = stack;
  const total = peelSequence.length;
  const id = useId().replaceAll(':', '');
  const buttonRef = useRef<SVGGElement>(null);
  const keyboardPeel = useRef(false);
  const active = peelSequence[peeled];
  const complete = peeled === total;
  const gesture = usePaperGesture({ layer: active, blocked: !!animation || complete, resetRevision,
    onFling: (direction, pose, keyboard) => {
      keyboardPeel.current = keyboard;
      onPeel(direction, pose);
    },
  });

  useEffect(() => {
    if (animation || !keyboardPeel.current) return;
    keyboardPeel.current = false;
    if (complete) onCompleteFocus();
    else buttonRef.current?.focus({ preventScroll: true });
  }, [peeled, animation, complete, onCompleteFocus]);

  return (
    <svg className="sculpture" viewBox={`0 0 560 ${scene.viewHeight}`} role="group"
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`}
      data-peeled-count={peeled} data-animating={animation !== null}
      data-gesture-phase={gesture.visual?.phase ?? 'idle'} data-peel-direction={animation?.direction}>
      <title id={`${id}-title`}>{complete ? `Revealed paper ${scene.label.toLowerCase()}` : 'Peelable paper stack'}</title>
      <desc id={`${id}-desc`}>{complete
        ? scene.description
        : 'Hold the top sheet, then fling it left or right and release. A click or an incomplete gesture returns the paper without peeling. For keyboard control, hold Space or Enter, then press the left or right arrow. Escape cancels. Each sculpted cutout stays in place.'}</desc>
      <defs>
        <filter id={`${id}-ground`} x="-40%" y="-60%" width="180%" height="220%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id={`${id}-lift`} x="-50%" y="-100%" width="250%" height="300%">
          <feDropShadow dx="-3" dy="10" stdDeviation="5" floodColor="#624932" floodOpacity=".18" />
        </filter>
        {paperLayers.map(layer => !layer.inlay && (
          <mask key={layer.id} id={`${id}-outer-${layer.id}`} maskUnits="userSpaceOnUse" x="-2" y="-2" width="404" height="354">
            <path d={PAPER_BOUNDS} fill="white" />
            {layer.path && <path d={layer.path} fill="black" />}
          </mask>
        ))}
      </defs>
      <ellipse className="ground-shadow" cx="277" cy={scene.ground.y} rx={complete ? scene.ground.revealedRadius : 198} ry="20"
        fill="#594638" opacity=".10" filter={`url(#${id}-ground)`} />
      {paperLayers.map((layer, index) => {
        const { vertical, thickness } = layer;
        const position = peelSequence.indexOf(index);
        const removed = position >= 0 && position < peeled;
        const inlay = layer.inlay;
        const flying = animation?.layer === index;
        const interactive = index === active && !animation;
        const exposed = removed || flying || inlay;
        const pose = flying ? animation.pose : index === active ? gesture.visual?.pose : undefined;
        const returning = index === active && gesture.visual?.phase === 'returning';
        const direction = animation?.direction;
        const sign = direction === 'left' ? -1 : 1;
        const flightX = pose ? sign * Math.max(640, Math.abs(pose.x) + 460) : 0;
        const motionStyle = pose ? {
          '--paper-x': `${pose.x}px`, '--paper-y': `${pose.y}px`,
          '--paper-angle': `${pose.angle}deg`, '--paper-skew': `${pose.skew}deg`,
          '--paper-scale': pose.scaleY,
          '--flight-x': `${flightX}px`, '--flight-y': `${pose.y - 160}px`,
          '--mid-x': `${pose.x + (flightX - pose.x) * .35}px`, '--mid-y': `${pose.y - 52}px`,
        } as CSSProperties : undefined;
        return (
          <g key={layer.id} data-slice={layer.id}>
            {layer.path && <>
              <g transform={`translate(0 ${vertical + thickness}) ${PERSPECTIVE}`}>
                <path d={layer.path} fill={layer.color} />
                <path d={layer.path} fill="#62402d" opacity=".14" />
              </g>
              <g transform={`translate(0 ${vertical}) ${PERSPECTIVE}`}>
                <path d={layer.path} fill={layer.color} stroke="#614631" strokeOpacity={exposed ? .12 : 0}
                  strokeWidth=".65" strokeLinejoin="round" />
              </g>
            </>}
            {!removed && !inlay && (
              <g className={flying ? `peel-flight peel-${direction}` : pose ? `paper-held${returning ? ' is-returning' : ''}` : undefined}
                style={motionStyle} key={flying ? animation.run : 'rest'}
                data-flying={flying || undefined}
                onAnimationEnd={event => {
                  if (flying && event.target === event.currentTarget && event.animationName === `peel-${direction}`) {
                    onFinish(animation.run);
                  }
                }}>
                <g className={flying ? `peel-curl curl-${direction}` : pose ? 'drag-curl' : undefined}
                  filter={pose ? `url(#${id}-lift)` : undefined}>
                  <g transform={`translate(0 ${vertical + thickness}) ${PERSPECTIVE}`}>
                    <g mask={`url(#${id}-outer-${layer.id})`}>
                      <path d={PAPER_BOUNDS} fill={layer.color} />
                      <path d={PAPER_BOUNDS} fill="#62402d" opacity=".14" />
                    </g>
                  </g>
                  <g transform={`translate(0 ${vertical}) ${PERSPECTIVE}`} style={{ color: layer.color }}
                    className={interactive ? `sheet-button${pose && !returning ? ' is-grabbing' : ''}` : undefined}
                    ref={interactive ? buttonRef : undefined}
                    role={index === active ? 'button' : undefined}
                    aria-label={index === active ? 'Hold and fling top sheet' : undefined}
                    aria-disabled={index === active ? !!animation || returning : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    onPointerDown={interactive ? gesture.pointerDown : undefined}
                    onPointerMove={interactive ? gesture.pointerMove : undefined}
                    onPointerUp={interactive ? gesture.pointerUp : undefined}
                    onPointerCancel={interactive ? gesture.cancel : undefined}
                    onLostPointerCapture={interactive ? gesture.cancel : undefined}
                    onBlur={interactive ? gesture.cancel : undefined}
                    onKeyDown={interactive ? gesture.keyDown : undefined}
                    onKeyUp={interactive ? gesture.keyUp : undefined}>
                    <g mask={`url(#${id}-outer-${layer.id})`}>
                      <path d={PAPER_BOUNDS} fill={layer.color} stroke="#614631" strokeOpacity=".12" strokeWidth=".65" />
                    </g>
                    {index === active && <>
                      <FoldedCorner />
                      <path className="corner-hit" d="M 338 0 H 400 V 65 H 338 Z" fill="transparent" />
                    </>}
                  </g>
                </g>
              </g>
            )}
            {scene.shadows?.filter(shadow => shadow.afterSlice === layer.id).map((shadow, shadowIndex) => (
              <path key={shadowIndex} d={shadow.path} fill={shadow.color} opacity={shadow.opacity} pointerEvents="none" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
