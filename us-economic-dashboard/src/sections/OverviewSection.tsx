import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { DateRange, FredObservation } from '../api/types';
import { useFredSeries } from '../hooks/useFredSeries';
import { palette, getTrendColour } from '../utils/colours';
import { formatDate, formatDateLabel, formatPercent, formatChange } from '../utils/formatters';

interface Props {
  dateRange: DateRange;
  onNavigate?: (tab: string) => void;
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

function computeYoY(
  data: FredObservation[] | undefined,
): { date: string; value: number }[] {
  if (!data) return [];
  const valid = data.filter((d) => d.value != null);
  const result: { date: string; value: number }[] = [];
  for (let i = 12; i < valid.length; i++) {
    const cur = valid[i].value!;
    const prev = valid[i - 12].value!;
    if (prev !== 0) {
      result.push({
        date: valid[i].date,
        value: ((cur - prev) / prev) * 100,
      });
    }
  }
  return result;
}

// ── compact stat display (no card wrapper) ───────────────────────────────

function MiniStat({
  label,
  value,
  change,
  changeLabel,
  positiveIsGood = true,
  isLoading = false,
}: {
  label: string;
  value: string;
  change?: number | null;
  changeLabel?: string;
  positiveIsGood?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-7 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  const trendClass =
    change != null ? getTrendColour(change, positiveIsGood) : '';

  const badgeBg =
    change != null
      ? change === 0
        ? 'bg-amber-100 dark:bg-amber-900/30'
        : (change > 0) === positiveIsGood
          ? 'bg-emerald-100 dark:bg-emerald-900/30'
          : 'bg-rose-100 dark:bg-rose-900/30'
      : '';

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </span>
        {change != null && (
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${badgeBg} ${trendClass}`}
          >
            {formatChange(change)}
          </span>
        )}
        {changeLabel && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {changeLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── mini chart skeleton ──────────────────────────────────────────────────

function MiniSkeleton() {
  return (
    <div className="h-full animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
  );
}

// ── component ────────────────────────────────────────────────────────────

export default function OverviewSection({ dateRange, onNavigate }: Props) {
  // ── fetch series ──
  const gdpGrowth = useFredSeries('A191RL1Q225SBEA', dateRange);
  const unrate = useFredSeries('UNRATE', dateRange);
  const cpiAll = useFredSeries('CPIAUCSL', dateRange);
  const corePce = useFredSeries('PCEPILFE', dateRange);
  const fedfunds = useFredSeries('FEDFUNDS', dateRange);

  // ── GDP: last 8 quarters bar data ──
  const gdpBarData = useMemo(() => {
    const all = (gdpGrowth.data ?? [])
      .filter((d) => d.value != null)
      .map((d) => ({ date: d.date, growth: d.value! }));
    return all.slice(-8);
  }, [gdpGrowth.data]);

  const currentQoQ = latest(gdpGrowth.data);
  const qoqChange = latestChange(gdpGrowth.data);

  // ── Labour: unemployment line data ──
  const unrateData = useMemo(
    () =>
      (unrate.data ?? [])
        .filter((d) => d.value != null)
        .map((d) => ({ date: d.date, unrate: d.value! })),
    [unrate.data],
  );
  const currentUnrate = latest(unrate.data);

  // ── Inflation: CPI YoY and Core PCE YoY ──
  const cpiYoY = useMemo(() => computeYoY(cpiAll.data), [cpiAll.data]);
  const corePceYoY = useMemo(() => computeYoY(corePce.data), [corePce.data]);

  const inflationData = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const obs of cpiYoY) {
      const existing = map.get(obs.date) ?? { date: obs.date };
      existing.cpi = Number(obs.value.toFixed(2));
      map.set(obs.date, existing);
    }
    for (const obs of corePceYoY) {
      const existing = map.get(obs.date) ?? { date: obs.date };
      existing.corePce = Number(obs.value.toFixed(2));
      map.set(obs.date, existing);
    }
    return [...map.values()].sort((a, b) =>
      (a.date as string).localeCompare(b.date as string),
    );
  }, [cpiYoY, corePceYoY]);

  const currentCorePce =
    corePceYoY.length > 0 ? corePceYoY[corePceYoY.length - 1].value : null;
  const corePceChange =
    corePceYoY.length >= 2
      ? corePceYoY[corePceYoY.length - 1].value -
        corePceYoY[corePceYoY.length - 2].value
      : null;

  // ── Monetary: fed funds rate line data ──
  const fedFundsData = useMemo(
    () =>
      (fedfunds.data ?? [])
        .filter((d) => d.value != null)
        .map((d) => ({ date: d.date, rate: d.value! })),
    [fedfunds.data],
  );
  const currentFedFunds = latest(fedfunds.data);

  // ── shared styles ──
  const panelClass =
    'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        US Economic Overview
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── GDP & Growth Panel ── */}
        <div className={panelClass}>
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              GDP &amp; Growth
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('gdp')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View Full Section &rarr;
              </button>
            )}
          </div>
          <div className="px-5 py-3">
            <MiniStat
              label="QoQ Growth (Ann.)"
              value={
                currentQoQ != null
                  ? `${currentQoQ >= 0 ? '+' : ''}${currentQoQ.toFixed(1)}%`
                  : '—'
              }
              change={qoqChange}
              changeLabel="vs prior Q"
              positiveIsGood={true}
              isLoading={gdpGrowth.isLoading}
            />
          </div>
          <div className="h-44 px-2 pb-3">
            {gdpGrowth.isLoading ? (
              <MiniSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gdpBarData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value: unknown) =>
                      typeof value === 'number'
                        ? [
                            `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`,
                            'QoQ Ann.',
                          ]
                        : ['—']
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
                  <Bar dataKey="growth" radius={[2, 2, 0, 0]}>
                    {gdpBarData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.growth >= 0 ? palette.emerald : palette.rose
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Labour Market Panel ── */}
        <div className={panelClass}>
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Labour Market
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('labour')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View Full Section &rarr;
              </button>
            )}
          </div>
          <div className="px-5 py-3">
            <MiniStat
              label="Unemployment Rate"
              value={formatPercent(currentUnrate)}
              change={latestChange(unrate.data)}
              changeLabel="MoM"
              positiveIsGood={false}
              isLoading={unrate.isLoading}
            />
          </div>
          <div className="h-44 px-2 pb-3">
            {unrate.isLoading ? (
              <MiniSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={unrateData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value: unknown) =>
                      typeof value === 'number'
                        ? [`${value.toFixed(1)}%`, 'U-3']
                        : ['—']
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Line
                    type="monotone"
                    dataKey="unrate"
                    stroke={palette.rose}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Inflation Panel ── */}
        <div className={panelClass}>
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Inflation
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('inflation')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View Full Section &rarr;
              </button>
            )}
          </div>
          <div className="px-5 py-3">
            <MiniStat
              label="Core PCE YoY"
              value={formatPercent(currentCorePce)}
              change={corePceChange}
              changeLabel="Fed's Preferred"
              positiveIsGood={false}
              isLoading={cpiAll.isLoading || corePce.isLoading}
            />
          </div>
          <div className="h-44 px-2 pb-3">
            {cpiAll.isLoading || corePce.isLoading ? (
              <MiniSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={inflationData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value: unknown) =>
                      typeof value === 'number'
                        ? [`${value.toFixed(2)}%`]
                        : ['—']
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    iconSize={10}
                  />
                  <ReferenceLine
                    y={2}
                    stroke={palette.amber}
                    strokeDasharray="6 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="cpi"
                    name="CPI YoY"
                    stroke={palette.rose}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="corePce"
                    name="Core PCE YoY"
                    stroke={palette.emerald}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Monetary Policy Panel ── */}
        <div className={panelClass}>
          <div className="flex items-center justify-between px-5 pt-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Monetary Policy
            </h3>
            {onNavigate && (
              <button
                onClick={() => onNavigate('monetary')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View Full Section &rarr;
              </button>
            )}
          </div>
          <div className="px-5 py-3">
            <MiniStat
              label="Fed Funds Rate"
              value={formatPercent(currentFedFunds)}
              change={latestChange(fedfunds.data)}
              positiveIsGood={false}
              isLoading={fedfunds.isLoading}
            />
          </div>
          <div className="h-44 px-2 pb-3">
            {fedfunds.isLoading ? (
              <MiniSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fedFundsData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#6b7280"
                    domain={['auto', 'auto']}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    labelFormatter={formatDateLabel}
                    formatter={(value: unknown) =>
                      typeof value === 'number'
                        ? [`${value.toFixed(2)}%`, 'Fed Funds']
                        : ['—']
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke={palette.indigo}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
