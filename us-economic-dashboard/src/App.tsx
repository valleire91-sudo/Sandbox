import { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from './api/types';
import DateRangePicker from './components/DateRangePicker';
import OverviewSection from './sections/OverviewSection';
import GDPSection from './sections/GDPSection';
import LabourSection from './sections/LabourSection';
import InflationSection from './sections/InflationSection';
import MonetarySection from './sections/MonetarySection';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 60 * 1000,
    },
  },
});

type Tab = 'overview' | 'gdp' | 'labour' | 'inflation' | 'monetary';

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'gdp', label: 'GDP & Growth' },
  { key: 'labour', label: 'Labour Market' },
  { key: 'inflation', label: 'Inflation' },
  { key: 'monetary', label: 'Monetary Policy' },
];

function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('5Y');
  const [dark, setDark] = useState(true);

  // Track last data refresh time
  const isFetching = useIsFetching();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const wasFetching = useRef(false);

  useEffect(() => {
    if (isFetching > 0) {
      wasFetching.current = true;
    } else if (wasFetching.current) {
      wasFetching.current = false;
      setLastRefresh(new Date());
    }
  }, [isFetching]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as Tab);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">
              US Economic Dashboard
            </h1>
            <span className="hidden text-xs text-gray-400 dark:text-gray-500 sm:inline">
              {isFetching > 0
                ? 'Refreshing...'
                : `Updated ${format(lastRefresh, 'MMM d, HH:mm')}`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <button
              onClick={() => setDark(!dark)}
              className="rounded-lg border border-gray-300 p-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
              aria-label="Toggle dark mode"
            >
              {dark ? '\u2600' : '\u263E'}
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mx-auto max-w-7xl px-4">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content with fade-in transition */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div key={activeTab} className="animate-fadeIn">
          {activeTab === 'overview' && (
            <OverviewSection
              dateRange={dateRange}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'gdp' && <GDPSection dateRange={dateRange} />}
          {activeTab === 'labour' && <LabourSection dateRange={dateRange} />}
          {activeTab === 'inflation' && (
            <InflationSection dateRange={dateRange} />
          )}
          {activeTab === 'monetary' && (
            <MonetarySection dateRange={dateRange} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-500">
        Data sourced from{' '}
        <abbr title="Federal Reserve Economic Data" className="no-underline">
          FRED
        </abbr>
        , Federal Reserve Bank of St. Louis &middot;{' '}
        {format(new Date(), 'MMMM d, yyyy')}
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
