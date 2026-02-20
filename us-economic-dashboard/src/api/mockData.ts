import type { FredObservation } from './types';

/**
 * Series metadata: typical value range, frequency, and trend direction.
 * Used to generate realistic-looking mock data when the FRED API is unreachable.
 */
interface SeriesProfile {
  min: number;
  max: number;
  start: number; // value ~15 years ago
  end: number; // value ~now
  freq: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  volatility?: number; // 0-1, default 0.05
}

const profiles: Record<string, SeriesProfile> = {
  // GDP & Growth
  GDPC1: { min: 15000, max: 23000, start: 15200, end: 22700, freq: 'quarterly' },
  A191RL1Q225SBEA: { min: -30, max: 35, start: 2.5, end: 2.8, freq: 'quarterly', volatility: 0.25 },
  PCECC96: { min: 10000, max: 16000, start: 10500, end: 15800, freq: 'quarterly' },
  GPDIC1: { min: 2500, max: 4500, start: 2700, end: 4100, freq: 'quarterly', volatility: 0.1 },
  GCEC1: { min: 2800, max: 3600, start: 2900, end: 3500, freq: 'quarterly' },
  NETEXP: { min: -1000, max: -400, start: -500, end: -750, freq: 'quarterly', volatility: 0.08 },

  // Labour
  UNRATE: { min: 3.4, max: 14.7, start: 9.0, end: 4.1, freq: 'monthly' },
  U6RATE: { min: 6.5, max: 22.8, start: 16.0, end: 7.5, freq: 'monthly' },
  PAYEMS: { min: 130000, max: 158000, start: 131000, end: 157500, freq: 'monthly' },
  JTSJOL: { min: 3000, max: 12000, start: 3200, end: 8100, freq: 'monthly', volatility: 0.08 },
  JTSQUL: { min: 2000, max: 4600, start: 2100, end: 3400, freq: 'monthly', volatility: 0.08 },
  EMRATIO: { min: 55, max: 62, start: 58.5, end: 60.2, freq: 'monthly' },
  LNS11300060: { min: 79, max: 84, start: 81.2, end: 83.5, freq: 'monthly' },
  CES0500000003: { min: 20, max: 35, start: 22.5, end: 34.5, freq: 'monthly' },
  ICSA: { min: 190000, max: 6000000, start: 450000, end: 220000, freq: 'weekly', volatility: 0.12 },

  // Inflation
  CPIAUCSL: { min: 220, max: 320, start: 222, end: 315, freq: 'monthly' },
  CPILFESL: { min: 220, max: 320, start: 224, end: 318, freq: 'monthly' },
  PCEPI: { min: 95, max: 130, start: 96, end: 128, freq: 'monthly' },
  PCEPILFE: { min: 95, max: 130, start: 97, end: 127, freq: 'monthly' },
  CPIUFDSL: { min: 220, max: 330, start: 222, end: 325, freq: 'monthly' },
  CPIENGSL: { min: 180, max: 330, start: 220, end: 280, freq: 'monthly', volatility: 0.15 },
  CPIHOSSL: { min: 230, max: 400, start: 240, end: 395, freq: 'monthly' },
  MICH: { min: 50, max: 100, start: 72, end: 67, freq: 'monthly', volatility: 0.08 },
  T5YIE: { min: 0.5, max: 3.5, start: 2.0, end: 2.3, freq: 'daily', volatility: 0.06 },
  PPIACO: { min: 180, max: 280, start: 190, end: 260, freq: 'monthly', volatility: 0.08 },

  // Monetary
  FEDFUNDS: { min: 0.05, max: 5.5, start: 0.15, end: 4.58, freq: 'monthly' },
  DFEDTARU: { min: 0.25, max: 5.50, start: 0.25, end: 4.75, freq: 'daily' },
  DFEDTARL: { min: 0.0, max: 5.25, start: 0.0, end: 4.50, freq: 'daily' },
  DGS1MO: { min: 0.0, max: 5.5, start: 0.05, end: 4.5, freq: 'daily', volatility: 0.06 },
  DGS3MO: { min: 0.0, max: 5.5, start: 0.1, end: 4.55, freq: 'daily', volatility: 0.06 },
  DGS6MO: { min: 0.0, max: 5.5, start: 0.15, end: 4.5, freq: 'daily', volatility: 0.06 },
  DGS1: { min: 0.0, max: 5.2, start: 0.2, end: 4.2, freq: 'daily', volatility: 0.06 },
  DGS2: { min: 0.15, max: 5.1, start: 0.3, end: 4.1, freq: 'daily', volatility: 0.06 },
  DGS5: { min: 0.2, max: 5.0, start: 1.8, end: 3.9, freq: 'daily', volatility: 0.05 },
  DGS10: { min: 0.5, max: 5.0, start: 2.8, end: 4.2, freq: 'daily', volatility: 0.05 },
  DGS20: { min: 0.8, max: 5.2, start: 3.5, end: 4.5, freq: 'daily', volatility: 0.05 },
  DGS30: { min: 1.0, max: 5.3, start: 4.0, end: 4.6, freq: 'daily', volatility: 0.05 },
  T10Y2Y: { min: -1.0, max: 3.0, start: 2.5, end: 0.1, freq: 'daily', volatility: 0.06 },
  WALCL: { min: 2000000, max: 9000000, start: 2300000, end: 7000000, freq: 'weekly' },
  MORTGAGE30US: { min: 2.6, max: 8.0, start: 4.8, end: 6.8, freq: 'weekly', volatility: 0.05 },

  // Recession indicator
  USREC: { min: 0, max: 1, start: 0, end: 0, freq: 'monthly' },
};

