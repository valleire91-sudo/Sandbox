import type { DateRange } from '../api/types';
import { useFredSeries } from '../hooks/useFredSeries';
import StatCard from '../components/StatCard';
import { formatPercent, formatBillions } from '../utils/formatters';

interface Props {
  dateRange: DateRange;
}

const series = [
  { id: 'GDP', label: 'Real GDP', positiveIsGood: true },
  { id: 'CPIAUCSL', label: 'CPI (All Urban)', positiveIsGood: false },
  { id: 'UNRATE', label: 'Unemployment Rate', positiveIsGood: false },
  { id: 'FEDFUNDS', label: 'Fed Funds Rate', positiveIsGood: true },
  { id: 'DGS10', label: '10Y Treasury Yield', positiveIsGood: true },
];

function getLatest(data: { date: string; value: number | null }[] | undefined) {
  if (!data || data.length === 0) return { value: null, change: null };
  const recent = [...data].reverse().find((d) => d.value != null);
  const prev = data.length >= 2
    ? [...data].reverse().find((d, i) => i > 0 && d.value != null)
    : null;
  return {
    value: recent?.value ?? null,
    change: recent?.value != null && prev?.value != null
      ? recent.value - prev.value
      : null,
  };
}

export default function OverviewSection({ dateRange }: Props) {
  const results = series.map((s) => ({
    ...s,
    query: useFredSeries(s.id, dateRange),
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        US Economic Overview
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {results.map((r) => {
          const { value, change } = getLatest(r.query.data);
          const formatted =
            r.id === 'GDP'
              ? formatBillions(value)
              : formatPercent(value);
          return (
            <StatCard
              key={r.id}
              label={r.label}
              value={r.query.isLoading ? '...' : formatted}
              change={change}
              positiveIsGood={r.positiveIsGood}
            />
          );
        })}
      </div>
    </div>
  );
}
