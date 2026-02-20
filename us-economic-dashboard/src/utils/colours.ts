export const palette = {
  blue: '#3b82f6',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  slate: '#64748b',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
} as const;

export const chartColours = [
  palette.blue,
  palette.emerald,
  palette.amber,
  palette.rose,
  palette.indigo,
  palette.cyan,
  palette.violet,
  palette.slate,
];

export function getTrendColour(
  value: number,
  positiveIsGood: boolean,
): string {
  if (value === 0) return 'text-amber-500';
  const isPositive = value > 0;
  if (isPositive === positiveIsGood) return 'text-emerald-500';
  return 'text-rose-500';
}
