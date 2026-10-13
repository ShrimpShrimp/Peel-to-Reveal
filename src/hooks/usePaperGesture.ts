import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { assessFling, HOLD_MS, paperPose, REST_POSE } from '../interaction/fling';
import type { MotionSample, PaperPose, PeelDirection } from '../interaction/fling';

type HeldPointer = {
  id: number;
  target: SVGGElement;
  start: MotionSample;
  samples: MotionSample[];
  scale: number;
  width: number;
};
type Visual = { pose: PaperPose; phase: 'holding' | 'armed' | 'dragging' | 'returning' };
type Options = {
  layer: number | undefined;
  blocked: boolean;
  resetRevision: number;
  onFling: (direction: PeelDirection, pose: PaperPose, keyboard: boolean) => void;
};

export function usePaperGesture({ layer, blocked, resetRevision, onFling }: Options) {
  const [visual, setVisual] = useState<Visual | null>(null);
  const held = useRef<HeldPointer | null>(null);
  const keyboardHold = useRef<number | null>(null);
  const arming = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (arming.current !== null) clearTimeout(arming.current);
    if (settling.current !== null) clearTimeout(settling.current);
    arming.current = settling.current = null;
  }, []);

  const releaseCapture = useCallback(() => {
    const pointer = held.current;
    held.current = null;
    if (pointer?.target.hasPointerCapture(pointer.id)) pointer.target.releasePointerCapture(pointer.id);
  }, []);

  const clear = useCallback(() => {
    clearTimers();
    releaseCapture();
    keyboardHold.current = null;
    setVisual(null);
  }, [clearTimers, releaseCapture]);

  const returnToStack = useCallback(() => {
    clearTimers();
    releaseCapture();
    keyboardHold.current = null;
    setVisual({ pose: REST_POSE, phase: 'returning' });
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 20 : 280;
    settling.current = setTimeout(() => {
      settling.current = null;
      setVisual(null);
    }, duration);
  }, [clearTimers, releaseCapture]);

  useEffect(() => { clear(); }, [layer, blocked, resetRevision, clear]);
  useEffect(() => {
    const blur = () => { if (held.current || keyboardHold.current !== null) returnToStack(); };
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('blur', blur);
      clearTimers();
      releaseCapture();
    };
  }, [clearTimers, releaseCapture, returnToStack]);

  const pointerDown = (event: PointerEvent<SVGGElement>) => {
    if (blocked || layer === undefined || held.current || keyboardHold.current !== null || settling.current !== null || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    const width = event.currentTarget.ownerSVGElement!.getBoundingClientRect().width;
    const start = { x: event.clientX, y: event.clientY, time: performance.now() };
    held.current = { id: event.pointerId, target: event.currentTarget, start, samples: [start], scale: width / 560, width };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    setVisual({ pose: paperPose(0, 0), phase: 'holding' });
    arming.current = setTimeout(() => {
      arming.current = null;
      if (held.current) setVisual(value => value && { ...value, phase: 'armed' });
    }, HOLD_MS);
  };

  const record = (event: PointerEvent<SVGGElement>) => {
    const pointer = held.current;
    if (!pointer || pointer.id !== event.pointerId) return null;
    const sample = { x: event.clientX, y: event.clientY, time: performance.now() };
    const previous = pointer.samples.at(-1)!;
    // A stationary release must not erase the last movement's velocity.
    if (Math.hypot(sample.x - previous.x, sample.y - previous.y) > .3) {
      pointer.samples.push(sample);
      pointer.samples = pointer.samples.filter(point => point.time >= sample.time - 240);
    }
    return { pointer, sample, pose: paperPose((sample.x - pointer.start.x) / pointer.scale, (sample.y - pointer.start.y) / pointer.scale) };
  };

  const pointerMove = (event: PointerEvent<SVGGElement>) => {
    const movement = record(event);
    if (!movement) return;
    event.preventDefault();
    setVisual({ pose: movement.pose, phase: 'dragging' });
  };

  const pointerUp = (event: PointerEvent<SVGGElement>) => {
    const movement = record(event);
    if (!movement) return;
    const direction = assessFling(movement.pointer.start, movement.pointer.samples, movement.sample.time, movement.pointer.width);
    if (!direction) { returnToStack(); return; }
    clear();
    onFling(direction, movement.pose, false);
  };

  const cancel = () => {
    if (held.current || keyboardHold.current !== null) returnToStack();
  };

  const keyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); cancel(); return; }
    if (blocked || layer === undefined || held.current || settling.current !== null) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (keyboardHold.current === null && !event.repeat) {
        keyboardHold.current = performance.now();
        setVisual({ pose: paperPose(0, 0), phase: 'holding' });
      }
    } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && keyboardHold.current !== null) {
      event.preventDefault();
      if (performance.now() - keyboardHold.current < HOLD_MS) return;
      const direction = event.key === 'ArrowLeft' ? 'left' : 'right';
      clear();
      onFling(direction, paperPose(direction === 'left' ? -100 : 100, -20), true);
    }
  };

  const keyUp = (event: KeyboardEvent<SVGGElement>) => {
    if ((event.key === ' ' || event.key === 'Enter') && keyboardHold.current !== null) {
      event.preventDefault();
      returnToStack();
    }
  };

  return { visual, pointerDown, pointerMove, pointerUp, cancel, keyDown, keyUp };
}
