const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
