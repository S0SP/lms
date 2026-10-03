import validator from 'validator';
import { isValidPhoneNumber, parsePhoneNumber, CountryCode } from 'libphonenumber-js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates an email address using the `validator` library.
 * Supports checking general valid emails and optional Gmail-specific validation.
 */
export function validateEmail(
  email: string,
  options?: { requireGmail?: boolean; fieldName?: string; required?: boolean }
): ValidationResult {
  const field = options?.fieldName || 'Email';
  const trimmed = (email || '').trim();

  if (!trimmed) {
    if (options?.required === false) {
      return { isValid: true };
    }
    return { isValid: false, error: `${field} is required` };
  }

  if (!validator.isEmail(trimmed)) {
    return { isValid: false, error: `Please enter a valid ${field.toLowerCase()} address` };
  }

  if (options?.requireGmail) {
    const domain = trimmed.split('@')[1]?.toLowerCase();
    if (domain !== 'gmail.com' && domain !== 'googlemail.com') {
      return { isValid: false, error: 'Please use a valid @gmail.com address' };
    }
  }

  return { isValid: true };
}

/**
 * Validates an international phone number using `libphonenumber-js`.
 */
export function validatePhone(
  phone: string,
  options?: { required?: boolean; defaultCountry?: CountryCode; fieldName?: string }
): ValidationResult {
  const field = options?.fieldName || 'Phone number';
  const trimmed = (phone || '').trim();

  if (!trimmed) {
    if (options?.required) {
      return { isValid: false, error: `${field} is required` };
    }
    return { isValid: true };
  }

  try {
    const valid = isValidPhoneNumber(trimmed, options?.defaultCountry);
    if (!valid) {
      return { isValid: false, error: 'Please enter a valid international phone number' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid phone number format' };
  }
}

/**
 * Formats a phone number into international E.164 format.
 */
export function formatPhoneNumber(phone: string, defaultCountry?: CountryCode): string {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);
    return parsed ? parsed.format('E.164') : phone;
  } catch {
    return phone;
  }
}

/**
 * Validates required text fields.
 */
export function validateRequired(value: string, fieldName: string, minLength = 1): ValidationResult {
  const trimmed = (value || '').trim();
  if (trimmed.length < minLength) {
    return { 
      isValid: false, 
      error: minLength > 1 
        ? `${fieldName} must be at least ${minLength} characters` 
        : `${fieldName} is required` 
    };
  }
  return { isValid: true };
}
