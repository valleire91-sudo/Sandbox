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
  BarChart,
  Bar,
  Cell,
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

/** Compute MoM change (current − previous) for a level series. */
function computeMoM(
  data: FredObservation[] | undefined,
): { date: string; value: number }[] {
  if (!data) return [];
  const valid = data.filter((d) => d.value != null);
  const result: { date: string; value: number }[] = [];
  for (let i = 1; i < valid.length; i++) {
    result.push({
      date: valid[i].date,
      value: valid[i].value! - valid[i - 1].value!,
    });
  }
  return result;
}

/** Compute YoY % change for a monthly series. */
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

function latestFromComputed(arr: { value: number }[]): number | null {
  return arr.length > 0 ? arr[arr.length - 1].value : null;
}

/** Merge multiple named series into one chart dataset keyed by date. */
function mergeSeries(
  entries: { key: string; data: { date: string; value: number }[] }[],
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>();
  for (const { key, data } of entries) {
    for (const obs of data) {
      const existing = map.get(obs.date) ?? { date: obs.date };
      existing[key] = Number(obs.value.toFixed(2));
      map.set(obs.date, existing);
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.date as string).localeCompare(b.date as string),
  );
}

/** Merge raw FRED observation series by date. */
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

export default function LabourSection({ dateRange }: Props) {
  // ── fetch all series ──
  const unrate = useFredSeries('UNRATE', dateRange);
  const u6rate = useFredSeries('U6RATE', dateRange);
  const payems = useFredSeries('PAYEMS', dateRange);
  const jtsjol = useFredSeries('JTSJOL', dateRange);
  const jtsqul = useFredSeries('JTSQUL', dateRange);
  const emratio = useFredSeries('EMRATIO', dateRange);
  const primeAgeLfpr = useFredSeries('LNS11300060', dateRange);
  const ahe = useFredSeries('CES0500000003', dateRange);
  const icsa = useFredSeries('ICSA', dateRange);
  const corePce = useFredSeries('PCEPILFE', dateRange);
  const usrec = useFredSeries('USREC', dateRange);

  // ── computed series ──
  const nfpMoM = useMemo(() => computeMoM(payems.data), [payems.data]);
  const aheYoY = useMemo(() => computeYoY(ahe.data), [ahe.data]);
  const corePceYoY = useMemo(() => computeYoY(corePce.data), [corePce.data]);

  // Last 24 months for payrolls bar chart
  const nfpBars = useMemo(() => nfpMoM.slice(-24), [nfpMoM]);

  // ── stat card values ──
  const currentUnrate = latest(unrate.data);
  const currentU6 = latest(u6rate.data);
  const lastNfp = latestFromComputed(nfpMoM);
  const currentJtsjol = latest(jtsjol.data);
  const currentQuits = latest(jtsqul.data);
  const currentLfpr = latest(primeAgeLfpr.data);

  const statsLoading =
    unrate.isLoading || u6rate.isLoading || payems.isLoading ||
    jtsjol.isLoading || jtsqul.isLoading || primeAgeLfpr.isLoading;

  // ── chart 1: unemployment ──
  const unemploymentData = useMemo(
    () =>
      mergeRawSeries([
        { key: 'unrate', data: unrate.data },
        { key: 'u6rate', data: u6rate.data },
      ]),
    [unrate.data, u6rate.data],
  );
  const unemploymentLoading = unrate.isLoading || u6rate.isLoading;
  const unemploymentError = unrate.isError && u6rate.isError;

  // ── chart 3: participation ──
  const participationData = useMemo(
    () =>
      mergeRawSeries([
        { key: 'lfpr', data: primeAgeLfpr.data },
        { key: 'emratio', data: emratio.data },
      ]),
    [primeAgeLfpr.data, emratio.data],
  );
  const participationLoading = primeAgeLfpr.isLoading || emratio.isLoading;
  const participationError = primeAgeLfpr.isError && emratio.isError;

  // ── chart 4: wage growth vs inflation ──
  const wageInflationData = useMemo(
    () =>
      mergeSeries([
        { key: 'wages', data: aheYoY },
        { key: 'corePce', data: corePceYoY },
      ]),
    [aheYoY, corePceYoY],
  );
  const wageInflationLoading = ahe.isLoading || corePce.isLoading;
  const wageInflationError = ahe.isError && corePce.isError;

  // ── chart 5: jobless claims ──
  const claimsData = useMemo(
    () =>
      (icsa.data ?? [])
        .filter((d) => d.value != null)
        .map((d) => ({ date: d.date, claims: d.value! / 1000 })),
    [icsa.data],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Labour Market
      </h2>

      {/* ── Headline StatCards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          title="Unemployment"
          value={formatPercent(currentUnrate)}
          change={latestChange(unrate.data)}
          changeLabel="MoM"
          positiveIsGood={false}
          isLoading={statsLoading}
        />
        <StatCard
          title="U-6 Rate"
          value={formatPercent(currentU6)}
          change={latestChange(u6rate.data)}
          positiveIsGood={false}
          isLoading={statsLoading}
        />
        <StatCard
          title="Nonfarm Payrolls"
          value={
            lastNfp != null
              ? `${lastNfp >= 0 ? '+' : ''}${Math.round(lastNfp)}K`
              : '—'
          }
          change={
            nfpMoM.length >= 2
              ? nfpMoM[nfpMoM.length - 1].value - nfpMoM[nfpMoM.length - 2].value
              : null
          }
          changeLabel="vs prior"
          positiveIsGood={true}
          isLoading={statsLoading}
        />
        <StatCard
          title="Job Openings"
          value={
            currentJtsjol != null
              ? `${(currentJtsjol / 1000).toFixed(1)}M`
              : '—'
          }
          change={latestChange(jtsjol.data)}
          positiveIsGood={true}
          isLoading={statsLoading}
        />
        <StatCard
          title="Quits Rate"
          value={formatPercent(currentQuits)}
          change={latestChange(jtsqul.data)}
          positiveIsGood={true}
          isLoading={statsLoading}
        />
        <StatCard
          title="Prime-Age LFPR"
          value={formatPercent(currentLfpr)}
          change={latestChange(primeAgeLfpr.data)}
          positiveIsGood={true}
          isLoading={statsLoading}
        />
      </div>

      {/* ── Row 1: Unemployment + NFP ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Unemployment Rate */}
        <ChartCard
          title="Unemployment Rate"
          subtitle="U-3 (headline) vs U-6 (broad)"
          isLoading={unemploymentLoading}
          isError={unemploymentError}
          onRetry={() => {
            unrate.refetch();
            u6rate.refetch();
          }}
          seriesIds={['UNRATE', 'U6RATE']}
          csvData={unemploymentData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={unemploymentData}>
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
                  typeof value === 'number' ? [`${value.toFixed(1)}%`] : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={unemploymentData[0]?.date as string | undefined}
                dataEndDate={
                  unemploymentData[unemploymentData.length - 1]?.date as
                    | string
                    | undefined
                }
              />
              <Line
                type="monotone"
                dataKey="unrate"
                name="U-3 Unemployment"
                stroke={palette.rose}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="u6rate"
                name="U-6 Underemployment"
                stroke={palette.amber}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Nonfarm Payrolls */}
        <ChartCard
          title="Nonfarm Payrolls"
          subtitle="Monthly change, thousands (last 24 months)"
          isLoading={payems.isLoading}
          isError={payems.isError}
          onRetry={() => payems.refetch()}
          seriesIds={['PAYEMS']}
          csvData={nfpBars}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nfpBars}>
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
                tickFormatter={(v: number) => `${v}K`}
              />
              <Tooltip
                labelFormatter={formatDateLabel}
                formatter={(value: unknown) =>
                  typeof value === 'number'
                    ? [`${value >= 0 ? '+' : ''}${Math.round(value)}K`, 'Jobs']
                    : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 2" />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {nfpBars.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.value >= 0 ? palette.emerald : palette.rose}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Participation + Wage Growth ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 3: Labour Force Participation */}
        <ChartCard
          title="Labour Force Participation"
          subtitle="Prime-age LFPR vs employment-population ratio"
          isLoading={participationLoading}
          isError={participationError}
          onRetry={() => {
            primeAgeLfpr.refetch();
            emratio.refetch();
          }}
          seriesIds={['LNS11300060', 'EMRATIO']}
          csvData={participationData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={participationData}>
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
                formatter={(value: unknown) =>
                  typeof value === 'number' ? [`${value.toFixed(1)}%`] : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={participationData[0]?.date as string | undefined}
                dataEndDate={
                  participationData[participationData.length - 1]?.date as
                    | string
                    | undefined
                }
              />
              <Line
                type="monotone"
                dataKey="lfpr"
                name="Prime-Age LFPR (25-54)"
                stroke={palette.blue}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="emratio"
                name="Employment-Pop Ratio"
                stroke={palette.emerald}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Wage Growth vs Inflation */}
        <ChartCard
          title="Wage Growth vs Inflation"
          subtitle="Average hourly earnings YoY vs Core PCE YoY"
          isLoading={wageInflationLoading}
          isError={wageInflationError}
          onRetry={() => {
            ahe.refetch();
            corePce.refetch();
          }}
          seriesIds={['CES0500000003', 'PCEPILFE']}
          csvData={wageInflationData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wageInflationData}>
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
                  typeof value === 'number' ? [`${value.toFixed(2)}%`] : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={wageInflationData[0]?.date as string | undefined}
                dataEndDate={
                  wageInflationData[wageInflationData.length - 1]?.date as
                    | string
                    | undefined
                }
              />
              <Line
                type="monotone"
                dataKey="wages"
                name="Avg Hourly Earnings YoY"
                stroke={palette.blue}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="corePce"
                name="Core PCE YoY"
                stroke={palette.rose}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 3: Jobless Claims ── */}
      <div className="grid grid-cols-1 gap-6">
        {/* Chart 5: Initial Jobless Claims */}
        <ChartCard
          title="Initial Jobless Claims"
          subtitle="Weekly, thousands"
          isLoading={icsa.isLoading}
          isError={icsa.isError}
          onRetry={() => icsa.refetch()}
          seriesIds={['ICSA']}
          csvData={claimsData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={claimsData}>
              <defs>
                <linearGradient id="claimsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.amber} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={palette.amber} stopOpacity={0.05} />
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
                tickFormatter={(v: number) => `${v}K`}
              />
              <Tooltip
                labelFormatter={formatDateLabel}
                formatter={(value: unknown) =>
                  typeof value === 'number'
                    ? [`${value.toFixed(0)}K`, 'Initial Claims']
                    : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={claimsData[0]?.date}
                dataEndDate={claimsData[claimsData.length - 1]?.date}
              />
              <Area
                type="monotone"
                dataKey="claims"
                stroke={palette.amber}
                fill="url(#claimsGrad)"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
