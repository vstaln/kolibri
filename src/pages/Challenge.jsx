import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { course } from '../../course-content.mjs';
import { deriveChallengeState, STATES, isComplete } from '../../course-state.mjs';
import { createSandboxRunner, loadProgress, saveProgress, advance } from '@/lib/course';

const stateLabel = {
  [STATES.LOCKED]: 'Locked',
  [STATES.READY]: 'Ready',
  [STATES.RUNNING]: 'Running…',
  [STATES.FAILED]: 'Try again',
  [STATES.PASSED]: 'Passed',
};

function entries() {
  return course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => lesson.challenges.map((challenge) => ({ module, lesson, challenge })))
  );
}

export default function Challenge({ challengeId, onExit, onSelect }) {
  const all = useRef(entries()).current;
  const entry = all.find(({ challenge }) => challenge.id === challengeId);
  const [progress, setProgress] = useState(() => loadProgress());
  const [code, setCode] = useState(() => progress.drafts[challengeId] ?? entry?.challenge.starter ?? '');
  const [runtime, setRuntime] = useState({ state: STATES.READY, result: null });
  const [showHint, setShowHint] = useState(0);
  const runnerRef = useRef(null);
  const saveTimer = useRef(0);

  useEffect(() => {
    runnerRef.current = createSandboxRunner(entry.challenge);
    return () => runnerRef.current?.dispose();
  }, [entry.challenge]);

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setProgress((prev) => {
        const next = { ...prev, drafts: { ...prev.drafts, [challengeId]: code } };
        saveProgress(next);
        return next;
      });
    }, 300);
  }, [code, challengeId]);

  if (!entry) return null;
  const { module, lesson, challenge } = entry;
  const state = deriveChallengeState(challenge, progress, runtime);

  const handleRun = async () => {
    if (state === STATES.RUNNING || state === STATES.PASSED) return;
    setRuntime({ challengeId: challenge.id, state: STATES.RUNNING, result: null });
    const result = await runnerRef.current.run(code);
    const nextRuntime = { challengeId: challenge.id, state: result.ok ? STATES.PASSED : STATES.FAILED, result };
    setRuntime(nextRuntime);
    if (result.ok) {
      setProgress((prev) => {
        const next = advance(prev, challenge.id);
        saveProgress(next);
        return next;
      });
    }
  };

  const handleReset = () => {
    setCode(challenge.starter);
    setRuntime({ challengeId: challenge.id, state: STATES.READY, result: null });
    setShowHint(0);
    setProgress((prev) => {
      const next = { ...prev, drafts: { ...prev.drafts } };
      delete next.drafts[challenge.id];
      saveProgress(next);
      return next;
    });
  };

  const handleNext = () => {
    if (challenge.nextId) onSelect?.(challenge.nextId);
    else onExit?.();
  };

  const locked = state === STATES.LOCKED;
  const firstFailure = runtime.result?.checks.find((check) => !check.pass);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => onExit?.()} className="text-sm text-muted-foreground hover:text-foreground">
            ← All challenges
          </button>
          <span className="text-sm font-medium">{course.title}</span>
          <span className="text-xs text-muted-foreground">
            {module.title} · {lesson.title}
          </span>
        </div>
        <Badge variant={state === STATES.PASSED ? 'default' : 'secondary'}>{stateLabel[state]}</Badge>
      </header>

      <div className="grid grid-cols-[240px_1fr] gap-0 min-h-[calc(100vh-57px)]">
        <aside className="border-r border-border p-3 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-2">
            Challenges
          </p>
          {all.map(({ challenge: c }) => {
            const st = deriveChallengeState(c, progress, runtime);
            return (
              <button
                key={c.id}
                type="button"
                disabled={st === STATES.LOCKED}
                onClick={() => onSelect?.(c.id)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 ${
                  c.id === challenge.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                } ${st === STATES.LOCKED ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-xs tabular-nums text-muted-foreground">
                  {String(c.position).padStart(2, '0')}
                </span>
                <span className="flex-1 truncate">{c.title}</span>
                {st === STATES.PASSED && <span aria-label="passed">✓</span>}
              </button>
            );
          })}
          {isComplete(course, progress) && (
            <p className="text-xs text-muted-foreground px-2 pt-3">
              Lesson complete — you know enough to review AI-written code.
            </p>
          )}
        </aside>

        <main className="grid grid-cols-2 gap-0">
          <section className="border-r border-border p-6 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-1">Step {challenge.position}</p>
            <h1 className="text-xl font-semibold mb-1">{challenge.title}</h1>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="text-accent-ai font-medium">{challenge.concept}</span>
            </p>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <p className="text-sm leading-relaxed mb-6">{challenge.instruction}</p>

              {locked && (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Complete the previous challenge to unlock this one.
                  </CardContent>
                </Card>
              )}

              {!locked && (
                <>
                  <label htmlFor="course-editor" className="sr-only">Code editor</label>
                  <Textarea
                    id="course-editor"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={state === STATES.PASSED}
                    spellCheck={false}
                    className="font-mono text-sm min-h-[180px] resize-y"
                    aria-label="Code editor"
                  />
                  <div className="flex items-center gap-2 mt-4">
                    <Button onClick={handleRun} disabled={state === STATES.RUNNING || state === STATES.PASSED || !code.trim()}>
                      {state === STATES.RUNNING ? 'Running…' : 'Check your code'}
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={state === STATES.RUNNING}>
                      Reset
                    </Button>
                    {state === STATES.PASSED && (
                      <Button variant="default" className="bg-brand text-white hover:bg-brand-strong" onClick={handleNext}>
                        {challenge.nextId ? 'Next challenge' : 'Finish lesson'}
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    {runtime.result && !runtime.result.ok && (
                      <Card className="border-destructive/50">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-sm font-medium text-destructive">Not yet</p>
                          {firstFailure && <p className="text-sm text-muted-foreground">{firstFailure.message}</p>}
                          {runtime.result.error && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {runtime.result.error.name}: {runtime.result.error.message}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    {runtime.result?.ok && (
                      <Card className="border-emerald-500/50">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{challenge.feedback.pass}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {challenge.hints?.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-medium mb-2">Need a nudge?</p>
                      <div className="space-y-1.5">
                        {challenge.hints.slice(0, showHint + 1).map((hint, i) => (
                          <motion.div
                            key={hint.level}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2"
                          >
                            <span className="font-medium">{hint.level}: </span>{hint.text}
                          </motion.div>
                        ))}
                      </div>
                      {showHint < challenge.hints.length - 1 && (
                        <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setShowHint((n) => n + 1)}>
                          Another hint
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </section>

          <section className="flex flex-col">
            <Tabs defaultValue="preview" className="flex-1 flex flex-col">
              <TabsList className="justify-start rounded-none border-b border-border px-4">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="console">Console</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="flex-1 m-0">
                <iframe
                  title="Program preview"
                  sandbox="allow-scripts"
                  srcDoc={`<!doctype html><html><body><div id="app"></div><script>window.addEventListener('message',e=>{if(e.data==='render'){try{document.querySelector('#app').textContent=eval(window.parent.__lastCode||'')}catch{}}});<\/script></body></html>`}
                  className="w-full h-full bg-white"
                />
              </TabsContent>
              <TabsContent value="console" className="flex-1 m-0 p-4 font-mono text-xs text-muted-foreground bg-muted/50">
                {(runtime.result?.checks ?? []).map((check) => (
                  <p key={check.id} className={check.pass ? 'text-emerald-600' : 'text-destructive'}>
                    {check.pass ? '✓' : '✗'} {check.message}
                  </p>
                ))}
                {runtime.result?.error && (
                  <p className="text-destructive">{runtime.result.error.name}: {runtime.result.error.message}</p>
                )}
                {!runtime.result && <p className="text-muted-foreground/60">Run your code to see the console output.</p>}
              </TabsContent>
            </Tabs>
          </section>
        </main>
      </div>
    </div>
  );
}
