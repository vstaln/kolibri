import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { submitWaitlist } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus('error');
      setMessage('Enter a valid email address.');
      return;
    }
    setStatus('submitting');
    try {
      await submitWaitlist(value);
      setStatus('done');
      setMessage('You are on the list. Watch your inbox.');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong.');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="flex gap-2">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
          placeholder="Email address"
          aria-label="Email address"
          aria-invalid={status === 'error'}
          required
        />
        <Button type="submit" disabled={status === 'submitting'} className="bg-brand text-white hover:bg-brand-strong">
          {status === 'submitting' ? 'Joining…' : 'Join early access'}
        </Button>
      </div>
      {status === 'done' && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      {status === 'error' && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <p className="text-xs text-muted-foreground">We will only email you about Kolibri product updates.</p>
    </form>
  );
}
