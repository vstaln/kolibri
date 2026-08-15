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
  it('renders the course header, explanation, task and starter code', () => {
    render(<Challenge challengeId={c01} />);
    expect(screen.getByText('Learn one idea. Use it. See what happens.')).toBeInTheDocument();
    expect(screen.getByText(/Change the greeting so the program prints exactly: Hello, Ada/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Your code')).toHaveValue("const greeting = 'Hello';\nconsole.log(greeting);");
    expect(screen.getByText(/const: A variable binding that is not reassigned/i)).toBeInTheDocument();
  });

  it('shows the lock message and no editor for a locked challenge', () => {
    render(<Challenge challengeId={c02} />);
    expect(screen.getByText('Complete the previous challenge to unlock this one.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Your code')).not.toBeInTheDocument();
  });

  it('renders the failure message when the run fails', async () => {
    fakeRun.mockResolvedValue({
      ok: false,
      checks: [{ id: 'console-output', pass: false, message: 'The console should contain exactly Hello, Ada.', actual: [], expected: ['Hello, Ada'] }],
      error: null,
    });
    render(<Challenge challengeId={c01} />);
    fireEvent.click(screen.getByRole('button', { name: 'Run tests' }));
    expect(await screen.findByText(/Read the expected line carefully, including its punctuation\. Expected/)).toBeInTheDocument();
  });

  it('renders the pass message and enables Next on success', async () => {
    fakeRun.mockResolvedValue({
      ok: true,
      checks: [{ id: 'console-output', pass: true, message: 'Passed.', actual: ['Hello, Ada'], expected: ['Hello, Ada'] }],
      error: null,
    });
    render(<Challenge challengeId={c01} />);
    fireEvent.click(screen.getByRole('button', { name: 'Run tests' }));
    expect(await screen.findByText('The greeting is exact. You changed a value and checked the result.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next challenge' })).toBeEnabled());
  });

  it('shows the running state and disables run while the runner is pending', async () => {
    let resolveRun;
    fakeRun.mockImplementation(() => new Promise((resolve) => { resolveRun = resolve; }));
    render(<Challenge challengeId={c01} />);
    fireEvent.click(screen.getByRole('button', { name: 'Run tests' }));
    await waitFor(() => expect(screen.getByText('Running tests…')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Run tests' })).toBeDisabled();
    resolveRun({ ok: true, checks: [{ id: 'x', pass: true, message: 'Passed.' }], error: null });
    await waitFor(() => expect(screen.queryByText('Running tests…')).not.toBeInTheDocument());
  });
});
