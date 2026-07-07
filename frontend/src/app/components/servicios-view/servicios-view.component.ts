import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { YEAR_COLORS } from '../../models/types';

interface WeekData {
  _year: number;
  _week: number;
  date_range: string;
  [key: string]: any;
}

const SV_SUBCATS = ['Electricidad', 'Fletes y Acarreos', 'Gastos de Exportación', 'Certificado Fitosanitario', 'Transporte de Personal', 'Compra de Flor a Terceros', 'Comida para el Personal', 'RO, TEL, RTA.Alim'];

// MO view uses a separate ranch system (not the physical RANCH_ORDER)
const MO_RANCH_ORDER = [
  'Administracion','Propagacion','Poscosecha','Ramona',
  'Isabela','Christina','Cecilia','Cecilia 25'
];

// Map physical ranch names to MO ranch names
const MO_RANCH_MAP: Record<string, string[]> = {
  'Prop-RM': ['Propagacion'],
  'PosCo-RM': ['Poscosecha'],
  'Campo-RM': ['Ramona'],
};

const MO_GROUPS = [
  { label: 'ING. Y ADMON.',      subcats: ['Ing. Y Admon.'] },
  { label: 'SUPERVISORES',       subcats: ['Supervisores'] },
  { label: 'CORTE',              subcats: ['Corte'] },
  { label: 'TRASPLANTE',         subcats: ['Trasplante'] },
  { label: 'MANEJO PLANTA',      subcats: ['Manejo P.'] },
  { label: 'CONSOLIDACIÓN',      subcats: ['Consolidacion'] },
  { label: 'SIEMBRA',            subcats: ['Siembra'] },
  { label: 'MOV. CHAROLAS',      subcats: ['Mov. Charolas'] },
  { label: 'RIEGO',              subcats: ['Riego'] },
  { label: 'ESQUEJES',           subcats: ['Esquejes'] },
  { label: 'HOOPS',              subcats: ['Hoops'] },
  { label: 'MIPE / MIRFE',       subcats: ['MIPE Y MIRFE'] },
  { label: 'TRACTORES/CAMEROS',  subcats: ['Tract. Y Cameros'] },
  { label: 'VELADORES',          subcats: ['Veladores'] },
  { label: 'SOLDADORES',         subcats: ['Soldadores'] },
  { label: 'TRANSPORTE',         subcats: ['Transporte'] },
  { label: 'ADMON POSCO',        subcats: ['Admon Posco'] },
  { label: 'ALM. UPC Y EMPAQUE', subcats: ['Alm.upc y empaq'] },
  { label: 'CONTRATISTA',        subcats: ['Contratista y com.'] },
  { label: 'PROD. PÁTINA Y REC', subcats: ['Prod. Patina y rec'] },
  { label: 'IMSS/INFO/RCV',      subcats: ['IMSS,INFO Y RCV'] },
  { label: 'IMP. 1.8%',          subcats: ['Imp. 1.8%'] },
];

