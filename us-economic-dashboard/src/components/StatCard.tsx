import { getTrendColour } from '../utils/colours';
import { formatChange } from '../utils/formatters';

interface StatCardProps {
  label: string;
  value: string;
  change?: number | null;
  positiveIsGood?: boolean;
  unit?: string;
}

export default function StatCard({
  label,
  value,
  change,
  positiveIsGood = true,
  unit,
}: StatCardProps) {
  const trendClass =
    change != null ? getTrendColour(change, positiveIsGood) : '';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
            {unit}
          </span>
        )}
      </p>
      {change != null && (
        <p className={`mt-1 text-sm font-medium ${trendClass}`}>
          {formatChange(change)}
        </p>
      )}
    </div>
  );
}
