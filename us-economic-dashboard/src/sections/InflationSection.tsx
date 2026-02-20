import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { DateRange } from '../api/types';
import { useFredSeries } from '../hooks/useFredSeries';
import ChartCard from '../components/ChartCard';
import RecessionBands from '../components/RecessionBands';
import { palette } from '../utils/colours';
import { formatDate, formatDateLabel } from '../utils/formatters';

interface Props {
  dateRange: DateRange;
}

export default function InflationSection({ dateRange }: Props) {
  const cpiYoY = useFredSeries('CPIAUCSL', dateRange);
  const coreCpi = useFredSeries('CPILFESL', dateRange);
  const pce = useFredSeries('PCEPI', dateRange);

  // Compute YoY % change for CPI
  function computeYoY(data: { date: string; value: number | null }[] | undefined) {
    if (!data) return [];
    const filtered = data.filter((d) => d.value != null);
    return filtered
      .map((d, i) => {
        if (i < 12) return null;
        const prev = filtered[i - 12];
        if (!prev || prev.value == null || d.value == null) return null;
        return {
          date: d.date,
          value: ((d.value - prev.value) / prev.value) * 100,
        };
      })
      .filter(Boolean) as { date: string; value: number }[];
  }

  const cpiData = computeYoY(cpiYoY.data);
  const coreData = computeYoY(coreCpi.data);
  const pceData = computeYoY(pce.data);

  // Merge into a single dataset by date
  const dateMap = new Map<string, { date: string; cpi?: number; core?: number; pce?: number }>();
  for (const d of cpiData) {
    dateMap.set(d.date, { ...dateMap.get(d.date), date: d.date, cpi: d.value });
  }
  for (const d of coreData) {
    dateMap.set(d.date, { ...dateMap.get(d.date), date: d.date, core: d.value });
  }
  for (const d of pceData) {
    dateMap.set(d.date, { ...dateMap.get(d.date), date: d.date, pce: d.value });
  }
  const merged = [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const isLoading = cpiYoY.isLoading || coreCpi.isLoading || pce.isLoading;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Inflation
      </h2>
      <ChartCard title="Inflation Measures" subtitle="Year-over-year % change">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            Loading...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
              <Tooltip
                labelFormatter={formatDateLabel}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: 8,
                  color: '#f3f4f6',
                }}
              />
              <Legend />
              <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="6 3" label="" />
              <RecessionBands
                dataStartDate={merged[0]?.date}
                dataEndDate={merged[merged.length - 1]?.date}
              />
              <Line
                type="monotone"
                dataKey="cpi"
                name="CPI (All Items)"
                stroke={palette.rose}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="core"
                name="Core CPI"
                stroke={palette.amber}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pce"
                name="PCE"
                stroke={palette.indigo}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