@Component({
  selector: 'app-servicios-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="gridWrap">
      <div class="pt-table-wrap admin-theme">
        @if (weekKeys().length === 0 || orderedSubcats().length === 0) {
          <div style="padding:20px;color:#888;font-size:12px">Sin datos para el rango seleccionado.</div>
        } @else {
          <table class="pt-table">
            <thead>
              <!-- Row 1: CONCEPTO | Ranchos | TOTAL -->
              <tr>
                <th rowspan="2" class="pt-pinned"
                    style="min-width:190px;text-align:left;">CONCEPTO</th>
                @for (rn of activeRanchesInData(); track rn) {
                  <th [attr.colspan]="nColsPerRanch()"
                      style="text-align:center;border-left:2px solid #d59ca8;background:var(--pt-hdr-bg);color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:6px 8px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:3;">
                    {{ rn }}
                  </th>
                }
                @if (showTotal()) {
                  <th [attr.colspan]="nTotalCols()"
                      style="text-align:center;border-left:3px solid #8a1c32;background:#fafafa;color:#262626;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:6px 8px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:3;">
                    TOTAL
                  </th>
                }
              </tr>
              <!-- Row 2: Week labels + DIF per ranch | Year totals + DIF -->
              <tr>
                @for (rn of activeRanchesInData(); track rn) {
                  @for (key of weekKeys(); track key) {
                    <th style="border-left:1px solid var(--pt-hdr-border);font-size:9px;min-width:60px;background:var(--pt-hdr-bg);color:#fff;font-weight:600;padding:4px 6px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:2;text-align:right;">
                      {{ shortLabel(key) }}
                    </th>
                  }
                  <th style="border-left:1px solid #e5e5e5;font-size:9px;min-width:70px;background:#eecdd3;color:#262626;font-weight:700;padding:4px 6px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:2;text-align:right;">
                    DIF
                  </th>
                }
                @if (showTotal()) {
                  @for (key of weekKeys(); track key) {
                    <th style="border-left:1px solid var(--pt-hdr-border);font-size:9px;min-width:60px;background:#fafafa;color:#262626;font-weight:600;padding:4px 6px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:2;text-align:right;">
                      {{ shortLabel(key) }}
                    </th>
                  }
                  <th style="border-left:1px solid #e5e5e5;font-size:9px;min-width:70px;background:#fafafa;color:#262626;font-weight:700;padding:4px 6px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:2;text-align:right;">
                    DIF
                  </th>
                  @if (showYearTotals()) {
                    @for (yr of totYears(); track yr; let yi = $index) {
                      <th [style.borderLeft]="yi === 0 ? '3px solid #8a1c32' : '1px solid var(--pt-hdr-border)'"
                          style="font-size:9px;min-width:90px;background:#fafafa;color:#262626;font-weight:700;padding:4px 6px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:2;text-align:right;">
                        {{ yr }}
                      </th>
                    }
                    @if (totYears().length >= 2) {
                      <th style="border-left:1px solid #e5e5e5;font-size:9px;min-width:70px;background:#fafafa;color:#262626;font-weight:700;padding:4px 6px;border-bottom:1px solid var(--pt-hdr-border);border-right:1px solid var(--pt-hdr-border);position:sticky;top:0;z-index:2;text-align:right;">
                        DIF
                      </th>
                    }
                  }
                }
              </tr>
            </thead>
            <tbody>
              @if (isManoObra()) {
                <!-- MANO DE OBRA: grouped -->
                @for (group of moGroups; track group.label) {
                  @if (groupHasData(group)) {
                    @if (group.subcats.length === 1) {
                      <!-- Single subcat: show directly in group row (no duplicate) - click to expand metrics -->
                      @let sc = group.subcats[0];
                      <tr class="pt-row-group" style="cursor:pointer;" (click)="toggleGroup(group.label)"
                          [style.background]="isGroupExpanded(group.label) ? '#e8e8e8' : 'var(--pt-grp-bg)'"
                          title="Clic para expandir/contraer métricas">
                        <td style="padding:3px 8px;position:sticky;left:0;z-index:1;background:inherit;border-bottom:1px solid #e5e5e5;border-right:1px solid #ddd;font-weight:700;color:var(--pt-grp-fg);font-size:11px;">
                          <span>{{ isGroupExpanded(group.label) ? '− ' : '+ ' }}</span>{{ group.label }}
                        </td>
                        @for (rn of activeRanchesInData(); track rn) {
                          @for (key of weekKeys(); track key) {
                            <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                                [style.color]="getRanchVal(key, rn, sc) > 0 ? '#5a1414' : '#ccc'"
                                [style.fontWeight]="getRanchVal(key, rn, sc) > 0 ? '600' : '400'">
                              {{ getRanchVal(key, rn, sc) > 0 ? fmt(getRanchVal(key, rn, sc)) : '' }}
                            </td>
                          }
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                              [style.color]="getRanchDif(rn, sc) !== 0 ? (getRanchDif(rn, sc) > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                              [style.fontWeight]="getRanchDif(rn, sc) !== 0 ? '700' : '400'">
                            {{ getRanchDif(rn, sc) !== 0 ? (getRanchDif(rn, sc) > 0 ? '+' : '') + fmt(absVal(getRanchDif(rn, sc))) : '' }}
                          </td>
                        }
                        @if (showTotal()) {
                          @for (key of weekKeys(); track key) {
                            <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                                [style.color]="getWeekTotalVal(key, sc) > 0 ? '#5a1414' : '#ccc'"
                                [style.fontWeight]="getWeekTotalVal(key, sc) > 0 ? '700' : '400'">
                              {{ getWeekTotalVal(key, sc) > 0 ? fmt(getWeekTotalVal(key, sc)) : '' }}
                            </td>
                          }
                          @let wkDif = getWeekTotalDif(sc);
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                              [style.color]="wkDif !== 0 ? (wkDif > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                              [style.fontWeight]="wkDif !== 0 ? '700' : '400'">
                            {{ wkDif !== 0 ? (wkDif > 0 ? '+' : '') + fmt(absVal(wkDif)) : '' }}
                          </td>
                          @if (showYearTotals()) {
                            @for (yr of totYears(); track yr) {
                              <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                                  [style.color]="getTotalVal(yr, sc) > 0 ? '#5a1414' : '#ccc'"
                                  [style.fontWeight]="getTotalVal(yr, sc) > 0 ? '700' : '400'">
                                {{ getTotalVal(yr, sc) > 0 ? fmt(getTotalVal(yr, sc)) : '' }}
                              </td>
                            }
                            @if (totYears().length >= 2) {
                              <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                                  [style.color]="getTotalDif(sc) !== 0 ? (getTotalDif(sc) > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                                  [style.fontWeight]="getTotalDif(sc) !== 0 ? '700' : '400'">
                                {{ getTotalDif(sc) !== 0 ? (getTotalDif(sc) > 0 ? '+' : '') + fmt(absVal(getTotalDif(sc))) : '' }}
                              </td>
                            }
                          }
                        }
                      </tr>

                      <!-- EXPANDED DETAIL ROWS -->
                      @if (isGroupExpanded(group.label)) {
                        <!-- HC: Número de Personas (Headcount) -->
                        <tr class="pt-row mo-detail">
                          <td class="pt-pinned"
                              style="padding:3px 8px;padding-left:20px;border-bottom:1px solid #e5e5e5;border-right:1px solid #ddd;font-size:10px;color:#404040;background:#f0fdf4;">
                            NÚMERO DE PERSONAS
                          </td>
                          @for (rn of activeRanchesInData(); track rn) {
                            @for (key of weekKeys(); track key) {
                              <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                  [style.color]="getHcRanchVal(key, rn, sc) > 0 ? '#15803d' : '#86efac'"
                                  [style.fontWeight]="getHcRanchVal(key, rn, sc) > 0 ? '600' : '400'">
                                {{ getHcRanchVal(key, rn, sc) > 0 ? fmtHc(getHcRanchVal(key, rn, sc)) : '' }}
                              </td>
                            }
                            <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                [style.color]="getHcDif(rn, sc) !== 0 ? (getHcDif(rn, sc) > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                [style.fontWeight]="getHcDif(rn, sc) !== 0 ? '700' : '400'">
                              {{ getHcDif(rn, sc) !== 0 ? (getHcDif(rn, sc) > 0 ? '+' : '') + fmtHcDiff(absVal(getHcDif(rn, sc))) : '' }}
                            </td>
                          }
                          @if (showTotal()) {
                            @for (key of weekKeys(); track key) {
                              @let hcV = getHcVal(key, sc);
                              <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                  [style.color]="hcV > 0 ? '#15803d' : '#86efac'"
                                  [style.fontWeight]="hcV > 0 ? '700' : '400'">
                                {{ hcV > 0 ? fmtHc(hcV) : '' }}
                              </td>
                            }
                            @let hcWkDif = getHcVal(weekKeys()[weekKeys().length - 1], sc) - getHcVal(weekKeys()[0], sc);
                            <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                [style.color]="hcWkDif !== 0 ? (hcWkDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                [style.fontWeight]="hcWkDif !== 0 ? '700' : '400'">
                              {{ hcWkDif !== 0 ? (hcWkDif > 0 ? '+' : '') + fmtHcDiff(absVal(hcWkDif)) : '' }}
                            </td>
                            @if (showYearTotals()) {
                              @for (yr of totYears(); track yr) {
                                @let hcYrV = getHcYrVal(yr, sc);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                    [style.color]="hcYrV > 0 ? '#15803d' : '#86efac'"
                                    [style.fontWeight]="hcYrV > 0 ? '700' : '400'">
                                  {{ hcYrV > 0 ? fmtHc(hcYrV) : '' }}
                                </td>
                              }
                              @if (totYears().length >= 2) {
                                @let hcTotDif = getHcTotalDif(sc);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                    [style.color]="hcTotDif !== 0 ? (hcTotDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                    [style.fontWeight]="hcTotDif !== 0 ? '700' : '400'">
                                  {{ hcTotDif !== 0 ? (hcTotDif > 0 ? '+' : '') + fmtHcDiff(absVal(hcTotDif)) : '' }}
                                </td>
                              }
                            }
                          }
                        </tr>

                        <!-- ESQUEJES: flores + plantas (solo columna Propagacion) -->
                        @if (group.label === 'ESQUEJES' && data()?.esquejes_data?.length) {
                          @for (flor of esquejeFloresList(); track flor) {
                            <tr class="pt-row mo-detail">
                              <td class="pt-pinned"
                                  style="padding:3px 8px;padding-left:20px;border-bottom:1px solid #bbf7d0;border-right:1px solid #bbf7d0;font-size:10px;color:#166534;background:#f0fdf4;">
                                {{ flor }}
                              </td>
                              @for (rn of esquejeRanches(); track rn) {
                                @if (rn === 'Propagacion') {
                                  @for (key of weekKeys(); track key) {
                                    @let v = getEsquejePlantas(key, flor);
                                    <td style="padding:3px 6px;border-bottom:1px solid #bbf7d0;border-right:1px solid #bbf7d0;text-align:right;background:#f0fdf4;"
                                        [style.color]="v > 0 ? '#166534' : '#86efac'"
                                        [style.fontWeight]="v > 0 ? '600' : '400'">
                                      {{ v > 0 ? fmtHc(v) : '' }}
                                    </td>
                                  }
                                  @let dif = getEsquejeDif(flor);
                                  <td style="padding:3px 6px;border-bottom:1px solid #bbf7d0;border-right:1px solid #bbf7d0;text-align:right;background:#f0fdf4;"
                                      [style.color]="dif !== 0 ? (dif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                      [style.fontWeight]="dif !== 0 ? '700' : '400'">
                                    {{ dif !== 0 ? (dif > 0 ? '+' : '') + fmtHcDiff(absVal(dif)) : '' }}
                                  </td>
                                } @else {
                                  @for (key of weekKeys(); track key) {
                                    <td style="padding:3px 6px;border-bottom:1px solid #bbf7d0;border-right:1px solid #bbf7d0;text-align:right;color:#86efac;background:#f0fdf4;"></td>
                                  }
                                  <td style="padding:3px 6px;border-bottom:1px solid #bbf7d0;border-right:1px solid #bbf7d0;text-align:right;color:#86efac;background:#f0fdf4;"></td>
                                }
                              }
                              @if (showTotal()) {
                                @for (key of weekKeys(); track key) {
                                  @let eV = getEsquejePlantas(key, flor);
                                  <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                      [style.color]="eV > 0 ? '#166534' : '#86efac'"
                                      [style.fontWeight]="eV > 0 ? '700' : '400'">
                                    {{ eV > 0 ? fmtHc(eV) : '' }}
                                  </td>
                                }
                                @let eDif = getEsquejeDif(flor);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                    [style.color]="eDif !== 0 ? (eDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                    [style.fontWeight]="eDif !== 0 ? '700' : '400'">
                                  {{ eDif !== 0 ? (eDif > 0 ? '+' : '') + fmtHcDiff(absVal(eDif)) : '' }}
                                </td>
                                @if (showYearTotals()) {
                                  @for (yr of totYears(); track yr) {
                                    @let eYrV = getEsquejeYrTotal(yr, flor);
                                    <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                        [style.color]="eYrV > 0 ? '#166534' : '#86efac'"
                                        [style.fontWeight]="eYrV > 0 ? '700' : '400'">
                                      {{ eYrV > 0 ? fmtHc(eYrV) : '' }}
                                    </td>
                                  }
                                  @if (totYears().length >= 2) {
                                    @let eTotDif = getEsquejeTotalDif(flor);
                                    <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                        [style.color]="eTotDif !== 0 ? (eTotDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                        [style.fontWeight]="eTotDif !== 0 ? '700' : '400'">
                                      {{ eTotDif !== 0 ? (eTotDif > 0 ? '+' : '') + fmtHcDiff(absVal(eTotDif)) : '' }}
                                    </td>
                                  }
                                }
                              }
                            </tr>
                          }
                        }

                        <!-- Unit Cost row for groups with siembra_data -->
                        @if (unitCostGroupMap[group.label]) {
                          @let uc = unitCostGroupMap[group.label];
                          <tr class="pt-row mo-detail">
                            <td class="pt-pinned"
                                style="padding:3px 8px;padding-left:20px;border-bottom:1px solid #fde68a;border-right:1px solid #fde68a;font-size:10px;color:#92400e;background:#fffbeb;">
                              {{ uc.title }}
                            </td>
                            @for (rn of activeRanchesInData(); track rn) {
                              @for (key of weekKeys(); track key) {
                                @let cost = getRanchVal(key, rn, sc);
                                @let denom = getSiembraVal(key, rn, uc.key);
                                @let cpt = denom > 0 ? cost / denom : 0;
                                <td style="padding:3px 6px;border-bottom:1px solid #fde68a;border-right:1px solid #fde68a;text-align:right;background:#fffbeb;"
                                    [style.color]="cpt > 0 ? '#92400e' : '#fde68a'"
                                    [style.fontWeight]="cpt > 0 ? '600' : '400'">
                                  {{ cpt > 0 ? fmtFull(cpt) : '' }}
                                </td>
                              }
                              @let difCost = getRanchDif(rn, sc);
                              @let difDenom = getSiembraDif(rn, uc.key);
                              @let difCpt = difDenom !== 0 ? difCost / difDenom : 0;
                              <td style="padding:3px 6px;border-bottom:1px solid #fde68a;border-right:1px solid #fde68a;text-align:right;background:#fffbeb;"
                                  [style.color]="difCpt !== 0 ? (difCpt > 0 ? '#16a34a' : '#dc2626') : '#fde68a'"
                                  [style.fontWeight]="difCpt !== 0 ? '700' : '400'">
                                {{ difCpt !== 0 ? (difCpt > 0 ? '+' : '') + fmtFull(absVal(difCpt)) : '' }}
                              </td>
                            }
                            @if (showTotal()) {
                              @for (key of weekKeys(); track key) {
                                @let wkCost = getWeekTotalVal(key, sc);
                                @let wkDenom = getSiembraWeekTotal(key, uc.key);
                                @let wkCpt = wkDenom > 0 ? wkCost / wkDenom : 0;
                                <td style="padding:3px 6px;border-bottom:1px solid #fde68a;border-right:1px solid #fde68a;text-align:right;background:#fffbeb;"
                                    [style.color]="wkCpt > 0 ? '#92400e' : '#fde68a'"
                                    [style.fontWeight]="wkCpt > 0 ? '700' : '400'">
                                  {{ wkCpt > 0 ? fmtFull(wkCpt) : '' }}
                                </td>
                              }
                              @let ucDif = getWeekTotalDif(sc);
                              @let denomDif = getSiembraWeekTotal(weekKeys()[weekKeys().length - 1], uc.key) - getSiembraWeekTotal(weekKeys()[0], uc.key);
                              @let ucDifCpt = denomDif !== 0 ? ucDif / denomDif : 0;
                              <td style="padding:3px 6px;border-bottom:1px solid #fde68a;border-right:1px solid #fde68a;text-align:right;background:#fffbeb;"
                                  [style.color]="ucDifCpt !== 0 ? (ucDifCpt > 0 ? '#16a34a' : '#dc2626') : '#fde68a'"
                                  [style.fontWeight]="ucDifCpt !== 0 ? '700' : '400'">
                                {{ ucDifCpt !== 0 ? (ucDifCpt > 0 ? '+' : '') + fmtFull(absVal(ucDifCpt)) : '' }}
                              </td>
                              @if (showYearTotals()) {
                                @for (yr of totYears(); track yr) {
                                  @let yrCost = getTotalVal(yr, sc);
                                  @let yrDenom = getSiembraYrTotal(yr, uc.key);
                                  @let yrCpt = yrDenom > 0 ? yrCost / yrDenom : 0;
                                  <td style="padding:3px 6px;border-bottom:1px solid #fde68a;border-right:1px solid #fde68a;text-align:right;background:#fffbeb;"
                                      [style.color]="yrCpt > 0 ? '#92400e' : '#fde68a'"
                                      [style.fontWeight]="yrCpt > 0 ? '700' : '400'">
                                    {{ yrCpt > 0 ? fmtFull(yrCpt) : '' }}
                                  </td>
                                }
                                @if (totYears().length >= 2) {
                                  @let totDifCost = getTotalDif(sc);
                                  @let totDifDenom = getSiembraTotalDif(uc.key);
                                  @let totDifCpt = totDifDenom !== 0 ? totDifCost / totDifDenom : 0;
                                  <td style="padding:3px 6px;border-bottom:1px solid #fde68a;border-right:1px solid #fde68a;text-align:right;background:#fffbeb;"
                                      [style.color]="totDifCpt !== 0 ? (totDifCpt > 0 ? '#16a34a' : '#dc2626') : '#fde68a'"
                                      [style.fontWeight]="totDifCpt !== 0 ? '700' : '400'">
                                    {{ totDifCpt !== 0 ? (totDifCpt > 0 ? '+' : '') + fmtFull(absVal(totDifCpt)) : '' }}
                                  </td>
                                }
                              }
                            }
                          </tr>
                        }

                        <!-- Siembra Metrics: Tallos, Charolas, Metros, Hectareas -->
                        @let siembraMetrics = getSiembraMetrics(group.label);
                        @if (siembraMetrics && data()?.siembra_data) {
                          @for (m of siembraMetrics; track m.key) {
                            <tr class="pt-row mo-detail">
                              <td class="pt-pinned"
                                  style="padding:3px 8px;padding-left:20px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;font-size:10px;color:#166534;background:#f0fdf4;">
                                {{ m.title }}
                              </td>
                              @for (rn of activeRanchesInData(); track rn) {
                                @for (key of weekKeys(); track key) {
                                  @let v = getSiembraVal(key, rn, m.key);
                                  <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                      [style.color]="v > 0 ? '#15803d' : '#86efac'"
                                      [style.fontWeight]="v > 0 ? '600' : '400'">
                                    {{ v > 0 ? fmtSiembra(v, m.decimals) : '' }}
                                  </td>
                                }
                                @let dif = getSiembraDif(rn, m.key);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                    [style.color]="dif !== 0 ? (dif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                    [style.fontWeight]="dif !== 0 ? '700' : '400'">
                                  {{ dif !== 0 ? (dif > 0 ? '+' : '') + fmtSiembra(absVal(dif), m.decimals) : '' }}
                                </td>
                              }
                              @if (showTotal()) {
                                @for (key of weekKeys(); track key) {
                                  @let sV = getSiembraWeekTotal(key, m.key);
                                  <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                      [style.color]="sV > 0 ? '#166534' : '#86efac'"
                                      [style.fontWeight]="sV > 0 ? '700' : '400'">
                                    {{ sV > 0 ? fmtSiembra(sV, m.decimals) : '' }}
                                  </td>
                                }
                                @let sDif = getSiembraWeekTotal(weekKeys()[weekKeys().length - 1], m.key) - getSiembraWeekTotal(weekKeys()[0], m.key);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                    [style.color]="sDif !== 0 ? (sDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                    [style.fontWeight]="sDif !== 0 ? '700' : '400'">
                                  {{ sDif !== 0 ? (sDif > 0 ? '+' : '') + fmtSiembra(absVal(sDif), m.decimals) : '' }}
                                </td>
                                @if (showYearTotals()) {
                                  @for (yr of totYears(); track yr) {
                                    @let sYrV = getSiembraYrTotal(yr, m.key);
                                    <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                        [style.color]="sYrV > 0 ? '#166534' : '#86efac'"
                                        [style.fontWeight]="sYrV > 0 ? '700' : '400'">
                                      {{ sYrV > 0 ? fmtSiembra(sYrV, m.decimals) : '' }}
                                    </td>
                                  }
                                  @if (totYears().length >= 2) {
                                    @let sTotDif = getSiembraTotalDif(m.key);
                                    <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                        [style.color]="sTotDif !== 0 ? (sTotDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                        [style.fontWeight]="sTotDif !== 0 ? '700' : '400'">
                                      {{ sTotDif !== 0 ? (sTotDif > 0 ? '+' : '') + fmtSiembra(absVal(sTotDif), m.decimals) : '' }}
                                    </td>
                                  }
                                }
                              }
                            </tr>
                          }
                        }

                        <!-- TRANSPORTE: HRS LABORADAS -->
                        @if (group.label === 'TRANSPORTE' && $any(data()).horas_transporte) {
                          <tr class="pt-row mo-detail">
                            <td class="pt-pinned"
                                style="padding:3px 8px;padding-left:20px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;font-size:10px;color:#166534;background:#f0fdf4;">
                              HRS LABORADAS
                            </td>
                            @for (rn of activeRanchesInData(); track rn) {
                              @for (key of weekKeys(); track key) {
                                @let v = getHorasTransporte(key, rn);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                    [style.color]="v > 0 ? '#15803d' : '#86efac'"
                                    [style.fontWeight]="v > 0 ? '600' : '400'">
                                  {{ v > 0 ? v.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}) : '' }}
                                </td>
                              }
                              @let dif = getHorasTransporteDif(rn);
                              <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                  [style.color]="dif !== 0 ? (dif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                  [style.fontWeight]="dif !== 0 ? '700' : '400'">
                                {{ dif !== 0 ? (dif > 0 ? '+' : '') + absVal(dif).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}) : '' }}
                              </td>
                            }
                            @if (showTotal()) {
                              @for (key of weekKeys(); track key) {
                                @let htV = getHorasTransporteWeekTotal(key);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                    [style.color]="htV > 0 ? '#166534' : '#86efac'"
                                    [style.fontWeight]="htV > 0 ? '700' : '400'">
                                  {{ htV > 0 ? htV.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}) : '' }}
                                </td>
                              }
                              @let htDif = getHorasTransporteWeekTotal(weekKeys()[weekKeys().length - 1]) - getHorasTransporteWeekTotal(weekKeys()[0]);
                              <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                  [style.color]="htDif !== 0 ? (htDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                  [style.fontWeight]="htDif !== 0 ? '700' : '400'">
                                {{ htDif !== 0 ? (htDif > 0 ? '+' : '') + absVal(htDif).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}) : '' }}
                              </td>
                              @if (showYearTotals()) {
                                @for (yr of totYears(); track yr) {
                                  @let htYrV = getHorasTransporteYrTotal(yr);
                                  <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                      [style.color]="htYrV > 0 ? '#166534' : '#86efac'"
                                      [style.fontWeight]="htYrV > 0 ? '700' : '400'">
                                    {{ htYrV > 0 ? htYrV.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}) : '' }}
                                  </td>
                                }
                                @if (totYears().length >= 2) {
                                  @let htTotDif = getHorasTransporteTotalDif();
                                  <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                      [style.color]="htTotDif !== 0 ? (htTotDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                      [style.fontWeight]="htTotDif !== 0 ? '700' : '400'">
                                    {{ htTotDif !== 0 ? (htTotDif > 0 ? '+' : '') + absVal(htTotDif).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}) : '' }}
                                  </td>
                                }
                              }
                            }
                          </tr>
                        }

                        <!-- TRACTORES/CAMEROS: actividades con Camas / Horas -->
                        @if (group.label === 'TRACTORES/CAMEROS' && $any(data()).tractores) {
                          @for (act of tractorActivities(); track act) {
                            <tr class="pt-row mo-detail">
                              <td class="pt-pinned"
                                  style="padding:3px 8px;padding-left:20px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;font-size:10px;color:#166534;background:#f0fdf4;">
                                {{ act }}
                              </td>
                              @for (rn of activeRanchesInData(); track rn) {
                                @for (key of weekKeys(); track key) {
                                  @let c_val = getTractorCamas(key, rn, act);
                                  @let h_val = getTractorHoras(key, rn, act);
                                  <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                      [style.color]="c_val > 0 || h_val > 0 ? '#15803d' : '#86efac'"
                                      [style.fontWeight]="c_val > 0 || h_val > 0 ? '600' : '400'">
                                    {{ (c_val > 0 || h_val > 0) ? (c_val > 0 ? c_val.toLocaleString('es-MX', {maximumFractionDigits:1}) : '') + ' / ' + (h_val > 0 ? h_val.toLocaleString('es-MX', {maximumFractionDigits:0}) : '') : '' }}
                                  </td>
                                }
                                @let cDif = getTractorDif(rn, act, 'camas');
                                @let hDif = getTractorDif(rn, act, 'horas');
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#f0fdf4;"
                                    [style.color]="cDif !== 0 || hDif !== 0 ? (cDif > 0 || hDif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                    [style.fontWeight]="cDif !== 0 || hDif !== 0 ? '700' : '400'">
                                  {{ formatTractorDif(cDif, hDif) }}
                                </td>
                              }
                              @if (showTotal()) {
                                @for (key of weekKeys(); track key) {
                                  @let tcV = getTractorCamasWeekTotal(key, act);
                                  @let thV = getTractorHorasWeekTotal(key, act);
                                  <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                      [style.color]="tcV > 0 || thV > 0 ? '#166534' : '#86efac'"
                                      [style.fontWeight]="tcV > 0 || thV > 0 ? '700' : '400'">
                                    {{ (tcV > 0 || thV > 0) ? (tcV > 0 ? tcV.toLocaleString('es-MX', {maximumFractionDigits:1}) : '') + ' / ' + (thV > 0 ? thV.toLocaleString('es-MX', {maximumFractionDigits:0}) : '') : '' }}
                                  </td>
                                }
                                @let tCdif = getTractorCamasWeekTotal(weekKeys()[weekKeys().length - 1], act) - getTractorCamasWeekTotal(weekKeys()[0], act);
                                @let tHdif = getTractorHorasWeekTotal(weekKeys()[weekKeys().length - 1], act) - getTractorHorasWeekTotal(weekKeys()[0], act);
                                <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                    [style.color]="tCdif !== 0 || tHdif !== 0 ? (tCdif > 0 || tHdif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                    [style.fontWeight]="tCdif !== 0 || tHdif !== 0 ? '700' : '400'">
                                  {{ formatTractorDif(tCdif, tHdif) }}
                                </td>
                                @if (showYearTotals()) {
                                  @for (yr of totYears(); track yr) {
                                    @let tYrC = getTractorYrTotal(yr, act, 'camas');
                                    @let tYrH = getTractorYrTotal(yr, act, 'horas');
                                    <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#dcfce7;"
                                        [style.color]="tYrC > 0 || tYrH > 0 ? '#166534' : '#86efac'"
                                        [style.fontWeight]="tYrC > 0 || tYrH > 0 ? '700' : '400'">
                                      {{ (tYrC > 0 || tYrH > 0) ? (tYrC > 0 ? tYrC.toLocaleString('es-MX', {maximumFractionDigits:1}) : '') + ' / ' + (tYrH > 0 ? tYrH.toLocaleString('es-MX', {maximumFractionDigits:0}) : '') : '' }}
                                    </td>
                                  }
                                  @if (totYears().length >= 2) {
                                    @let tTotCdif = getTractorTotalDif(act, 'camas');
                                    @let tTotHdif = getTractorTotalDif(act, 'horas');
                                    <td style="padding:3px 6px;border-bottom:1px solid #dcfce7;border-right:1px solid #dcfce7;text-align:right;background:#bbf7d0;"
                                        [style.color]="tTotCdif !== 0 || tTotHdif !== 0 ? (tTotCdif > 0 || tTotHdif > 0 ? '#16a34a' : '#dc2626') : '#86efac'"
                                        [style.fontWeight]="tTotCdif !== 0 || tTotHdif !== 0 ? '700' : '400'">
                                      {{ formatTractorDif(tTotCdif, tTotHdif) }}
                                    </td>
                                  }
                                }
                              }
                            </tr>
                          }
                        }
                      }
                    } @else {
                      <!-- Multiple subcats: show group header + subcat rows -->
                      <tr class="pt-row-group">
                        <td style="padding:3px 8px;position:sticky;left:0;z-index:1;background:var(--pt-grp-bg);border-bottom:1px solid #e5e5e5;border-right:1px solid #ddd;font-weight:700;color:var(--pt-grp-fg);font-size:11px;">
                          {{ group.label }}
                        </td>
                        @for (rn of activeRanchesInData(); track rn) {
                          @for (key of weekKeys(); track key) {
                            <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;color:#ccc;"></td>
                          }
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;color:#ccc;"></td>
                        }
                        @if (showTotal()) {
                          @for (key of weekKeys(); track key) {
                            <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;color:#ccc;"></td>
                          }
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;color:#ccc;"></td>
                          @if (showYearTotals()) {
                            @for (yr of totYears(); track yr) {
                              <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;color:#ccc;"></td>
                            }
                            @if (totYears().length >= 2) {
                              <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;color:#ccc;"></td>
                            }
                          }
                        }
                      </tr>
                      @for (sc of group.subcats; track sc; let si = $index) {
                        <tr class="pt-row" [class.pt-row-sub]="si === group.subcats.length - 1">
                          <td class="pt-pinned"
                              style="padding:3px 8px;border-bottom:1px solid #e5e5e5;border-right:1px solid #ddd;font-weight:500;color:#404040;background:#fff;">
                            <span style="padding-left:12px;font-size:11px;">{{ sc }}</span>
                          </td>
                          @for (rn of activeRanchesInData(); track rn) {
                            @for (key of weekKeys(); track key) {
                              <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                                  [style.color]="getRanchVal(key, rn, sc) > 0 ? '#5a1414' : '#ccc'"
                                  [style.fontWeight]="getRanchVal(key, rn, sc) > 0 ? '600' : '400'">
                                {{ getRanchVal(key, rn, sc) > 0 ? fmt(getRanchVal(key, rn, sc)) : '' }}
                              </td>
                            }
                            <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                                [style.color]="getRanchDif(rn, sc) !== 0 ? (getRanchDif(rn, sc) > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                                [style.fontWeight]="getRanchDif(rn, sc) !== 0 ? '700' : '400'">
                              {{ getRanchDif(rn, sc) !== 0 ? (getRanchDif(rn, sc) > 0 ? '+' : '') + fmt(absVal(getRanchDif(rn, sc))) : '' }}
                            </td>
                          }                      @if (showTotal()) {
                        @for (key of weekKeys(); track key) {
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                              [style.color]="getWeekTotalVal(key, sc) > 0 ? '#5a1414' : '#ccc'"
                              [style.fontWeight]="getWeekTotalVal(key, sc) > 0 ? '700' : '400'">
                            {{ getWeekTotalVal(key, sc) > 0 ? fmt(getWeekTotalVal(key, sc)) : '' }}
                          </td>
                        }
                        @let wkDif = getWeekTotalDif(sc);
                        <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                            [style.color]="wkDif !== 0 ? (wkDif > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                            [style.fontWeight]="wkDif !== 0 ? '700' : '400'">
                          {{ wkDif !== 0 ? (wkDif > 0 ? '+' : '') + fmt(absVal(wkDif)) : '' }}
                        </td>
                        @for (yr of totYears(); track yr) {
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                              [style.color]="getTotalVal(yr, sc) > 0 ? '#5a1414' : '#ccc'"
                              [style.fontWeight]="getTotalVal(yr, sc) > 0 ? '700' : '400'">
                            {{ getTotalVal(yr, sc) > 0 ? fmt(getTotalVal(yr, sc)) : '' }}
                          </td>
                        }
                        @if (totYears().length >= 2) {
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                              [style.color]="getTotalDif(sc) !== 0 ? (getTotalDif(sc) > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                              [style.fontWeight]="getTotalDif(sc) !== 0 ? '700' : '400'">
                            {{ getTotalDif(sc) !== 0 ? (getTotalDif(sc) > 0 ? '+' : '') + fmt(absVal(getTotalDif(sc))) : '' }}
                          </td>
                        }
                      }
                        </tr>
                      }
                    }
                  }
                }
              } @else {
                <!-- SERVICIOS: flat rows -->
                @for (sc of orderedSubcats(); track sc) {
                  <tr class="pt-row">
                    <td class="pt-pinned"
                        style="padding:3px 8px;border-bottom:1px solid #e5e5e5;border-right:1px solid #ddd;font-weight:700;color:#262626;background:#fff;font-size:11px;">
                      {{ sc }}
                    </td>
                    @for (rn of activeRanchesInData(); track rn) {
                      @for (key of weekKeys(); track key) {
                        <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                            [style.color]="getRanchVal(key, rn, sc) > 0 ? '#5a1414' : '#ccc'"
                            [style.fontWeight]="getRanchVal(key, rn, sc) > 0 ? '600' : '400'">
                          {{ getRanchVal(key, rn, sc) > 0 ? fmt(getRanchVal(key, rn, sc)) : '' }}
                        </td>
                      }
                      <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                          [style.color]="getRanchDif(rn, sc) !== 0 ? (getRanchDif(rn, sc) > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                          [style.fontWeight]="getRanchDif(rn, sc) !== 0 ? '700' : '400'">                            {{ getRanchDif(rn, sc) !== 0 ? (getRanchDif(rn, sc) > 0 ? '+' : '') + fmt(absVal(getRanchDif(rn, sc))) : '' }}
                      </td>
                    }
                    @if (showTotal()) {
                      @for (key of weekKeys(); track key) {
                        <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                            [style.color]="getWeekTotalVal(key, sc) > 0 ? '#5a1414' : '#ccc'"
                            [style.fontWeight]="getWeekTotalVal(key, sc) > 0 ? '700' : '400'">
                          {{ getWeekTotalVal(key, sc) > 0 ? fmt(getWeekTotalVal(key, sc)) : '' }}
                        </td>
                      }
                      @let wkDif = getWeekTotalDif(sc);
                      <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                          [style.color]="wkDif !== 0 ? (wkDif > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                          [style.fontWeight]="wkDif !== 0 ? '700' : '400'">
                        {{ wkDif !== 0 ? (wkDif > 0 ? '+' : '') + fmt(absVal(wkDif)) : '' }}
                      </td>
                      @if (showYearTotals()) {
                        @for (yr of totYears(); track yr) {
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                              [style.color]="getTotalVal(yr, sc) > 0 ? '#5a1414' : '#ccc'"
                              [style.fontWeight]="getTotalVal(yr, sc) > 0 ? '700' : '400'">
                            {{ getTotalVal(yr, sc) > 0 ? fmt(getTotalVal(yr, sc)) : '' }}
                          </td>
                        }
                        @if (totYears().length >= 2) {
                          <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;"
                              [style.color]="getTotalDif(sc) !== 0 ? (getTotalDif(sc) > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                              [style.fontWeight]="getTotalDif(sc) !== 0 ? '700' : '400'">
                            {{ getTotalDif(sc) !== 0 ? (getTotalDif(sc) > 0 ? '+' : '') + fmt(absVal(getTotalDif(sc))) : '' }}
                          </td>
                        }
                      }
                    }
                  </tr>
                }
              }
              <!-- TOTAL ROW -->
              <tr class="pt-row-total">
                <td class="pt-pinned"
                    style="padding:3px 8px;border-bottom:1px solid #e5e5e5;border-right:1px solid #ddd;font-weight:800;color:#5a1414;background:var(--pt-tot-bg);font-size:11px;">
                  TOTAL
                </td>
                @for (rn of activeRanchesInData(); track rn) {
                  @for (key of weekKeys(); track key) {
                    <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;background:var(--pt-tot-bg);"
                        [style.color]="getGrandRanchVal(key, rn) > 0 ? '#5a1414' : '#ccc'"
                        [style.fontWeight]="getGrandRanchVal(key, rn) > 0 ? '700' : '400'">
                      {{ getGrandRanchVal(key, rn) > 0 ? fmt(getGrandRanchVal(key, rn)) : '' }}
                    </td>
                  }
                  <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;background:var(--pt-tot-bg);"
                      [style.color]="getGrandRanchDif(rn) !== 0 ? (getGrandRanchDif(rn) > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                      [style.fontWeight]="getGrandRanchDif(rn) !== 0 ? '700' : '400'">
                    {{ getGrandRanchDif(rn) !== 0 ? (getGrandRanchDif(rn) > 0 ? '+' : '') + fmt(absVal(getGrandRanchDif(rn))) : '' }}
                  </td>
                }
                @if (showTotal()) {
                  @for (key of weekKeys(); track key) {
                    <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;background:var(--pt-tot-bg);"
                        [style.color]="getGrandWeekTotal(key) > 0 ? '#5a1414' : '#ccc'"
                        [style.fontWeight]="getGrandWeekTotal(key) > 0 ? '700' : '400'">
                      {{ getGrandWeekTotal(key) > 0 ? fmt(getGrandWeekTotal(key)) : '' }}
                    </td>
                  }
                  @let grandWkDif = getGrandWeekDif();
                  <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;background:var(--pt-tot-bg);"
                      [style.color]="grandWkDif !== 0 ? (grandWkDif > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                      [style.fontWeight]="grandWkDif !== 0 ? '700' : '400'">
                    {{ grandWkDif !== 0 ? (grandWkDif > 0 ? '+' : '') + fmt(absVal(grandWkDif)) : '' }}
                  </td>
                  @if (showYearTotals()) {
                    @for (yr of totYears(); track yr) {
                      <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;background:var(--pt-tot-bg);"
                          [style.color]="getGrandTotalVal(yr) > 0 ? '#5a1414' : '#ccc'"
                          [style.fontWeight]="getGrandTotalVal(yr) > 0 ? '700' : '400'">
                        {{ getGrandTotalVal(yr) > 0 ? fmt(getGrandTotalVal(yr)) : '' }}
                      </td>
                    }
                    @if (totYears().length >= 2) {
                      <td style="padding:3px 6px;border-bottom:1px solid #e5e5e5;border-right:1px solid #e5e5e5;text-align:right;background:var(--pt-tot-bg);"
                          [style.color]="getGrandTotalDif() !== 0 ? (getGrandTotalDif() > 0 ? '#16a34a' : '#dc2626') : '#ccc'"
                          [style.fontWeight]="getGrandTotalDif() !== 0 ? '700' : '400'">
                        {{ getGrandTotalDif() !== 0 ? (getGrandTotalDif() > 0 ? '+' : '') + fmt(absVal(getGrandTotalDif())) : '' }}
                      </td>
                    }
                  }
                }
              </tr>
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class ServiciosViewComponent {
  readonly YEAR_COLORS = YEAR_COLORS;
  readonly moGroups = MO_GROUPS;

  constructor(protected stateService: StateService) {}

  protected state = this.stateService.state;
  protected data = this.stateService.data;

  protected isManoObra = computed(() => this.state().cat === 'COSTO MANO DE OBRA');
  protected activeRanches = this.stateService.activeRanchesList;
  protected showTotal = computed(() => this.state().activeRanches.includes('Todos'));
  protected showYearTotals = computed(() => this.weekKeys().length >= 2);

  // ── Expandable groups state ──
  protected expandedGroups: Record<string, boolean> = {};

  protected toggleGroup(label: string): void {
    this.expandedGroups = { ...this.expandedGroups, [label]: !this.expandedGroups[label] };
  }

  protected isGroupExpanded(label: string): boolean {
    return !!this.expandedGroups[label];
  }

  // ── HC (Headcount) helpers ──
  protected getHcVal(weekKey: string, subcat: string): number {
    const d = this.data();
    if (!d) return 0;
    const [yr, wk] = weekKey.split('-').map(Number);
    let total = 0;
    for (const r of (d.mano_obra_data || [])) {
      if (r.subcat === subcat && r.year === yr && r.week === wk) {
        total += r.hc_total || 0;
      }
    }
    return total;
  }

  protected getHcRanchVal(weekKey: string, ranch: string, subcat: string): number {
    const d = this.data();
    if (!d) return 0;
    const [yr, wk] = weekKey.split('-').map(Number);
    let total = 0;
    for (const r of (d.mano_obra_data || [])) {
      if (r.subcat === subcat && r.year === yr && r.week === wk) {
        total += (r.hc_ranches || {})[ranch] || 0;
      }
    }
    return total;
  }

  protected getHcDif(ranch: string, subcat: string): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    const first = this.getHcRanchVal(keys[0], ranch, subcat);
    const last = this.getHcRanchVal(keys[keys.length - 1], ranch, subcat);
    return last - first;
  }

  protected getHcTotalDif(subcat: string): number {
    const yrs = this.totYears();
    if (yrs.length < 2) return 0;
    const map = this.weekMap();
    let firstTotal = 0, lastTotal = 0;
    for (const k of this.weekKeys()) {
      if (map[k]._year === yrs[0]) firstTotal += this.getHcVal(k, subcat);
      if (map[k]._year === yrs[yrs.length - 1]) lastTotal += this.getHcVal(k, subcat);
    }
    return lastTotal - firstTotal;
  }

  // ── Siembra helpers (Tallos, Charolas, Metros, Hectareas) ──
  protected getSiembraVal(weekKey: string, ranch: string, metricKey: string): number {
    const d = this.data();
    if (!d || !d.siembra_data) return 0;
    const [yr, wk] = weekKey.split('-').map(Number);
    const code = (yr % 100) * 100 + wk;
    const wkData = (d.siembra_data as any)[code] || (d.siembra_data as any)[String(code)] || {};
    const revMap: Record<string, string> = { 'Ramona': 'Campo-RM', 'Poscosecha': 'PosCo-RM', 'Propagacion': 'Prop-RM' };
    const targetRn = revMap[ranch] || ranch;
    const rData = wkData[targetRn] || {};
    return rData[metricKey] || 0;
  }

  protected unitCostGroupMap: Record<string, { key: string; label: string; title: string }> = {
    'CORTE':          { key: 'tallos_cos',  label: '$ / UNIT',  title: 'Costo Unitario por Tallo Cosechado:' },
    'TRASPLANTE':     { key: 'charolas',    label: '$ / UNIT',  title: 'Costo Unitario por Charola Sembrada:' },
    'MANEJO PLANTA':  { key: 'metros',      label: '$ / UNIT',  title: 'Costo Unitario por Metro de Siembra:' },
    'MIPE / MIRFE':   { key: 'metros',      label: '$ / UNIT',  title: 'Costo Unitario por Metro de Siembra:' },
  };

  // ── Siembra metrics (standalone) per group ──
  protected siembraMetricsMap: Record<string, Array<{ key: string; title: string; decimals: number }>> = {
    'CORTE':          [{ key: 'tallos_cos',  title: 'TALLOS COSECHADOS',        decimals: 0 }],
    'TRASPLANTE':     [{ key: 'charolas',    title: 'NUMERO DE CHAROLAS SEMBRADAS', decimals: 0 }],
    'MANEJO PLANTA':  [{ key: 'metros',      title: 'METROS DE SIEMBRA',        decimals: 0 },
                      { key: 'hectareas',   title: 'HECTAREAS EN SIEMBRA',     decimals: 2 }],
    'MIPE / MIRFE':   [{ key: 'metros',      title: 'METROS DE SIEMBRA',        decimals: 0 },
                      { key: 'hectareas',   title: 'HECTAREAS EN SIEMBRA',     decimals: 2 }],
    'TRANSPORTE':     [{ key: 'tallos_cos',  title: 'TALLOS COSECHADOS',        decimals: 0 }],
  };

  protected getSiembraMetrics(label: string): Array<{ key: string; title: string; decimals: number }> | null {
    return this.siembraMetricsMap[label] || null;
  }

  // ── Build weekMap ──
  protected weekMap = computed(() => {
    const data = this.data();
    if (!data) return {} as Record<string, WeekData>;
    const s = this.state();
    const map: Record<string, WeekData> = {};
    const src = this.isManoObra()
      ? (data.mano_obra_data || [])
      : (data.servicios_data && data.servicios_data.length ? data.servicios_data : data.weekly_detail);

    for (const r of src) {
      if (!s.activeYears[r.year]) continue;
      if (r.week < s.fromWeek || r.week > s.toWeek) continue;
      const key = `${r.year}-${r.week}`;
      if (!map[key]) map[key] = { _year: r.year, _week: r.week, date_range: r.date_range || '' };

      let subcat: string | null = null;
      let val = 0;
      let ranches: Record<string, number> = {};

      const rec = r as any;
      if (rec.subcat) {
        subcat = rec.subcat;
        val = s.currency === 'usd' ? r.usd_total : r.mxn_total;
        ranches = s.currency === 'usd' ? (rec.usd_ranches || {}) : (rec.mxn_ranches || {});
      } else if ((r as any).categoria && (r as any).categoria.startsWith('SV:')) {
        subcat = (r as any).categoria.replace('SV:', '');
        val = s.currency === 'usd' ? r.usd_total : r.mxn_total;
        ranches = s.currency === 'usd' ? (r.usd_ranches || {}) : (r.mxn_ranches || {});
      }
      if (!subcat) continue;

      map[key][subcat] = (map[key][subcat] || 0) + (val || 0);
      for (const rn of Object.keys(ranches || {})) {
        const rk = subcat + '__r__' + rn;
        map[key][rk] = (map[key][rk] || 0) + (ranches[rn] || 0);
      }
    }
    return map;
  });

  // ── Week keys with data ──
  protected weekKeys = computed(() => {
    const map = this.weekMap();
    return Object.keys(map)
      .filter(key => {
        const d = map[key];
        return Object.keys(d).some(k => k[0] !== '_' && !k.includes('__r__') && (d[k] as number) > 0);
      })
      .sort((a, b) => {
        const [ay, aw] = a.split('-').map(Number);
        const [by, bw] = b.split('-').map(Number);
        return ay - by || aw - bw;
      });
  });

  // ── Subcats ──
  protected orderedSubcats = computed(() => {
    const map = this.weekMap();
    const keys = this.weekKeys();
    const set = new Set<string>();
    for (const k of keys) {
      for (const prop of Object.keys(map[k] || {})) {
        if (prop[0] !== '_' && !prop.includes('__r__') && (map[k][prop] as number) > 0) {
          set.add(prop);
        }
      }
    }
    // Order by SV_SUBCATS first, then append any others
    const ordered = SV_SUBCATS.filter(sc => set.has(sc));
    for (const sc of set) {
      if (!ordered.includes(sc)) ordered.push(sc);
    }
    return ordered;
  });

  // ── Ranches with data ──
  protected activeRanchesInData = computed(() => {
    const keys = this.weekKeys();
    const map = this.weekMap();

    if (this.isManoObra()) {
      // MO view: use MO_RANCH_ORDER as base, mapping physical ranches to MO names
      const s = this.state();
      let allowedRanches: string[];
      if (s.activeRanches.includes('Todos')) {
        allowedRanches = [...MO_RANCH_ORDER];
      } else {
        allowedRanches = [];
        for (const rn of s.activeRanches) {
          const mapped = MO_RANCH_MAP[rn] || [rn];
          for (const m of mapped) {
            if (!allowedRanches.includes(m)) allowedRanches.push(m);
          }
        }
      }

      // Step 1: filter to ranches with data in weekMap
      const result = allowedRanches.filter(rn =>
        keys.some(key =>
          Object.keys(map[key] || {}).some(k => k.endsWith('__r__' + rn) && (map[key][k] as number) > 0)
        )
      );

      // Step 2: also include any ranches from data that are in the allowed list
      for (const k of keys) {
        for (const prop of Object.keys(map[k] || {})) {
          if (!prop.includes('__r__')) continue;
          const rn = prop.split('__r__')[1];
          if (result.includes(rn)) continue;
          if (allowedRanches.includes(rn)) result.push(rn);
        }
      }

      return result;
    }

    // Non-MO (Servicios) view: current logic
    const allowed = this.activeRanches();
    return allowed.filter(rn =>
      keys.some(key =>
        Object.keys(map[key] || {}).some(k => k.endsWith('__r__' + rn) && (map[key][k] as number) > 0)
      )
    );
  });

  // ── Years present ──
  protected totYears = computed(() => {
    const map = this.weekMap();
    const keys = this.weekKeys();
    const yrs = new Set<number>();
    for (const key of keys) {
      yrs.add(map[key]._year);
    }
    return Array.from(yrs).sort((a, b) => a - b);
  });

  // ── Column counts ──
  protected nColsPerRanch = computed(() => Math.max(this.weekKeys().length, 0) + 1);
  protected nTotalCols = computed(() => {
    const yrs = this.totYears();
    return this.nColsPerRanch() + (this.showYearTotals() ? yrs.length + (yrs.length >= 2 ? 1 : 0) : 0);
  });

  // ── Label helper ──
  protected shortLabel(key: string): string {
    const [yr, wk] = key.split('-').map(Number);
    return String(yr).slice(2) + String(wk).padStart(2, '0');
  }

  // ── Value getters ──
  protected getRanchVal(weekKey: string, ranch: string, subcat: string): number {
    const wk = this.weekMap()[weekKey];
    if (!wk) return 0;
    return (wk[subcat + '__r__' + ranch] as number) || 0;
  }

  protected getTotalVal(yr: number, subcat: string): number {
    const map = this.weekMap();
    let total = 0;
    for (const k of this.weekKeys()) {
      if (map[k]._year === yr) {
        total += (map[k][subcat] as number) || 0;
      }
    }
    return total;
  }

  protected getRanchDif(ranch: string, subcat: string): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    const first = this.getRanchVal(keys[0], ranch, subcat);
    const last = this.getRanchVal(keys[keys.length - 1], ranch, subcat);
    return last - first;
  }

  protected getTotalDif(subcat: string): number {
    const yrs = this.totYears();
    if (yrs.length < 2) return 0;
    return this.getTotalVal(yrs[yrs.length - 1], subcat) - this.getTotalVal(yrs[0], subcat);
  }

  protected groupHasData(group: { label: string; subcats: string[] }): boolean {
    const map = this.weekMap();
    const keys = this.weekKeys();
    const ranches = this.activeRanchesInData();
    for (const k of keys) {
      for (const sc of group.subcats) {
        if ((map[k][sc] as number) > 0) return true;
        for (const rn of ranches) {
          if ((map[k][sc + '__r__' + rn] as number) > 0) return true;
        }
      }
    }
    return false;
  }

  // ── All subcats for totals ──
  protected allSubcatsForTotals = computed(() => {
    if (this.isManoObra()) {
      const subs: string[] = [];
      for (const g of this.moGroups) {
        for (const sc of g.subcats) {
          if (!subs.includes(sc)) subs.push(sc);
        }
      }
      return subs;
    }
    return this.orderedSubcats();
  });

  // ── Week total helpers (across all ranches) ──
  protected getWeekTotalVal(weekKey: string, subcat: string): number {
    const wk = this.weekMap()[weekKey];
    if (!wk) return 0;
    return (wk[subcat] as number) || 0;
  }

  protected getWeekTotalDif(subcat: string): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    return this.getWeekTotalVal(keys[keys.length - 1], subcat) - this.getWeekTotalVal(keys[0], subcat);
  }

  protected getGrandWeekTotal(weekKey: string): number {
    let total = 0;
    for (const sc of this.allSubcatsForTotals()) {
      total += this.getWeekTotalVal(weekKey, sc);
    }
    return total;
  }

  protected getGrandWeekDif(): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    return this.getGrandWeekTotal(keys[keys.length - 1]) - this.getGrandWeekTotal(keys[0]);
  }

  // ── Grand total helpers ──
  protected getGrandRanchVal(weekKey: string, ranch: string): number {
    let total = 0;
    for (const sc of this.allSubcatsForTotals()) {
      total += this.getRanchVal(weekKey, ranch, sc);
    }
    return total;
  }

  protected getGrandRanchDif(ranch: string): number {
    let total = 0;
    for (const sc of this.allSubcatsForTotals()) {
      total += this.getRanchDif(ranch, sc);
    }
    return total;
  }

  protected getGrandTotalVal(yr: number): number {
    let total = 0;
    for (const sc of this.allSubcatsForTotals()) {
      total += this.getTotalVal(yr, sc);
    }
    return total;
  }

  protected getGrandTotalDif(): number {
    let total = 0;
    for (const sc of this.allSubcatsForTotals()) {
      total += this.getTotalDif(sc);
    }
    return total;
  }

  // ── HC yearly total ──
  protected getHcYrVal(yr: number, subcat: string): number {
    let total = 0;
    for (const k of this.weekKeys()) {
      const [y] = k.split('-').map(Number);
      if (y === yr) total += this.getHcVal(k, subcat);
    }
    return total;
  }

  // ── Siembra helpers ──
  protected getSiembraWeekTotal(weekKey: string, metricKey: string): number {
    let total = 0;
    for (const rn of this.activeRanchesInData()) {
      total += this.getSiembraVal(weekKey, rn, metricKey);
    }
    return total;
  }

  protected getSiembraDif(ranch: string, metricKey: string): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    const first = this.getSiembraVal(keys[0], ranch, metricKey);
    const last = this.getSiembraVal(keys[keys.length - 1], ranch, metricKey);
    return last - first;
  }

  protected getSiembraYrTotal(yr: number, metricKey: string): number {
    let total = 0;
    for (const k of this.weekKeys()) {
      const [y] = k.split('-').map(Number);
      if (y !== yr) continue;
      for (const rn of this.activeRanchesInData()) {
        total += this.getSiembraVal(k, rn, metricKey);
      }
    }
    return total;
  }

  protected getSiembraTotalDif(metricKey: string): number {
    const yrs = this.totYears();
    if (yrs.length < 2) return 0;
    let firstTotal = 0, lastTotal = 0;
    for (const k of this.weekKeys()) {
      const [y] = k.split('-').map(Number);
      if (y === yrs[0] || y === yrs[yrs.length - 1]) {
        for (const rn of this.activeRanchesInData()) {
          if (y === yrs[0]) firstTotal += this.getSiembraVal(k, rn, metricKey);
          if (y === yrs[yrs.length - 1]) lastTotal += this.getSiembraVal(k, rn, metricKey);
        }
      }
    }
    return lastTotal - firstTotal;
  }

  // ── ESQUEJES helpers ──
  protected esquejeRanches = computed(() => this.activeRanchesInData());

  protected esquejeFloresList = computed(() => {
    const d = this.data();
    if (!d || !d.esquejes_data || !d.esquejes_data.length) return [];
    const flores = new Set<string>();
    for (const k of this.weekKeys()) {
      const [yr, wk] = k.split('-').map(Number);
      const sf = (yr % 100) * 100 + wk;
      for (const r of (d.esquejes_data as any[])) {
        if (r.semana_fin === sf) {
          flores.add(r.flor);
        }
      }
    }
    return Array.from(flores).sort();
  });

  protected getEsquejePlantas(weekKey: string, flor: string): number {
    const d = this.data();
    if (!d || !d.esquejes_data) return 0;
    const [yr, wk] = weekKey.split('-').map(Number);
    const sf = (yr % 100) * 100 + wk;
    let total = 0;
    for (const r of (d.esquejes_data as any[])) {
      if (r.semana_fin === sf && r.flor === flor) {
        total += r.plantas || 0;
      }
    }
    return total;
  }

  protected getEsquejeDif(flor: string): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    return this.getEsquejePlantas(keys[keys.length - 1], flor) - this.getEsquejePlantas(keys[0], flor);
  }

  protected getEsquejeYrTotal(yr: number, flor: string): number {
    let total = 0;
    for (const k of this.weekKeys()) {
      const [y] = k.split('-').map(Number);
      if (y === yr) total += this.getEsquejePlantas(k, flor);
    }
    return total;
  }

  protected getEsquejeTotalDif(flor: string): number {
    const yrs = this.totYears();
    if (yrs.length < 2) return 0;
    return this.getEsquejeYrTotal(yrs[yrs.length - 1], flor) - this.getEsquejeYrTotal(yrs[0], flor);
  }

  // ── Horas Transporte helpers ──
  protected getHorasTransporteWeekTotal(weekKey: string): number {
    let total = 0;
    for (const rn of this.activeRanchesInData()) {
      total += this.getHorasTransporte(weekKey, rn);
    }
    return total;
  }

  protected getHorasTransporte(weekKey: string, ranch: string): number {
    const d = this.data();
    if (!d || !(d as any).horas_transporte) return 0;
    const [yr, wk] = weekKey.split('-').map(Number);
    const code = (yr % 100) * 100 + wk;
    const hData = ((d as any).horas_transporte as any)[code] || ((d as any).horas_transporte as any)[String(code)] || {};
    const revMap: Record<string, string> = { 'Ramona': 'Campo-RM', 'Poscosecha': 'PosCo-RM', 'Propagacion': 'Prop-RM' };
    const targetRn = revMap[ranch] || ranch;
    return hData[targetRn] || hData[ranch] || 0;
  }

  protected getHorasTransporteDif(ranch: string): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    return this.getHorasTransporte(keys[keys.length - 1], ranch) - this.getHorasTransporte(keys[0], ranch);
  }

  protected getHorasTransporteYrTotal(yr: number): number {
    let total = 0;
    for (const k of this.weekKeys()) {
      const [y] = k.split('-').map(Number);
      if (y === yr) {
        for (const rn of this.activeRanchesInData()) {
          total += this.getHorasTransporte(k, rn);
        }
      }
    }
    return total;
  }

  protected getHorasTransporteTotalDif(): number {
    const yrs = this.totYears();
    if (yrs.length < 2) return 0;
    return this.getHorasTransporteYrTotal(yrs[yrs.length - 1]) - this.getHorasTransporteYrTotal(yrs[0]);
  }

  // ── TRACTORES/CAMEROS helpers ──
  protected tractorActivities = computed(() => {
    const d = this.data();
    if (!d || !(d as any).tractores) return [];
    const acts = new Set<string>();
    for (const k of this.weekKeys()) {
      const [yr, wk] = k.split('-').map(Number);
      const code = (yr % 100) * 100 + wk;
      const tData = ((d as any).tractores as any)[code] || ((d as any).tractores as any)[String(code)] || {};
      for (const act of Object.keys(tData)) {
        if (act !== 'TOTALES') acts.add(act);
      }
    }
    return Array.from(acts).sort();
  });

  protected getTractorCamas(weekKey: string, ranch: string, activity: string): number {
    return this.getTractorVal(weekKey, ranch, activity, 'camas');
  }

  protected getTractorHoras(weekKey: string, ranch: string, activity: string): number {
    return this.getTractorVal(weekKey, ranch, activity, 'horas');
  }

  protected getTractorCamasWeekTotal(weekKey: string, activity: string): number {
    let total = 0;
    for (const rn of this.activeRanchesInData()) {
      total += this.getTractorCamas(weekKey, rn, activity);
    }
    return total;
  }

  protected getTractorHorasWeekTotal(weekKey: string, activity: string): number {
    let total = 0;
    for (const rn of this.activeRanchesInData()) {
      total += this.getTractorHoras(weekKey, rn, activity);
    }
    return total;
  }

  private getTractorVal(weekKey: string, ranch: string, activity: string, field: string): number {
    const d = this.data();
    if (!d || !(d as any).tractores) return 0;
    const [yr, wk] = weekKey.split('-').map(Number);
    const code = (yr % 100) * 100 + wk;
    const tData = ((d as any).tractores as any)[code] || ((d as any).tractores as any)[String(code)] || {};
    const revMap: Record<string, string> = { 'Ramona': 'Campo-RM', 'Poscosecha': 'PosCo-RM', 'Propagacion': 'Prop-RM' };
    const targetRn = revMap[ranch] || ranch;
    const revBack: Record<string, string> = { 'Prop-RM': 'Propagacion', 'PosCo-RM': 'Poscosecha', 'Campo-RM': 'Ramona' };
    const rData = (tData[activity] || {})[revBack[targetRn] || targetRn] || (tData[activity] || {})[targetRn] || (tData[activity] || {})[ranch] || {};
    return rData[field] || 0;
  }

  protected getTractorDif(ranch: string, activity: string, field: string): number {
    const keys = this.weekKeys();
    if (keys.length < 2) return 0;
    const first = this.getTractorVal(keys[0], ranch, activity, field);
    const last = this.getTractorVal(keys[keys.length - 1], ranch, activity, field);
    return last - first;
  }

  protected getTractorYrTotal(yr: number, activity: string, field: string): number {
    let total = 0;
    for (const k of this.weekKeys()) {
      const [y] = k.split('-').map(Number);
      if (y === yr) {
        for (const rn of this.activeRanchesInData()) {
          total += this.getTractorVal(k, rn, activity, field);
        }
      }
    }
    return total;
  }

  protected getTractorTotalDif(activity: string, field: string): number {
    const yrs = this.totYears();
    if (yrs.length < 2) return 0;
    return this.getTractorYrTotal(yrs[yrs.length - 1], activity, field) - this.getTractorYrTotal(yrs[0], activity, field);
  }

  protected absVal(n: number): number {
    return Math.abs(n);
  }

  protected fmt(n: number): string {
    if (!n || isNaN(n)) return '';
    const neg = n < 0;
    const s = Math.abs(n);
    return (neg ? '-$' : '$') + Math.round(s).toLocaleString('en-US');
  }

  protected fmtHc(n: number): string {
    if (!n || isNaN(n)) return '';
    return Math.round(n).toLocaleString('en-US');
  }

  protected fmtHcDiff(n: number): string {
    if (!n || isNaN(n)) return '';
    return Math.abs(Math.round(n)).toLocaleString('en-US');
  }

  protected fmtFull(n: number): string {
    if (!n || isNaN(n)) return '';
    const neg = n < 0;
    const s = Math.abs(n);
    return (neg ? '-$' : '$') + s.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  protected fmtSiembra(n: number, decimals: number): string {
    if (n === 0 || isNaN(n)) return '';
    return n.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  protected formatTractorDif(cDif: number, hDif: number): string {
    const cStr = (cDif !== 0 && Math.abs(cDif) >= 0.01)
      ? (cDif > 0 ? '+' : '') + Math.abs(cDif).toLocaleString('es-MX', { maximumFractionDigits: 1 })
      : '';
    const hStr = (hDif !== 0 && Math.abs(hDif) >= 0.5)
      ? (hDif > 0 ? '+' : '') + Math.abs(hDif).toLocaleString('es-MX', { maximumFractionDigits: 0 })
      : '';
    if (!cStr && !hStr) return '';
    return cStr + ' / ' + hStr;
  }
}
