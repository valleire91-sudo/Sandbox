import type { ReactNode } from 'react';
import { format } from 'date-fns';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
  /** FRED series IDs cited in this chart */
  seriesIds?: string[];
  /** Timestamp of last successful data fetch */
  lastUpdated?: Date | null;
  /** Raw data for CSV export — array of flat objects */
  csvData?: Record<string, unknown>[];
}

function ChartSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700">
      <div className="flex h-full items-end gap-2 px-6 pb-6 pt-10">
        {[40, 65, 50, 80, 55, 70, 45, 75, 60, 85, 50, 72].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gray-200 dark:bg-gray-600"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry, errorMessage }: { onRetry?: () => void; errorMessage?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30">
      <svg
        className="h-10 w-10 text-rose-400 dark:text-rose-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
        Failed to load data
      </p>
      {errorMessage && (
        <p className="max-w-xs text-center text-xs text-rose-500 dark:text-rose-400">
          {errorMessage}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (val == null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ChartCard({
  title,
  subtitle,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  children,
  seriesIds,
  lastUpdated,
  csvData,
}: ChartCardProps) {
  const safeFilename = title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.csv';

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {csvData && csvData.length > 0 && !isLoading && !isError && (
          <button
            onClick={() => downloadCsv(csvData, safeFilename)}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            title="Export CSV"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            CSV
          </button>
        )}
      </div>

      {/* Chart area */}
      <div className="px-5 py-4">
        {isLoading ? (
          <ChartSkeleton />
        ) : isError ? (
          <ErrorState onRetry={onRetry} errorMessage={errorMessage} />
        ) : (
          <div className="h-64">{children}</div>
        )}
      </div>

      {/* Footer */}
      {(seriesIds || lastUpdated) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 px-5 py-2.5 dark:border-gray-700">
          {seriesIds && seriesIds.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              FRED:{' '}
              {seriesIds.map((id, i) => (
                <span key={id}>
                  {i > 0 && ', '}
                  <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-gray-700">
                    {id}
                  </code>
                </span>
              ))}
            </p>
          )}
          {lastUpdated && (
            <p className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              Updated {format(lastUpdated, 'MMM d, yyyy HH:mm')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
