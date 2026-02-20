import { format, parseISO } from 'date-fns';

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n.toFixed(2)}%`;
}

export function formatBillions(n: number | null | undefined): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000) {
    return `$${(n / 1_000).toFixed(1)}T`;
  }
  return `$${n.toFixed(1)}B`;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM yyyy');
}

export function formatDateLabel(label: unknown): string {
  if (typeof label === 'string') return formatDate(label);
  return String(label ?? '');
}

export function formatChange(n: number | null | undefined): string {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}
