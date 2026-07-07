import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  template: `
    <div class="cfbc-loader">
      <div class="cfbc-loader-brand">CFBC</div>
      <div class="cfbc-loader-sub">CONTROL SEMANAL</div>
      <div class="cfbc-loader-bar-track">
        <div class="cfbc-loader-bar-fill"></div>
      </div>
      <div class="mt-6 text-xs tracking-wider" style="color: rgba(255,255,255,0.4);">
        Cargando Datos
        <span class="cfbc-loader-dot">.</span>
        <span class="cfbc-loader-dot">.</span>
        <span class="cfbc-loader-dot">.</span>
      </div>
    </div>
  `,
})
export class LoadingScreenComponent {}
