import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Challenge from './Challenge.jsx';

const fakeRun = vi.fn();

vi.mock('@/lib/course', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createSandboxRunner: vi.fn(() => ({
      run: fakeRun,
      dispose: vi.fn(),
    })),
  };
});

const c01 = 'js-foundations-m01-l01-c01';
const c02 = 'js-foundations-m01-l01-c02';

beforeEach(() => {
  localStorage.clear();
  fakeRun.mockReset();
});

describe('Challenge', () => {
  it('renders the challenge instruction and starter code', () => {
    render(<Challenge challengeId={c01} />);
    expect(screen.getByText(/Change the greeting/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Code editor')).toHaveValue("const greeting = 'Hello';\nconsole.log(greeting);");
  });

  it('shows the lock message and no editor for a locked challenge', () => {
    render(<Challenge challengeId={c02} />);
    expect(screen.getByText(/Complete the previous challenge/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Code editor')).not.toBeInTheDocument();
  });

  it('renders the failure message when the run fails', async () => {
    fakeRun.mockResolvedValue({
      ok: false,
      checks: [{ id: 'console-output', pass: false, message: 'The console should contain exactly Hello, Ada.', actual: [], expected: ['Hello, Ada'] }],
      error: null,
    });
    render(<Challenge challengeId={c01} />);
    fireEvent.click(screen.getByRole('button', { name: /Check your code/i }));
    expect(await screen.findByText(/The console should contain exactly Hello, Ada/i)).toBeInTheDocument();
  });

  it('renders the pass message and enables Next on success', async () => {
    fakeRun.mockResolvedValue({
      ok: true,
      checks: [{ id: 'console-output', pass: true, message: 'Passed.', actual: ['Hello, Ada'], expected: ['Hello, Ada'] }],
      error: null,
    });
    render(<Challenge challengeId={c01} />);
    fireEvent.click(screen.getByRole('button', { name: /Check your code/i }));
    expect(await screen.findByText(/You changed a value and checked the result/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /Next challenge/i })).toBeEnabled());
  });

  it('disables run while the runner is pending', async () => {
    let resolveRun;
    fakeRun.mockImplementation(() => new Promise((resolve) => { resolveRun = resolve; }));
    render(<Challenge challengeId={c01} />);
    const runBtn = screen.getByRole('button', { name: /Check your code/i });
    fireEvent.click(runBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /Running/i })).toBeDisabled());
    resolveRun({ ok: true, checks: [{ id: 'x', pass: true, message: 'Passed.' }], error: null });
    await waitFor(() => expect(screen.queryByRole('button', { name: /Running/i })).not.toBeInTheDocument());
  });
});
