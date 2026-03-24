import { describe, it, expect } from 'vitest';
import {
  required,
  email,
  minLength,
  phone,
  positiveNumber,
  slug,
  validateForm,
} from '../utils/validation';

describe('required', () => {
  const check = required('Name');
  it('returns error for empty string', () => {
    expect(check('')).toBe('Name is required');
  });
  it('returns error for whitespace-only', () => {
    expect(check('   ')).toBe('Name is required');
  });
  it('returns null for valid value', () => {
    expect(check('John')).toBeNull();
  });
  it('returns error for undefined', () => {
    expect(check(undefined)).toBe('Name is required');
  });
});

describe('email', () => {
  it('returns null for empty (optional)', () => {
    expect(email('')).toBeNull();
  });
  it('returns error for invalid email', () => {
    expect(email('notanemail')).toBe('Invalid email address');
  });
  it('returns null for valid email', () => {
    expect(email('test@example.com')).toBeNull();
  });
});

describe('minLength', () => {
  const check = minLength('Password', 8);
  it('returns error when too short', () => {
    expect(check('abc')).toBe('Password must be at least 8 characters');
  });
  it('returns null when long enough', () => {
    expect(check('abcdefgh')).toBeNull();
  });
  it('returns null for empty (optional)', () => {
    expect(check('')).toBeNull();
  });
});

describe('phone', () => {
  it('returns null for empty (optional)', () => {
    expect(phone('')).toBeNull();
  });
  it('returns null for valid phone', () => {
    expect(phone('+1 (555) 123-4567')).toBeNull();
  });
  it('returns error for invalid phone', () => {
    expect(phone('abc')).toBe('Invalid phone number');
  });
});

describe('positiveNumber', () => {
  const check = positiveNumber('Amount');
  it('returns error for empty', () => {
    expect(check('')).toBe('Amount is required');
  });
  it('returns error for zero', () => {
    expect(check(0)).toBe('Amount must be greater than 0');
  });
  it('returns error for negative', () => {
    expect(check(-5)).toBe('Amount must be greater than 0');
  });
  it('returns null for positive number', () => {
    expect(check(100)).toBeNull();
  });
});

describe('slug', () => {
  it('returns null for empty (optional)', () => {
    expect(slug('')).toBeNull();
  });
  it('returns null for valid slug', () => {
    expect(slug('my-church-123')).toBeNull();
  });
  it('returns error for uppercase', () => {
    expect(slug('MyChurch')).toBe('Only lowercase letters, numbers, and hyphens');
  });
  it('returns error for spaces', () => {
    expect(slug('my church')).toBe('Only lowercase letters, numbers, and hyphens');
  });
});

describe('validateForm', () => {
  it('returns valid when all rules pass', () => {
    const { valid, errors } = validateForm(
      { name: 'John', email: 'john@test.com' },
      { name: [required('Name')], email: [required('Email'), email] }
    );
    expect(valid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns first error per field', () => {
    const { valid, errors } = validateForm(
      { name: '', email: 'bad' },
      { name: [required('Name')], email: [required('Email'), email] }
    );
    expect(valid).toBe(false);
    expect(errors.name).toBe('Name is required');
    expect(errors.email).toBe('Invalid email address');
  });

  it('stops at first error for each field', () => {
    const { errors } = validateForm(
      { password: '' },
      { password: [required('Password'), minLength('Password', 8)] }
    );
    expect(errors.password).toBe('Password is required');
  });
});
