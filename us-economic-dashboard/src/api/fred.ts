import axios from 'axios';
import type { FredObservation } from './types';

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const LOOKBACK_YEARS = 15;

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

export async function fetchFredSeries(
  seriesId: string,
  apiKey: string,
): Promise<FredObservation[]> {
  const cached = getFromCache(seriesId);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - LOOKBACK_YEARS);
  const observationStart = startDate.toISOString().slice(0, 10);

  const response = await axios.get(FRED_BASE_URL, {
    params: {
      series_id: seriesId,
      api_key: apiKey,
      file_type: 'json',
      observation_start: observationStart,
    },
  });

  const observations: FredObservation[] = (
    response.data.observations as Array<{ date: string; value: string }>
  ).map((obs) => ({
    date: obs.date,
    value: obs.value === '.' ? null : parseFloat(obs.value),
  }));

  setCache(seriesId, observations);
  return observations;
}
