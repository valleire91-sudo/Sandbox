import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
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

export default function LabourSection({ dateRange }: Props) {
  const unrate = useFredSeries('UNRATE', dateRange);
  const payems = useFredSeries('PAYEMS', dateRange);

  const unrateData = (unrate.data ?? [])
    .filter((d) => d.value != null)
    .map((d) => ({ date: d.date, value: d.value }));

  const nfpData = (payems.data ?? [])
    .filter((d) => d.value != null)
    .map((d, i, arr) => ({
      date: d.date,
      value: i > 0 ? (d.value as number) - (arr[i - 1].value as number) : 0,
    }))
    .slice(1);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Labour Market
      </h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Unemployment Rate" subtitle="Seasonally adjusted, %">
          {unrate.isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={unrateData}>
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
                <RecessionBands
                  dataStartDate={unrateData[0]?.date}
                  dataEndDate={unrateData[unrateData.length - 1]?.date}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={palette.rose}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Non-Farm Payroll Change" subtitle="Month-over-month, thousands">
          {payems.isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nfpData}>
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
                <Bar dataKey="value" fill={palette.blue} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
