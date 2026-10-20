/**
 * Format a number as Colombian pesos
 */
export function formatCOP(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}

/**
 * Format a date string (YYYY-MM-DD) to Colombian format DD/MM/YYYY
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  return dateStr;
}

/**
 * Format a timestamp to a readable date+time
 */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
