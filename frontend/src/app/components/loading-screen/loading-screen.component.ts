import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  template: `
    <div class="cfbc-loader" role="status" aria-live="polite" aria-label="Preparando el reporte semanal">
      <div class="cfbc-loader-panel">
        <div class="cfbc-loader-brand">CFBC</div>
        <div class="cfbc-loader-sub">CONTROL SEMANAL</div>

        <div class="cfbc-loader-copy">
          <h1>Preparando tu reporte semanal</h1>
          <p>Actualizando los indicadores más recientes de producción.</p>
        </div>

        <div class="cfbc-loader-bar-track" aria-hidden="true">
          <div class="cfbc-loader-bar-fill"></div>
        </div>

        <div class="cfbc-loader-status">
          Actualizando indicadores
          <span class="cfbc-loader-dot">.</span>
          <span class="cfbc-loader-dot">.</span>
          <span class="cfbc-loader-dot">.</span>
        </div>
      </div>
    </div>
  `,
})
export class LoadingScreenComponent {}
