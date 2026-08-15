import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WaitlistForm from '@/components/WaitlistForm.jsx';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('WaitlistForm', () => {
  it('POSTs a valid email as JSON and shows success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Join early access/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/waitlist');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).email).toBe('ada@example.com');
    expect(await screen.findByText(/on the list/i)).toBeInTheDocument();
  });

  it('shows the rate-limit message on 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Join early access/i }));
    expect(await screen.findByText(/Too many attempts/i)).toBeInTheDocument();
  });

  it('rejects an invalid email without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<WaitlistForm />);
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /Join early access/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
