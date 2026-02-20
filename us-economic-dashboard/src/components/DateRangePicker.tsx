import type { DateRange } from '../api/types';

const ranges: DateRange[] = ['1Y', '3Y', '5Y', '10Y', 'MAX'];

interface DateRangePickerProps {
  /** Currently selected range */
  value?: DateRange;
  /** @deprecated Use `value` instead */
  selected?: DateRange;
  /** Callback when range changes */
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({
  value,
  selected,
  onChange,
}: DateRangePickerProps) {
  const current = value ?? selected ?? '5Y';

  return (
    <div className="inline-flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            r === current
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
