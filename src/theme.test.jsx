import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('design system', () => {
  it('renders a shadcn button with variant classes', () => {
    render(<Button className="bg-brand text-white">Hello</Button>);
    const btn = screen.getByRole('button', { name: 'Hello' });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('bg-brand');
  });

  it('renders default variant', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button', { name: 'Default' })).toHaveClass('bg-primary');
  });
});
