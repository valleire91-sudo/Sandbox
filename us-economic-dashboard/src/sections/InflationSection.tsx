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

/**
 * Compute YoY % change for a monthly index series.
 * Compares each observation to the one 12 positions earlier in the
 * non-null-filtered array (i.e. ≈ 12 months prior).
 */
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

/** Latest YoY value from a computed YoY array. */
function latestYoY(yoyData: { date: string; value: number }[]): number | null {
  return yoyData.length > 0 ? yoyData[yoyData.length - 1].value : null;
}

/** Change from second-to-last to last observation (≈ MoM delta in YoY terms). */
function latestYoYChange(
  yoyData: { date: string; value: number }[],
): number | null {
  if (yoyData.length < 2) return null;
  return yoyData[yoyData.length - 1].value - yoyData[yoyData.length - 2].value;
}

/** Get latest non-null value from raw observations. */
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

/** Merge multiple named YoY arrays into one chart dataset. */
function mergeYoYSeries(
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

export default function InflationSection({ dateRange }: Props) {
  // ── fetch all series ──
  const cpiAll = useFredSeries('CPIAUCSL', dateRange);
  const coreCpi = useFredSeries('CPILFESL', dateRange);
  const pce = useFredSeries('PCEPI', dateRange);
  const corePce = useFredSeries('PCEPILFE', dateRange);
  const cpiFood = useFredSeries('CPIUFDSL', dateRange);
  const cpiEnergy = useFredSeries('CPIENGSL', dateRange);
  const cpiShelter = useFredSeries('CPIHOSSL', dateRange);
  const mich = useFredSeries('MICH', dateRange);
  const t5yie = useFredSeries('T5YIE', dateRange);
  const ppi = useFredSeries('PPIACO', dateRange);
  const usrec = useFredSeries('USREC', dateRange);

  // ── compute YoY arrays ──
  const cpiYoY = useMemo(() => computeYoY(cpiAll.data), [cpiAll.data]);
  const coreCpiYoY = useMemo(() => computeYoY(coreCpi.data), [coreCpi.data]);
  const pceYoY = useMemo(() => computeYoY(pce.data), [pce.data]);
  const corePceYoY = useMemo(() => computeYoY(corePce.data), [corePce.data]);
  const foodYoY = useMemo(() => computeYoY(cpiFood.data), [cpiFood.data]);
  const energyYoY = useMemo(() => computeYoY(cpiEnergy.data), [cpiEnergy.data]);
  const shelterYoY = useMemo(() => computeYoY(cpiShelter.data), [cpiShelter.data]);
  const ppiYoY = useMemo(() => computeYoY(ppi.data), [ppi.data]);

  // ── stat card values ──
  const statsLoading =
    cpiAll.isLoading || coreCpi.isLoading || corePce.isLoading ||
    ppi.isLoading || t5yie.isLoading;

  // ── chart 1: main inflation trends ──
  const mainTrendsData = useMemo(
    () =>
      mergeYoYSeries([
        { key: 'cpi', data: cpiYoY },
        { key: 'coreCpi', data: coreCpiYoY },
        { key: 'pce', data: pceYoY },
        { key: 'corePce', data: corePceYoY },
      ]),
    [cpiYoY, coreCpiYoY, pceYoY, corePceYoY],
  );
  const mainTrendsLoading =
    cpiAll.isLoading || coreCpi.isLoading || pce.isLoading || corePce.isLoading;
  const mainTrendsError =
    cpiAll.isError && coreCpi.isError && pce.isError && corePce.isError;

  // ── chart 2: CPI components ──
  const componentsData = useMemo(
    () =>
      mergeYoYSeries([
        { key: 'food', data: foodYoY },
        { key: 'energy', data: energyYoY },
        { key: 'shelter', data: shelterYoY },
        { key: 'coreCpi', data: coreCpiYoY },
      ]),
    [foodYoY, energyYoY, shelterYoY, coreCpiYoY],
  );
  const componentsLoading =
    cpiFood.isLoading || cpiEnergy.isLoading || cpiShelter.isLoading || coreCpi.isLoading;
  const componentsError =
    cpiFood.isError && cpiEnergy.isError && cpiShelter.isError && coreCpi.isError;

  // ── chart 3: inflation expectations ──
  const expectationsData = useMemo(
    () =>
      mergeRawSeries([
        { key: 'mich', data: mich.data },
        { key: 't5yie', data: t5yie.data },
      ]),
    [mich.data, t5yie.data],
  );
  const expectationsLoading = mich.isLoading || t5yie.isLoading;
  const expectationsError = mich.isError && t5yie.isError;

  // ── chart 4: PPI vs CPI ──
  const ppiCpiData = useMemo(
    () =>
      mergeYoYSeries([
        { key: 'ppi', data: ppiYoY },
        { key: 'cpi', data: cpiYoY },
      ]),
    [ppiYoY, cpiYoY],
  );
  const ppiCpiLoading = ppi.isLoading || cpiAll.isLoading;
  const ppiCpiError = ppi.isError && cpiAll.isError;

  // Date boundaries for recession bands
  const mainStart = mainTrendsData[0]?.date as string | undefined;
  const mainEnd = mainTrendsData[mainTrendsData.length - 1]?.date as string | undefined;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Inflation
      </h2>

      {/* ── Headline StatCards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="CPI YoY"
          value={formatPercent(latestYoY(cpiYoY))}
          change={latestYoYChange(cpiYoY)}
          changeLabel="MoM"
          positiveIsGood={false}
          isLoading={statsLoading}
        />
        <StatCard
          title="Core CPI YoY"
          value={formatPercent(latestYoY(coreCpiYoY))}
          change={latestYoYChange(coreCpiYoY)}
          changeLabel="MoM"
          positiveIsGood={false}
          isLoading={statsLoading}
        />
        <StatCard
          title="Core PCE YoY"
          value={formatPercent(latestYoY(corePceYoY))}
          change={latestYoYChange(corePceYoY)}
          changeLabel="Fed's Preferred"
          positiveIsGood={false}
          isLoading={statsLoading}
        />
        <StatCard
          title="PPI YoY"
          value={formatPercent(latestYoY(ppiYoY))}
          change={latestYoYChange(ppiYoY)}
          changeLabel="MoM"
          positiveIsGood={false}
          isLoading={statsLoading}
        />
        <StatCard
          title="5Y Breakeven"
          value={formatPercent(latest(t5yie.data))}
          change={latestChange(t5yie.data)}
          changeLabel="vs prev"
          positiveIsGood={false}
          isLoading={statsLoading}
        />
      </div>

      {/* ── Row 1: Main Trends + CPI Components ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Main Inflation Trends */}
        <ChartCard
          title="Inflation Trends"
          subtitle="Year-over-year % change"
          isLoading={mainTrendsLoading}
          isError={mainTrendsError}
          onRetry={() => {
            cpiAll.refetch();
            coreCpi.refetch();
            pce.refetch();
            corePce.refetch();
          }}
          seriesIds={['CPIAUCSL', 'CPILFESL', 'PCEPI', 'PCEPILFE']}
          csvData={mainTrendsData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mainTrendsData}>
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
              <ReferenceLine
                y={2}
                stroke={palette.amber}
                strokeDasharray="6 3"
                label={{ value: 'Fed Target', position: 'right', fill: palette.amber, fontSize: 11 }}
              />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={mainStart}
                dataEndDate={mainEnd}
              />
              <Line
                type="monotone"
                dataKey="cpi"
                name="CPI"
                stroke={palette.rose}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="coreCpi"
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
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="corePce"
                name="Core PCE"
                stroke={palette.emerald}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: CPI Components */}
        <ChartCard
          title="CPI Components"
          subtitle="Year-over-year % change by category"
          isLoading={componentsLoading}
          isError={componentsError}
          onRetry={() => {
            cpiFood.refetch();
            cpiEnergy.refetch();
            cpiShelter.refetch();
            coreCpi.refetch();
          }}
          seriesIds={['CPIUFDSL', 'CPIENGSL', 'CPIHOSSL', 'CPILFESL']}
          csvData={componentsData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={componentsData}>
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
              <Line
                type="monotone"
                dataKey="food"
                name="Food"
                stroke={palette.emerald}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="energy"
                name="Energy"
                stroke={palette.rose}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="shelter"
                name="Shelter"
                stroke={palette.cyan}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="coreCpi"
                name="Core CPI"
                stroke={palette.amber}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Expectations + PPI vs CPI ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 3: Inflation Expectations */}
        <ChartCard
          title="Inflation Expectations"
          subtitle="Survey-based vs market-implied"
          isLoading={expectationsLoading}
          isError={expectationsError}
          onRetry={() => {
            mich.refetch();
            t5yie.refetch();
          }}
          seriesIds={['MICH', 'T5YIE']}
          csvData={expectationsData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={expectationsData}>
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
                  typeof value === 'number' ? [`${value.toFixed(2)}%`] : ['—']
                }
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend />
              <ReferenceLine
                y={2}
                stroke={palette.amber}
                strokeDasharray="6 3"
                label={{ value: '2%', position: 'right', fill: palette.amber, fontSize: 11 }}
              />
              <RecessionBands
                recessionData={usrec.data}
                dataStartDate={expectationsData[0]?.date as string | undefined}
                dataEndDate={
                  expectationsData[expectationsData.length - 1]?.date as string | undefined
                }
              />
              <Line
                type="monotone"
                dataKey="mich"
                name="UMich 1Y Expectations"
                stroke={palette.blue}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="t5yie"
                name="5Y Breakeven"
                stroke={palette.violet}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: PPI vs CPI */}
        <ChartCard
          title="PPI vs CPI"
          subtitle="Year-over-year % — PPI leads CPI"
          isLoading={ppiCpiLoading}
          isError={ppiCpiError}
          onRetry={() => {
            ppi.refetch();
            cpiAll.refetch();
          }}
          seriesIds={['PPIACO', 'CPIAUCSL']}
          csvData={ppiCpiData}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ppiCpiData}>
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
                dataStartDate={ppiCpiData[0]?.date as string | undefined}
                dataEndDate={
                  ppiCpiData[ppiCpiData.length - 1]?.date as string | undefined
                }
              />
              <Line
                type="monotone"
                dataKey="ppi"
                name="PPI (All Commodities)"
                stroke={palette.rose}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cpi"
                name="CPI (All Items)"
                stroke={palette.blue}
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
