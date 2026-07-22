import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CfbcData } from '../models/types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  /** Fetch the full dataset */
  getData(): Observable<CfbcData> {
    return this.http.get<CfbcData>(`${this.baseUrl}/data`);
  }

  /** Health check */
  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/health`);
  }

  /** Reload cache */
  reloadCache(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/reload`, {});
  }

  /** Config only */
  getConfig(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/config`);
  }

  /** Summary */
  getSummary(category?: string, year?: number): Observable<any> {
    let params: any = {};
    if (category) params.category = category;
    if (year) params.year = year;
    return this.http.get<any>(`${this.baseUrl}/summary`, { params });
  }

  /** Weekly detail */
  getWeeklyDetail(params?: {
    category?: string;
    year?: number;
    week?: number;
    from?: number;
    to?: number;
  }): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/weekly-detail`, { params: params || {} });
  }

  /** Servicios */
  getServicios(params?: {
    year?: number;
    week?: number;
    from?: number;
    to?: number;
  }): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/servicios`, { params: params || {} });
  }

  /** Mano de obra */
  getManoObra(params?: {
    year?: number;
    week?: number;
    from?: number;
    to?: number;
  }): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/mano-obra`, { params: params || {} });
  }

  /** Unit costs */
  getUnitCosts(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/unit-costs`);
  }

  /** Siembra */
  getSiembra(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/siembra`);
  }

  /** Productos by type */
  getProductos(tipo: 'pr' | 'mp' | 'me' | 'mv'): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/productos/${tipo}`);
  }
}
