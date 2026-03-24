import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormField from '../components/ui/FormField';

describe('FormField', () => {
  it('renders label text', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormField label="Name" required>
        <input />
      </FormField>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show required indicator when not required', () => {
    render(
      <FormField label="Note">
        <input />
      </FormField>
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('shows error message when error prop passed', () => {
    render(
      <FormField label="Email" error="Invalid email">
        <input />
      </FormField>
    );
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('does not show error message when no error', () => {
    render(
      <FormField label="Email">
        <input />
      </FormField>
    );
    expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FormField label="Test">
        <input data-testid="child-input" />
      </FormField>
    );
    expect(screen.getByTestId('child-input')).toBeInTheDocument();
  });
});
