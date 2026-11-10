import { Injectable, signal } from '@angular/core';

export interface PersonnelAmountComparison {
  week_code: string;
  year: number;
  week: number;
  rows: Array<{ ranch: string; subcat: string; amount: number }>;
  unmapped_sections: string[];
  unmapped_concepts: string[];
}

@Injectable({ providedIn: 'root' })
export class AmountComparisonService {
  readonly comparison = signal<PersonnelAmountComparison | null>(null);

  set(value: PersonnelAmountComparison): void {
    this.comparison.set(value);
  }

  clear(): void {
    this.comparison.set(null);
  }
}
