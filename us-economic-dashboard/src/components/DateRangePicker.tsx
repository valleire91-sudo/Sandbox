import type { DateRange } from '../api/types';

const ranges: DateRange[] = ['1Y', '3Y', '5Y', '10Y', 'MAX'];

interface DateRangePickerProps {
  selected: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({
  selected,
  onChange,
}: DateRangePickerProps) {
  return (
    <div className="flex gap-1">
      {ranges.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            r === selected
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
