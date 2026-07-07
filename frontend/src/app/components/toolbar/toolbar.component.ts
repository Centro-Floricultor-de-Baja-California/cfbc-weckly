import { Component, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { YEAR_COLORS, CurrencyType } from '../../models/types';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toolbar">
      <span class="tb-label">Cat</span>
      <select class="tb-sel" style="max-width:200px" 
              [style.color]="hasData(state().cat) ? '#262626' : '#dc2626'"
              [style.fontWeight]="hasData(state().cat) ? '600' : '700'"
              [value]="state().cat" (change)="onCatChange($event)">
        <option *ngFor="let c of categories()" [value]="c"
                [style.color]="hasData(c) ? '#222' : '#dc2626'"
                [style.fontWeight]="hasData(c) ? '400' : '700'">
          {{ c }}{{ hasData(c) ? '' : ' 🚫' }}
        </option>
      </select>
      <div class="tb-sep"></div>

      <span class="tb-label">Rancho</span>
      <button class="tb-btn" id="ranchDropdownBtn"
        style="min-width:90px;max-width:180px;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        (click)="toggleRanchDropdown($event)">{{ ranchLabel() }}</button>
      @if (ranchOpen()) {
        <div id="ranchDropdownPanel" [style.top.px]="ranchPos().top" [style.left.px]="ranchPos().left"
          style="display:block;position:fixed;z-index:9999;background:#fff;border:1px solid #bbb;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:150px;max-height:220px;overflow-y:auto;padding:4px 0;">
          <label *ngFor="let r of allRanches(); track r"
            style="display:flex;align-items:center;gap:6px;padding:4px 10px;cursor:pointer;font-size:11px;white-space:nowrap;"
            [style.borderTop]="r === ranchOrder()[0] ? '1px solid #eee;margin-top:2px;padding-top:4px;' : ''">
            <input type="checkbox" [value]="r" [checked]="isRanchSelected(r)" (change)="toggleRanch(r, $event)" style="margin:0;cursor:pointer;">{{ r }}
          </label>
        </div>
      }

      <div class="tb-sep"></div>

      <div class="tb-grp">
        <button class="tb-btn" id="btnUSD" [class.active]="state().currency==='usd'" (click)="setCurrency('usd')">USD</button>
        <button class="tb-btn" id="btnMXN" [class.active]="state().currency==='mxn'" (click)="setCurrency('mxn')">MXN</button>
      </div>

      <div class="tb-sep"></div>

      <span class="tb-label">Desde</span>
      <span class="range-val">{{ state().fromWeek | number:'2.0-0' }}</span>
      <input type="range" class="tb-slider" [min]="minWeek()" [max]="maxWeek()" [value]="state().fromWeek" (input)="onFromChange($event)">
      <span class="tb-label">Hasta</span>
      <span class="range-val">{{ state().toWeek | number:'2.0-0' }}</span>
      <input type="range" class="tb-slider" [min]="minWeek()" [max]="maxWeek()" [value]="state().toWeek" (input)="onToChange($event)">
      <span class="range-badge">{{ state().fromWeek | number:'2.0-0' }}  {{ state().toWeek | number:'2.0-0' }} ({{ weekCount() }} sem)</span>

      <div class="tb-sep"></div>

      <span class="tb-label">Años</span>
      @for (y of dataYears(); track y) {
        <button class="yr-chip" [class.on]="isYearActive(y)"
          [style.color]="YEAR_COLORS[y]||'#888'"
          [style.borderColor]="isYearActive(y)?(YEAR_COLORS[y]||'#888'):'transparent'"
          [style.background]="isYearActive(y)?(YEAR_COLORS[y]+'20'):'transparent'"
          (click)="toggleYear(y)">{{ y }}</button>
      }

      @if (!isServiciosCat()) {
        <div class="tb-sep"></div>
        <button class="tb-btn" style="color:#16a34a;border-color:#16a34a;" (click)="verProductos.emit()">VER PRODUCTOS</button>
      }
    </div>
  `,
})
export class ToolbarComponent {
  readonly YEAR_COLORS = YEAR_COLORS;
  readonly verProductos = output<void>();

  protected ranchOpen = signal(false);
  protected ranchPos = signal({ top: 0, left: 0 });

  constructor(protected stateService: StateService) {}

  protected state = this.stateService.state;
  protected data = this.stateService.data;
  protected isServiciosCat = this.stateService.isServiciosCat;

  protected categories = computed(() => this.data()?.categories ?? []);
  protected dataYears = computed(() => this.data()?.years ?? []);
  protected ranchOrder = computed(() => this.data()?.config.ranch_order ?? []);
  protected allRanches = computed(() => ['Todos', ...(this.ranchOrder())]);

  protected minWeek = computed(() => { const w = this.stateService.allWeeks(); return w.length > 0.01 ? w[0] : 1; });
  protected maxWeek = computed(() => { const w = this.stateService.allWeeks(); return w.length > 0.01 ? w[w.length - 1] : 52; });
  protected weekCount = computed(() => {
    const all = this.stateService.allWeeks();
    return all.filter(w => w >= this.state().fromWeek && w <= this.state().toWeek).length;
  });

  protected ranchLabel = computed(() => {
    const s = this.state();
    if (s.activeRanches.includes('Todos')) return 'Todos \u25BE';
    return s.activeRanches.length === 1 ? s.activeRanches[0] + ' \u25BE' : s.activeRanches.length + ' ranchos \u25BE';
  });

  protected isRanchSelected(r: string): boolean { return this.state().activeRanches.includes(r); }
  protected isYearActive(y: number): boolean { return !!this.state().activeYears[y]; }

  protected hasData(cat: string): boolean {
    const data = this.data();
    if (!data || !cat) return false;
    const s = this.state();
    const fromW = s.fromWeek;
    const toW = s.toWeek;
    const activeYrs = Object.keys(s.activeYears).filter(y => s.activeYears[Number(y)]).map(Number);
    if (!activeYrs.length) return false;

    const inScope = (r: any) => activeYrs.includes(r.year) && r.week >= fromW && r.week <= toW;
    const hasAmt = (r: any) => Math.abs(r.mxn_total || 0) > 0.01 || Math.abs(r.usd_total || 0) > 0.01 || Math.abs(r.hc_total || 0) > 0.01;

    let recs: any[] = [];
    if (cat === 'COSTO MANO DE OBRA') {
      recs = data.mano_obra_data || [];
    } else if (cat === 'COSTO SERVICIOS') {
      recs = data.servicios_data || [];
    } else {
      recs = (data.weekly_detail || []).filter(r => r.categoria === cat);
    }
    
    return recs.some(r => inScope(r) && hasAmt(r));
  }

  protected onCatChange(event: Event) { this.stateService.setCategory((event.target as HTMLSelectElement).value); }
  protected setCurrency(cur: CurrencyType) { this.stateService.setCurrency(cur); }
  protected toggleYear(y: number) { this.stateService.toggleYear(y); }

  protected toggleRanchDropdown(event: MouseEvent) {
    this.ranchOpen.update(v => !v);
    if (!this.ranchOpen()) return;
    const btn = event.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.ranchPos.set({ top: rect.bottom + 2, left: rect.left });
  }

  protected toggleRanch(val: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current = [...this.state().activeRanches];
    if (val === 'Todos') {
      this.stateService.setActiveRanches(checked ? ['Todos'] : [...this.ranchOrder()]);
    } else {
      const todosIdx = current.indexOf('Todos');
      if (todosIdx > -1) current.splice(todosIdx, 1);
      if (checked) { if (!current.includes(val)) current.push(val); }
      else {
        const idx = current.indexOf(val);
        if (idx > -1) current.splice(idx, 1);
        if (current.length === 0) current.push('Todos');
      }
      this.stateService.setActiveRanches(current);
    }
  }

  protected onFromChange(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value);
    const to = this.state().toWeek;
    this.stateService.setFromToWeek(Math.min(val, to), Math.max(val, to));
  }

  protected onToChange(event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value);
    const from = this.state().fromWeek;
    this.stateService.setFromToWeek(Math.min(from, val), Math.max(from, val));
  }
}
