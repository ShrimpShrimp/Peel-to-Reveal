import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { PaperSculpture } from './components/PaperSculpture';
import { createPaperStack } from './geometry/paperStack';
import { scenes } from './geometry/scenes';
import type { SceneId } from './geometry/scenes';
import { usePeel } from './hooks/usePeel';
import './styles.css';

const stacks = { shrimp: createPaperStack(scenes.shrimp), courtyard: createPaperStack(scenes.courtyard), tree: createPaperStack(scenes.tree) };

type ExperimentProps = {
  selected: SceneId;
  initialPeeled: number;
  remember: (scene: SceneId, count: number) => void;
  choose: (scene: SceneId) => void;
};

function Experiment({ selected, initialPeeled, remember, choose }: ExperimentProps) {
  const scene = scenes[selected];
  const stack = stacks[selected];
  const total = stack.sequence.length;
  const { peeled, animation, resetRevision, peel, finish, reset } = usePeel(stack.sequence, initialPeeled);
  const resetRef = useRef<HTMLButtonElement>(null);
  const focusReset = useCallback(() => resetRef.current?.focus({ preventScroll: true }), []);
  const complete = peeled === total;
  useEffect(() => { remember(selected, peeled); }, [selected, peeled, remember]);

  return (
    <main>
      <header className="intro">
        <p className="eyebrow">A SMALL PAPER EXPERIMENT</p>
        <h1>Peel to reveal.</h1>
        <p className="subtitle">{complete ? scene.caption : 'Hold a sheet. Fling left or right.'}</p>
      </header>
      <div className="scene-switcher" role="group" aria-label="Choose sculpture">
        {(Object.keys(scenes) as SceneId[]).map(id => (
          <button key={id} className="scene-choice" aria-pressed={selected === id} onClick={() => choose(id)}>{scenes[id].label}</button>
        ))}
      </div>
      <section className="stage" style={{ '--scene-ratio': 560 / scene.viewHeight } as CSSProperties}
        aria-label={`${scene.label} paper sculpture experiment`} aria-busy={!!animation}>
        <PaperSculpture scene={scene} stack={stack} peeled={peeled} animation={animation} resetRevision={resetRevision} onPeel={peel} onFinish={finish} onCompleteFocus={focusReset} />
      </section>
      <footer className="controls">
        <p className="progress" aria-hidden="true">{complete ? 'Revealed.' : `${total - peeled} ${total - peeled === 1 ? 'sheet' : 'sheets'} to peel`}</p>
        <span className="control-divider" aria-hidden="true" />
        <button className="reset" ref={resetRef} onClick={reset} aria-label="Reset paper stack">Reset</button>
      </footer>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {complete ? `${scene.label} fully revealed. Reset to peel again.` : `${scene.label}: ${peeled} of ${total} sheets peeled. ${total - peeled} remaining.`}
      </p>
    </main>
  );
}

function App() {
  const [selected, setSelected] = useState<SceneId>(() => {
    const requested = document.getElementById('root')?.dataset.scene;
    return requested && requested in scenes ? requested as SceneId : 'shrimp';
  });
  const progress = useRef<Record<SceneId, number>>({ shrimp: 0, courtyard: 0, tree: 0 });
  const remember = useCallback((scene: SceneId, count: number) => { progress.current[scene] = count; }, []);
  // Remounting cancels the previous scene's held pointer and pending flight.
  // Completed peels remain in memory until reset or a page reload.
  return <Experiment key={selected} selected={selected} initialPeeled={progress.current[selected]} remember={remember} choose={setSelected} />;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
