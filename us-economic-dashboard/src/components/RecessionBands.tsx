import { ReferenceArea } from 'recharts';

// NBER recession periods (approximate start/end dates)
const recessions = [
  { start: '2007-12-01', end: '2009-06-01' },
  { start: '2020-02-01', end: '2020-04-01' },
];

interface RecessionBandsProps {
  dataStartDate?: string;
  dataEndDate?: string;
}

export default function RecessionBands({
  dataStartDate,
  dataEndDate,
}: RecessionBandsProps) {
  return (
    <>
      {recessions
        .filter((r) => {
          if (dataStartDate && r.end < dataStartDate) return false;
          if (dataEndDate && r.start > dataEndDate) return false;
          return true;
        })
        .map((r) => (
          <ReferenceArea
            key={r.start}
            x1={dataStartDate && r.start < dataStartDate ? dataStartDate : r.start}
            x2={dataEndDate && r.end > dataEndDate ? dataEndDate : r.end}
            fill="#94a3b8"
            fillOpacity={0.15}
            strokeOpacity={0}
          />
        ))}
    </>
  );
}
