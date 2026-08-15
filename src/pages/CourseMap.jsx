import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { course } from '../../course-content.mjs';
import { deriveChallengeState, STATES, isComplete, createProgress, normalizeProgress } from '../../course-state.mjs';
import { loadProgress } from '@/lib/course';

const stateLabel = {
  [STATES.LOCKED]: 'Locked',
  [STATES.READY]: 'Ready',
  [STATES.PASSED]: 'Passed',
  [STATES.FAILED]: 'Try again',
};

export default function CourseMap({ onSelect }) {
  const progress = loadProgress();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {course.modules.length} module{course.modules.length > 1 ? 's' : ''} · literacy floor for reviewing AI-written code
          </p>
        </div>
        <Button variant="outline" onClick={() => { window.location.hash = '#/'; }}>← Home</Button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {course.modules.map((module) => (
          <section key={module.id}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{module.title}</h2>
            {module.lessons.map((lesson) => (
              <Card key={lesson.id}>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">{lesson.title}</p>
                  <p className="text-xs text-muted-foreground mb-3">{lesson.objective}</p>
                  <div className="space-y-1.5">
                    {lesson.challenges.map((challenge) => {
                      const state = deriveChallengeState(challenge, progress, {});
                      return (
                        <button
                          key={challenge.id}
                          type="button"
                          disabled={state === STATES.LOCKED}
                          onClick={() => onSelect?.(challenge.id)}
                          className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {String(challenge.position).padStart(2, '0')}
                          </span>
                          <span className="flex-1 text-sm">{challenge.title}</span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">{challenge.concept}</span>
                          <Badge variant={state === STATES.PASSED ? 'default' : 'secondary'}>{stateLabel[state]}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
        {isComplete(course, progress) && (
          <Card className="border-brand/50">
            <CardContent className="p-4 text-sm">
              🎉 Lesson complete — you can read, review, and verify AI-written code. The build track unlocks next.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
