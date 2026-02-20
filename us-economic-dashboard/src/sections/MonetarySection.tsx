import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
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

export default function MonetarySection({ dateRange }: Props) {
  const fedFunds = useFredSeries('FEDFUNDS', dateRange);
  const dgs10 = useFredSeries('DGS10', dateRange);
  const dgs2 = useFredSeries('DGS2', dateRange);

  const rateData = (() => {
    const dateMap = new Map<
      string,
      { date: string; fedfunds?: number; dgs10?: number; dgs2?: number }
    >();
    for (const d of fedFunds.data?.filter((d) => d.value != null) ?? []) {
      dateMap.set(d.date, { ...dateMap.get(d.date), date: d.date, fedfunds: d.value! });
    }
    for (const d of dgs10.data?.filter((d) => d.value != null) ?? []) {
      dateMap.set(d.date, { ...dateMap.get(d.date), date: d.date, dgs10: d.value! });
    }
    for (const d of dgs2.data?.filter((d) => d.value != null) ?? []) {
      dateMap.set(d.date, { ...dateMap.get(d.date), date: d.date, dgs2: d.value! });
    }
    return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Yield curve spread (10Y - 2Y)
  const spreadData = rateData
    .filter((d) => d.dgs10 != null && d.dgs2 != null)
    .map((d) => ({
      date: d.date,
      spread: Number((d.dgs10! - d.dgs2!).toFixed(2)),
    }));

  const isLoading = fedFunds.isLoading || dgs10.isLoading || dgs2.isLoading;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Monetary Policy
      </h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Policy & Benchmark Rates" subtitle="% per annum">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rateData}>
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
                <RecessionBands
                  dataStartDate={rateData[0]?.date}
                  dataEndDate={rateData[rateData.length - 1]?.date}
                />
                <Line
                  type="monotone"
                  dataKey="fedfunds"
                  name="Fed Funds"
                  stroke={palette.blue}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dgs10"
                  name="10Y Treasury"
                  stroke={palette.emerald}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dgs2"
                  name="2Y Treasury"
                  stroke={palette.amber}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Yield Curve Spread" subtitle="10Y minus 2Y Treasury, bps">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spreadData}>
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
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
                <RecessionBands
                  dataStartDate={spreadData[0]?.date}
                  dataEndDate={spreadData[spreadData.length - 1]?.date}
                />
                <Area
                  type="monotone"
                  dataKey="spread"
                  name="10Y-2Y Spread"
                  stroke={palette.violet}
                  fill={palette.violet}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
