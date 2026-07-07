import { Injectable, signal, computed } from '@angular/core';
import { AppState, CfbcData, ViewType, CurrencyType } from '../models/types';

const INITIAL_STATE: AppState = {
  cat: '',
  activeRanches: ['Todos'],
  currency: 'mxn',
  activeYears: {},
  view: 'rancho',
  fromWeek: 1,
  toWeek: 52,
  allWeeks: [],
  loading: true,
  loaded: false,
  expandedRow: null,
};

@Injectable({ providedIn: 'root' })
export class StateService {
  // ── Reactive State ──
  state = signal<AppState>({ ...INITIAL_STATE });
  data = signal<CfbcData | null>(null);

  // ── Computed ──
  activeYearsList = computed(() => {
    const s = this.state();
    return this.data()?.years.filter(y => s.activeYears[y]) ?? [];
  });

  activeRanchesList = computed(() => {
    const s = this.state();
    if (s.activeRanches.includes('Todos')) {
      return this.data()?.config.ranch_order ?? [];
    }
    return s.activeRanches;
  });

  allWeeks = computed(() => this.state().allWeeks);

  isServiciosCat = computed(() => {
    return this.state().cat === 'COSTO SERVICIOS' || this.state().cat === 'COSTO MANO DE OBRA';
  });

  // ── Actions ──
  setData(d: CfbcData) {
    this.data.set(d);

    // Initialize state from data
    const years = d.years;
    const latestYear = years[years.length - 1];
    const activeYears: Record<number, boolean> = {};
    if (latestYear) activeYears[latestYear] = true;

    // Collect all weeks
    const weekSet = new Set<number>();
    d.weekly_detail.forEach(r => weekSet.add(r.week));
    (d.mano_obra_data || []).forEach(r => weekSet.add(r.week));
    const allWeeks = Array.from(weekSet).sort((a, b) => a - b);

    const latestYearWeeks = new Set<number>();
    d.weekly_detail.filter(r => r.year === latestYear).forEach(r => latestYearWeeks.add(r.week));
    (d.mano_obra_data || []).filter(r => r.year === latestYear).forEach(r => latestYearWeeks.add(r.week));
    const sortedLatest = Array.from(latestYearWeeks).sort((a, b) => a - b);
    const toWeek = sortedLatest[sortedLatest.length - 1] || allWeeks[allWeeks.length - 1] || 52;

    // Default category
    const prefCat = 'MATERIAL DE EMPAQUE';
    const defaultCat = d.categories.includes(prefCat) ? prefCat : d.categories[0] || '';

    this.state.update(s => ({
      ...s,
      cat: defaultCat,
      activeYears,
      fromWeek: toWeek,
      toWeek,
      allWeeks,
      loading: false,
      loaded: true,
    }));
  }

  setCategory(cat: string) {
    this.state.update(s => ({ ...s, cat }));
  }

  setView(view: ViewType) {
    this.state.update(s => ({ ...s, view }));
  }

  setCurrency(currency: CurrencyType) {
    this.state.update(s => ({ ...s, currency }));
  }

  toggleYear(year: number) {
    this.state.update(s => {
      const active = Object.keys(s.activeYears).filter(k => s.activeYears[+k]).map(Number);
      const newYears = { ...s.activeYears };
      if (newYears[year] && active.length > 1) {
        delete newYears[year];
      } else {
        newYears[year] = true;
      }
      return { ...s, activeYears: newYears };
    });
  }

  setActiveRanches(ranches: string[]) {
    this.state.update(s => ({ ...s, activeRanches: ranches }));
  }

  setFromWeek(w: number) {
    this.state.update(s => ({ ...s, fromWeek: w }));
  }

  setToWeek(w: number) {
    this.state.update(s => ({ ...s, toWeek: w }));
  }

  setFromToWeek(from: number, to: number) {
    this.state.update(s => ({ ...s, fromWeek: from, toWeek: to }));
  }

  setExpandedRow(row: number | null) {
    this.state.update(s => ({ ...s, expandedRow: row }));
  }

  resetState() {
    this.state.set({ ...INITIAL_STATE });
  }
}