// Simple seeded PRNG for reproducibility
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function generateDates(freq: SeriesProfile['freq'], years: number): string[] {
  const dates: string[] = [];
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - years);

  if (freq === 'daily') {
    // Business days only, sampled ~every 5th day for performance
    let d = new Date(start);
    while (d <= end) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        dates.push(formatDate(d));
      }
      d = addDays(d, 1);
    }
    // Downsample to roughly weekly to keep arrays manageable
    return dates.filter((_, i) => i % 5 === 0);
  }

  if (freq === 'weekly') {
    let d = new Date(start);
    while (d <= end) {
      dates.push(formatDate(d));
      d = addDays(d, 7);
    }
    return dates;
  }

  if (freq === 'quarterly') {
    let d = new Date(start);
    d.setDate(1);
    d.setMonth(Math.floor(d.getMonth() / 3) * 3);
    while (d <= end) {
      dates.push(formatDate(d));
      d.setMonth(d.getMonth() + 3);
    }
    return dates;
  }

  // monthly
  let d = new Date(start);
  d.setDate(1);
  while (d <= end) {
    dates.push(formatDate(d));
    d.setMonth(d.getMonth() + 1);
  }
  return dates;
}

export function generateMockSeries(seriesId: string): FredObservation[] {
  const profile = profiles[seriesId];
  if (!profile) {
    // Unknown series — generate a generic upward trend 0-100
    return generateForProfile(seriesId, {
      min: 0,
      max: 100,
      start: 30,
      end: 70,
      freq: 'monthly',
    });
  }
  return generateForProfile(seriesId, profile);
}

function generateForProfile(
  seriesId: string,
  profile: SeriesProfile,
): FredObservation[] {
  // Special case: USREC is binary (0/1 recession indicator)
  if (seriesId === 'USREC') {
    return generateRecessionIndicator();
  }

  const dates = generateDates(profile.freq, 15);
  const n = dates.length;
  if (n === 0) return [];

  const rand = seededRandom(hashCode(seriesId));
  const vol = profile.volatility ?? 0.05;
  const range = profile.max - profile.min;

  const observations: FredObservation[] = [];
  let value = profile.start;

  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); // 0 → 1
    // Linear interpolation as the "trend"
    const trend = profile.start + (profile.end - profile.start) * t;
    // Mean-revert towards trend with some random walk
    value = value + (trend - value) * 0.1 + (rand() - 0.5) * range * vol;
    // Clamp
    value = Math.max(profile.min, Math.min(profile.max, value));

    observations.push({
      date: dates[i],
      value: Math.round(value * 100) / 100,
    });
  }

  return observations;
}

function generateRecessionIndicator(): FredObservation[] {
  const dates = generateDates('monthly', 15);
  // Place a recession roughly around 2020 (COVID) for realism
  return dates.map((date) => {
    const year = parseInt(date.slice(0, 4));
    const month = parseInt(date.slice(5, 7));
    const isRecession =
      (year === 2020 && month >= 2 && month <= 4);
    return { date, value: isRecession ? 1 : 0 };
  });
}
