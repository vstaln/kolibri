import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="max-w-2xl text-center space-y-6"
      >
        <p className="text-sm font-medium uppercase tracking-widest text-brand">Kolibri</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Learn programming by solving a problem you already have.
        </h1>
        <p className="text-lg text-muted-foreground">
          Short ideas, tiny challenges, exact checks. You are the author of your work — not the AI.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button size="lg" className="bg-brand text-white hover:bg-brand-strong" onClick={() => { window.location.hash = '#/course'; }}>
            Start the preview
          </Button>
          <Button size="lg" variant="outline">Join the waitlist</Button>
        </div>
      </motion.div>
    </main>
  );
}
