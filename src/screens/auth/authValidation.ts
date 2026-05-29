import { isValidEmail, normalizeEmail as normalizeEmailValue } from '../../utils/validation';

export function normalizeEmail(email: string): string {
  return normalizeEmailValue(email);
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) {
    return `${label} is required.`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!isValidEmail(email.trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) {
    return 'Password should be at least 6 characters.';
  }
  return null;
}

export function validatePasswordConfirmation(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return 'Password and confirm password must match.';
  }
  return null;
}
