export async function submitWaitlist(email) {
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (res.ok) return { ok: true };
  let message = 'Something went wrong. Try again.';
  if (res.status === 429) message = 'Too many attempts. Wait a moment and try again.';
  if (res.status === 400) message = 'That email address does not look valid.';
  if (res.status === 503) message = 'The waitlist is temporarily unavailable.';
  throw { status: res.status, message };
}
