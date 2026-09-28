import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { StateService } from '../../services/state.service';
import { ViewType, CfbcData } from '../../models/types';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { ComparativoViewComponent } from '../comparativo-view/comparativo-view.component';
import { RanchoViewComponent } from '../rancho-view/rancho-view.component';
import { ServiciosViewComponent } from '../servicios-view/servicios-view.component';
import { ProductPanelComponent } from '../product-panel/product-panel.component';

@Component({
  selector: 'app-main-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    LoadingScreenComponent,
    ToolbarComponent,
    ComparativoViewComponent,
    RanchoViewComponent,
    ServiciosViewComponent,
    ProductPanelComponent,
  ],
  template: `
    @if (stateService.state().loading) {
      <app-loading-screen />
    }

    @if (stateService.state().loaded) {
      <div class="min-h-screen bg-gray-50">
        <!-- App Toolbar -->
        <app-toolbar (verProductos)="onVerProductos()" (adminAuthorized)="openAdminPanel($event)" />

        <!-- View Tabs -->
        @if (!isServiciosCat()) {
          <div class="view-tabs-container">
            <button class="cfbc-tab" [class.active]="stateService.state().view === 'comparativo'" (click)="setView('comparativo'); activePanels.set([])">Comparativo</button>
            <button class="cfbc-tab" [class.active]="stateService.state().view === 'rancho'" (click)="setView('rancho'); activePanels.set([])">Por Rancho</button>
          </div>
        }


        <!-- View Content -->
        @if (stateService.state().view === 'comparativo' && !isServiciosCat()) {
          <app-comparativo-view (cellClick)="onCellClick($event)" />
        }

        @if (stateService.state().view === 'rancho' && !isServiciosCat()) {
          <app-rancho-view (cellClick)="onCellClick($event)" />
        }

        @if (stateService.state().view === 'servicios' || isServiciosCat()) {
          <app-servicios-view />
        }

        <!-- Product Panels Side-by-Side -->
        @if (activePanels().length > 0) {
          <div style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 16px; margin-top: 20px; padding-bottom: 20px; align-items: flex-start; width: 100%;">
            @for (panelData of activePanels(); track $index) {
              <div style="flex: 1; min-width: 0;">
                <app-product-panel [cellData]="panelData" [visible]="true" (close)="closePanel($index)" />
              </div>
            }
          </div>
        }
      </div>
    }

    @if (adminPanelOpen()) {
      <div class="modal-backdrop fade show" style="z-index: 9998; background: rgba(15,23,42,0.48); position: fixed; inset: 0; backdrop-filter: blur(3px);" (click)="closeAdminPanel()"></div>
      <div class="modal show d-block" style="z-index: 9999; position: fixed; inset: 0; overflow-y: auto;" role="dialog" aria-modal="true" aria-labelledby="admin-panel-title">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content shadow-lg border-0 rounded-4">
            <div class="modal-header border-bottom-0 pb-0">
              <div>
                <h5 class="modal-title fw-bold text-dark" id="admin-panel-title">Administrar datos</h5>
                <p class="text-secondary small mb-0 mt-1">Elige la acción que necesitas realizar.</p>
              </div>
              <button type="button" class="btn-close" aria-label="Cerrar" (click)="closeAdminPanel()"></button>
            </div>
            <div class="modal-body p-4">
              @if (adminMessage()) {
                <div class="alert" [class.alert-success]="adminMessageKind() === 'success'" [class.alert-danger]="adminMessageKind() === 'error'" role="status">{{ adminMessage() }}</div>
              }

              <section class="border rounded-3 p-3 p-md-4 mb-3" aria-labelledby="reload-data-title">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <h6 class="fw-bold mb-1" id="reload-data-title"><i class="fa-solid fa-cloud-arrow-down me-2" style="color:#0f766e"></i>Recargar datos</h6>
                    <p class="text-secondary small mb-0">Actualiza los datos desde las fuentes configuradas actualmente.</p>
                  </div>
                  <button type="button" class="btn text-white fw-semibold" style="background:#0f766e" (click)="onReload()" [disabled]="isReloading() || isUploading()">
                    @if (isReloading()) { <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Recargando... } @else { <i class="fa-solid fa-rotate me-2"></i>Recargar ahora }
                  </button>
                </div>
              </section>

              <section class="border rounded-3 p-3 p-md-4" aria-labelledby="headcount-upload-title">
                <h6 class="fw-bold mb-1" id="headcount-upload-title"><i class="fa-solid fa-people-group me-2" style="color:#0f766e"></i>Conteo personal</h6>
                <p class="text-secondary small mb-3">Selecciona el número de semana y escribe su código. El conteo se asociará con COSTO MANO DE OBRA en la pestaña semanal del libro.</p>
                <div class="row g-3">
                  <div class="col-md-4">
                    <label for="personal-week-code" class="form-label small fw-semibold">Semana</label>
                    <input id="personal-week-code" type="text" class="form-control" inputmode="numeric" maxlength="4" placeholder="2638" [value]="personalWeekCode()" (input)="onPersonalWeekInput($event)" [disabled]="isUploading()" autocomplete="off">
                    <div class="form-text">Ejemplo: 2638 = año 2026, semana 38.</div>
                  </div>
                  <div class="col-md-8">
                    <label for="personal-count-file" class="form-label small fw-semibold">Archivo Excel</label>
                    <input id="personal-count-file" type="file" class="form-control" accept=".xlsx" (change)="onPersonalFileChange($event)" [disabled]="isUploading()">
                    @if (personalFileName()) {
                      <div class="form-text text-truncate" title="{{ personalFileName() }}">Seleccionado: {{ personalFileName() }}</div>
                    }
                  </div>
                </div>
                <div class="alert alert-info small mt-3 mb-3 py-2">Se guardan únicamente los conteos de Planta y Contratistas en una pestaña con el código semanal. Por ahora, Ramona se asociará con Campo RM; las demás secciones se conservarán mientras confirmamos sus equivalencias.</div>
                <div class="d-flex justify-content-end">
                  <button type="button" class="btn btn-light border fw-semibold" (click)="onUploadPersonal()" [disabled]="!canUploadPersonal() || isUploading() || isReloading()">
                    @if (isUploading()) { <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Subiendo... } @else { <i class="fa-solid fa-file-arrow-up me-2"></i>Subir conteo }
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    }

    @if (error()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div class="text-red-600 font-mono p-5 bg-white rounded-lg border border-red-200 max-w-lg">
          <b>Error cargando datos:</b>
          <p class="mt-2 text-sm">{{ error() }}</p>
          <button class="mt-4 cfbc-btn-primary" (click)="loadData()">Reintentar</button>
        </div>
      </div>
    }
  `,
})
export class MainDashboardComponent implements OnInit {
  error = signal<string | null>(null);
  protected adminPanelOpen = signal(false);
  protected adminToken = signal<string | null>(null);
  protected adminMessage = signal('');
  protected adminMessageKind = signal<'success' | 'error'>('success');
  protected isReloading = signal(false);
  protected isUploading = signal(false);
  protected personalWeekCode = signal('');
  protected personalFileName = signal('');
  protected personalFile = signal<File | null>(null);
  protected activePanels = signal<{yr: number; wk: number; ranch: string; cat?: string}[]>([]);
  protected isServiciosCat = this.stateService.isServiciosCat;

