import { BIRD_ASCII } from '@/lib/bird';

/* Dormant React landing — styled to the hand-built page's language
   (black, cream, gold, mono labels). The production landing is the
   hand-built index.html; this mirrors it until Phase 2 replaces it. */

export default function Landing() {
  return (
    <main style={{ background: '#000', color: '#f4f1ea', fontFamily: "var(--font-sans)" }}>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(4.5rem, 8vh, 6rem) clamp(1.25rem, 4vw, 2.5rem)', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'clamp(1.5rem, 4vw, 3.5rem)', alignItems: 'center' }}>
        <pre aria-hidden="true" style={{ color: '#c9a962', lineHeight: '0.95', fontSize: 10, userSelect: 'none' }}>
          {BIRD_ASCII}
        </pre>
        <div>
          <h1 style={{ fontSize: 'clamp(1.85rem, 3.6vw + 0.5vh, 3.35rem)', lineHeight: 1.15, margin: '0 0 1rem 0', letterSpacing: '-0.01em' }}>
            Learn programming by solving a problem you already have.
          </h1>
          <p style={{ color: '#9a958c', fontSize: 'clamp(0.95rem, 0.9vw + 0.45vh, 1.05rem)', lineHeight: 1.7, margin: 0 }}>
            Kolibri is an interactive course about the ideas underneath programming and what those ideas let you do.
            You will work with examples, change working systems, investigate mistakes, and then look for somewhere the
            same idea could be useful in your own life.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/course'; }}
              style={{ border: '1px solid #c9a962', background: 'rgba(201,169,98,0.12)', color: '#f2dfab', font: '0.75rem var(--font-mono)', minHeight: '2.75rem', padding: '0.55rem 0.85rem', cursor: 'pointer' }}
            >
              Start the preview
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
