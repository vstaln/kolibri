import { useState } from 'react';
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
    <form className="waitlist" id="waitlist-form" onSubmit={submit} noValidate>
      <label htmlFor="waitlist-email">Email address</label>
      <div className="waitlist-row">
        <input
          id="waitlist-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
          aria-label="Email address"
          aria-invalid={status === 'error'}
          required
          maxLength={254}
        />
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Joining…' : 'Join early access'}
        </button>
      </div>
      <p className="privacy">We will only email you about Kolibri product updates.</p>
      <p className="form-status" id="form-status" role="status" aria-live="polite" data-state={status}>
        {status === 'done' && message}
        {status === 'error' && message}
      </p>
    </form>
  );
}