  protected onCellClick(e: {yr: number; wk: number; ranch: string; cat?: string}) {
    this.activePanels.update(panels => {
      // Prevent opening duplicate panel
      const exists = panels.some(p => p.yr === e.yr && p.wk === e.wk && p.ranch === e.ranch && p.cat === e.cat);
      if (exists) return panels;
      
      const newPanels = [...panels, e];
      if (newPanels.length > 2) {
        newPanels.shift(); // Keep only the last 2 panels
      }
      return newPanels;
    });
  }

  protected closePanel(index: number) {
    this.activePanels.update(panels => panels.filter((_, i) => i !== index));
  }

  protected onVerProductos() {
    const s = this.stateService.state();
    const yr = Object.keys(s.activeYears).map(Number)[0] || new Date().getFullYear();
    const fromWk = s.fromWeek;
    const toWk = s.toWeek;
    const cat = s.cat;
    const currency = s.currency;
    const url = `/todos-productos?yr=${yr}&fromWk=${fromWk}&toWk=${toWk}&cat=${encodeURIComponent(cat)}&currency=${currency}`;
    window.open(url, '_blank');
  }

  protected openAdminPanel(token: string) {
    this.adminToken.set(token);
    this.adminMessage.set('');
    this.personalWeekCode.set('');
    this.personalFileName.set('');
    this.personalFile.set(null);
    this.isUploading.set(false);
    this.adminPanelOpen.set(true);
  }

