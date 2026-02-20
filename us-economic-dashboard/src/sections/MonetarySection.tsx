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
  ReferenceLine,
} from 'recharts';
import type { DateRange, FredObservation } from '../api/types';
import { useFredSeries } from '../hooks/useFredSeries';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/StatCard';
import RecessionBands from '../components/RecessionBands';
import { palette } from '../utils/colours';
import { formatDate, formatDateLabel, formatPercent } from '../utils/formatters';

interface Props {
  dateRange: DateRange;
}

// ── helpers ──────────────────────────────────────────────────────────────

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

/** Find the observation closest to a target ISO date string. */
function valueNearDate(
  data: FredObservation[] | undefined,
  targetDate: string,
): number | null {
  if (!data || data.length === 0) return null;
  let best: FredObservation | null = null;
  let bestDiff = Infinity;
  const target = new Date(targetDate).getTime();
  for (const obs of data) {
    if (obs.value == null) continue;
    const diff = Math.abs(new Date(obs.date).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = obs;
    }
  }
  return best?.value ?? null;
}

/** Merge multiple named series into one array keyed by date. */
function mergeSeries(
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

const TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: 'none',
  borderRadius: 8,
  color: '#f3f4f6',
} as const;

// ── yield curve maturity config ─────────────────────────────────────────

const YIELD_CURVE_SERIES = [
  { seriesId: 'DGS1MO', label: '1M' },
  { seriesId: 'DGS3MO', label: '3M' },
  { seriesId: 'DGS6MO', label: '6M' },
  { seriesId: 'DGS1', label: '1Y' },
  { seriesId: 'DGS2', label: '2Y' },
  { seriesId: 'DGS5', label: '5Y' },
  { seriesId: 'DGS10', label: '10Y' },
  { seriesId: 'DGS20', label: '20Y' },
  { seriesId: 'DGS30', label: '30Y' },
] as const;

// ── component ───────────────────────────────────────────────────────────

