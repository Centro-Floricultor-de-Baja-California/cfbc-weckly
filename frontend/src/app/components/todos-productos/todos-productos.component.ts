import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { CfbcData } from '../../models/types';

const CAT_MIRFE = 'MATERIALES, INDIRECTOS, REPUESTOS, FERRETERIA, EQUIPOS';
const CAT_MIPE = 'MIPE';

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

function sumUnits(val1: any, val2: any): string {
  const str1 = String(val1 || '').trim();
  const str2 = String(val2 || '').trim();
  if (!str1) return str2;
  if (!str2) return str1;
  
  const match1 = str1.match(/^([\d.,]+)\s*(.*)$/);
  const match2 = str2.match(/^([\d.,]+)\s*(.*)$/);
  
  if (match1 && match2) {
    const num1 = parseFloat(match1[1].replace(/,/g, ''));
    const num2 = parseFloat(match2[1].replace(/,/g, ''));
    const suffix1 = match1[2].trim();
    const suffix2 = match2[2].trim();
    
    if (!isNaN(num1) && !isNaN(num2)) {
      const sum = num1 + num2;
      const suffix = suffix1 || suffix2;
      return sum.toLocaleString('en-US', { maximumFractionDigits: 2 }) + (suffix ? ' ' + suffix : '');
    }
  }
  return str1;
}

