import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  subtitle?: string;
}

export default function ChartCard({ title, children, subtitle }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}
