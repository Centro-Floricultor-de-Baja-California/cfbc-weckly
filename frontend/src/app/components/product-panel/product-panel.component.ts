import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { CAT_MIRFE, CAT_MIPE } from '../../models/types';

export interface DetailRow {
  flor: string;
  metros?: number;
  plantas?: number;
  valor?: number;
  proveedor?: string;
}

export interface UnifiedRow {
  id: string;
  ubicacion: string;
  producto: string;
  unidades: string;
  gasto: number;
  isSiembra: boolean;
  isExpandable?: boolean;
  siembraKey?: string;
  details?: DetailRow[];
  totalDetail?: number;
}

@Component({
  selector: 'app-product-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible() && cellData()) {
      <div class="prod-panel-wrapper" 
           style="display: flex; flex-direction: column; width: 100%; font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif;">
        
        <!-- Encabezado Limpio sin Caja (Solo Texto y Línea Negra) -->
        <div style="background-color: transparent; color: #1e293b; border-bottom: 2px solid #000000; padding: 8px 4px; display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box;">
          
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
            <!-- Número de Semana (Texto Simple, sin caja) -->
            <span style="color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; flex-shrink: 0; display: inline-block;">
              {{ getWeekString() }}
            </span>
            
            <!-- Nombre de Categoría (Slate Oscuro) -->
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #0f172a;">
              {{ getCategoryName() }}
            </span>
            
            <!-- Separador sutil -->
            @if (getRanchName()) {
              <span style="color: #cbd5e1; font-size: 11px; flex-shrink: 0;">•</span>
              
              <!-- Nombre de Rancho (Texto Simple Rojo, sin caja) -->
              <span style="color: #b91c1c; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; flex-shrink: 0; display: inline-block;">
                {{ getRanchName() }}
              </span>
            }
          </div>

          <!-- Botón Cerrar Inline (Slate Oscuro) -->
          <button style="background: none; border: none; padding: 2px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; opacity: 0.8; transition: all 0.2s; outline: none; margin-left: 8px;"
                  onmouseover="this.style.opacity='1'; this.style.color='#0f172a'"
                  onmouseout="this.style.opacity='0.8'; this.style.color='#64748b'"
                  (click)="close.emit()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style="display: flex; flex-direction: column; height: 100%; border: 1px solid #e2e8f0; border-top: none; background-color: #ffffff; border-radius: 0 0 8px 8px; overflow: hidden; margin-top: 0;">
          
          <!-- Subcabecera con Buscador Moderno -->
          <div style="padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #334155; font-weight: 600; font-size: 11px;">
              Gasto Total: <span style="color: #b91c1c; font-weight: 700;">{{ fmt(totalGasto()) }}</span>
            </span>
            <input type="text" placeholder="Buscar..." (input)="onSearch($event)" 
                   style="padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 9999px; font-size: 11px; width: 140px; color: #1e293b; outline: none; background-color: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: border-color 0.15s, box-shadow 0.15s;" 
                   onfocus="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 0 0 2px rgba(0,0,0,0.05)'" 
                   onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)'" />
          </div>

          <!-- Contenedor Tabla -->
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed;">
              <colgroup>
                <col style="width: 20%;">
                <col style="width: 50%;">
                <col style="width: 12%;">
                <col style="width: 18%;">
              </colgroup>
              <thead style="background-color: #f8fafc; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid #e2e8f0;">
                <tr>
                  <th style="padding: 6px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">UBICACIÓN</th>
                  <th style="padding: 6px 8px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">PRODUCTO</th>
                  <th style="padding: 6px 8px; font-weight: 600; color: #475569; text-align: right; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">UNID.</th>
                  <th style="padding: 6px 8px; font-weight: 600; color: #475569; text-align: right; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">GASTO {{ state().currency.toUpperCase() }}</th>
                </tr>
              </thead>
              <tbody>
                @for (r of filteredRows(); track $index) {
                  <tr [style.cursor]="r.isExpandable ? 'pointer' : 'default'"
                      (click)="r.isExpandable ? toggleExpand(r.id) : null"
                      [class.table-row-hover]="!r.isSiembra"
                      [class.siembra-row]="r.isSiembra"
                      style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s;"
                      [style.backgroundColor]="r.isSiembra ? '#f0fdf4' : '#ffffff'">
                    
                    <!-- Ubicación con Badges Modernos -->
                    <td style="padding: 4px 8px; vertical-align: middle;">
                      @if (r.ubicacion === 'SIEMBRA') {
                        <span style="background-color: #d1fae5; color: #065f46; padding: 1px 4px; border-radius: 4px; font-weight: 600; font-size: 9px; letter-spacing: 0.05em; display: inline-block; border: 1px solid #a7f3d0;">SIEMBRA</span>
                      } @else {
                        <span style="background-color: #e0f2fe; color: #0369a1; padding: 1px 4px; border-radius: 4px; font-weight: 600; font-size: 9px; letter-spacing: 0.05em; display: inline-block; border: 1px solid #bae6fd;">{{ r.ubicacion }}</span>
                      }
                    </td>

                    <!-- Producto con arrow si es expandible -->
                    <td style="padding: 4px 8px; font-weight: 500; color: #1e293b; font-size: 11px; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ r.producto }}
                      @if (r.isExpandable) {
                        <span style="color: #94a3b8; font-size: 8px; margin-left: 4px; user-select: none;">
                          {{ isExpanded(r.id) ? '▲' : '▼' }}
                        </span>
                      }
                    </td>

                    <!-- Unidades -->
                    <td style="padding: 4px 8px; text-align: right; color: #64748b; font-size: 11px; font-weight: 500; vertical-align: middle;">
                      {{ r.unidades }}
                    </td>

                    <!-- Gasto -->
                    <td style="padding: 4px 8px; text-align: right; font-weight: 600; color: #0f172a; font-size: 11px; vertical-align: middle;">
                      {{ r.isSiembra ? (r.gasto | number:'1.0-2') : fmt(convertGasto(r.gasto)) }}
                    </td>
                  </tr>

                  <!-- Desglose de fila expandida -->
                  @if (r.isExpandable && isExpanded(r.id) && r.details) {
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <td colspan="4" style="padding: 0;">
                        <div style="margin: 4px 8px 6px 12px; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
                             [style.borderLeft]="'3px solid ' + getDetailStyles(r.siembraKey).border">
                          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left;">
                            <colgroup>
                              <col style="width: 50%;">
                              <col style="width: 25%;">
                              <col style="width: 25%;">
                            </colgroup>
                            <thead>
                              <tr>
                                <th style="color: #475569; padding: 4px 6px; border-bottom: 2px solid #e2e8f0; font-weight: 600; text-transform: uppercase; font-size: 10px;">Variedad (Flor)</th>
                                @if (r.siembraKey === 'metros' || r.siembraKey === 'charolas') {
                                  <th style="color: #475569; padding: 4px 6px; border-bottom: 2px solid #e2e8f0; font-weight: 600; text-transform: uppercase; font-size: 10px; text-align: right;">{{ r.siembraKey === 'metros' ? 'Metros' : 'Plantas' }}</th>
                                  <th style="color: #475569; padding: 4px 6px; border-bottom: 2px solid #e2e8f0; font-weight: 600; text-transform: uppercase; font-size: 10px; text-align: right;">{{ r.siembraKey === 'metros' ? 'Plantas Acum.' : 'Metros' }}</th>
                                } @else {
                                  <th style="color: #475569; padding: 4px 6px; border-bottom: 2px solid #e2e8f0; font-weight: 600; text-transform: uppercase; font-size: 10px; text-align: right;">Tallos</th>
                                  <th style="color: #475569; padding: 4px 6px; border-bottom: 2px solid #e2e8f0; font-weight: 600; text-transform: uppercase; font-size: 10px; text-align: right;">{{ r.siembraKey === 'tallos_comp' ? 'Proveedor' : '%' }}</th>
                                }
                              </tr>
                            </thead>
                            <tbody>
                              @for (det of r.details; track det.flor + (det.proveedor||'')) {
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                  <td style="color: #334155; padding: 4px 6px; font-weight: 600;">{{ det.flor }}</td>
                                  @if (r.siembraKey === 'metros' || r.siembraKey === 'charolas') {
                                    <td style="color: #1e293b; padding: 4px 6px; text-align: right;">{{ r.siembraKey === 'metros' ? (det.metros | number:'1.0-2') : (det.plantas | number:'1.0-2') }}</td>
                                    <td style="color: #1e293b; padding: 4px 6px; text-align: right;">{{ r.siembraKey === 'metros' ? (det.plantas | number:'1.0-2') : (det.metros | number:'1.0-2') }}</td>
                                  } @else {
                                    <td style="color: #1e293b; padding: 4px 6px; text-align: right;">{{ det.valor | number:'1.0-0' }}</td>
                                    @if (r.siembraKey === 'tallos_comp') {
                                      <td style="color: #475569; padding: 4px 6px; text-align: right; font-size: 9.5px;">{{ det.proveedor }}</td>
                                    } @else {
                                      <td style="color: #64748b; padding: 4px 6px; text-align: right; font-size: 9.5px;">{{ (r.totalDetail && r.totalDetail > 0 && det.valor) ? ((det.valor / r.totalDetail * 100) | number:'1.1-1') + '%' : '' }}</td>
                                    }
                                  }
                                </tr>
                              }
                              @if (r.siembraKey !== 'metros' && r.siembraKey !== 'charolas') {
                                <tr style="border-top: 2px solid #cbd5e1;">
                                  <td style="color: #475569; padding: 4px 6px; font-weight: 700; font-size: 10px; text-transform: uppercase;">Total</td>
                                  <td style="color: #1e293b; padding: 4px 6px; text-align: right; font-weight: 700; font-size: 11px;">{{ r.totalDetail | number:'1.0-0' }}</td>
                                  <td></td>
                                </tr>
                              }
                              @if (r.details.length === 0) {
                                <tr><td colspan="3" style="color: #64748b; padding: 8px 12px; font-size: 10.5px; font-style: italic;">Sin datos detallados.</td></tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  }
                }
                @if (filteredRows().length === 0) {
                  <tr>
                    <td colspan="4" style="text-align: center; padding: 12px; color: #64748b; font-style: italic;">No hay resultados.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .bg-wine { background-color: #5a1414; }
    .text-wine { color: #5a1414; }
    .table-row-hover:hover {
      background-color: #f8fafc !important;
    }
    .siembra-row:hover {
      background-color: #dcfce7 !important;
    }
  `]
})
export class ProductPanelComponent {
  readonly visible = input(false);
  readonly cellData = input<{yr: number; wk: number; ranch: string; cat?: string} | null>(null);
  readonly close = output<void>();

  constructor(protected stateService: StateService) {}

  protected data = this.stateService.data;
  protected state = this.stateService.state;

  protected getWeekString = computed(() => {
    const cd = this.cellData();
    if (!cd) return '';
    return String(cd.yr).slice(2) + String(cd.wk).padStart(2, '0');
  });

  protected getCategoryName = computed(() => {
    const cd = this.cellData();
    if (!cd) return '';
    return cd.cat || this.state().cat;
  });

  protected getRanchName = computed(() => {
    const cd = this.cellData();
    if (!cd) return '';
    return (cd.ranch && cd.ranch !== 'Todos') ? cd.ranch.toUpperCase() : null;
  });

  protected panelTitle = computed(() => {
    const cd = this.cellData();
    if (!cd) return '';
    const cat = cd.cat || this.state().cat;
    const yyss = String(cd.yr).slice(2) + String(cd.wk).padStart(2, '0');
    let title = `${yyss} - ${cat}`;
    if (cd.ranch && cd.ranch !== 'Todos') {
      title += ` - ${cd.ranch.toUpperCase()}`;
    }
    return title;
  });

  protected isMirfe = computed(() => (this.cellData()?.cat || this.state().cat) === CAT_MIRFE);
  protected isMipe = computed(() => (this.cellData()?.cat || this.state().cat) === CAT_MIPE);

  protected searchTerm = signal('');
  protected expandedState = signal<Record<string, boolean>>({});
  
  protected onSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleExpand(rowId: string) {
    this.expandedState.update(s => ({ ...s, [rowId]: !s[rowId] }));
  }

  protected isExpanded(rowId: string) {
    return !!this.expandedState()[rowId];
  }

  protected unifiedRows = computed(() => {
    const cd = this.cellData();
    const ds = this.data();
    if (!cd || !ds) return [];
    
    const cat = cd.cat || this.state().cat;
    const isMant = cat === 'MANTENIMIENTO';
    const isMatEmp = cat === 'MATERIAL DE EMPAQUE';
    const isMatVeg = cat === 'MATERIAL VEGETAL';
    const isMirfe = cat === CAT_MIRFE;
    const isMipe = cat === CAT_MIPE;

    const rows: UnifiedRow[] = [];

    const isRanchAllowed = (r: string) => {
      const rawRn = r.replace('Prop-RM','Propagacion').replace('PosCo-RM','Poscosecha').replace('Campo-RM','Ramona');
      if (cd.ranch && cd.ranch !== 'Todos') return r === cd.ranch || rawRn === cd.ranch;
      return true;
    };

    // --- Siembra Metrics ---
    if (ds.siembra_data) {
      const rn = cd.ranch === 'Todos' ? 'TOTAL' : cd.ranch;
      const wkKey = (cd.yr % 100) * 100 + cd.wk;
      const row = ds.siembra_data[wkKey]?.[rn] || ds.siembra_data[wkKey]?.['TOTAL'] || null;
      if (row) {
        const _allMetas = [
          {k:'inv_inicial',  lbl:'INV. INICIAL'},
          {k:'tallos_cos',   lbl:'TALLOS COSECHADOS'},
          {k:'tallos_des',   lbl:'TALLOS DESECHADOS'},
          {k:'tallos_des_sf',lbl:'TALLOS DESECHADOS SF'},
          {k:'tallos_comp',  lbl:'TALLOS COMPRADOS'},
          {k:'tallos_bouq',  lbl:'TALLOS BOUQUETS/PROC.'},
          {k:'tallos_desp',  lbl:'TALLOS DESPACHADOS'},
          {k:'libras_alb',   lbl:'LIBRAS ALBAHACA'},
          {k:'tallos_mues',  lbl:'TALLOS MUESTRA'},
          {k:'inv_final',    lbl:'INV. FINAL'},
          {k:'tallos_proc',  lbl:'TALLOS PROC. TOTALES'},
          {k:'charolas_288', lbl:'CHAROLAS *288'},
          {k:'charolas',     lbl:'NUMERO DE CHAROLAS SEMBRADAS'},
          {k:'esquejes',     lbl:'Nº ESQUEJES'},
          {k:'metros',       lbl:'METROS SIEMBRA'},
          {k:'hectareas',    lbl:'HECTÁREAS'},
        ];
        
        for (const m of _allMetas) {
          if (row[m.k] !== undefined && row[m.k] !== null && row[m.k] !== 0) {
            const isMetros = m.k === 'metros';
            const isCharolas = m.k === 'charolas';
            const _WEEKLY_KEYS = ['inv_inicial','tallos_cos','tallos_des','tallos_comp','tallos_desp','inv_final','tallos_proc'];
            const isWeeklyDetail = _WEEKLY_KEYS.includes(m.k);
            const isExpandable = isMetros || isCharolas || isWeeklyDetail;
            
            let details: DetailRow[] = [];
            let totalDetail = 0;
            
            if (isMetros && ds.metros_acumulados) {
              const mRows = ds.metros_acumulados.filter(r => parseInt(r.semana_fin as any) === wkKey && isRanchAllowed(r.rancho));
              const mAgr: Record<string, DetailRow> = {};
              mRows.forEach(mr => {
                const mk = (mr.rancho||'') + '||' + (mr.flor||'');
                if (!mAgr[mk]) mAgr[mk] = { flor: mr.flor, metros: 0, plantas: 0 };
                mAgr[mk].metros! += Number(mr.metros) || 0;
                mAgr[mk].plantas! += Number(mr.pla_acum) || 0;
              });
              details = Object.values(mAgr).sort((a,b) => a.flor.localeCompare(b.flor));
            }
            else if (isCharolas && ds.plantas_metros) {
              const cRows = ds.plantas_metros.filter(r => parseInt(r.semana_fin as any) === wkKey && isRanchAllowed(r.rancho));
              const cAgr: Record<string, DetailRow> = {};
              cRows.forEach(cr => {
                const ck = (cr.rancho||'') + '||' + (cr.flor||'');
                if (!cAgr[ck]) cAgr[ck] = { flor: cr.flor, plantas: 0, metros: 0 };
                cAgr[ck].plantas! += Number(cr.plantas) || 0;
                cAgr[ck].metros! += Number(cr.metros) || 0;
              });
              details = Object.values(cAgr).sort((a,b) => a.flor.localeCompare(b.flor));
            }
            else if (isWeeklyDetail && ds.detalle_weekly) {
              const wkSrcW = ds.detalle_weekly[wkKey] || ds.detalle_weekly[String(wkKey)];
              let rawRows: any[] = [];
              if (wkSrcW && wkSrcW[m.k]) {
                wkSrcW[m.k].forEach((r: any) => { if (r.valor && r.valor !== 0) rawRows.push(r); });
              }
              if (m.k === 'tallos_cos') {
                if (cd.ranch && cd.ranch !== 'Todos') {
                  const rawRn = cd.ranch.replace('Prop-RM','Propagacion').replace('PosCo-RM','Poscosecha').replace('Campo-RM','Ramona');
                  rawRows = rawRows.filter(r => r.rancho === cd.ranch || r.rancho === rawRn);
                }
                const cosMap: Record<string, number> = {};
                rawRows.forEach(r => { cosMap[r.flor] = (cosMap[r.flor]||0) + Number(r.valor); });
                details = Object.keys(cosMap).map(f => ({ flor: f, valor: cosMap[f] }));
              } else {
                const agrMap: Record<string, DetailRow> = {};
                rawRows.forEach(r => {
                  const k = r.flor + (r.proveedor ? '||' + r.proveedor : '');
                  if (!agrMap[k]) agrMap[k] = { flor: r.flor, valor: 0, proveedor: r.proveedor || '' };
                  agrMap[k].valor! += Number(r.valor);
                });
                details = Object.values(agrMap);
              }
              details.sort((a,b) => a.flor.localeCompare(b.flor) || (a.proveedor||'').localeCompare(b.proveedor||''));
              totalDetail = details.reduce((s, r) => s + (r.valor||0), 0);
            }

            rows.push({
              id: 'siembra_' + m.k,
              ubicacion: 'SIEMBRA',
              producto: m.lbl,
              unidades: '',
              gasto: Number(row[m.k]),
              isSiembra: true,
              isExpandable,
              siembraKey: m.k,
              details,
              totalDetail
            });
          }
        }
      }
    }

    // --- Products ---
    let src = 'pr';
    if (isMant) src = 'mp';
    else if (isMatEmp) src = 'me';
    else if (isMatVeg) src = 'mv';

    let tipoFilter: string | null = null;
    if (src === 'pr') {
      if (isMirfe) tipoFilter = 'MIRFE';
      else if (isMipe) tipoFilter = 'MIPE';
    }

    const dsMap: Record<string, any> = {
      pr: ds.productos, mp: ds.productos_mp, me: ds.productos_me, mv: ds.productos_mv
    };
    const prodData = dsMap[src] || {};
    const wkCodeShort = (cd.yr % 100) * 100 + cd.wk;
    const weekD = prodData[wkCodeShort] || prodData[String(wkCodeShort)];
    
    if (weekD) {
      for (const ranch of Object.keys(weekD)) {
        if (!isRanchAllowed(ranch)) continue;
        const byTipo = weekD[ranch];
        for (const tipo of Object.keys(byTipo)) {
          if (tipoFilter && tipo !== tipoFilter) continue;
          const items = byTipo[tipo] || [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const rawGasto = parseFloat(item[2]) || 0;
            const ubic = item[3] ? String(item[3]).toUpperCase() : (tipo ? String(tipo).toUpperCase() : ranch.toUpperCase());
            rows.push({
              id: 'prod_' + ranch + '_' + tipo + '_' + i,
              ubicacion: ubic,
              producto: item[0] || '',
              unidades: item[1] || '',
              gasto: rawGasto,
              isSiembra: false
            });
          }
        }
      }
    }
    
    // Sort logic: keep siembra first, then sort by absolute gasto descending
    return rows.sort((a, b) => {
      if (a.isSiembra && !b.isSiembra) return -1;
      if (!a.isSiembra && b.isSiembra) return 1;
      if (!a.isSiembra && !b.isSiembra) return Math.abs(b.gasto) - Math.abs(a.gasto);
      return 0;
    });
  });

  protected filteredRows = computed(() => {
    const q = this.searchTerm().toLowerCase();
    if (!q) return this.unifiedRows();
    return this.unifiedRows().filter(r => 
      r.producto.toLowerCase().includes(q) || 
      r.ubicacion.toLowerCase().includes(q)
    );
  });

  protected getExchangeRate = computed(() => {
    const cd = this.cellData();
    const ds = this.data();
    if (!cd || !ds) return 1;

    // Find all records for the same year and week
    const recs = ds.weekly_detail.filter(r => r.year === cd.yr && r.week === cd.wk);

    // Find the first record with a valid usd_total and mxn_total to calculate the rate
    for (const r of recs) {
      if (r.usd_total && r.mxn_total && r.usd_total > 0 && r.mxn_total > 0) {
        return r.mxn_total / r.usd_total;
      }
    }

    // If not found in weekly_detail, check all weekly_detail to find any rate for that year
    const yearRecs = ds.weekly_detail.filter(r => r.year === cd.yr);
    for (const r of yearRecs) {
      if (r.usd_total && r.mxn_total && r.usd_total > 0 && r.mxn_total > 0) {
        return r.mxn_total / r.usd_total;
      }
    }

    // Fallback to any valid rate in the entire dataset
    for (const r of ds.weekly_detail) {
      if (r.usd_total && r.mxn_total && r.usd_total > 0 && r.mxn_total > 0) {
        return r.mxn_total / r.usd_total;
      }
    }

    return 18.0; // Hard fallback if everything fails
  });

  protected getDetailStyles(siembraKey: string | undefined): { border: string; bg: string } {
    if (!siembraKey) return { border: '#4b5563', bg: '#f9fafb' };

    switch (siembraKey) {
      case 'charolas':
        return { border: '#10b981', bg: '#f0fdf4' }; // Green (Plantas/Charolas)
      case 'metros':
        return { border: '#0284c7', bg: '#f0f9ff' }; // Blue (Metros)
      case 'tallos_cos':
        return { border: '#8a1c32', bg: '#fdf2f2' }; // Wine red (Cosechados)
      case 'tallos_comp':
        return { border: '#7c3aed', bg: '#f5f3ff' }; // Purple (Comprados)
      case 'tallos_des':
      case 'tallos_des_sf':
        return { border: '#ea580c', bg: '#fff7ed' }; // Orange (Desechados)
      case 'inv_inicial':
      case 'inv_final':
        return { border: '#0d9488', bg: '#f0fdfa' }; // Teal (Inventarios)
      default:
        return { border: '#8a1c32', bg: '#fdf2f2' }; // Fallback to wine/pink
    }
  }

  protected convertGasto(gasto: number): number {
    const cur = this.state().currency;
    if (cur === 'usd') {
      return gasto / this.getExchangeRate();
    }
    return gasto;
  }

  protected totalGasto = computed(() => {
    const sumMxn = this.unifiedRows().filter(r => !r.isSiembra).reduce((sum, row) => sum + row.gasto, 0);
    const cur = this.state().currency;
    if (cur === 'usd') {
      return sumMxn / this.getExchangeRate();
    }
    return sumMxn;
  });

  protected fmt(n: number): string {
    if (!n || isNaN(n)) return '$0';
    const neg = n < 0;
    const s = Math.abs(n);
    return (neg ? '-$' : '$') + s.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
