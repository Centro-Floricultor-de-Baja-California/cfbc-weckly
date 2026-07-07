import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./components/main-dashboard/main-dashboard.component').then(m => m.MainDashboardComponent) },
  { path: 'todos-productos', loadComponent: () => import('./components/todos-productos/todos-productos.component').then(m => m.TodosProductosComponent) },
  { path: '**', redirectTo: '/dashboard' },
];
