import { useMemo } from 'react';
import { ReferenceArea } from 'recharts';
import type { FredObservation } from '../api/types';

interface RecessionPeriod {
  start: string;
  end: string;
}

interface RecessionBandsProps {
  /** USREC series observations (value === 1 means recession month) */
  recessionData?: FredObservation[];
  /** Visible start date for clipping bands to chart viewport */
  dataStartDate?: string;
  /** Visible end date for clipping bands to chart viewport */
  dataEndDate?: string;
}

/**
 * Parse the USREC series into contiguous recession periods.
 * Each run of consecutive value===1 observations becomes one period.
 */
function parseRecessionPeriods(data: FredObservation[]): RecessionPeriod[] {
  const periods: RecessionPeriod[] = [];
  let start: string | null = null;

  for (const obs of data) {
    if (obs.value === 1) {
      if (start === null) start = obs.date;
    } else {
      if (start !== null) {
        periods.push({ start, end: obs.date });
        start = null;
      }
    }
  }
  // Close any open period at the end of the data
  if (start !== null && data.length > 0) {
    periods.push({ start, end: data[data.length - 1].date });
  }

  return periods;
}

// Fallback hardcoded NBER recession periods when USREC data is not provided
const FALLBACK_RECESSIONS: RecessionPeriod[] = [
  { start: '2001-03-01', end: '2001-11-01' },
  { start: '2007-12-01', end: '2009-06-01' },
  { start: '2020-02-01', end: '2020-04-01' },
];

export default function RecessionBands({
  recessionData,
  dataStartDate,
  dataEndDate,
}: RecessionBandsProps) {
  const periods = useMemo(() => {
    if (recessionData && recessionData.length > 0) {
      return parseRecessionPeriods(recessionData);
    }
    return FALLBACK_RECESSIONS;
  }, [recessionData]);

  const visible = periods.filter((r) => {
    if (dataStartDate && r.end < dataStartDate) return false;
    if (dataEndDate && r.start > dataEndDate) return false;
    return true;
  });

  return (
    <>
      {visible.map((r) => (
        <ReferenceArea
          key={r.start}
          x1={dataStartDate && r.start < dataStartDate ? dataStartDate : r.start}
          x2={dataEndDate && r.end > dataEndDate ? dataEndDate : r.end}
          fill="#94a3b8"
          fillOpacity={0.2}
          strokeOpacity={0}
        />
      ))}
    </>
  );
}
