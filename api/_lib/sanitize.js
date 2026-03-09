export function sanitizeString(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/<[^>]*>/g, '').slice(0, maxLength);
}

export function sanitizeAmount(value, min = 1, max = 10000) {
  const num = parseFloat(value);
  if (!isFinite(num) || num < min || num > max) return null;
  return Math.round(num * 100) / 100;
}
