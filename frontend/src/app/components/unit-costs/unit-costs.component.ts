import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { YEAR_COLORS } from '../../models/types';

interface UnitCostRow {
  key: string;
  label: string;
  isHeader?: boolean;
  indent?: boolean;
  fw?: string;
  borderBottom?: boolean;
  borderTop?: boolean;
  bg?: string;
  color?: string;
}

@Component({
  selector: 'app-unit-costs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="margin-top:20px;border:3px solid #f97316;border-radius:4px;padding:2px;background:#fff;">
      @for (section of sections(); track section.title) {
        <div class="pt-table-wrap">
          <table class="pt-table" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th rowspan="2" class="bg-navy text-white font-semibold uppercase tracking-wider px-2 py-1.5 border border-[#262626] text-left sticky left-0 z-10"
                    style="width:200px;min-width:200px;max-width:200px;">{{ section.title }}</th>
                @if (showTotal()) {
                  <th [attr.colspan]="nCols()" class="px-2 py-1.5 border border-gray-200 text-center font-bold"
                      style="background:var(--pt-hdr-bg);color:#ffffff;border-left:1px solid #ddd;">
                    TOTAL SEMANAL
                  </th>
                }
                @for (r of activeRanches(); track r) {
                  <th [attr.colspan]="nCols()" class="px-2 py-1.5 border border-gray-200 text-center font-bold"
                      [style.borderLeft]="'1px solid #ddd'"
                      style="background:var(--pt-hdr-bg);color:#ffffff;">
                    {{ r }}
                  </th>
                }
              </tr>
              <tr>
                @if (showTotal()) {
                  @for (_ of subHeaderCols(); track $index) {
                    <th class="px-1.5 py-1 text-right border border-gray-200"
                        [style.color]="$index < weeks().length ? '#ffffff' : 'rgba(255,255,255,0.7)'"
                        [style.fontSize]="'9px'" [style.width]="'75px'" [style.minWidth]="'75px'"
                        style="background:var(--pt-hdr-bg);font-weight:700;">
                      {{ subHeaderLabel($index) }}
                    </th>
                  }
                }
                @for (r of activeRanches(); track r) {
                  @for (_ of subHeaderCols(); track $index) {
                    <th class="px-1.5 py-1 text-right border border-gray-200"
                        [style.color]="$index < weeks().length ? '#ffffff' : 'rgba(255,255,255,0.7)'"
                        [style.fontSize]="'9px'" [style.width]="'75px'" [style.minWidth]="'75px'"
                        style="background:var(--pt-hdr-bg);font-weight:700;">
                      {{ subHeaderLabel($index) }}
                    </th>
                  }
                }
              </tr>
            </thead>
            <tbody>
              @for (row of section.rows; track row.key; let ri = $index) {
                <tr [style.background]="row.bg || (ri % 2 === 0 ? '#ffffff' : '#fafafa')"
                    [style.borderTop]="row.borderTop ? '2px solid #5a1414' : ''">
                  <td class="px-2 py-1 border-b border-r border-gray-200 text-left sticky left-0 z-1"
                      [style.background]="row.bg || (ri % 2 === 0 ? '#ffffff' : '#fafafa')"
                      [style.fontWeight]="row.fw || (row.isHeader ? '700' : '500')"
                      [style.color]="row.color || (row.isHeader ? '#5a1414' : '#333')"
                      [style.borderTop]="row.borderTop ? '2px solid #5a1414' : ''"
                      [style.borderBottom]="row.borderBottom ? '2px solid #5a1414' : '1px solid #e5e5e5'"
                      [style.paddingLeft]="row.indent ? '25px' : '8px'">
                    {{ row.label }}
                  </td>
                  @if (showTotal()) {
                    @for (col of subHeaderCols(); track col.colKey) {
                      <td class="px-1.5 py-1 border-b border-r border-gray-200 text-right"
                          [style.color]="getUnitVal(null, col, row) > 0 ? '#5a1414' : '#ccc'"
                          [style.fontWeight]="row.fw || '400'">
                        {{ getUnitVal(null, col, row) > 0 ? fmt(getUnitVal(null, col, row)) : '' }}
                      </td>
                    }
                  }
                  @for (r of activeRanches(); track r) {
                    @for (col of subHeaderCols(); track col.colKey) {
                      <td class="px-1.5 py-1 border-b border-r border-gray-200 text-right"
                          [style.color]="getUnitVal(r, col, row) > 0 ? '#262626' : '#ccc'"
                          [style.fontWeight]="row.fw || '400'">
                        {{ getUnitVal(r, col, row) > 0 ? fmt(getUnitVal(r, col, row)) : '' }}
                      </td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (!$last) {
          <div class="h-1 bg-orange-500 my-1"></div>
        }
      }
    </div>
  `,
})
export class UnitCostsComponent {
  readonly YEAR_COLORS = YEAR_COLORS;

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

  protected years = computed(() => {
    const yrs = this.activeYears();
    const wks = this.weeks();
    const result: { yr: number; wk: number }[] = [];
    for (const yr of yrs) {
      for (const wk of wks) {
        result.push({ yr, wk });
      }
    }
    return result;
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

  protected subHeaderLabel(idx: number): string {
    const col = this.subHeaderCols()[idx];
    if (!col) return '';
    if (col.isYearDif) return 'DIF AÑOS';
    if (col.isDif) return `DIF${String(col.yr).slice(2)}`;
    return `${String(col.yr).slice(2)}${String(col.wk).padStart(2, '0')}`;
  }

  protected sections = computed(() => {
    const data = this.data();
    if (!data) return [];

    const ucData = data.unit_costs_data || {};

    const talloRows: UnitCostRow[] = [
      { key: 'tallo_procesados', label: '$ / Tallo Procesado', isHeader: true, color: '#5a1414', fw: '700' },
      { key: 'materiales_tallo', label: 'Materiales' },
      { key: 'mano_obra_tallo', label: 'Mano de Obra' },
      { key: 'servicios_tallo', label: 'Servicios (Fletes)' },
      { key: 'cpv_tallo', label: 'Costo de Produccion y Ventas', fw: '700', borderBottom: true },
      { key: 'empaque_tallo', label: 'Material de Empaque / Tallo', indent: true },
      { key: 'sanidad_tallo', label: 'Sanidad Vegetal / Tallo', indent: true, borderTop: true },
      { key: 'fertilizacion_tallo', label: 'Fertilizacion / Tallo', indent: true },
      { key: 'mano_obra_prod_tallo', label: 'Mano de Obra Prod / Tallo', indent: true, borderTop: true, borderBottom: true },
    ];

    const haRows: UnitCostRow[] = [
      { key: 'hectareas_ha', label: '$ / Hectárea', isHeader: true, color: '#5a1414', fw: '700' },
      { key: 'materiales_ha', label: 'Materiales' },
      { key: 'mano_obra_ha', label: 'Mano de Obra' },
      { key: 'servicios_ha', label: 'Servicios (Fletes)' },
      { key: 'cpv_ha', label: 'Costo de Producción y Ventas', fw: '700', borderBottom: true },
      { key: 'empaque_ha', label: 'Material de Empaque / Caja', indent: true },
      { key: 'sanidad_ha', label: 'Sanidad Vegetal / Ha', indent: true, borderTop: true },
      { key: 'fertilizacion_ha', label: 'Fertilización / Ha', indent: true },
      { key: 'mano_obra_prod_ha', label: 'Mano de Obra Prod / Ha', indent: true, borderTop: true, borderBottom: true },
    ];

    return [
      { title: '$ / TALLO PROCESADO', rows: talloRows },
      { title: '$ / HECTÁREA', rows: haRows },
    ];
  });

  protected getUnitVal(
    ranch: string | null,
    col: { colKey: string; yr?: number; wk?: number; isDif?: boolean; isYearDif?: boolean },
    row: UnitCostRow
  ): number {
    if (row.isHeader && !row.key) return 0;
    const data = this.data();
    if (!data) return 0;

    const ucData = data.unit_costs_data || {};
    const key = row.key;

    if (col.isDif && col.yr) {
      const wks = this.weeks();
      if (wks.length < 2) return 0;
      const first = this._getRawVal(ucData, col.yr, wks[0], key, ranch);
      const last = this._getRawVal(ucData, col.yr, wks[wks.length - 1], key, ranch);
      return last - first;
    }

    if (col.isYearDif) {
      const yrs = this.activeYears();
      if (yrs.length < 2) return 0;
      const wks = this.weeks();
      if (!wks.length) return 0;
      const lastWk = wks[wks.length - 1];
      const v0 = this._getRawVal(ucData, yrs[0], lastWk, key, ranch);
      const vn = this._getRawVal(ucData, yrs[yrs.length - 1], lastWk, key, ranch);
      return vn - v0;
    }

    if (col.yr && col.wk) {
      return this._getRawVal(ucData, col.yr, col.wk, key, ranch);
    }

    return 0;
  }

  private _getRawVal(
    ucData: Record<string, any>,
    yr: number,
    wk: number,
    key: string,
    ranch: string | null
  ): number {
    const code = ((yr % 100) * 100 + wk).toString();
    const weekData = ucData[code] || ucData[Number(code).toString()] || {};
    if (ranch) {
      const ranchData = weekData[ranch] || {};
      return ranchData[key] || 0;
    }
    const totalData = weekData['TOTAL'] || {};
    return totalData[key] || 0;
  }

  protected fmt(n: number): string {
    if (!n || isNaN(n)) return '';
    const neg = n < 0;
    const s = Math.abs(n);
    return (neg ? '-$' : '$') + s.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
