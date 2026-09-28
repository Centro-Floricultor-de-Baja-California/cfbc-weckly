import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  /** Start a short-lived administrative session after password validation. */
  authenticateAdmin(password: string): Observable<{ token: string; expires_in: number }> {
    return this.http.post<{ token: string; expires_in: number }>(`${this.baseUrl}/admin/auth`, { password });
  }

  /** Close an administrative session. */
  logoutAdmin(token: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/admin/logout`, {}, {
      headers: new HttpHeaders({ 'X-Admin-Token': token }),
    });
  }

  /** Reload cache; requires an authenticated administrative session. */
  reloadCache(token: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/reload`, {}, {
      headers: new HttpHeaders({ 'X-Admin-Token': token }),
    });
  }

  /** Save an Excel personnel count in the weekly SharePoint worksheet. */
  uploadHeadcount(file: File, weekCode: string, token: string): Observable<{
    week_code: string;
    sheet_name: string;
    stored_rows: number;
    mapped_sections: string[];
    unmapped_sections: string[];
  }> {
    const body = new FormData();
    body.append('week_code', weekCode);
    body.append('file', file, file.name);
    return this.http.post<{
      week_code: string;
      sheet_name: string;
      stored_rows: number;
      mapped_sections: string[];
      unmapped_sections: string[];
    }>(`${this.baseUrl}/admin/headcount/upload`, body, {
      headers: new HttpHeaders({ 'X-Admin-Token': token }),
    });
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
