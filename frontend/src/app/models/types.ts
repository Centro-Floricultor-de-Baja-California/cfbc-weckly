// ── Core Data Types ──────────────────────────────────────────

export interface CfbcConfig {
  ranch_order: string[];
  ranch_colors: Record<string, string>;
}

export interface CfbcData {
  years: number[];
  categories: string[];
  ranches: string[];
  summary: Record<string, Record<number, YearSummary>>;
  weeks_per_year: Record<number, number[]>;
  week_date_ranges: Record<string, string>;
  weekly_detail: WeeklyRecord[];
  servicios_data: ManoObraRecord[];
  mano_obra_data: ManoObraRecord[];
  productos: Record<string, any>;
  productos_debug: Record<string, any>;
  productos_mp: Record<string, any>;
  productos_mp_debug: Record<string, any>;
  productos_me: Record<string, any>;
  productos_me_debug: Record<string, any>;
  productos_mv: Record<string, any>;
  productos_mv_debug: Record<string, any>;
  config: CfbcConfig;
  siembra_data: Record<number, Record<string, Record<string, number>>>;
  unit_costs_data: Record<string, Record<string, Record<string, number>>>;
  metros_acumulados: MetrosRecord[];
  plantas_metros: PlantasMetrosRecord[];
  detalle_weekly: Record<string, any>;
  horas_transporte: Record<string, Record<string, number>>;
  tractores: Record<string, any>;
  esquejes_data: EsquejesRecord[];
}

export interface YearSummary {
  usd: number;
  mxn: number;
  ranches: Record<string, number>;
  ranches_mxn: Record<string, number>;
}

export interface WeeklyRecord {
  semana: number;
  year: number;
  week: number;
  date_range: string;
  categoria: string;
  mxn_total: number;
  usd_total: number;
  mxn_ranches: Record<string, number>;
  usd_ranches: Record<string, number>;
}

export interface ManoObraRecord {
  semana: number;
  year: number;
  week: number;
  date_range: string;
  subcat: string;
  mxn_total: number;
  usd_total: number;
  hc_total?: number;
  mxn_ranches: Record<string, number>;
  usd_ranches: Record<string, number>;
  hc_ranches?: Record<string, number>;
}

export interface MetrosRecord {
  semana_fin: number;
  rancho: string;
  flor: string;
  metros: number;
  pla_acum: number;
  semana_rango: string;
}

export interface PlantasMetrosRecord {
  semana_fin: number;
  rancho: string;
  flor: string;
  plantas: number;
  metros: number;
}

export interface EsquejesRecord {
  semana_fin: number;
  flor: string;
  plantas: number;
}

// ── UI State ────────────────────────────────────────────────

export type ViewType = 'comparativo' | 'rancho' | 'servicios';
export type CurrencyType = 'usd' | 'mxn';

export interface AppState {
  cat: string;
  activeRanches: string[];
  currency: CurrencyType;
  activeYears: Record<number, boolean>;
  view: ViewType;
  fromWeek: number;
  toWeek: number;
  allWeeks: number[];
  loading: boolean;
  loaded: boolean;
  expandedRow: number | null;
}

// ── Pivot Table Types ───────────────────────────────────────

export interface ColDef {
  field: string;
  headerName: string;
  width?: number;
  type?: 'text' | 'numericColumn';
  pinned?: 'left' | false;
  cellRenderer?: (p: CellRendererParams) => string;
}

export interface CellRendererParams {
  value: any;
  data: Record<string, any>;
  colDef: ColDef;
}

export interface TableRow extends Record<string, any> {
  _isGroup?: boolean;
  _isSub?: boolean;
  _isTotal?: boolean;
  _cat?: string;
  _year?: number;
  _week?: number;
  _fromWeek?: number;
  _toWeek?: number;
}

// ── Constants ───────────────────────────────────────────────

export const YEAR_COLORS: Record<number, string> = {
  2021: '#8a1c32',
  2022: '#d97706',
  2023: '#16a34a',
  2024: '#be123c',
  2025: '#f97316',
  2026: '#dc2626',
};

export const CAT_MIRFE = 'FERTILIZANTES';
export const CAT_MIPE = 'DESINFECCION / PLAGUICIDAS';

export const CATEGORIAS_ORDEN = [
  'DESINFECCION Y FERTILIZACION',
  'AMPLIACION',
  'CULTIVO TIERRA, CHAROLAS',
  'MATERIAL VEGETAL',
  'PREPARACION DE SUELO',
  'FERTILIZANTES',
  'DESINFECCION / PLAGUICIDAS',
  'MANTENIMIENTO',
  'EXPANSION CECILIA 25',
  'RENOVACION DE SIEMBRA',
  'MATERIAL DE EMPAQUE',
  'COSTO SERVICIOS',
  'COSTO MANO DE OBRA',
];
