export interface FredObservation {
  date: string;
  value: number | null;
}

export interface FredSeries {
  id: string;
  title: string;
  observations: FredObservation[];
}

export type DateRange = '1Y' | '3Y' | '5Y' | '10Y' | 'MAX';
