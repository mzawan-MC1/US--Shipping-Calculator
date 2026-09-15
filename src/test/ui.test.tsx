import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

describe('UI Primitives', () => {
  it('renders Button with text and handles loading state', () => {
    const { rerender } = render(<Button variant="primary">Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();

    rerender(
      <Button variant="primary" isLoading>
        Click Me
      </Button>
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders Card with selected styling indicator', () => {
    render(
      <Card selected={true} data-testid="test-card">
        Card Content
      </Card>
    );
    expect(screen.getByTestId('test-card')).toHaveClass('border-brand-orange-500');
  });

  it('renders Badge with correct variant styling', () => {
    render(<Badge variant="orange">Demonstration</Badge>);
    expect(screen.getByText('Demonstration')).toBeInTheDocument();
  });
});
