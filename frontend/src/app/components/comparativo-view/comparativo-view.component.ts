import { Component, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { YEAR_COLORS } from '../../models/types';

@Component({
  selector: 'app-comparativo-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="comparativoWrap" class="show">
      <div class="cmp-tbl-wrap">
        <table class="cmp-tbl">
          <thead>
            <tr>
              <th class="bg-navy text-white font-semibold uppercase tracking-wider px-2 py-1.5 border border-[#262626] text-left sticky left-0 z-10"
                  style="min-width:70px;">Semana</th>
              <th class="bg-navy text-white font-semibold uppercase tracking-wider px-2 py-1.5 border border-[#262626] text-right"
                  style="min-width:100px;">Total {{ sym() }}</th>
              <th class="bg-navy text-white font-semibold uppercase tracking-wider px-2 py-1.5 border border-[#262626] text-right"
                  style="min-width:80px;">&#916; vs ant.</th>
              @for (r of activeRanches(); track r) {
                <th style="min-width:90px;">{{ r }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (yr of activeYears(); track yr) {
              @for (wk of rangeWeeks(); track wk) {
                <tr class="cmp-row">
                  <td [style.color]="YEAR_COLORS[yr] || '#888'" style="font-weight:600;">
                    {{ yr.toString().slice(2) }}{{ wk | number:'2.0-0' }}
                  </td>
                  <td [style.color]="getVal(yr, wk) > 0 ? '#5a1414' : '#bbb'"
                      style="cursor:pointer;font-weight:700;"
                      (click)="getVal(yr, wk) > 0 && showProd(yr, wk, '')">
                    {{ fmt(getVal(yr, wk)) }}
                  </td>
                  <td [innerHTML]="deltaHtml(yr, wk)" style="text-align:right;"></td>
                  @for (r of activeRanches(); track r) {
                    <td [style.color]="getRanchVal(yr, wk, r) > 0 ? '#404040' : '#ddd'"
                        [style.fontWeight]="getRanchVal(yr, wk, r) > 0 ? '600' : '400'"
                        style="cursor:pointer;"
                        (click)="getRanchVal(yr, wk, r) > 0 && showProd(yr, wk, r)">
                      {{ getRanchVal(yr, wk, r) > 0 ? fmt(getRanchVal(yr, wk, r)) : '' }}
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ComparativoViewComponent {
  readonly YEAR_COLORS = YEAR_COLORS;
  readonly cellClick = output<{yr: number; wk: number; ranch: string; cat?: string}>();

  constructor(protected stateService: StateService) {}

  protected state = this.stateService.state;
  protected data = this.stateService.data;

  protected activeYears = this.stateService.activeYearsList;
  protected activeRanches = this.stateService.activeRanchesList;

  protected sym = computed(() => this.state().currency.toUpperCase());

  protected rangeWeeks = computed(() => {
    const all = this.stateService.allWeeks();
    return all.filter(w => w >= this.state().fromWeek && w <= this.state().toWeek);
  });

  protected getVal(yr: number, wk: number): number {
    const data = this.data();
    if (!data) return 0;
    const recs = data.weekly_detail.filter(r =>
      r.categoria === this.state().cat && r.year === yr && r.week === wk
    );
    const cur = this.state().currency;
    const ranches = this.activeRanches();
    let total = 0;
    for (const r of recs) {
      if (ranches.includes('Todos')) {
        total += cur === 'usd' ? r.usd_total : r.mxn_total;
      } else {
        const src = cur === 'usd' ? r.usd_ranches : r.mxn_ranches;
        for (const rn of ranches) {
          total += src[rn] || 0;
        }
      }
    }
    return total;
  }

  protected getRanchVal(yr: number, wk: number, ranch: string): number {
    const data = this.data();
    if (!data) return 0;
    const recs = data.weekly_detail.filter(r =>
      r.categoria === this.state().cat && r.year === yr && r.week === wk
    );
    const cur = this.state().currency;
    let total = 0;
    for (const r of recs) {
      const src = cur === 'usd' ? r.usd_ranches : r.mxn_ranches;
      total += src[ranch] || 0;
    }
    return total;
  }

  protected fmt(n: number): string {
    if (!n || isNaN(n)) return '';
    const neg = n < 0;
    const s = Math.abs(n);
    return (neg ? '-$' : '$') + Math.round(s).toLocaleString('en-US');
  }

  protected prevVal(yr: number, wk: number): number | null {
    const weeks = this.rangeWeeks();
    const idx = weeks.indexOf(wk);
    if (idx <= 0) return null;
    // Buscar la semana anterior con datos
    for (let i = idx - 1; i >= 0; i--) {
      const v = this.getVal(yr, weeks[i]);
      if (v > 0) return v;
    }
    return null;
  }

  protected deltaHtml(yr: number, wk: number): string {
    const cur = this.getVal(yr, wk);
    const prev = this.prevVal(yr, wk);
    if (prev === null || prev === 0) return '<span style="color:#a3a3a3">&mdash;</span>';
    const diff = cur - prev;
    const pct = ((diff / prev) * 100).toFixed(1);
    const cls = diff > 0 ? 'cell-pos' : diff < 0 ? 'cell-neg' : 'chg-0';
    const sign = diff > 0 ? '+' : '';
    return `<span class="${cls}" style="font-size:10px;">${sign}${this.fmt(diff)} (${sign}${pct}%)</span>`;
  }

  protected showProd(yr: number, wk: number, ranch: string) {
    this.cellClick.emit({yr, wk, ranch, cat: this.state().cat});
  }
}
