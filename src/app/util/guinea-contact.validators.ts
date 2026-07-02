import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Formats acceptés : +224 628 XX XX XX, 00224 628 XX XX XX ou 628 XX XX XX */
export const GUINEA_PHONE_HINT =
  'Format attendu : +224 628 XX XX XX, 00224 628 XX XX XX ou 628 XX XX XX';

export function compactGuineaPhone(value: string): string {
  return value.replace(/\s+/g, '');
}

export function isValidGuineaPhone(value: string | null | undefined): boolean {
  if (!value || !value.trim()) {
    return true;
  }
  const compact = compactGuineaPhone(value.trim());
  return (
    /^\+224[0-9]{9}$/.test(compact) ||
    /^00224[0-9]{9}$/.test(compact) ||
    /^[0-9]{9}$/.test(compact)
  );
}

export function guineaPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return null;
    }
    return isValidGuineaPhone(String(raw)) ? null : { guineaPhone: true };
  };
}

export function optionalEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw == null || String(raw).trim() === '') {
      return null;
    }
    const email = String(raw).trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return ok ? null : { email: true };
  };
}

export function phoneControlError(control: AbstractControl | null, required = false): string | null {
  if (!control || !control.touched && !control.dirty) {
    return null;
  }
  if (required && control.hasError('required')) {
    return 'Requis';
  }
  if (control.hasError('guineaPhone')) {
    return GUINEA_PHONE_HINT;
  }
  return null;
}

export function emailControlError(control: AbstractControl | null): string | null {
  if (!control || !control.touched && !control.dirty) {
    return null;
  }
  if (control.hasError('email')) {
    return 'Email invalide';
  }
  return null;
}