export default function MonetarySection({ dateRange }: Props) {
  // ── primary series ──
  const fedfunds = useFredSeries('FEDFUNDS', dateRange);
  const upperTarget = useFredSeries('DFEDTARU', dateRange);
  const lowerTarget = useFredSeries('DFEDTARL', dateRange);
  const dgs2 = useFredSeries('DGS2', dateRange);
  const dgs10 = useFredSeries('DGS10', dateRange);
  const t10y2y = useFredSeries('T10Y2Y', dateRange);
  const walcl = useFredSeries('WALCL', dateRange);
  const mortgage30 = useFredSeries('MORTGAGE30US', dateRange);
  const usrec = useFredSeries('USREC', dateRange);

  // ── yield curve maturities (always fetch MAX for snapshot lookback) ──
  const dgs1mo = useFredSeries('DGS1MO', 'MAX');
  const dgs3mo = useFredSeries('DGS3MO', 'MAX');
  const dgs6mo = useFredSeries('DGS6MO', 'MAX');
  const dgs1 = useFredSeries('DGS1', 'MAX');
  const dgs2Full = useFredSeries('DGS2', 'MAX');
  const dgs5 = useFredSeries('DGS5', 'MAX');
  const dgs10Full = useFredSeries('DGS10', 'MAX');
  const dgs20 = useFredSeries('DGS20', 'MAX');
  const dgs30Full = useFredSeries('DGS30', 'MAX');

  const ycAllData = [
    dgs1mo.data, dgs3mo.data, dgs6mo.data, dgs1.data,
    dgs2Full.data, dgs5.data, dgs10Full.data, dgs20.data, dgs30Full.data,
  ];
  const ycAllSeries = [
    dgs1mo, dgs3mo, dgs6mo, dgs1, dgs2Full, dgs5, dgs10Full, dgs20, dgs30Full,
  ];

  // ── stat values ──
  const currentFedFunds = latest(upperTarget.data);
  const currentDgs10 = latest(dgs10.data);
  const currentDgs2 = latest(dgs2.data);
  const currentSpread = latest(t10y2y.data);
  const currentMortgage = latest(mortgage30.data);
  const spreadChange = latestChange(t10y2y.data);

  const statsLoading =
    upperTarget.isLoading || dgs10.isLoading || dgs2.isLoading ||
    t10y2y.isLoading || mortgage30.isLoading;

  // ── chart 1: fed funds rate with target band ──
  const fedFundsData = useMemo(
    () =>
      mergeSeries([
        { key: 'fedfunds', data: fedfunds.data },
        { key: 'upper', data: upperTarget.data },
        { key: 'lower', data: lowerTarget.data },
      ]),
    [fedfunds.data, upperTarget.data, lowerTarget.data],
  );
  const fedFundsLoading =
    fedfunds.isLoading || upperTarget.isLoading || lowerTarget.isLoading;
  const fedFundsError =
    fedfunds.isError && upperTarget.isError && lowerTarget.isError;

  // ── chart 2: yield curve snapshot ──
  const ycLoading = ycAllSeries.some((s) => s.isLoading);
  const ycError = ycAllSeries.every((s) => s.isError);

  const yieldCurveData = useMemo(() => {
    const now = new Date();
    const dateNow = now.toISOString().slice(0, 10);
    const date1y = new Date(now);
    date1y.setFullYear(date1y.getFullYear() - 1);
    const date1yStr = date1y.toISOString().slice(0, 10);
    const date2y = new Date(now);
    date2y.setFullYear(date2y.getFullYear() - 2);
    const date2yStr = date2y.toISOString().slice(0, 10);

    return YIELD_CURVE_SERIES.map((m, idx) => {
      const data = ycAllData[idx];
      return {
        maturity: m.label,
        current: valueNearDate(data, dateNow),
        '1Y ago': valueNearDate(data, date1yStr),
        '2Y ago': valueNearDate(data, date2yStr),
      };
    });
  }, [
    dgs1mo.data, dgs3mo.data, dgs6mo.data, dgs1.data,
    dgs2Full.data, dgs5.data, dgs10Full.data, dgs20.data, dgs30Full.data,
  ]);

  // ── chart 3: 10Y-2Y spread ──
  const spreadData = useMemo(
    () =>
      (t10y2y.data ?? [])
        .filter((d) => d.value != null)
        .map((d) => ({
          date: d.date,
          spread: d.value!,
          positive: d.value! >= 0 ? d.value! : 0,
          negative: d.value! < 0 ? d.value! : 0,
        })),
    [t10y2y.data],
  );

  // ── chart 4: fed balance sheet ──
  const balanceSheetData = useMemo(
    () =>
      (walcl.data ?? [])
        .filter((d) => d.value != null)
        .map((d) => ({
          date: d.date,
          trillions: Number((d.value! / 1_000_000).toFixed(3)),
        })),
    [walcl.data],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Monetary Policy
      </h2>

      {/* ── Headline StatCards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Fed Funds Target"
          value={formatPercent(currentFedFunds)}
          change={latestChange(upperTarget.data)}
          positiveIsGood={false}
          isLoading={statsLoading}
        />
        <StatCard
          title="10Y Treasury"
          value={formatPercent(currentDgs10)}
          change={latestChange(dgs10.data)}
          changeLabel="vs prev"
          isLoading={statsLoading}
        />
        <StatCard
          title="2Y Treasury"
          value={formatPercent(currentDgs2)}
          change={latestChange(dgs2.data)}
          changeLabel="vs prev"
          isLoading={statsLoading}
        />
        <StatCard
          title="Yield Spread"
          value={
            currentSpread != null
              ? `${currentSpread >= 0 ? '+' : ''}${currentSpread.toFixed(2)}%`
              : '—'
          }
          change={spreadChange}
          changeLabel={
            currentSpread != null && currentSpread < 0 ? 'INVERTED' : undefined
          }
          positiveIsGood={true}
          isLoading={statsLoading}
        />
        <StatCard
          title="30Y Mortgage"
          value={formatPercent(currentMortgage)}
          change={latestChange(mortgage30.data)}
          positiveIsGood={false}
          isLoading={statsLoading}
        />
      </div>

      {/* ── Row 1: Fed Funds + Yield Curve Snapshot ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Fed Funds Rate */}
        <ChartCard
          title="Federal Funds Rate"
          subtitle="Effective rate with FOMC target band"
          isLoading={fedFundsLoading}
          isError={fedFundsError}
          onRetry={() => {
            fedfunds.refetch();
            upperTarget.refetch();
            lowerTarget.refetch();
          }}
          seriesIds={['FEDFUNDS', 'DFEDTARU', 'DFEDTARL']}
          csvData={fedFundsData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={fedFundsData}>
              <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.blue} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={palette.blue} stopOpacity={0.05} />
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
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                labelFormatter={formatDateLabel}
                formatter={(value: unknown, name: unknown) => {
                  const v = typeof value === 'number' ? value : 0;
                  const label = name === 'upper' ? 'Upper Target' : name === 'lower' ? 'Lower Target' : 'Effective Rate';
                  return [`${v.toFixed(2)}%`, label];
                }}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'upper'
                    ? 'Upper Target'
                    : value === 'lower'
                      ? 'Lower Target'
                      : 'Effective Rate'
                }
              />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={fedFundsData[0]?.date as string | undefined}
                dataEndDate={
                  fedFundsData[fedFundsData.length - 1]?.date as string | undefined
                }
              />
              <Area
                type="stepAfter"
                dataKey="upper"
                stroke={palette.blue}
                strokeWidth={1}
                strokeDasharray="4 2"
                fill="url(#bandGrad)"
                fillOpacity={1}
                dot={false}
                activeDot={false}
              />
              <Area
                type="stepAfter"
                dataKey="lower"
                stroke={palette.blue}
                strokeWidth={1}
                strokeDasharray="4 2"
                fill="#1f2937"
                fillOpacity={1}
                dot={false}
                activeDot={false}
              />
              <Line
                type="monotone"
                dataKey="fedfunds"
                stroke={palette.indigo}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Yield Curve Snapshot */}
        <ChartCard
          title="Yield Curve Snapshot"
          subtitle="Current vs 1Y ago vs 2Y ago"
          isLoading={ycLoading}
          isError={ycError}
          seriesIds={YIELD_CURVE_SERIES.map((s) => s.seriesId)}
          csvData={yieldCurveData as unknown as Record<string, unknown>[]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={yieldCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="maturity"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value: unknown) =>
                  typeof value === 'number' ? [`${value.toFixed(2)}%`] : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="current"
                name="Current"
                stroke={palette.blue}
                strokeWidth={2.5}
                dot={{ r: 3, fill: palette.blue }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="1Y ago"
                name="1Y Ago"
                stroke={palette.amber}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={{ r: 2, fill: palette.amber }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="2Y ago"
                name="2Y Ago"
                stroke={palette.slate}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 2, fill: palette.slate }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Yield Spread + Balance Sheet ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 3: 10Y-2Y Spread */}
        <ChartCard
          title="10Y-2Y Yield Spread"
          subtitle="Negative = yield curve inversion"
          isLoading={t10y2y.isLoading}
          isError={t10y2y.isError}
          onRetry={() => t10y2y.refetch()}
          seriesIds={['T10Y2Y']}
          csvData={spreadData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spreadData}>
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
                formatter={(value: unknown) => [typeof value === 'number' ? `${value.toFixed(2)}%` : '—', 'Spread']}
                contentStyle={TOOLTIP_STYLE}
              />
              <ReferenceLine
                y={0}
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={spreadData[0]?.date}
                dataEndDate={spreadData[spreadData.length - 1]?.date}
              />
              <Area
                type="monotone"
                dataKey="positive"
                stroke={palette.emerald}
                fill={palette.emerald}
                fillOpacity={0.25}
                strokeWidth={0}
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="negative"
                stroke={palette.rose}
                fill={palette.rose}
                fillOpacity={0.25}
                strokeWidth={0}
                dot={false}
                activeDot={false}
              />
              <Line
                type="monotone"
                dataKey="spread"
                stroke={palette.violet}
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Fed Balance Sheet */}
        <ChartCard
          title="Federal Reserve Balance Sheet"
          subtitle="Total assets (trillions USD)"
          isLoading={walcl.isLoading}
          isError={walcl.isError}
          onRetry={() => walcl.refetch()}
          seriesIds={['WALCL']}
          csvData={balanceSheetData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceSheetData}>
              <defs>
                <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.cyan} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={palette.cyan} stopOpacity={0.05} />
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
                formatter={(value: unknown) => [typeof value === 'number' ? `$${value.toFixed(2)}T` : '—', 'Total Assets']}
                contentStyle={TOOLTIP_STYLE}
              />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={balanceSheetData[0]?.date}
                dataEndDate={balanceSheetData[balanceSheetData.length - 1]?.date}
              />
              <Area
                type="monotone"
                dataKey="trillions"
                stroke={palette.cyan}
                fill="url(#balGrad)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
