import { useQuery } from '@tanstack/react-query';
import { subYears } from 'date-fns';
import { fetchFredSeries } from '../api/fred';
import type { DateRange, FredObservation } from '../api/types';

const API_KEY = import.meta.env.VITE_FRED_API_KEY as string;

function getStartDate(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case '1Y':
      return subYears(now, 1);
    case '3Y':
      return subYears(now, 3);
    case '5Y':
      return subYears(now, 5);
    case '10Y':
      return subYears(now, 10);
    case 'MAX':
      return null;
  }
}

function filterByDateRange(
  observations: FredObservation[],
  range: DateRange,
): FredObservation[] {
  const start = getStartDate(range);
  if (!start) return observations;
  const startStr = start.toISOString().slice(0, 10);
  return observations.filter((obs) => obs.date >= startStr);
}

export function useFredSeries(seriesId: string, dateRange: DateRange) {
  const query = useQuery({
    queryKey: ['fred', seriesId],
    queryFn: () => {
      if (!API_KEY) {
        throw new Error('VITE_FRED_API_KEY is not set in .env');
      }
      return fetchFredSeries(seriesId, API_KEY);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });

  const filtered = query.data
    ? filterByDateRange(query.data, dateRange)
    : undefined;

  return {
    data: filtered,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
