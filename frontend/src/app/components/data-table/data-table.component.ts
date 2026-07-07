import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, TableRow } from '../../models/types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pt-table-wrap overflow-x-auto overflow-y-visible w-full">
      <table class="cfbc-table">
        <thead>
          <tr>
            @for (col of colDefs(); track col.field) {
              <th [class.pinned]="isPinned($index)"
                  [style.text-align]="col.type === 'numericColumn' ? 'right' : 'left'"
                  [style.left.px]="pinnedOffset($index)">
                {{ col.headerName }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track trackByFn($index, row); let ri = $index) {
            <tr [class.group-row]="row._isGroup"
                [class.sub-row]="row._isSub"
                [class.total-row]="row._isTotal"
                (click)="onRowClick(ri)">
              @for (col of colDefs(); track col.field; let ci = $index) {
                <td [class.pinned]="isPinned(ci)"
                    [style.text-align]="col.type === 'numericColumn' ? 'right' : 'left'"
                    [style.left.px]="pinnedOffset(ci)">
                  @if (col.cellRenderer) {
                    <span [innerHTML]="renderCell(col, row)"></span>
                  } @else {
                    {{ formatValue(row[col.field]) }}
                  }
                </td>
              }
            </tr>
            @if (expandedRow() === ri) {
              <tr>
                <td [colSpan]="colDefs().length" class="bg-gray-50 border-l-4 border-wine p-3 text-sm">
                  <ng-container [ngTemplateOutlet]="detailTpl()" [ngTemplateOutletContext]="{$implicit: row}"></ng-container>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DataTableComponent {
  readonly colDefs = input<ColDef[]>([]);
  readonly rows = input<TableRow[]>([]);
  readonly expandedRow = input<number | null>(null);
  readonly detailTpl = input<any>(null);

  readonly rowClick = output<number>();

  protected pinnedCount = computed(() => {
    let count = 0;
    for (const col of this.colDefs()) {
      if (col.pinned === 'left') count++;
      else break;
    }
    return count;
  });

  protected isPinned(ci: number): boolean {
    return ci < this.pinnedCount();
  }

  protected pinnedOffset(ci: number): number {
    let offset = 0;
    const cols = this.colDefs();
    for (let i = 0; i < ci && i < cols.length; i++) {
      if (cols[i].pinned === 'left') {
        offset += cols[i].width || 120;
      }
    }
    return offset;
  }

  protected renderCell(col: ColDef, row: TableRow): string {
    if (!col.cellRenderer) return this.formatValue(row[col.field]);
    try {
      return col.cellRenderer({ value: row[col.field], data: row, colDef: col });
    } catch {
      return this.formatValue(row[col.field]);
    }
  }

  protected formatValue(v: any): string {
    if (v === null || v === undefined) return '';
    return String(v);
  }

  protected onRowClick(ri: number) {
    this.rowClick.emit(ri);
  }

  protected trackByFn(index: number, item: TableRow): any {
    return index;
  }
}
