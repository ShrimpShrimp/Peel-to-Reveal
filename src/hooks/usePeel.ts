import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaperPose, PeelDirection } from '../interaction/fling';

export type PeelAnimation = { layer: number; run: number; direction: PeelDirection; pose: PaperPose };

export function usePeel(peelSequence: readonly number[], initialPeeled = 0) {
  const total = peelSequence.length;
  const [peeled, setPeeled] = useState(initialPeeled);
  const [animation, setAnimation] = useState<PeelAnimation | null>(null);
  const [resetRevision, setResetRevision] = useState(0);
  const run = useRef(0);
  const locked = useRef(false);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback((expectedRun: number) => {
    if (!locked.current || expectedRun !== run.current) return;
    if (fallback.current !== null) clearTimeout(fallback.current);
    fallback.current = null;
    locked.current = false;
    setPeeled(value => Math.min(value + 1, total));
    setAnimation(null);
  }, [total]);

  const peel = useCallback((direction: PeelDirection, pose: PaperPose) => {
    if (locked.current || peeled >= total) return;
    locked.current = true;
    const nextRun = ++run.current;
    setAnimation({ layer: peelSequence[peeled], run: nextRun, direction, pose });
    // Recover if a browser suspends animations or omits animation-end.
    fallback.current = setTimeout(() => finish(nextRun), 850);
  }, [finish, peeled, peelSequence, total]);

  const reset = useCallback(() => {
    ++run.current;
    locked.current = false;
    if (fallback.current !== null) clearTimeout(fallback.current);
    fallback.current = null;
    setAnimation(null);
    setPeeled(0);
    setResetRevision(value => value + 1);
  }, []);

  useEffect(() => () => {
    ++run.current;
    if (fallback.current !== null) clearTimeout(fallback.current);
  }, []);

  return { peeled, animation, resetRevision, peel, finish, reset };
}
