import { getTrendColour } from '../utils/colours';
import { formatChange } from '../utils/formatters';

interface StatCardProps {
  /** Display title for the stat */
  title?: string;
  /** @deprecated Use `title` instead */
  label?: string;
  /** Pre-formatted display value */
  value: string;
  /** Numeric change from previous period */
  change?: number | null;
  /** Label shown next to the change badge (e.g. "vs prev quarter") */
  changeLabel?: string;
  /** Unit suffix (e.g. "%", "bps") */
  unit?: string;
  /** Whether a positive change is considered good (green) */
  positiveIsGood?: boolean;
  /** Show skeleton placeholder instead of data */
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-2 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

function ArrowUp({ className }: { className?: string }) {
  return (
    <svg
      className={`inline-block h-4 w-4 ${className ?? ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .55.24l4 4.5a.75.75 0 1 1-1.1 1.02L10 4.86 6.55 8.76a.75.75 0 1 1-1.1-1.02l4-4.5A.75.75 0 0 1 10 3Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg
      className={`inline-block h-4 w-4 ${className ?? ''}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 17a.75.75 0 0 1-.55-.24l-4-4.5a.75.75 0 1 1 1.1-1.02L10 15.14l3.45-3.9a.75.75 0 1 1 1.1 1.02l-4 4.5A.75.75 0 0 1 10 17Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function StatCard({
  title,
  label,
  value,
  change,
  changeLabel,
  unit,
  positiveIsGood = true,
  isLoading = false,
}: StatCardProps) {
  if (isLoading) return <SkeletonCard />;

  const displayTitle = title ?? label ?? '';
  const trendClass =
    change != null ? getTrendColour(change, positiveIsGood) : '';

  const badgeBg =
    change != null
      ? change === 0
        ? 'bg-amber-100 dark:bg-amber-900/30'
        : (change > 0) === positiveIsGood
          ? 'bg-emerald-100 dark:bg-emerald-900/30'
          : 'bg-rose-100 dark:bg-rose-900/30'
      : '';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {displayTitle}
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
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${badgeBg} ${trendClass}`}
          >
            {change > 0 ? (
              <ArrowUp />
            ) : change < 0 ? (
              <ArrowDown />
            ) : null}
            {formatChange(change)}
          </span>
          {changeLabel && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
