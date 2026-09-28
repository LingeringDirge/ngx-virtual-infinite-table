import { NgModule } from '@angular/core';
import { InfiniteScrollTableComponent } from './infinite-scroll-table.component';
import { InfiniteScrollTableTemplateColumnDirective } from './directives/infinite-scroll-table-template-column.directive';
import { InfiniteScrollTableFilterComponent } from './filter/infinite-scroll-table-filter.component';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { IsRowExpandedPipe } from './pipes/is-row-expanded.pipe';

/**
 * NgModule export for convenient single-import usage across standalone components and classic NgModules.
 *
 * Usage in Standalone Component:
 * ```typescript
 * import { InfiniteScrollTableModule } from 'ngx-virtual-infinite-table';
 *
 * @Component({
 *   standalone: true,
 *   imports: [InfiniteScrollTableModule],
 *   // ...
 * })
 * export class MyComponent {}
 * ```
 */
@NgModule({
  imports: [
    InfiniteScrollTableComponent,
    InfiniteScrollTableTemplateColumnDirective,
    InfiniteScrollTableFilterComponent,
    ClickOutsideDirective,
    IsRowExpandedPipe,
  ],
  exports: [
    InfiniteScrollTableComponent,
    InfiniteScrollTableTemplateColumnDirective,
    InfiniteScrollTableFilterComponent,
    ClickOutsideDirective,
    IsRowExpandedPipe,
  ],
})
export class InfiniteScrollTableModule {}
