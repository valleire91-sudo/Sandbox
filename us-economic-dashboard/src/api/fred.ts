import type { FredObservation } from './types';
import { generateMockSeries } from './mockData';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const CORS_PROXY = 'https://corsproxy.io/?url=';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const LOOKBACK_YEARS = 15;

// Track whether we're using mock data so the UI can show an indicator
let _usingMockData = false;
export function isUsingMockData(): boolean {
  return _usingMockData;
}

interface CacheEntry {
  timestamp: number;
  data: FredObservation[];
}

function getCacheKey(seriesId: string): string {
  return `fred_cache_${seriesId}`;
}

function getFromCache(seriesId: string): FredObservation[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(seriesId));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(seriesId));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache(seriesId: string, data: FredObservation[]): void {
  const entry: CacheEntry = { timestamp: Date.now(), data };
  try {
    localStorage.setItem(getCacheKey(seriesId), JSON.stringify(entry));
  } catch {
    // localStorage full — silently ignore
  }
}

async function fetchFromApi(
  seriesId: string,
  apiKey: string,
): Promise<FredObservation[]> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - LOOKBACK_YEARS);
  const observationStart = startDate.toISOString().slice(0, 10);

  const target = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${observationStart}`;
  const url = `${CORS_PROXY}${encodeURIComponent(target)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FRED API returned ${response.status}`);
  }

  const json = await response.json();

  return (json.observations as Array<{ date: string; value: string }>).map(
    (obs) => ({
      date: obs.date,
      value:
        obs.value === '.' || isNaN(parseFloat(obs.value))
          ? null
          : parseFloat(obs.value),
    }),
  );
}

export async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
): Promise<FredObservation[]> {
  const cached = getFromCache(seriesId);
  if (cached) return cached;

  // Try real API first, fall back to mock data
  try {
    const data = await fetchFromApi(seriesId, apiKey);
    setCache(seriesId, data);
    return data;
  } catch {
    console.warn(
      `[FRED] API unreachable for ${seriesId}, using mock data`,
    );
    _usingMockData = true;
    return generateMockSeries(seriesId);
  }
}
