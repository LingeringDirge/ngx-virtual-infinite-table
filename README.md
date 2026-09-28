# ngx-infinite-scroll-table

[![npm version](https://img.shields.io/npm/v/ngx-infinite-scroll-table?style=flat-square)](https://www.npmjs.com/package/ngx-infinite-scroll-table)
[![license](https://img.shields.io/github/license/LingeringDirge/Custom-Material-Infinite-Scroll-Table?style=flat-square)](LICENSE)
[![angular](https://img.shields.io/badge/angular-19+-red?style=flat-square)](https://angular.io)
[![material](https://img.shields.io/badge/material-19+-blue?style=flat-square)](https://material.angular.io)

A high-performance Angular data table component built on **Angular Material CDK** with:

- **Dual-mode pagination** -- infinite scroll (append pages on demand) _or_ CDK virtual scroll (5,000+ rows in tiny DOM)
- **Seek-to-row** -- jump to any absolute row index, triggering background page fetches until the target row arrives
- **Column sorting** (tri-state: Desc → Asc → None)
- **Column filtering** (text, numeric, currency, date, boolean, single-select, multi-select overlays)
- **Column visibility toggle** -- show/hide any column at runtime; build your own picker UI
- **Column resizing** -- drag the right edge of any header to resize; pin columns with `[sticky]` / `[stickyEnd]`
- **Row selection** -- checkboxes with select-all and indeterminate state
- **Expandable master-detail rows** with programmatic expand/collapse API
- **Drag-and-drop row reordering** (CDK)
- **CSV export** utility included (zero external dependencies)
- **Keyboard & ARIA** -- focusable rows, `aria-selected`, Space/Enter triggers
- **Material 3 design tokens** -- inherits your theme automatically; full dark mode support

---

## Live Demo

[View the showcase demo →](https://lingeringdirge.github.io/Custom-Material-Infinite-Scroll-Table)

---

## Installation

```bash
npm install ngx-infinite-scroll-table ngx-infinite-scroll
```

The package has peer dependencies on `@angular/material`, `@angular/cdk`, and `ngx-infinite-scroll`.

---

## Quick Start

### 1. Import the component

```typescript
import { InfiniteScrollTableComponent, InfiniteScrollTableTemplateColumnDirective } from 'ngx-infinite-scroll-table';

@Component({
  standalone: true,
  imports: [InfiniteScrollTableComponent, InfiniteScrollTableTemplateColumnDirective],
  // ...
})
export class MyComponent {}
```

### 2. Add to your template

```html
<ngx-infinite-scroll-table
  [items]="products()"
  [loadMoreRows]="loadNextPage"
  [hasMoreData]="hasMore()"
  [isLoading]="loading()"
  (sortChanged)="onSort($event)"
  style="height: 480px; display: block;">

  <ng-template ngxInfiniteScrollColumn title="Name" dataKey="name" let-row>
    {{ row.name }}
  </ng-template>

  <ng-template ngxInfiniteScrollColumn title="Price" dataKey="price" textAlign="right" let-row>
    ${{ row.price.toFixed(2) }}
  </ng-template>

</ngx-infinite-scroll-table>
```

> **Important**: The table container must have a defined height (e.g., `height: 480px` or a flex parent).

---

## Feature Recipes

### Column Visibility Toggle

Build any picker UI and call the table API via `@ViewChild`:

```typescript
@ViewChild('table') table!: InfiniteScrollTableComponent;

// Get all column definitions (key, title, hidden)
const cols = this.table.getColumnDefinitions();
// → [{ key: 'Name', title: 'Name', hidden: false }, ...]

this.table.hideColumn('Price');       // hide by column key
this.table.showColumn('Price');       // restore
this.table.toggleColumn('Price');     // flip
this.table.isColumnHidden('Price');   // → boolean
this.table.getHiddenColumns();        // → string[]
```

Column keys are resolved as: **title** → **dataKey** → **index string** (same as `matColumnDef`).

```html
<!-- Column picker using a Material Menu -->
<button mat-button [matMenuTriggerFor]="colPicker">Columns</button>
<mat-menu #colPicker>
  @for (col of tableRef.getColumnDefinitions(); track col.key) {
    <button mat-menu-item (click)="tableRef.toggleColumn(col.key)">
      <mat-icon>{{ col.hidden ? 'check_box_outline_blank' : 'check_box' }}</mat-icon>
      {{ col.title }}
    </button>
  }
</mat-menu>
```

---

### Column Resizing

Resize handles appear automatically on all header cells. Drag the right edge to resize. Specific columns can opt out:

```html
<!-- Disable resize on a specific column -->
<ng-template ngxInfiniteScrollColumn title="Actions" [resizable]="false" let-row>
  ...
</ng-template>
```

```typescript
// Reset all resize overrides back to template widths
this.table.resetColumnWidths();
```

---

### Sticky Columns (Pinned Left / Right)

```html
<!-- Pin ID to the left -->
<ng-template ngxInfiniteScrollColumn title="ID" [sticky]="true" width="80px" let-row>
  {{ row.id }}
</ng-template>

<!-- Pin Actions to the right -->
<ng-template ngxInfiniteScrollColumn title="Actions" [stickyEnd]="true" [resizable]="false" let-row>
  <button mat-icon-button (click)="edit(row)"><mat-icon>edit</mat-icon></button>
</ng-template>
```

---

### Infinite Scroll Pagination

```typescript
public loadNextPage = (): void => {
  if (this.loading() || !this.hasMore()) return;
  this.loading.set(true);
  this.api.getProducts(this.page++).subscribe(result => {
    this.products.update(prev => [...prev, ...result.items]);
    this.hasMore.set(result.hasMore);
    this.loading.set(false);
  });
};
```

---

### Virtual Scroll (Large Datasets)

```html
<ngx-infinite-scroll-table
  [items]="allRows()"
  [enableVirtualScroll]="true"
  [virtualRowHeight]="48"
  [virtualScrollBuffer]="20"
  [hasMoreData]="false">
  ...
</ngx-infinite-scroll-table>
```

> Note: virtual scroll is automatically disabled when `expandedRowTemplate` or `enableDrag` is active (incompatible features).

---

### Seek to Row (Programmatic Navigation)

```typescript
// Scroll to a row already in the DOM
this.table.scrollToRow(500);

// Scroll to row 2000 -- triggers incremental page fetches until row 2000 is loaded
this.table.scrollToRow(2000, 'smooth');
```

---

### Column Sorting

```html
<ngx-infinite-scroll-table (sortChanged)="onSort($event)">
  <!-- Pre-sort this column Descending on initial load -->
  <ng-template ngxInfiniteScrollColumn title="Date" dataKey="createdAt"
               [preSortDirection]="SortType.Descending" let-row>
    {{ row.createdAt | date }}
  </ng-template>
</ngx-infinite-scroll-table>
```

```typescript
public onSort(event: IInfiniteScrollSortEvent): void {
  // { dataKey: 'createdAt', sortDirection: SortType.Descending }
  this.queryParams.set({ sort: event.dataKey, dir: event.sortDirection });
  this.reload();
}
```

---

### Column Filters

```html
<ngx-infinite-scroll-table [enableFilters]="true">
  <ng-template ngxInfiniteScrollColumn title="Name" dataKey="name"
               [filterTemplate]="nameTpl" let-row>
    {{ row.name }}
  </ng-template>
</ngx-infinite-scroll-table>

<ng-template #nameTpl>
  <ngx-infinite-scroll-table-filter
    dataKey="name"
    columnName="Name"
    type="text"
    [scrollTable]="tableRef"
    [filterValue]="filters()['name']"
    (filterChanged)="onFilter($event)" />
</ng-template>
```

Filter types: `"text"` | `"numeric"` | `"currency"` | `"date"` | `"boolean"` | `"singleselect"` | `"multiselect"`

---

### Row Selection

```html
<ngx-infinite-scroll-table
  [isRowSelected]="isSelected"
  [isRowSelectable]="canSelect"
  [rowSelectableTooltip]="disabledTooltip"
  (rowSelected)="onRowSelected($event)"
  (allRowsSelected)="onSelectAll($event)">
```

```typescript
isSelected = (index: number) => this.selectedIds.has(this.rows()[index].id);
canSelect = (row: User, index: number) => !row.locked;
disabledTooltip = (row: User) => row.locked ? 'Row is locked' : '';
```

Programmatic selection:
```typescript
this.table.selectAllRows();   // select all
this.table.clearSelection();  // deselect all
```

---

### Expandable Master-Detail Rows

```html
<ngx-infinite-scroll-table [expandedRowTemplate]="detailTpl">
  ...
</ngx-infinite-scroll-table>

<ng-template #detailTpl let-item>
  <div class="detail">{{ item.description }}</div>
</ng-template>
```

Programmatic expand/collapse:
```typescript
this.table.expandAllRows();                  // expand all
this.table.collapseAllRows();                // collapse all
this.table.expandAllRows([row1, row2]);      // expand specific rows
this.table.isRowExpanded(item);              // → boolean
this.table.getExpandedRows();                // → T[]
```

---

### Drag & Drop Row Reordering

```html
<ngx-infinite-scroll-table [enableDrag]="true" (rowDropped)="onDrop($event)">
```

```typescript
public onDrop(event: CdkDragDrop<MyRow[], MyRow[]>): void {
  moveItemInArray(this.rows, event.previousIndex, event.currentIndex);
}
```

---

### CSV Export

```typescript
import { exportToCsv } from 'ngx-infinite-scroll-table';

exportToCsv(
  this.products(),
  [
    { title: 'ID',       dataKey: 'id' },
    { title: 'Name',     dataKey: 'name' },
    { title: 'Price($)', dataKey: 'price', formatter: (v: number) => v.toFixed(2) },
    { title: 'In Stock', dataKey: 'inStock', formatter: (v: boolean) => v ? 'Yes' : 'No' }
  ],
  'products.csv'
);
```

---

### Custom Empty State

```html
<ngx-infinite-scroll-table
  [emptyText]="'No matching records'"
  [emptyTemplate]="emptyTpl">
  ...
</ngx-infinite-scroll-table>

<!-- Or provide a fully custom empty state template -->
<ng-template #emptyTpl>
  <div class="my-empty-state">
    <img src="empty.svg" />
    <p>Nothing found. Try adjusting your filters.</p>
  </div>
</ng-template>
```

---

### Custom Loading Overlay

```html
<ngx-infinite-scroll-table [loadingTemplate]="loadingTpl">
  ...
</ngx-infinite-scroll-table>

<ng-template #loadingTpl let-mode="mode">
  @if (mode === 'initial') {
    <div class="skeleton-loader">Loading...</div>
  } @else {
    <div class="loading-more">Fetching more...</div>
  }
</ng-template>
```

---

## Theming

The table inherits colors from your Angular Material 3 theme automatically via `--mat-sys-*` CSS variables. To override:

```scss
ngx-infinite-scroll-table {
  --mat-sys-surface:                  #ffffff;
  --mat-sys-surface-container-high:   #f8fafc;
  --mat-sys-surface-container-highest:#e2e8f0;
  --mat-sys-surface-variant:          #f1f5f9;
  --mat-sys-primary:                  #3b82f6;
  --mat-sys-tertiary-container:       #e0e7ff;
  --mat-sys-on-surface:               #1e293b;
  --mat-sys-outline:                  #cbd5e1;
}
```

Dark mode is enabled automatically when a parent element has the class `.dark` or `.dark-theme`.

---

## 📖 API Reference

### `<ngx-infinite-scroll-table>` Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `items` | `T[]` | **required** | The array of row data items to render. |
| `loadMoreRows` | `() => void` | `undefined` | Callback invoked when user scrolls near the bottom. |
| `hasMoreData` | `boolean` | `true` | Set to `false` when all pages have been fetched. |
| `isLoading` | `boolean` | `false` | When `true`, shows loading spinner and suppresses duplicate requests. |
| `enableVirtualScroll` | `boolean` | `false` | Enables CDK virtual scroll for large datasets. |
| `virtualRowHeight` | `number` | `48` | Estimated row height in pixels for virtual scroll. |
| `virtualScrollBuffer` | `number` | `20` | Buffer rows rendered outside the visible viewport. |
| `enableFilters` | `boolean` | `false` | Shows filter icons in headers when a column has `filterTemplate`. |
| `disableSort` | `boolean` | `false` | Disables sorting globally. |
| `enableDrag` | `boolean` | `false` | Enables drag-and-drop row reordering. |
| `isRowSelected` | `(idx: number) => boolean` | `undefined` | Row selection predicate. Enables the selection checkbox column. |
| `isRowSelectable` | `(row: T, idx: number) => boolean` | `undefined` | Predicate determining if a row checkbox is enabled. |
| `rowSelectableTooltip` | `(row: T, idx: number) => string` | `undefined` | Tooltip for disabled row checkboxes. |
| `multiselectReadonly` | `boolean` | `false` | Makes checkboxes read-only. |
| `expandedRowTemplate` | `TemplateRef<unknown>` | `null` | Template for expandable master-detail rows. |
| `emptyTemplate` | `TemplateRef<unknown>` | `null` | Custom template displayed when there are no items. |
| `emptyText` | `string` | `"No records found"` | Text shown in the default empty state. |
| `loadingTemplate` | `TemplateRef<{ mode: string }>` | `null` | Custom loading overlay (`mode: "initial" \| "more"`). |
| `enableRowStripes` | `boolean` | `true` | Alternating row backgrounds. |
| `fitContent` | `boolean` | `false` | `display: table` layout so columns size to content. |
| `enableWordWrap` | `boolean` | `false` | Allows text wrapping inside cells. |
| `showHeaders` | `boolean` | `true` | Show or hide the header row. |
| `interactive` | `boolean` | `true` | Adds hover highlight and pointer cursor on rows. |
| `maxColumnWidth` | `number` | `undefined` | Global max column width in pixels. |
| `ariaLabel` | `string` | `"Scrollable data table"` | Accessible label for the table container. |
| `trackBy` | `TrackByFunction<T>` | `item.id \| guid \| index` | Custom trackBy function for DOM reuse. |
| `scrollDistance` | `number` | `1.5` | Multiplier determining how close to bottom before load triggers. |
| `scrollUpDistance` | `number` | `2` | Upward scroll threshold multiplier. |
| `scrollThrottle` | `number` | `150` | Throttle time in ms for the scroll listener. |
| `scrollTop` | `number` | `0` | Two-way bindable scroll position. |

---

### Outputs

| Output | Payload | Description |
|---|---|---|
| `sortChanged` | `IInfiniteScrollSortEvent` | Emitted when sort changes (`{ dataKey, sortDirection }`). |
| `rowSelected` | `IInfiniteScrollTableRowActionEvent` | Emitted when a row checkbox is toggled. |
| `allRowsSelected` | `boolean` | Emitted when the header select-all checkbox is toggled. |
| `rowActionClicked` | `IInfiniteScrollTableRowActionEvent` | Emitted when a cell action is clicked. |
| `rowDropped` | `CdkDragDrop<T[], T[]>` | Emitted after a drag-and-drop reorder. |
| `scrolledUp` | `void` | Emitted when scrolling up past threshold. |
| `rowsRendered` | `IInfiniteScrollRowsRenderedEvent` | Emitted with `{ startIndex, stopIndex }` in virtual mode. |
| `filterCollapsed` | `IInfiniteScrollFilterCollapsedEvent` | Emitted when a filter overlay closes. |
| `scrollTopChange` | `number` | Emitted on scroll (two-way binding partner for `scrollTop`). |

---

### Methods (via `@ViewChild`)

**Scrolling**
- `scrollToRow(index: number, behavior?: ScrollBehavior)` -- Scroll or seek to absolute row index.
- `resetScroll(offset?: number)` -- Reset scroll to offset (or top).
- `resetScrollState()` -- Reset scroll + clear internal caching guards. Call after sort/filter resets.
- `scrollToEnd()` -- Scroll to the bottom.
- `cancelSeek()` -- Cancel any in-progress seek operation.

**Selection**
- `selectAll()` -- Toggle select-all state.
- `selectAllRows()` -- Programmatically select all rows.
- `clearSelection()` -- Programmatically deselect all rows.
- `resetSelectAll(selected?: boolean)` -- Set select-all state to a specific value.

**Expand / Collapse**
- `expandAllRows(rows?: T[])` -- Expand all rows, or a specific subset.
- `collapseAllRows()` -- Collapse all expanded rows.
- `openExpandedRow(element: T)` -- Expand a specific row.
- `toggleExpandedRow(element: T, event: Event)` -- Toggle expansion of a specific row.
- `getExpandedRows(): T[]` -- Returns currently expanded row items.
- `isRowExpanded(item: T): boolean` -- Returns whether an item is currently expanded.

**Column Visibility**
- `hideColumn(key: string)` -- Hide a column by key.
- `showColumn(key: string)` -- Show a previously hidden column.
- `toggleColumn(key: string)` -- Toggle a column's visibility.
- `isColumnHidden(key: string): boolean` -- Check if a column is hidden.
- `getHiddenColumns(): string[]` -- Returns all currently hidden column keys.
- `getColumnDefinitions(): Array<{ key, title, hidden }>` -- Returns all column metadata (ideal for building picker UIs).

**Column Resizing**
- `getColumnWidth(col, idx): number | undefined` -- Returns current resize override in pixels.
- `resetColumnWidths()` -- Clears all resize overrides, restoring original column widths.

**Filtering**
- `closeFilter()` -- Close any open filter overlay.

---

### `ngxInfiniteScrollColumn` Directive Inputs

Applied to `<ng-template>` inside the table:

```html
<ng-template ngxInfiniteScrollColumn title="Name" dataKey="name" width="200px" let-row>
  {{ row.name }}
</ng-template>
```

| Input | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `undefined` | Header display text. |
| `dataKey` | `string` | `undefined` | Property key on row objects (used for sort/filter). |
| `width` | `string` | `undefined` | CSS width (e.g. `150px`, `20%`). Also sets flex-basis. |
| `textAlign` | `'left' \| 'right' \| 'center'` | `'left'` | Alignment of header and cell content. |
| `sticky` | `boolean` | `false` | Pins the column to the **left** edge (frozen column). |
| `stickyEnd` | `boolean` | `false` | Pins the column to the **right** edge (frozen column). |
| `resizable` | `boolean` | `true` | Enables the drag-resize handle on this column's header. |
| `maxColumnWidth` / `maxWidth` | `number` | `undefined` | Column max-width in pixels. |
| `headerTemplate` | `TemplateRef<unknown>` | `undefined` | Custom header cell template (replaces default title + sort). |
| `filterTemplate` | `TemplateRef<unknown>` | `null` | Template rendered inside the filter overlay for this column. |
| `filterEnabled` | `() => boolean` | `undefined` | Function returning whether a filter is currently active (highlights header). |
| `hideSortIndicator` | `boolean` | `undefined` | Hides the sort arrow icon even when `dataKey` is set. |
| `disableColumnSort` | `boolean` | `undefined` | Disables sorting for this specific column. |
| `preSortDirection` | `SortType` | `undefined` | Initial sort direction on first render. |
| `centerCellContent` | `boolean` | `undefined` | Centers cell content horizontally. |
| `centerTitle` | `boolean` | `undefined` | Centers the header title text. |
| `position` | `'before' \| 'after'` | `'after'` | Relative render position among data columns. |

---

### `<ngx-infinite-scroll-table-filter>` Inputs

| Input | Type | Description |
|---|---|---|
| `dataKey` | `string` | Property key emitted with filter changes. |
| `columnName` | `string` | Human-readable label shown in the filter UI. |
| `type` | `InfiniteScrollFilterType` | `"text" \| "numeric" \| "currency" \| "date" \| "boolean" \| "singleselect" \| "multiselect"` |
| `filterValue` | `IFilterValueState` | Current filter state object (two-way bindable). |
| `scrollTable` | `IFilterHostTable` | Reference to the parent table for auto-close on apply. |

---

### `exportToCsv` Utility

```typescript
import { exportToCsv, ICsvExportColumn } from 'ngx-infinite-scroll-table';

exportToCsv<MyRow>(
  rows,
  columns: ICsvExportColumn<MyRow>[],
  filename?: string   // default: 'table-export.csv'
);

interface ICsvExportColumn<T> {
  title?: string;
  dataKey?: keyof T | string;
  formatter?: (value: any, row: T) => string | number | boolean | null | undefined;
}
```

---

## 📄 License

MIT © [Vincent Fermo](LICENSE)
