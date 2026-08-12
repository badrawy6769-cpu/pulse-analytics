/**
 * Shared pure utility functions used across the app.
 * Kept dependency-free and side-effect-free so they are easy to unit test.
 */

/**
 * Format a number as USD currency, e.g. 12345.6 -> "$12,345.60"
 */
export function formatCurrency(value, { decimals = 2 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a number with thousands separators, e.g. 12345 -> "12,345"
 */
export function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

/**
 * Format a fraction as a percentage string, e.g. 0.1234 -> "12.34%"
 */
export function formatPercent(value, { decimals = 1 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0%';
  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * Percentage growth between two values. Returns 0 when previous is 0
 * to avoid Infinity/NaN leaking into the UI.
 */
export function calcGrowth(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return 0;
  return (c - p) / p;
}

/**
 * Simple, dependency-free unique id generator (not cryptographically secure,
 * fine for a client-only demo dataset / mock user records).
 */
export function generateId(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

/**
 * Very small, dependency-free string hashing used to avoid storing plaintext
 * passwords in localStorage for this client-only demo. This is NOT
 * cryptographically secure and must never be used for real credentials in
 * a production system with a real backend.
 */
export function hashString(input) {
  const str = String(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  // Second pass with a different seed to reduce trivial collisions
  let hash2 = 5381;
  for (let i = 0; i < str.length; i++) {
    hash2 = (hash2 * 33) ^ str.charCodeAt(i);
  }
  return `${(hash >>> 0).toString(16)}${(hash2 >>> 0).toString(16)}`;
}

/**
 * Basic email format validation (client-side UX guard, not a security boundary).
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Password strength guard: minimum 8 chars, at least one letter and one number.
 */
export function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Escape a string for safe insertion into HTML text content contexts.
 * Prevents basic XSS when rendering user-supplied strings (e.g. name/email).
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
