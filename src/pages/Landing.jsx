import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WaitlistForm from '@/components/WaitlistForm.jsx';
import { BIRD_ASCII } from '@/lib/bird';
import { lessonDemo } from '../../page-content.js';

function Hero() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 items-center px-6 py-16 md:px-16 max-w-5xl mx-auto">
      <motion.pre
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-brand-strong leading-[0.95] select-none text-[8px] sm:text-[10px]"
        aria-hidden="true"
      >
        {BIRD_ASCII}
      </motion.pre>
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Learn programming by solving a problem you already have.
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Kolibri is an interactive course about the ideas underneath programming and what those ideas let you do.
          You will work with examples, change working systems, investigate mistakes, and then look for somewhere the
          same idea could be useful in your own life. The point is not to remember the example. It is to understand it
          well enough to use the concept somewhere the course did not choose for you.
        </p>
        <div className="flex gap-3 mt-6">
          <Button size="lg" className="bg-brand text-white hover:bg-brand-strong" onClick={() => { window.location.hash = '#/course'; }}>
            Try the preview
          </Button>
          <Button size="lg" variant="outline" onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}>
            Follow the build
          </Button>
        </div>
      </div>
    </section>
  );
}

function Concepts() {
  return (
    <section className="px-6 py-16 md:px-16 bg-muted/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-sm font-medium uppercase tracking-widest text-brand mb-3">How Kolibri teaches</p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">
          AI can write the code.<br />
          <span className="text-muted-foreground">You still have to make the decisions.</span>
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            You begin with something small that already runs: a reminder that fires too late, a form that accepts the
            wrong thing, or a tool that almost solves a problem you actually have.
          </p>
          <p>
            Ask AI to change it. Watch what happens. Trace the mistake far enough to understand it. Keep what works,
            reject what does not, and decide what the system should do next.
          </p>
          <p>
            Later, the same idea returns somewhere else — under another name, inside another problem. Kolibri does not
            test whether you remember the syntax. It tests whether you can recognize the idea when it shows up again.
          </p>
          <p className="text-foreground font-medium">The prompt disappears. The problem remains yours.</p>
        </div>
      </div>
    </section>
  );
}

function LessonDemo() {
  const [stage, setStage] = useState('learn');
  const current = lessonDemo[stage];
  return (
    <section className="px-6 py-16 md:px-16 max-w-5xl mx-auto" id="lessons">
      <p className="text-sm font-medium uppercase tracking-widest text-brand mb-3">The lesson loop</p>
      <h2 className="text-2xl sm:text-3xl font-bold mb-6">Lessons give you less help as you go.</h2>
      <p className="text-muted-foreground mb-8 max-w-2xl">
        Kolibri starts with a short explanation beside a program you can run. There are no videos to sit through.
        You read the idea, change the code, and see what happens.
      </p>
      <Card>
        <CardContent className="p-0">
          <Tabs value={stage} onValueChange={setStage} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border">
              <TabsTrigger value="learn">01 Learn</TabsTrigger>
              <TabsTrigger value="debug">02 Build &amp; Debug</TabsTrigger>
              <TabsTrigger value="project">03 Final Project</TabsTrigger>
            </TabsList>
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="border-r border-border p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">{current.file}</p>
                <pre className="text-xs font-mono leading-relaxed text-muted-foreground overflow-x-auto">{current.code.starter}</pre>
                <div className="space-y-1">
                  {current.checkRows.map((row) => (
                    <p key={row} className="text-xs font-mono">{row}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{current.status}</p>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm font-medium">{current.task}</p>
                <div className="space-y-2">
                  {current.prompts.map((p) => (
                    <div key={p.label} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">You: {p.q}</p>
                      <p className="text-xs">{p.a}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-brand font-medium">Kolibri AI suggests a change — you review it, keep it, or reject it.</p>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}

function Waitlist() {
  return (
    <section className="px-6 py-16 md:px-16 bg-muted/40" id="waitlist">
      <div className="max-w-xl mx-auto text-center space-y-6">
        <h2 className="text-2xl font-bold">Follow the online course build</h2>
        <p className="text-muted-foreground">
          Kolibri is still being developed. Join the existing update list to hear when the browser-based course is
          ready to try.
        </p>
        <div className="max-w-sm mx-auto">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
      Kolibri · open source · MIT · you are the author of your work
    </footer>
  );
}

export default function Landing() {
  return (
    <main className="bg-background text-foreground">
      <Hero />
      <Concepts />
      <LessonDemo />
      <Waitlist />
      <Footer />
    </main>
  );
}
