/**
 * Lightweight frontend validation helpers.
 * Returns error message string or null if valid.
 */

export const required = (label) => (value) =>
  value && String(value).trim() ? null : `${label} is required`;

export const email = (value) => {
  if (!value) return null; // Use required() separately for required checks
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email address';
};

export const minLength = (label, min) => (value) =>
  !value || String(value).length >= min ? null : `${label} must be at least ${min} characters`;

export const phone = (value) => {
  if (!value) return null;
  return /^[+]?[\d\s()-]{7,20}$/.test(value) ? null : 'Invalid phone number';
};

export const positiveNumber = (label) => (value) => {
  if (value === '' || value === undefined || value === null) return `${label} is required`;
  return Number(value) > 0 ? null : `${label} must be greater than 0`;
};

export const slug = (value) => {
  if (!value) return null;
  return /^[a-z0-9-]+$/.test(value) ? null : 'Only lowercase letters, numbers, and hyphens';
};

/**
 * Run multiple validators on a form object.
 * @param {Object} form - The form data
 * @param {Object} rules - { fieldName: [validatorFn, ...], ... }
 * @returns {{ valid: boolean, errors: Object }}
 */
export function validateForm(form, rules) {
  const errors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const error = validator(form[field]);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
