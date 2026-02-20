import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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

export default function GDPSection({ dateRange }: Props) {
  const gdp = useFredSeries('GDP', dateRange);
  const gdpGrowth = useFredSeries('A191RL1Q225SBEA', dateRange);

  const gdpData = (gdp.data ?? [])
    .filter((d) => d.value != null)
    .map((d) => ({ date: d.date, value: d.value }));

  const growthData = (gdpGrowth.data ?? [])
    .filter((d) => d.value != null)
    .map((d) => ({ date: d.date, value: d.value }));

  const startDate = gdpData[0]?.date;
  const endDate = gdpData[gdpData.length - 1]?.date;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        GDP &amp; Growth
      </h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Real GDP" subtitle="Billions of chained 2017 dollars">
          {gdp.isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gdpData}>
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
                <RecessionBands dataStartDate={startDate} dataEndDate={endDate} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={palette.blue}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Real GDP Growth Rate" subtitle="Quarterly, annualised %">
          {gdpGrowth.isLoading ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
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
                  dataStartDate={growthData[0]?.date}
                  dataEndDate={growthData[growthData.length - 1]?.date}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={palette.emerald}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
