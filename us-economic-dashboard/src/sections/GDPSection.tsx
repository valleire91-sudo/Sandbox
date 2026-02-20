import { useMemo } from 'react';
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
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { DateRange, FredObservation } from '../api/types';
import { useFredSeries } from '../hooks/useFredSeries';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/StatCard';
import RecessionBands from '../components/RecessionBands';
import { palette } from '../utils/colours';
import { formatDate, formatDateLabel } from '../utils/formatters';

interface Props {
  dateRange: DateRange;
}

// ── helpers ──────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: 'none',
  borderRadius: 8,
  color: '#f3f4f6',
} as const;

function latest(data: FredObservation[] | undefined): number | null {
  if (!data) return null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].value != null) return data[i].value;
  }
  return null;
}

function latestDate(data: FredObservation[] | undefined): string | null {
  if (!data) return null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].value != null) return data[i].date;
  }
  return null;
}

function latestChange(data: FredObservation[] | undefined): number | null {
  if (!data) return null;
  let cur: number | null = null;
  let prev: number | null = null;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].value != null) {
      if (cur === null) {
        cur = data[i].value;
      } else {
        prev = data[i].value;
        break;
      }
    }
  }
  return cur != null && prev != null ? cur - prev : null;
}

/** Convert an ISO date to a quarter label like "Q3 2024". */
function toQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

/** Compute YoY % change for a quarterly series (compare to 4 quarters prior). */
function computeYoYQuarterly(
  data: FredObservation[] | undefined,
): { date: string; value: number }[] {
  if (!data) return [];
  const valid = data.filter((d) => d.value != null);
  const result: { date: string; value: number }[] = [];
  for (let i = 4; i < valid.length; i++) {
    const cur = valid[i].value!;
    const prev = valid[i - 4].value!;
    if (prev !== 0) {
      result.push({
        date: valid[i].date,
        value: ((cur - prev) / prev) * 100,
      });
    }
  }
  return result;
}

/** Merge multiple named raw FRED series into one dataset keyed by date. */
function mergeRawSeries(
  entries: { key: string; data: FredObservation[] | undefined }[],
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const { key, data } of entries) {
    for (const obs of data ?? []) {
      if (obs.value == null) continue;
      const existing = map.get(obs.date) ?? { date: obs.date };
      existing[key] = obs.value;
      map.set(obs.date, existing);
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.date as string).localeCompare(b.date as string),
  );
}

// ── component ───────────────────────────────────────────────────────────

