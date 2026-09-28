import { Component, computed, signal, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { ApiService } from '../../services/api.service';
import { YEAR_COLORS, CurrencyType } from '../../models/types';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white px-3 py-1 d-flex flex-wrap align-items-center gap-3" style="min-height: 42px; border-bottom: 1px solid #e5e5e5; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      
      <!-- Category -->
      <div class="d-flex align-items-center gap-1">
        <span class="text-secondary fw-bold" style="font-size: 0.65rem; letter-spacing: 0.5px; text-transform: uppercase;" title="Categoría">CAT</span>
        <select class="form-select form-select-sm border border-light" 
                style="background-color: #f8f9fa; min-width:180px; font-size: 0.7rem; padding: 2px 24px 2px 8px; border-radius: 4px; font-weight: 600;" 
                [style.color]="hasData(state().cat) ? '#1f2937' : '#dc2626'"
                [value]="state().cat" (change)="onCatChange($event)">
          <option *ngFor="let c of categories()" [value]="c"
                  [style.color]="hasData(c) ? '#1f2937' : '#dc2626'">
            {{ c }}{{ hasData(c) ? '' : ' 🚫' }}
          </option>
        </select>
      </div>

      <div class="vr bg-secondary opacity-25 d-none d-md-block" style="height: 16px; align-self: center;"></div>

      <!-- Ranch -->
      <div class="d-flex align-items-center gap-1 position-relative">
        <span class="text-secondary fw-bold" style="font-size: 0.65rem; letter-spacing: 0.5px; text-transform: uppercase;" title="Rancho">RANCH</span>
        <button class="btn btn-sm btn-light border fw-bold text-start d-flex justify-content-between align-items-center" id="ranchDropdownBtn"
          style="min-width:110px; max-width:150px; font-size: 0.7rem; padding: 2px 8px; background-color: #f8f9fa; border-radius: 4px; border-color: #f1f5f9 !important;"
          (click)="toggleRanchDropdown($event)">
          <span class="text-truncate me-2" style="color: #1f2937;">{{ ranchLabel() }}</span>
          <i class="fa-solid fa-chevron-down text-secondary" style="font-size: 0.6rem;"></i>
        </button>
        @if (ranchOpen()) {
          <div id="ranchDropdownPanel" class="shadow-sm rounded-1 border bg-white py-1" [style.top.px]="ranchPos().top" [style.left.px]="ranchPos().left"
            style="display:block; position:fixed; z-index:9999; min-width:150px; max-height:280px; overflow-y:auto; border-color: #e5e7eb !important;">
            <label *ngFor="let r of allRanches(); track r"
              class="dropdown-item d-flex align-items-center gap-2 px-2 py-1 text-dark fw-medium"
              style="font-size:0.75rem; cursor:pointer;"
              [style.borderTop]="r === ranchOrder()[0] ? '1px solid #f1f5f9; margin-top:2px; padding-top:4px;' : ''">
              <input type="checkbox" class="form-check-input mt-0" style="transform: scale(0.85);" [value]="r" [checked]="isRanchSelected(r)" (change)="toggleRanch(r, $event)">
              {{ r }}
            </label>
          </div>
        }
      </div>

      <div class="vr bg-secondary opacity-25 d-none d-md-block" style="height: 16px; align-self: center;"></div>

      <!-- Currency Toggle -->
      <div class="d-flex align-items-center bg-light rounded p-1 border" style="background-color: #f8f9fa; border-color: #f1f5f9 !important;">
        <button type="button" class="btn btn-sm border-0 fw-bold" 
                style="font-size: 0.65rem; padding: 1px 10px; border-radius: 3px;" 
                [ngClass]="state().currency==='usd' ? 'bg-white shadow-sm text-dark' : 'text-muted bg-transparent'" 
                (click)="setCurrency('usd')">USD</button>
        <button type="button" class="btn btn-sm border-0 fw-bold" 
                style="font-size: 0.65rem; padding: 1px 10px; border-radius: 3px;" 
                [ngClass]="state().currency==='mxn' ? 'bg-white shadow-sm text-dark' : 'text-muted bg-transparent'" 
                (click)="setCurrency('mxn')">MXN</button>
      </div>

      <div class="vr bg-secondary opacity-25 d-none d-md-block" style="height: 16px; align-self: center;"></div>

      <!-- Range Sliders -->
      <div class="d-flex align-items-center gap-1">
        <span class="text-secondary fw-bold" style="font-size: 0.65rem; letter-spacing: 0.5px; text-transform: uppercase;"><i class="fa-regular fa-calendar me-1"></i>DEL</span>
        <span class="badge bg-light text-dark border fw-bold px-2 py-1" style="font-size: 0.7rem; border-color: #e5e7eb !important;">{{ state().fromWeek | number:'2.0-0' }}</span>
        <input type="range" class="form-range mx-1" style="width: 50px; height: 1rem;" [min]="minWeek()" [max]="maxWeek()" [value]="state().fromWeek" (input)="onFromChange($event)">
        
        <span class="text-secondary fw-bold ms-1" style="font-size: 0.65rem; letter-spacing: 0.5px; text-transform: uppercase;">AL</span>
        <span class="badge bg-light text-dark border fw-bold px-2 py-1" style="font-size: 0.7rem; border-color: #e5e7eb !important;">{{ state().toWeek | number:'2.0-0' }}</span>
        <input type="range" class="form-range mx-1" style="width: 50px; height: 1rem;" [min]="minWeek()" [max]="maxWeek()" [value]="state().toWeek" (input)="onToChange($event)">
        
        <span class="badge fw-bold ms-1" style="background-color: #fee2e2; color: #991b1b; font-size: 0.65rem; padding: 3px 6px; border-radius: 4px;">
          ({{ weekCount() }} sem)
        </span>
      </div>

      <div class="vr bg-secondary opacity-25 d-none d-lg-block" style="height: 16px; align-self: center;"></div>

      <!-- Years -->
      <div class="d-flex align-items-center gap-1">
        <span class="text-secondary" style="font-size: 0.75rem;" title="Años"><i class="fa-solid fa-clock-rotate-left"></i></span>
        <div class="d-flex flex-wrap gap-1 px-1">
          @for (y of dataYears(); track y) {
            <button class="btn btn-sm fw-bold" 
              [class.shadow-sm]="isYearActive(y)"
              style="font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; transition: all 0.1s;"
              [style.color]="isYearActive(y) ? (YEAR_COLORS[y]||'#1f2937') : '#9ca3af'"
              [style.backgroundColor]="isYearActive(y) ? (YEAR_COLORS[y]+'15') : 'transparent'"
              [style.border]="isYearActive(y) ? ('1px solid ' + YEAR_COLORS[y]) : '1px solid transparent'"
              (click)="toggleYear(y)">{{ y }}</button>
          }
        </div>
      </div>

      <div class="ms-auto d-flex align-items-center gap-2">
        @if (!isServiciosCat()) {
          <button class="btn btn-sm btn-light border fw-bold d-flex align-items-center gap-1 px-2 py-1" style="font-size: 0.7rem; border-radius: 4px; color: #1f2937;" (click)="verProductos.emit()" title="Ver rangos de productos">
            <i class="fa-solid fa-boxes-stacked"></i>
            <span>Productos</span>
          </button>
        }

        <button class="btn btn-sm d-flex align-items-center gap-1 text-white fw-bold px-2 py-1" style="background-color: #0f766e; border-radius: 4px; border: none; font-size: 0.7rem;" (click)="openReloadModal()" title="Recargar datos completos">
          <i class="fa-solid fa-cloud-arrow-down"></i>
          <span>Recargar</span>
        </button>
      </div>
    </div>

    <!-- Administrative access -->
    @if (showPasswordModal()) {
      <div class="modal-backdrop fade show" style="z-index: 9998; background: rgba(0,0,0,0.5); position: fixed; inset: 0; backdrop-filter: blur(4px);"></div>
      <div class="modal fade show" style="display: block; z-index: 9999; position: fixed; top: 0; left: 0; width: 100%; height: 100%;" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow-lg border-0 rounded-4">
            <div class="modal-header border-bottom-0 pb-0">
              <h5 class="modal-title fw-bold text-dark" style="font-size: 1.2rem;">Acceso de administración</h5>
              <button type="button" class="btn-close" aria-label="Cerrar" (click)="closePasswordModal()" [disabled]="isAuthorizing()"></button>
            </div>
            <div class="modal-body p-4">
              <p class="text-secondary mb-3" style="font-size: 0.95rem;">Ingresa la contraseña para abrir las acciones de administración.</p>
              <input type="password" class="form-control form-control-lg bg-light border-0 shadow-sm rounded-3 px-4" placeholder="Contraseña..." [value]="passwordInput()" (input)="onPasswordInput($event)" (keyup.enter)="confirmReload()" [disabled]="isAuthorizing()" autocomplete="current-password">
              @if (passwordError()) {
                <div class="text-danger mt-3 small fw-semibold bg-danger bg-opacity-10 p-2 rounded-3"><i class="fa-solid fa-circle-exclamation me-1"></i> {{ passwordError() }}</div>
              }
            </div>
            <div class="modal-footer border-top-0 pt-0">
              <button type="button" class="btn btn-light rounded-pill px-4 fw-medium" (click)="closePasswordModal()" [disabled]="isAuthorizing()">Cancelar</button>
              <button type="button" class="btn text-white rounded-pill px-4 fw-medium shadow-sm" style="background: linear-gradient(135deg, #1f2937, #111827);" (click)="confirmReload()" [disabled]="isAuthorizing() || !passwordInput().trim()">
                @if (isAuthorizing()) { <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Validando... } @else { Continuar }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ToolbarComponent {
  readonly YEAR_COLORS = YEAR_COLORS;
  readonly verProductos = output<void>();
  readonly adminAuthorized = output<string>();

  protected ranchOpen = signal(false);
  protected ranchPos = signal({ top: 0, left: 0 });

  // Password Modal Signals
  protected showPasswordModal = signal(false);
  protected passwordInput = signal('');
  protected passwordError = signal('');
  protected isAuthorizing = signal(false);

  openReloadModal() {
    this.passwordInput.set('');
    this.passwordError.set('');
    this.showPasswordModal.set(true);
  }

  closePasswordModal() {
    this.showPasswordModal.set(false);
    this.passwordInput.set('');
    this.passwordError.set('');
  }

  onPasswordInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.passwordInput.set(val);
    this.passwordError.set('');
  }

  confirmReload() {
    if (this.isAuthorizing() || !this.passwordInput().trim()) return;
    this.isAuthorizing.set(true);
    this.passwordError.set('');
    this.apiService.authenticateAdmin(this.passwordInput()).subscribe({
      next: ({ token }) => {
        this.isAuthorizing.set(false);
        this.closePasswordModal();
        this.adminAuthorized.emit(token);
      },
      error: (err: any) => {
        this.isAuthorizing.set(false);
        this.passwordError.set(err?.error?.detail || 'No se pudo validar la contraseña. Intenta nuevamente.');
      },
    });
  }

  constructor(protected stateService: StateService, private apiService: ApiService) {}

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

  @HostListener('document:click', ['$event'])
  protected closeRanchDropdownOnOutsideClick(event: MouseEvent) {
    const target = event.target;
    if (target instanceof Element && !target.closest('#ranchDropdownBtn, #ranchDropdownPanel')) {
      this.ranchOpen.set(false);
    }
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
