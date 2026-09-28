import { Directive, Input, TemplateRef } from '@angular/core';
import { SortType } from '../models/sort-type.enum';

/**
 * Directive applied to `<ng-template>` elements inside `<ngx-infinite-scroll-table>`
 * to define column header title, width, sorting, filtering, sticky positioning, and cell templates.
 *
 * Example:
 * ```html
 * <ng-template ngxInfiniteScrollColumn title="Name" dataKey="name" width="200px" [sticky]="true" let-row>
 *     <span>{{ row.name }}</span>
 * </ng-template>
 * ```
 */
@Directive({
    selector: 'ng-template[ngxInfiniteScrollColumn], ng-template[infinite-scroll-template-column], [ngxInfiniteScrollColumn], [infinite-scroll-template-column]',
    standalone: true
})
export class InfiniteScrollTableTemplateColumnDirective {
    constructor(public template: TemplateRef<unknown>) {}

    /** Display title in header. */
    @Input() public title?: string;

    /** Property key on row objects used for sorting and filtering. */
    @Input() public dataKey?: string;

    /** CSS width (e.g. '150px' or '20%'). Also sets flex-basis. */
    @Input() public width?: string;

    /** Computed flex-basis shortcut. */
    public get flex(): string | null {
        return this.width ? `0 0 ${this.width}` : null;
    }

    /** Center cell content horizontally. */
    @Input() public centerCellContent?: boolean;

    /** Center column title text in header. */
    @Input() public centerTitle?: boolean;

    /** Custom filter template rendered inside the column filter overlay. */
    @Input() public filterTemplate!: TemplateRef<unknown> | null;

    /** Function returning whether a filter is currently active on this column. */
    @Input() public filterEnabled?: () => boolean;

    /** Custom header cell template overriding the default header text & sort button. */
    @Input() public headerTemplate?: TemplateRef<unknown>;

    /** Hides the sort indicator icon even if dataKey is present. */
    @Input() public hideSortIndicator?: boolean;

    /** Disables sorting for this specific column. */
    @Input() public disableColumnSort?: boolean;

    /** Text alignment in column header and body cells. */
    @Input() public textAlign: 'left' | 'right' | 'center' = 'left';

    /** Pins the column to the left edge of the table (sticky column). */
    @Input() public sticky?: boolean = false;

    /** Pins the column to the right edge of the table (stickyEnd column). */
    @Input() public stickyEnd?: boolean = false;

    private _maxColumnWidth?: number;

    /** Column max-width in pixels. */
    @Input()
    public set maxColumnWidth(value: number | undefined) {
        this._maxColumnWidth = value;
    }

    public get maxColumnWidth(): number | undefined {
        return this._maxColumnWidth;
    }

    /** Alias for maxColumnWidth. */
    @Input()
    public set maxWidth(value: number | undefined) {
        this._maxColumnWidth = value;
    }

    public get maxWidth(): number | undefined {
        return this._maxColumnWidth;
    }

    /** Relative column position ('before' or 'after' dynamic data columns). */
    @Input() public position: 'before' | 'after' = 'after';

    /** Pre-set initial sort direction for this column. */
    @Input() public preSortDirection?: SortType;

    /**
     * Whether this column shows a drag-resize handle in its header.
     * Set to false to disable resizing for this specific column.
     * Default true.
     */
    @Input() public resizable = true;
}
