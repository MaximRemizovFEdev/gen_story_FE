const PHONE_LENGTH = 11;

export const normalizePhone = (value) => {
  let digits = value.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  } else if (!digits.startsWith('7')) {
    digits = `7${digits}`;
  }

  return digits.slice(0, PHONE_LENGTH);
};

export const formatPhone = (value) => {
  const normalizedPhone = normalizePhone(value);
  if (!normalizedPhone) return '';

  const digits = normalizedPhone.slice(1);
  const parts = ['+7'];

  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));

  return parts.join(' ');
};

export const isValidPhone = (value) => /^7\d{10}$/.test(value);