  protected closeAdminPanel() {
    if (this.isUploading()) return;
    const token = this.adminToken();
    this.adminPanelOpen.set(false);
    this.adminToken.set(null);
    this.adminMessage.set('');
    this.personalWeekCode.set('');
    this.personalFileName.set('');
    this.personalFile.set(null);
    if (token) this.apiService.logoutAdmin(token).subscribe({ error: () => {} });
  }

  protected onPersonalWeekInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4);
    this.personalWeekCode.set(value);
    this.adminMessage.set('');
  }

  protected onPersonalFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.personalFileName.set(file?.name ?? '');
    this.personalFile.set(file ?? null);
    this.adminMessage.set('');
  }

  protected canUploadPersonal(): boolean {
    return /^\d{2}(?:0[1-9]|[1-4]\d|5[0-3])$/.test(this.personalWeekCode())
      && !!this.personalFile();
  }

  protected onUploadPersonal() {
    const token = this.adminToken();
    const file = this.personalFile();
    const weekCode = this.personalWeekCode();
    if (!token || !file || !this.canUploadPersonal() || this.isUploading()) return;

    this.isUploading.set(true);
    this.adminMessage.set('');
    this.apiService.uploadHeadcount(file, weekCode, token).subscribe({
      next: result => {
        const mappedMessage = result.mapped_sections.includes('Ramona')
          ? 'Los datos de Ramona se asociarán con Campo RM.'
          : 'No se detectó una sección mapeada para mostrar en el tablero.';
        const pendingMessage = result.unmapped_sections.length
          ? ` Se conservaron para mapear después: ${result.unmapped_sections.join(', ')}.`
          : '';
        this.loadData(() => {
          this.isUploading.set(false);
          if (this.error()) {
            this.adminMessageKind.set('error');
            this.adminMessage.set(`El conteo ${result.week_code} se guardó en SharePoint, pero no se pudo actualizar el tablero. ${this.error()}`);
          } else {
            this.adminMessageKind.set('success');
            this.adminMessage.set(`Conteo ${result.week_code} guardado en la pestaña ${result.sheet_name}. ${mappedMessage}${pendingMessage}`);
          }
        });
      },
      error: (err: any) => {
        this.isUploading.set(false);
        this.adminMessageKind.set('error');
        this.adminMessage.set(err?.error?.detail || err.message || 'No se pudo subir el conteo.');
      },
    });
  }

  protected onReload() {
    const token = this.adminToken();
    if (!token || this.isReloading()) return;
    this.isReloading.set(true);
    this.adminMessage.set('');
    this.apiService.reloadCache(token).subscribe({
      next: () => {
        this.loadData(() => {
          this.isReloading.set(false);
          if (this.error()) {
            this.adminMessageKind.set('error');
            this.adminMessage.set('Se limpió la caché, pero no se pudieron cargar los datos. Revisa el mensaje y vuelve a intentar.');
          } else {
            this.adminMessageKind.set('success');
            this.adminMessage.set('Los datos se recargaron correctamente.');
          }
        });
      },
      error: (err: any) => {
        this.isReloading.set(false);
        this.adminMessageKind.set('error');
        this.adminMessage.set(err?.error?.detail || err.message || 'No se pudieron recargar los datos.');
      }
    });
  }

  constructor(
    protected stateService: StateService,
    private apiService: ApiService
  ) {
    let lastCat = this.stateService.state().cat;
    effect(() => {
      const currentCat = this.stateService.state().cat;
      if (currentCat !== lastCat) {
        this.activePanels.set([]);
        
        // Switch to 'comparativo' only if it's a real user change (not the initial data load)
        if (lastCat !== '') {
          if (!this.stateService.isServiciosCat()) {
            this.stateService.setView('comparativo');
          } else {
            this.stateService.setView('servicios');
          }
        }
        
        lastCat = currentCat;
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadData();
  }

  protected loadData(onComplete?: () => void): void {
    this.error.set(null);
    this.stateService.state.update(s => ({ ...s, loading: true }));

    this.apiService.getData().subscribe({
      next: (data: CfbcData) => {
        this.stateService.setData(data);
        onComplete?.();
      },
      error: (err: any) => {
        console.error('Error loading data:', err);
        this.error.set(err.message || 'Error desconocido al cargar datos');
        this.stateService.state.update(s => ({ ...s, loading: false }));
        onComplete?.();
      },
    });
  }

  protected setView(v: ViewType): void {
    this.stateService.setView(v);
  }
}
