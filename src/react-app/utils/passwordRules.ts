export function getPasswordErrors(password: string): string[] {
  const errors: string[] = [];

  if (password.length > 0 && password.length < 12) {
    errors.push("At least 12 characters");
  }
  if (password.length > 64) {
    errors.push("At most 64 characters");
  }
  if (password.length > 0 && !/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }
  if (password.length > 0 && !/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter");
  }
  if (password.length > 0 && !/[0-9]/.test(password)) {
    errors.push("At least one number");
  }

  return errors;
}

export const PASSWORD_REQUIREMENTS_HINT =
  "12-64 characters, must include uppercase, lowercase, and number";
