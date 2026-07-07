import { Component, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { YEAR_COLORS } from '../../models/types';
import { UnitCostsComponent } from '../unit-costs/unit-costs.component';

@Component({
  selector: 'app-rancho-view',
  standalone: true,
  imports: [CommonModule, UnitCostsComponent],
  template: `
    <div id="gridWrap">
      <div class="pt-table-wrap">
        <table class="pt-table">
          <thead>
            <!-- Header Row 1 -->
            <tr>
              <th rowspan="2" class="pt-pinned" style="width:200px;min-width:200px;max-width:200px;text-align:left;">CATEGOR&Iacute;A</th>
              @if (showTotal()) {
                <th [attr.colspan]="nCols()" style="text-align:center;border-left:3px solid #8a1c32;background:var(--pt-hdr-bg);color:#ffffff;">TOTAL SEMANAL</th>
              }
              @for (r of activeRanches(); track r) {
                <th [attr.colspan]="nCols()" style="text-align:center;border-left:2px solid #d59ca8;background:var(--pt-hdr-bg);color:#ffffff;">{{ r }}</th>
              }
            </tr>
            <!-- Header Row 2 -->
            <tr>
              @if (showTotal()) {
                @for (col of subHeaderCols(); track col.colKey) {
                  <th [style.fontSize]="'9px'" [style.width]="'75px'" [style.minWidth]="'75px'"
                      [style.color]="col.yr ? '#ffffff' : 'rgba(255,255,255,0.7)'"
                      [style.borderLeft]="col.colKey.includes('-') && !col.isDif && !col.isYearDif ? '' : ''">
                    {{ subHeaderLabel(col) }}
                  </th>
                }
              }
              @for (r of activeRanches(); track r) {
                @for (col of subHeaderCols(); track col.colKey) {
                  <th [style.fontSize]="'9px'" [style.width]="'75px'" [style.minWidth]="'75px'"
                      [style.color]="col.yr ? '#ffffff' : 'rgba(255,255,255,0.7)'">
                    {{ subHeaderLabel(col) }}
                  </th>
                }
              }
            </tr>
          </thead>
          <tbody>
            @for (cat of costCats(); track cat.key) {
              <tr class="pt-row" [style.background]="cat.key === 'cpv' ? 'var(--pt-tot-bg)' : ''">
                <td class="pt-pinned" [style.fontWeight]="cat.key === 'cpv' ? '800' : '700'"
                    [style.color]="cat.key === 'cpv' ? '#5a1414' : '#333'">
                  {{ cat.label }}
                </td>
                @if (showTotal()) {
                  @for (col of subHeaderCols(); track col.colKey) {
                    <td [style.color]="col.isDif ? (getTotalDif(col.yr!, cat.key) > 0 ? '#16a34a' : '#dc2626') : (getTotal(col.yr!, col.wk!, cat.key) > 0 ? '#262626' : '#ccc')"
                        [style.fontWeight]="col.isDif || col.isYearDif ? '700' : '400'">
                      @if (col.isDif) {
                        {{ getTotalDif(col.yr!, cat.key) !== 0 ? (getTotalDif(col.yr!, cat.key) > 0 ? '+' : '') + fmt(getTotalDif(col.yr!, cat.key)) : '' }}
                      } @else if (col.isYearDif) {
                        {{ getYearTotalDif(cat.key) !== 0 ? (getYearTotalDif(cat.key) > 0 ? '+' : '') + fmt(getYearTotalDif(cat.key)) : '' }}
                      } @else {
                        {{ getTotal(col.yr!, col.wk!, cat.key) > 0 ? fmt(getTotal(col.yr!, col.wk!, cat.key)) : '' }}
                      }
                    </td>
                  }
                }
                @for (r of activeRanches(); track r) {
                  @for (col of subHeaderCols(); track col.colKey) {
                    <td [style.color]="col.isDif ? (getRanchDif(col.yr!, r, cat.key) > 0 ? '#16a34a' : '#dc2626') : (getRanchVal(col.yr!, col.wk!, r, cat.key) > 0 ? '#262626' : '#ccc')"
                        [style.fontWeight]="col.isDif || col.isYearDif ? '700' : '400'">
                      @if (col.isDif) {
                        {{ getRanchDif(col.yr!, r, cat.key) !== 0 ? (getRanchDif(col.yr!, r, cat.key) > 0 ? '+' : '') + fmt(getRanchDif(col.yr!, r, cat.key)) : '' }}
                      } @else if (col.isYearDif) {
                        {{ getRanchYearTotalDif(r, cat.key) !== 0 ? (getRanchYearTotalDif(r, cat.key) > 0 ? '+' : '') + fmt(getRanchYearTotalDif(r, cat.key)) : '' }}
                      } @else {
                        {{ getRanchVal(col.yr!, col.wk!, r, cat.key) > 0 ? fmt(getRanchVal(col.yr!, col.wk!, r, cat.key)) : '' }}
                      }
                    </td>
                  }
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Unit Costs Tables -->
    <app-unit-costs />
  `,
})
export class RanchoViewComponent {
  readonly YEAR_COLORS = YEAR_COLORS;
  readonly cellClick = output<{yr: number; wk: number; ranch: string; cat?: string}>();

  constructor(protected stateService: StateService) {}

  protected state = this.stateService.state;
  protected data = this.stateService.data;
  protected activeYears = this.stateService.activeYearsList;
  protected activeRanches = this.stateService.activeRanchesList;

  protected showTotal = computed(() => this.state().activeRanches.includes('Todos'));

  protected weeks = computed(() => {
    const all = this.stateService.allWeeks();
    return all.filter(w => w >= this.state().fromWeek && w <= this.state().toWeek);
  });

  protected nWk = computed(() => this.weeks().length);
  protected nYrs = computed(() => this.activeYears().length);
  protected nCols = computed(() => {
    return this.nYrs() * (this.nWk() + (this.nWk() >= 2 ? 1 : 0)) + (this.nYrs() >= 2 ? 1 : 0);
  });

  protected subHeaderCols = computed(() => {
    const cols: { colKey: string; yr?: number; wk?: number; isDif?: boolean; isYearDif?: boolean }[] = [];
    const yrs = this.activeYears();
    const wks = this.weeks();

    for (const yr of yrs) {
      for (const wk of wks) {
        cols.push({ colKey: `${yr}-${wk}`, yr, wk });
      }
      if (wks.length >= 2) {
        cols.push({ colKey: `dif-${yr}`, yr, isDif: true });
      }
    }
    if (yrs.length >= 2) {
      cols.push({ colKey: 'year-dif', isYearDif: true });
    }
    return cols;
  });

  protected subHeaderLabel(col: { colKey: string; yr?: number; wk?: number; isDif?: boolean; isYearDif?: boolean }): string {
    if (col.isYearDif) return 'DIF AÑOS';
    if (col.isDif) return `DIF${String(col.yr).slice(2)}`;
    return `${String(col.yr).slice(2)}${String(col.wk!).padStart(2, '0')}`;
  }

  protected costCats = computed(() => [
    { key: 'mat', label: 'COSTO DE MATERIALES' },
    { key: 'mo', label: 'COSTO DE MANO DE OBRA' },
    { key: 'sv', label: 'COSTO DE SERVICIOS' },
    { key: 'cpv', label: 'TOTAL CPV' },
  ]);

  protected getTotal(yr: number, wk: number, catKey: string): number {
    const data = this.data();
    if (!data) return 0;
    const cur = this.state().currency;
    const ranches = this.activeRanches();

    const sumRecs = (recs: any[]) => {
      let t = 0;
      for (const r of recs) {
        if (ranches.includes('Todos')) {
          t += cur === 'usd' ? (r.usd_total || 0) : (r.mxn_total || 0);
        } else {
          const src = cur === 'usd' ? (r.usd_ranches || {}) : (r.mxn_ranches || {});
          for (const rn of ranches) {
            t += src[rn] || 0;
          }
        }
      }
      return t;
    };

    let total = 0;
    if (catKey === 'mat' || catKey === 'cpv') {
      const matCats = data.categories.filter(c => c !== 'COSTO SERVICIOS' && c !== 'COSTO MANO DE OBRA');
      const recs = data.weekly_detail.filter(r => matCats.includes(r.categoria) && r.year === yr && r.week === wk);
      total += sumRecs(recs);
    }
    if (catKey === 'mo' || catKey === 'cpv') {
      const recs = data.weekly_detail.filter(r => r.categoria === 'COSTO MANO DE OBRA' && r.year === yr && r.week === wk);
      total += sumRecs(recs);
    }
    if (catKey === 'sv' || catKey === 'cpv') {
      const recs = (data.servicios_data || []).filter(r => r.year === yr && r.week === wk);
      total += sumRecs(recs);
    }
    return total;
  }

  protected getRanchVal(yr: number, wk: number, ranch: string, catKey: string): number {
    const data = this.data();
    if (!data) return 0;
    const cur = this.state().currency;

    const sumRecs = (recs: any[]) => {
      let t = 0;
      for (const r of recs) {
        const src = cur === 'usd' ? (r.usd_ranches || {}) : (r.mxn_ranches || {});
        t += src[ranch] || 0;
      }
      return t;
    };

    let total = 0;
    if (catKey === 'mat' || catKey === 'cpv') {
      const matCats = data.categories.filter(c => c !== 'COSTO SERVICIOS' && c !== 'COSTO MANO DE OBRA');
      const recs = data.weekly_detail.filter(r => matCats.includes(r.categoria) && r.year === yr && r.week === wk);
      total += sumRecs(recs);
    }
    if (catKey === 'mo' || catKey === 'cpv') {
      const recs = data.weekly_detail.filter(r => r.categoria === 'COSTO MANO DE OBRA' && r.year === yr && r.week === wk);
      total += sumRecs(recs);
    }
    if (catKey === 'sv' || catKey === 'cpv') {
      const recs = (data.servicios_data || []).filter(r => r.year === yr && r.week === wk);
      total += sumRecs(recs);
    }
    return total;
  }

  protected getTotalDif(yr: number, catKey: string): number {
    const wks = this.weeks();
    if (wks.length < 2) return 0;
    return this.getTotal(yr, wks[wks.length - 1], catKey) - this.getTotal(yr, wks[0], catKey);
  }

  protected getRanchDif(yr: number, ranch: string, catKey: string): number {
    const wks = this.weeks();
    if (wks.length < 2) return 0;
    return this.getRanchVal(yr, wks[wks.length - 1], ranch, catKey) - this.getRanchVal(yr, wks[0], ranch, catKey);
  }

  protected getYearTotalDif(catKey: string): number {
    const yrs = this.activeYears();
    if (yrs.length < 2) return 0;
    const wks = this.weeks();
    if (!wks.length) return 0;
    const lastWk = wks[wks.length - 1];
    return this.getTotal(yrs[yrs.length - 1], lastWk, catKey) - this.getTotal(yrs[0], lastWk, catKey);
  }

  protected getRanchYearTotalDif(ranch: string, catKey: string): number {
    const yrs = this.activeYears();
    if (yrs.length < 2) return 0;
    const wks = this.weeks();
    if (!wks.length) return 0;
    const lastWk = wks[wks.length - 1];
    return this.getRanchVal(yrs[yrs.length - 1], lastWk, ranch, catKey) - this.getRanchVal(yrs[0], lastWk, ranch, catKey);
  }

  protected fmt(n: number): string {
    if (!n || isNaN(n)) return '';
    const neg = n < 0;
    const s = Math.abs(n);
    return (neg ? '-$' : '$') + Math.round(s).toLocaleString('en-US');
  }

  protected showProd(yr: number, wk: number, ranch: string, catKey: string) {
    this.cellClick.emit({yr, wk, ranch, cat: catKey});
  }
}