@Component({
  selector: 'app-todos-productos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-h-screen bg-gray-50; font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif; padding: 24px; background-color: #f8fafc;">
      
      <!-- Loading Screen -->
      @if (loading()) {
        <div style="position: fixed; inset: 0; background-color: rgba(255,255,255,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999;">
          <div style="font-size: 16px; font-weight: 600; color: #5a1414; margin-bottom: 8px;">Cargando datos...</div>
          <div style="width: 150px; height: 3px; background-color: #e2e8f0; border-radius: 999px; overflow: hidden; position: relative;">
            <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 40%; background-color: #8a1c32; animation: slide 1.2s infinite ease-in-out;"></div>
          </div>
        </div>
      }

      <div style="max-width: 1200px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03); overflow: hidden;">
        
        <!-- Header Principal de la Pestaña -->
        <div style="background-color: #ffffff; color: #1e293b; border-bottom: 2px solid #000000; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <!-- Badge de Semanas / Rango -->
            <span style="color: #64748b; font-size: 13px; font-weight: 800; letter-spacing: 0.05em; background-color: #f1f5f9; padding: 3px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
              S-{{ getWeekString() }}
            </span>
            
            <!-- Separador -->
            <span style="color: #cbd5e1; font-size: 14px;">•</span>

            <!-- Nombre de Categoría -->
            <span style="font-size: 13px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; color: #0f172a;">
              {{ getCategoryName() }}
            </span>

            <!-- Separador -->
            <span style="color: #cbd5e1; font-size: 14px;">•</span>

            <!-- Badge de Todos los Ranchos -->
            <span style="color: #b91c1c; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
              TODOS LOS PRODUCTOS
            </span>
          </div>

          <!-- Botón de Cerrar Pestaña -->
          <button (click)="closeTab()" 
                  style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; color: #475569; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; flex-shrink: 0;"
                  onmouseover="this.style.backgroundColor='#e2e8f0'; this.style.color='#0f172a'"
                  onmouseout="this.style.backgroundColor='#f1f5f9'; this.style.color='#475569'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cerrar Pestaña
          </button>
        </div>

        <!-- Barra de Búsqueda y Resumen -->
        <div style="padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <span style="color: #334155; font-weight: 600; font-size: 12px;">
            Gasto Acumulado: <span style="color: #b91c1c; font-weight: 700; font-size: 13px;">{{ fmt(totalGasto()) }}</span>
          </span>
          <input type="text" placeholder="Buscar producto o ubicación..." (input)="onSearch($event)" 
                 style="padding: 6px 16px; border: 1px solid #cbd5e1; border-radius: 9999px; font-size: 12px; width: 220px; color: #1e293b; outline: none; background-color: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: all 0.15s;" 
                 onfocus="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 0 0 2px rgba(0,0,0,0.05)'" 
                 onblur="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)'" />
        </div>

        <!-- Tabla de Productos -->
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; font-size: 11px;">
            <colgroup>
              <col style="width: 20%;">
              <col style="width: 50%;">
              <col style="width: 12%;">
              <col style="width: 18%;">
            </colgroup>
            <thead style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <tr>
                <th style="padding: 10px 14px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">UBICACIÓN</th>
                <th style="padding: 10px 14px; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">PRODUCTO</th>
                <th style="padding: 10px 14px; font-weight: 600; color: #475569; text-align: right; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">UNID.</th>
                <th style="padding: 10px 14px; font-weight: 600; color: #475569; text-align: right; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">GASTO {{ activeCurrency().toUpperCase() }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of filteredRows(); track r.id) {
                <tr [style.cursor]="r.isExpandable ? 'pointer' : 'default'"
                    (click)="r.isExpandable ? toggleExpand(r.id) : null"
                    [class.table-row-hover]="!r.isSiembra"
                    [class.siembra-row]="r.isSiembra"
                    style="border-bottom: 1px solid #f1f5f9; transition: background-color 0.15s;"
                    [style.backgroundColor]="r.isSiembra ? '#f0fdf4' : '#ffffff'">
                  
                  <!-- Ubicación -->
                  <td style="padding: 8px 14px; vertical-align: middle; font-weight: 500; color: #475569; font-size: 11px;">
                    {{ r.ubicacion }}
                  </td>

                  <!-- Producto -->
                  <td style="padding: 8px 14px; font-weight: 500; color: #1e293b; font-size: 11px; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    {{ r.producto }}
                    @if (r.isExpandable) {
                      <span style="color: #94a3b8; font-size: 8px; margin-left: 6px; user-select: none;">
                        {{ isExpanded(r.id) ? '▲' : '▼' }}
                      </span>
                    }
                  </td>

                  <!-- Unidades -->
                  <td style="padding: 8px 14px; text-align: right; color: #64748b; font-size: 11px; font-weight: 500; vertical-align: middle;">
                    {{ r.unidades }}
                  </td>

                  <!-- Gasto -->
                  <td style="padding: 8px 14px; text-align: right; font-weight: 600; color: #0f172a; font-size: 11px; vertical-align: middle;">
                    {{ r.isSiembra ? (r.gasto | number:'1.0-2') : fmt(convertGasto(r.gasto)) }}
                  </td>
                </tr>

                <!-- Desglose de fila expandida -->
                @if (r.isExpandable && isExpanded(r.id) && r.details) {
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <td colspan="4" style="padding: 0;">
                      <div style="margin: 6px 16px 8px 24px; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
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
                  <td colspan="4" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">No hay resultados.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .table-row-hover:hover {
      background-color: #f8fafc !important;
    }
    .siembra-row:hover {
      background-color: #dcfce7 !important;
    }
    @keyframes slide {
      0% { left: -40%; }
      100% { left: 100%; }
    }
  `]
})
export class TodosProductosComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  protected stateService = inject(StateService);

  protected queryParams = signal<{ yr: number; fromWk: number; toWk: number; ranch: string; cat: string; currency: string } | null>(null);
  protected loading = signal(true);
  protected searchTerm = signal('');
  protected expandedState = signal<Record<string, boolean>>({});

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const yr = Number(params['yr']) || new Date().getFullYear();
      const fromWk = Number(params['fromWk']) || Number(params['wk']) || 1;
      const toWk = Number(params['toWk']) || Number(params['wk']) || 1;
      const ranch = params['ranch'] || 'Todos';
      const cat = params['cat'] || '';
      const currency = (params['currency'] || 'mxn').toLowerCase();

      this.queryParams.set({ yr, fromWk, toWk, ranch, cat, currency });
      
      if (!this.stateService.data()) {
        this.apiService.getData().subscribe({
          next: (data) => {
            this.stateService.setData(data);
            this.stateService.setCurrency(currency as any);
            this.loading.set(false);
          },
          error: (err) => {
            console.error('Error fetching data for child component:', err);
            this.loading.set(false);
          }
        });
      } else {
        this.stateService.setCurrency(currency as any);
        this.loading.set(false);
      }
    });
  }

  protected getWeekString = computed(() => {
    const q = this.queryParams();
    if (!q) return '';
    const yrShort = String(q.yr).slice(2);
    if (q.fromWk === q.toWk) {
      return yrShort + String(q.fromWk).padStart(2, '0');
    }
    return yrShort + String(q.fromWk).padStart(2, '0') + ' - ' + yrShort + String(q.toWk).padStart(2, '0');
  });

  protected getCategoryName = computed(() => {
    const q = this.queryParams();
    return q ? q.cat : '';
  });

  protected activeCurrency = computed(() => {
    const q = this.queryParams();
    return q ? q.currency : 'mxn';
  });

  protected onSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleExpand(rowId: string) {
    this.expandedState.update(s => ({ ...s, [rowId]: !s[rowId] }));
  }

  protected isExpanded(rowId: string) {
    return !!this.expandedState()[rowId];
  }

  protected closeTab() {
    window.close();
  }

  protected getExchangeRate = computed(() => {
    const q = this.queryParams();
    const ds = this.stateService.data();
    if (!q || !ds) return 1;

    const recs = ds.weekly_detail.filter(r => r.year === q.yr && r.week === q.toWk);
    for (const r of recs) {
      if (r.usd_total && r.mxn_total && r.usd_total > 0 && r.mxn_total > 0) {
        return r.mxn_total / r.usd_total;
      }
    }

    const yearRecs = ds.weekly_detail.filter(r => r.year === q.yr);
    for (const r of yearRecs) {
      if (r.usd_total && r.mxn_total && r.usd_total > 0 && r.mxn_total > 0) {
        return r.mxn_total / r.usd_total;
      }
    }

    for (const r of ds.weekly_detail) {
      if (r.usd_total && r.mxn_total && r.usd_total > 0 && r.mxn_total > 0) {
        return r.mxn_total / r.usd_total;
      }
    }

    return 18.0;
  });

  protected getDetailStyles(siembraKey: string | undefined): { border: string; bg: string } {
    if (!siembraKey) return { border: '#4b5563', bg: '#f9fafb' };

    switch (siembraKey) {
      case 'charolas':
        return { border: '#10b981', bg: '#f0fdf4' };
      case 'metros':
        return { border: '#0284c7', bg: '#f0f9ff' };
      case 'tallos_cos':
        return { border: '#8a1c32', bg: '#fdf2f2' };
      case 'tallos_comp':
        return { border: '#7c3aed', bg: '#f5f3ff' };
      case 'tallos_des':
      case 'tallos_des_sf':
        return { border: '#ea580c', bg: '#fff7ed' };
      case 'inv_inicial':
      case 'inv_final':
        return { border: '#0d9488', bg: '#f0fdfa' };
      default:
        return { border: '#8a1c32', bg: '#fdf2f2' };
    }
  }

  protected convertGasto(gasto: number): number {
    const cur = this.activeCurrency();
    if (cur === 'usd') {
      return gasto / this.getExchangeRate();
    }
    return gasto;
  }

  protected totalGasto = computed(() => {
    const sumMxn = this.unifiedRows().filter(r => !r.isSiembra).reduce((sum, row) => sum + row.gasto, 0);
    const cur = this.activeCurrency();
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

  protected unifiedRows = computed(() => {
    const q = this.queryParams();
    const ds = this.stateService.data();
    if (!q || !ds) return [];

    const cat = q.cat;
    const isMant = cat === 'MANTENIMIENTO';
    const isMatEmp = cat === 'MATERIAL DE EMPAQUE';
    const isMatVeg = cat === 'MATERIAL VEGETAL';
    const isMirfe = cat === CAT_MIRFE;
    const isMipe = cat === CAT_MIPE;

    const rows: UnifiedRow[] = [];

    const isRanchAllowed = (r: string) => {
      const rawRn = r.replace('Prop-RM','Propagacion').replace('PosCo-RM','Poscosecha').replace('Campo-RM','Ramona');
      if (q.ranch && q.ranch !== 'Todos') return r === q.ranch || rawRn === q.ranch;
      return true;
    };

    const weekSet = new Set<number>();
    for (let w = q.fromWk; w <= q.toWk; w++) {
      weekSet.add(w);
    }
    const wkKeys = Array.from(weekSet).map(w => (q.yr % 100) * 100 + w);

    // --- Siembra Metrics ---
    if (ds.siembra_data) {
      const rn = q.ranch === 'Todos' ? 'TOTAL' : q.ranch;
      const metricsSum: Record<string, number> = {};
      const firstWkKey = wkKeys[0];
      const lastWkKey = wkKeys[wkKeys.length - 1];

      wkKeys.forEach(wkKey => {
        const row = ds.siembra_data[wkKey]?.[rn] || ds.siembra_data[wkKey]?.['TOTAL'] || null;
        if (row) {
          const _keys = [
            'inv_inicial', 'tallos_cos', 'tallos_des', 'tallos_des_sf', 'tallos_comp',
            'tallos_bouq', 'tallos_desp', 'libras_alb', 'tallos_mues', 'inv_final',
            'tallos_proc', 'charolas_288', 'charolas', 'esquejes', 'metros', 'hectareas'
          ];
          _keys.forEach(k => {
            const val = Number(row[k]) || 0;
            if (k === 'inv_inicial') {
              if (wkKey === firstWkKey) metricsSum[k] = val;
            } else if (k === 'inv_final') {
              if (wkKey === lastWkKey) metricsSum[k] = val;
            } else {
              metricsSum[k] = (metricsSum[k] || 0) + val;
            }
          });
        }
      });

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
        if (metricsSum[m.k] !== undefined && metricsSum[m.k] !== 0) {
          const isMetros = m.k === 'metros';
          const isCharolas = m.k === 'charolas';
          const _WEEKLY_KEYS = ['inv_inicial','tallos_cos','tallos_des','tallos_comp','tallos_desp','inv_final','tallos_proc'];
          const isWeeklyDetail = _WEEKLY_KEYS.includes(m.k);
          const isExpandable = isMetros || isCharolas || isWeeklyDetail;
          
          let details: DetailRow[] = [];
          let totalDetail = 0;

          if (isMetros && ds.metros_acumulados) {
            const mRows = ds.metros_acumulados.filter(r => wkKeys.includes(parseInt(r.semana_fin as any)) && isRanchAllowed(r.rancho));
            const mAgr: Record<string, DetailRow> = {};
            mRows.forEach(mr => {
              const mk = mr.flor;
              if (!mAgr[mk]) mAgr[mk] = { flor: mr.flor, metros: 0, plantas: 0 };
              mAgr[mk].metros! += Number(mr.metros) || 0;
              mAgr[mk].plantas! += Number(mr.pla_acum) || 0;
            });
            details = Object.values(mAgr).sort((a,b) => a.flor.localeCompare(b.flor));
          }
          else if (isCharolas && ds.plantas_metros) {
            const cRows = ds.plantas_metros.filter(r => wkKeys.includes(parseInt(r.semana_fin as any)) && isRanchAllowed(r.rancho));
            const cAgr: Record<string, DetailRow> = {};
            cRows.forEach(cr => {
              const ck = cr.flor;
              if (!cAgr[ck]) cAgr[ck] = { flor: cr.flor, plantas: 0, metros: 0 };
              cAgr[ck].plantas! += Number(cr.plantas) || 0;
              cAgr[ck].metros! += Number(cr.metros) || 0;
            });
            details = Object.values(cAgr).sort((a,b) => a.flor.localeCompare(b.flor));
          }
          else if (isWeeklyDetail && ds.detalle_weekly) {
            let rawRows: any[] = [];
            wkKeys.forEach(wkKey => {
              const wkSrcW = ds.detalle_weekly[wkKey] || ds.detalle_weekly[String(wkKey)];
              if (wkSrcW && wkSrcW[m.k]) {
                wkSrcW[m.k].forEach((r: any) => { if (r.valor && r.valor !== 0) rawRows.push(r); });
              }
            });

            if (m.k === 'tallos_cos') {
              if (q.ranch && q.ranch !== 'Todos') {
                const rawRn = q.ranch.replace('Prop-RM','Propagacion').replace('PosCo-RM','Poscosecha').replace('Campo-RM','Ramona');
                rawRows = rawRows.filter(r => r.rancho === q.ranch || r.rancho === rawRn);
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
            totalDetail = details.reduce((sum, row) => sum + (row.valor||0), 0);
          }

          rows.push({
            id: 'siembra_' + m.k,
            ubicacion: 'SIEMBRA',
            producto: m.lbl,
            unidades: '',
            gasto: metricsSum[m.k],
            isSiembra: true,
            isExpandable,
            siembraKey: m.k,
            details,
            totalDetail
          });
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

    const productMap: Record<string, { ubicacion: string, producto: string, unidades: string, gasto: number }> = {};

    wkKeys.forEach(wkCodeShort => {
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
              
              const key = ubic + '||' + (item[0] || '');
              if (!productMap[key]) {
                productMap[key] = {
                  ubicacion: ubic,
                  producto: item[0] || '',
                  unidades: item[1] || '',
                  gasto: 0
                };
              } else {
                productMap[key].unidades = sumUnits(productMap[key].unidades, item[1]);
              }
              productMap[key].gasto += rawGasto;
            }
          }
        }
      }
    });

    Object.values(productMap).forEach((p, idx) => {
      rows.push({
        id: 'prod_agg_' + idx,
        ubicacion: p.ubicacion,
        producto: p.producto,
        unidades: p.unidades,
        gasto: p.gasto,
        isSiembra: false
      });
    });

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
}
