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
        <app-toolbar (verProductos)="onVerProductos()" (reload)="onReload()" />

        <!-- View Tabs -->
        <div class="view-tabs-container">
          @if (!isServiciosCat()) {
            <button class="cfbc-tab" [class.active]="stateService.state().view === 'comparativo'" (click)="setView('comparativo'); activePanels.set([])">Comparativo</button>
            <button class="cfbc-tab" [class.active]="stateService.state().view === 'rancho'" (click)="setView('rancho'); activePanels.set([])">Por Rancho</button>
          }
          @if (isServiciosCat()) {
            <button class="cfbc-tab" [class.active]="stateService.state().view === 'servicios'" (click)="setView('servicios'); activePanels.set([])">Costo Servicios</button>
          }
        </div>

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

  protected onReload() {
    this.error.set(null);
    this.stateService.state.update(s => ({ ...s, loading: true }));
    
    // Clear backend cache, then fetch fresh data
    this.apiService.reloadCache().subscribe({
      next: () => {
        this.loadData();
      },
      error: (err: any) => {
        console.error('Error vaciando caché:', err);
        this.error.set(err.message || 'Error al recargar');
        this.stateService.state.update(s => ({ ...s, loading: false }));
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
        lastCat = currentCat;
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadData();
  }

  protected loadData(): void {
    this.error.set(null);
    this.stateService.state.update(s => ({ ...s, loading: true }));

    this.apiService.getData().subscribe({
      next: (data: CfbcData) => {
        this.stateService.setData(data);
      },
      error: (err: any) => {
        console.error('Error loading data:', err);
        this.error.set(err.message || 'Error desconocido al cargar datos');
        this.stateService.state.update(s => ({ ...s, loading: false }));
      },
    });
  }

  protected setView(v: ViewType): void {
    this.stateService.setView(v);
  }
}
