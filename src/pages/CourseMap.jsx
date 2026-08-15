import { course } from '../../course-content.mjs';
import { deriveChallengeState, STATES, isComplete } from '../../course-state.mjs';
import { loadProgress } from '@/lib/course';

const stateLabel = {
  [STATES.LOCKED]: 'Locked',
  [STATES.READY]: 'Ready',
  [STATES.FAILED]: 'Try again',
  [STATES.PASSED]: 'Passed',
};

export default function CourseMap({ onSelect }) {
  const progress = loadProgress();
  const complete = isComplete(course, progress);

  return (
    <section className="course-section" aria-labelledby="course-title">
      <div className="course-header">
        <p className="course-eyebrow">JavaScript Foundations · preview</p>
        <h2 id="course-title">Learn one idea. Use it. See what happens.</h2>
        <p>
          Read a short explanation, change a few lines, run the checks, and use the feedback to fix your code.
          Finish one small challenge before the next one opens.
        </p>
        {complete && <p className="course-completion">{course.modules[0].lessons[0].completion}</p>}
      </div>

      <div className="course-layout">
        <div className="course-map-panel">
          <p className="course-panel-label">All challenges</p>
          <ol>
            {course.modules.flatMap((module) =>
              module.lessons.flatMap((lesson) => lesson.challenges.map((challenge) => {
                const state = deriveChallengeState(challenge, progress, {});
                return (
                  <li key={challenge.id}>
                    <button
                      type="button"
                      className="course-map-button"
                      data-state={state === STATES.PASSED ? 'PASSED' : state === STATES.FAILED ? 'FAILED' : undefined}
                      disabled={state === STATES.LOCKED}
                      onClick={() => onSelect?.(challenge.id)}
                    >
                      <span className="course-map-number">{String(challenge.position).padStart(2, '0')}</span>
                      <span className="course-map-title">{challenge.title}</span>
                      <span className="course-map-status">{stateLabel[state]}</span>
                    </button>
                  </li>
                );
              }))
            )}
          </ol>
        </div>

        <div className="course-workspace">
          <p className="course-breadcrumb">{course.title}</p>
          <h3>Course map</h3>
          <div className="course-explanation">
            <p>Pick a challenge. The next one opens after you pass the one before it.</p>
            <p>Every challenge runs in an isolated sandbox: your code only talks to the checks, and the checks only see what your program prints or renders.</p>
          </div>
          <div className="course-task">Choose the first challenge that is not locked.</div>
        </div>
      </div>
    </section>
  );
}