export default function GDPSection({ dateRange }: Props) {
  // ── fetch all series ──
  const gdpc1 = useFredSeries('GDPC1', dateRange);
  const gdpGrowth = useFredSeries('A191RL1Q225SBEA', dateRange);
  const pce = useFredSeries('PCECC96', dateRange);
  const investment = useFredSeries('GPDIC1', dateRange);
  const government = useFredSeries('GCEC1', dateRange);
  const netExports = useFredSeries('NETEXP', dateRange);
  const usrec = useFredSeries('USREC', dateRange);

  // ── computed series ──
  const yoyGrowth = useMemo(
    () => computeYoYQuarterly(gdpc1.data),
    [gdpc1.data],
  );

  // ── chart 1: Real GDP level ──
  const gdpLevelData = useMemo(
    () =>
      (gdpc1.data ?? [])
        .filter((d) => d.value != null)
        .map((d) => ({ date: d.date, gdp: d.value! / 1000 })),
    [gdpc1.data],
  );

  // ── chart 2: GDP growth rate bars ──
  const growthBarData = useMemo(
    () =>
      (gdpGrowth.data ?? [])
        .filter((d) => d.value != null)
        .map((d) => ({ date: d.date, growth: d.value! })),
    [gdpGrowth.data],
  );

  // ── chart 3: GDP components ──
  const componentsData = useMemo(
    () =>
      mergeRawSeries([
        { key: 'pce', data: pce.data },
        { key: 'investment', data: investment.data },
        { key: 'government', data: government.data },
        { key: 'netExports', data: netExports.data },
      ]),
    [pce.data, investment.data, government.data, netExports.data],
  );
  const componentsLoading =
    pce.isLoading || investment.isLoading || government.isLoading || netExports.isLoading;
  const componentsError =
    pce.isError && investment.isError && government.isError && netExports.isError;

  // ── chart 4: YoY growth ──
  const yoyData = useMemo(
    () => yoyGrowth.map((d) => ({ date: d.date, yoy: Number(d.value.toFixed(2)) })),
    [yoyGrowth],
  );

  // ── stat card values ──
  const currentGdp = latest(gdpc1.data);
  const currentQoQ = latest(gdpGrowth.data);
  const qoqChange = latestChange(gdpGrowth.data);
  const currentYoY = yoyGrowth.length > 0 ? yoyGrowth[yoyGrowth.length - 1].value : null;
  const lastDateStr = latestDate(gdpc1.data);
  const quarterLabel = lastDateStr ? toQuarterLabel(lastDateStr) : '—';

  const statsLoading = gdpc1.isLoading || gdpGrowth.isLoading;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        GDP &amp; Growth
      </h2>

      {/* ── Headline StatCards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Real GDP"
          value={
            currentGdp != null
              ? `$${(currentGdp / 1000).toFixed(2)}T`
              : '—'
          }
          change={
            gdpc1.data && gdpc1.data.length >= 2
              ? (() => {
                  const vals = gdpc1.data.filter((d) => d.value != null);
                  if (vals.length < 2) return null;
                  return (vals[vals.length - 1].value! - vals[vals.length - 2].value!) / 1000;
                })()
              : null
          }
          changeLabel="QoQ"
          positiveIsGood={true}
          isLoading={statsLoading}
        />
        <StatCard
          title="QoQ Growth (Ann.)"
          value={
            currentQoQ != null
              ? `${currentQoQ >= 0 ? '+' : ''}${currentQoQ.toFixed(1)}%`
              : '—'
          }
          change={qoqChange}
          changeLabel="vs prior Q"
          positiveIsGood={true}
          isLoading={statsLoading}
        />
        <StatCard
          title="YoY Growth"
          value={
            currentYoY != null
              ? `${currentYoY >= 0 ? '+' : ''}${currentYoY.toFixed(2)}%`
              : '—'
          }
          positiveIsGood={true}
          isLoading={statsLoading}
        />
        <StatCard
          title="Latest Quarter"
          value={quarterLabel}
          isLoading={statsLoading}
        />
      </div>

      {/* ── Row 1: GDP Level + Growth Rate ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Real GDP Level */}
        <ChartCard
          title="Real GDP"
          subtitle="Trillions of chained 2017 dollars"
          isLoading={gdpc1.isLoading}
          isError={gdpc1.isError}
          onRetry={() => gdpc1.refetch()}
          seriesIds={['GDPC1']}
          csvData={gdpLevelData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={gdpLevelData}>
              <defs>
                <linearGradient id="gdpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.blue} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={palette.blue} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(v: number) => `$${v}T`}
              />
              <Tooltip
                labelFormatter={formatDateLabel}
                formatter={(value: unknown) =>
                  typeof value === 'number'
                    ? [`$${value.toFixed(2)}T`, 'Real GDP']
                    : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={gdpLevelData[0]?.date}
                dataEndDate={gdpLevelData[gdpLevelData.length - 1]?.date}
              />
              <Area
                type="monotone"
                dataKey="gdp"
                stroke={palette.blue}
                fill="url(#gdpGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: GDP Growth Rate */}
        <ChartCard
          title="GDP Growth Rate"
          subtitle="Quarterly, annualised %"
          isLoading={gdpGrowth.isLoading}
          isError={gdpGrowth.isError}
          onRetry={() => gdpGrowth.refetch()}
          seriesIds={['A191RL1Q225SBEA']}
          csvData={growthBarData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                labelFormatter={(label: unknown) =>
                  typeof label === 'string'
                    ? `${toQuarterLabel(label)} (${formatDate(label)})`
                    : String(label ?? '')
                }
                formatter={(value: unknown) =>
                  typeof value === 'number'
                    ? [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, 'QoQ Ann.']
                    : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={growthBarData[0]?.date}
                dataEndDate={growthBarData[growthBarData.length - 1]?.date}
              />
              <Bar dataKey="growth" radius={[2, 2, 0, 0]}>
                {growthBarData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.growth >= 0 ? palette.emerald : palette.rose}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Components + YoY Growth ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 3: GDP Components */}
        <ChartCard
          title="GDP Components"
          subtitle="Real levels, billions of chained 2017 dollars"
          isLoading={componentsLoading}
          isError={componentsError}
          onRetry={() => {
            pce.refetch();
            investment.refetch();
            government.refetch();
            netExports.refetch();
          }}
          seriesIds={['PCECC96', 'GPDIC1', 'GCEC1', 'NETEXP']}
          csvData={componentsData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={componentsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}T` : `$${v}B`
                }
              />
              <Tooltip
                labelFormatter={formatDateLabel}
                formatter={(value: unknown) =>
                  typeof value === 'number'
                    ? [`$${value.toLocaleString()}B`]
                    : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={componentsData[0]?.date as string | undefined}
                dataEndDate={
                  componentsData[componentsData.length - 1]?.date as
                    | string
                    | undefined
                }
              />
              <Area
                type="monotone"
                dataKey="pce"
                name="Consumption"
                stroke={palette.blue}
                fill={palette.blue}
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
                stackId="gdp"
              />
              <Area
                type="monotone"
                dataKey="investment"
                name="Investment"
                stroke={palette.emerald}
                fill={palette.emerald}
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
                stackId="gdp"
              />
              <Area
                type="monotone"
                dataKey="government"
                name="Government"
                stroke={palette.amber}
                fill={palette.amber}
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
                stackId="gdp"
              />
              {/* Net Exports rendered as an unstacked line overlay
                  because stacking negative values distorts the chart */}
              <Line
                type="monotone"
                dataKey="netExports"
                name="Net Exports"
                stroke={palette.rose}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: YoY Real GDP Growth */}
        <ChartCard
          title="YoY Real GDP Growth"
          subtitle="Year-over-year % change"
          isLoading={gdpc1.isLoading}
          isError={gdpc1.isError}
          onRetry={() => gdpc1.refetch()}
          seriesIds={['GDPC1']}
          csvData={yoyData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yoyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                labelFormatter={formatDateLabel}
                formatter={(value: unknown) =>
                  typeof value === 'number'
                    ? [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, 'YoY Growth']
                    : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={yoyData[0]?.date}
                dataEndDate={yoyData[yoyData.length - 1]?.date}
              />
              <Line
                type="monotone"
                dataKey="yoy"
                stroke={palette.indigo}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
