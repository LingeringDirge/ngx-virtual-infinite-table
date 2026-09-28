import { SelectionModel } from '@angular/cdk/collections';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { CdkVirtualScrollViewport, ScrollingModule, VIRTUAL_SCROLL_STRATEGY } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
    AfterViewChecked,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    ContentChildren,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    Input,
    NgZone,
    OnDestroy,
    OnInit,
    output,
    QueryList,
    signal,
    TemplateRef,
    TrackByFunction,
    ViewChild,
    WritableSignal
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { FillCheckController } from './classes/fill-check-controller';
import { warnInfiniteScrollConfig } from './classes/infinite-scroll-table-dev-warnings';
import { SeekController } from './classes/seek-controller';
import { TableVirtualScrollStrategy } from './classes/table-virtual-scroll-strategy';
import { VirtualScrollController } from './classes/virtual-scroll-controller';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { InfiniteScrollTableTemplateColumnDirective } from './directives/infinite-scroll-table-template-column.directive';
import { SortType } from './models/sort-type.enum';
import {
    IInfiniteScrollFilterCollapsedEvent,
    IInfiniteScrollRowsRenderedEvent,
    IInfiniteScrollSortEvent,
    IInfiniteScrollTableRowActionEvent
} from './models/table-events.model';
import { IsRowExpandedPipe } from './pipes/is-row-expanded.pipe';

/**
 * High-performance data table component with infinite-scroll pagination,
 * virtual scrolling, column sorting, filtering overlays, row selection,
 * drag-and-drop reordering, and expandable master-detail rows.
 */
@Component({
    selector: 'ngx-virtual-infinite-table, ngx-infinite-scroll-table, infinite-scroll-table, app-infinite-scroll-table',
    templateUrl: './infinite-scroll-table.component.html',
    styleUrls: ['./infinite-scroll-table.component.scss'],
    providers: [
        TableVirtualScrollStrategy,
        { provide: VIRTUAL_SCROLL_STRATEGY, useExisting: TableVirtualScrollStrategy }
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,
        InfiniteScrollDirective,
        DragDropModule,
        ScrollingModule,
        OverlayModule,
        MatTableModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatIconModule,
        MatProgressSpinnerModule,
        IsRowExpandedPipe,
        ClickOutsideDirective
    ]
})
export class InfiniteScrollTableComponent<T = any>
    implements AfterViewChecked, AfterViewInit, OnDestroy, OnInit {
    @ViewChild('scrolltable', { read: ElementRef, static: false }) public scrolltable?: ElementRef<HTMLElement>;
    @ViewChild('virtualHeaderWrapper', { read: ElementRef }) public virtualHeaderWrapper?: ElementRef<HTMLElement>;

    private _virtualViewport: CdkVirtualScrollViewport | undefined;

    @ViewChild('virtualViewport')
    public set virtualViewport(vp: CdkVirtualScrollViewport | undefined) {
        if (vp && vp !== this._virtualViewport) {
            this._virtualViewport = vp;
            this.virtualCtrl.attach(vp, this.virtualHeaderWrapper);
        }
    }

    public get virtualViewport(): CdkVirtualScrollViewport | undefined {
        return this._virtualViewport;
    }

    /** Row data array to display. */
    public items = input.required<T[]>();

    /** Callback invoked when the user scrolls near the bottom and more rows are needed. */
    public loadMoreRows = input<(() => void) | undefined>();

    /** Whether more pages exist on the server. */
    public hasMoreData = input<boolean>(true);

    /** Indicates that data is currently being fetched. */
    public isLoading = input<boolean>(false);

    /** Multiplier of container height determining how close to the bottom before loadMoreRows triggers. Default 1.5. */
    public scrollDistance = input<number>(1.5);

    /** Multiplier of container height for upward scrolling threshold. Default 2. */
    public scrollUpDistance = input<number>(2);

    /** Throttle time in ms for scroll listener. Default 150. */
    public scrollThrottle = input<number>(150);

    /** Attaches scroll listener to document root instead of container. Default false. */
    public fromRoot = input<boolean>(false);

    /** Enables column filter triggers in headers. */
    public enableFilters = input<boolean | undefined>();

    /** Disables sorting globally across all columns. */
    public disableSort = input<boolean | undefined>();

    /** Predicate returning whether a row at index is selected. */
    public isRowSelected = input<((index: number) => boolean) | undefined>();

    /** Optional predicate to determine if a specific row checkbox is selectable. */
    public isRowSelectable = input<((row: T, index: number) => boolean) | undefined>();

    /** Optional tooltip shown when hovering over a disabled row checkbox. */
    public rowSelectableTooltip = input<((row: T, index: number) => string) | undefined>();

    /** Enables drag-and-drop row reordering. Default false. */
    public enableDrag = input<boolean | undefined>(false);

    /** Shows or hides the header row. Default true. */
    public showHeaders = input<boolean | undefined>(true);

    /** Applies `display: table` styling so columns size to content. */
    public fitContent = input<boolean | undefined>();

    /** Global max column width in pixels. */
    public maxColumnWidth = input<number | null | undefined>();

    /** Accessible label for the table container. */
    public ariaLabel = input<string | undefined>();

    private _preventFilterCollapseInternal = signal<boolean>(false);

    /** Keeps filter overlays open even when they would normally close on outside click. */
    @Input()
    public get preventFilterCollapse(): boolean {
        return this._preventFilterCollapseInternal();
    }

    public set preventFilterCollapse(value: boolean) {
        this._preventFilterCollapseInternal.set(value);
    }

    /** Alternating row background for readability. Default true. */
    public enableRowStripes = input<boolean>(true);

    /** Allow text to wrap inside table cells. Default false. */
    public enableWordWrap = input<boolean>(false);

    /** Adds hover highlight and pointer cursor on interactive rows. Default true. */
    public interactive = input<boolean>(true);

    /** Template rendered inside expanded row details. */
    public expandedRowTemplate = input<TemplateRef<unknown> | null>(null);

    /** Custom template rendered when the table has no data items. */
    public emptyTemplate = input<TemplateRef<unknown> | null>(null);

    /** Message text shown in the default empty state. Default "No records found". */
    public emptyText = input<string>("No records found");

    /** Custom template for loading spinner/overlay. Context includes `{ mode: "initial" | "more" }`. */
    public loadingTemplate = input<TemplateRef<{ mode: "initial" | "more" }> | null>(null);

    /** Makes selection checkboxes read-only. Default false. */
    public multiselectReadonly = input<boolean>(false);

    /** Enables virtual scrolling for high performance on large datasets. Default false. */
    public enableVirtualScroll = input<boolean>(false);

    /** Estimated row height in px for virtual scroll calculation. Default 48. */
    public virtualRowHeight = input<number>(48);

    /** Extra rows rendered outside visible viewport to prevent blank areas while scrolling. Default 20. */
    public virtualScrollBuffer = input<number>(20);

    /**
     * Custom row tracking function for CDK Table DOM reuse.
     * Defaults to item.id, item.guid, or index.
     */
    public trackBy = input<TrackByFunction<T>>(
        (index: number, item: T) =>
            ((item as Record<string, unknown>)?.['id'] ??
                (item as Record<string, unknown>)?.['guid'] ??
                index) as string | number
    );

    /** Emitted when a column filter overlay closes. */
    public filterCollapsed = output<IInfiniteScrollFilterCollapsedEvent>();

    /** Emitted when sort column or direction changes. */
    public sortChanged = output<IInfiniteScrollSortEvent>();

    /** Emitted when an action within a cell is clicked. */
    public rowActionClicked = output<IInfiniteScrollTableRowActionEvent>();

    /** Emitted when a row is selected. */
    public rowSelected = output<IInfiniteScrollTableRowActionEvent>();

    /** Emitted when the "select all" checkbox is toggled. */
    public allRowsSelected = output<boolean>();

    /** Emitted after a drag-and-drop reorder operation. */
    public rowDropped = output<CdkDragDrop<T[], T[]>>();

    /** Emitted when scrolling up past the scrollUpDistance threshold. */
    public scrolledUp = output<void>();

    /** Emitted with visible row indices in virtual scroll mode. */
    public rowsRendered = output<IInfiniteScrollRowsRenderedEvent>();

    /** Active column definitions projected via content children. */
    public templateColumns = signal<InfiniteScrollTableTemplateColumnDirective[] | null>(null);

    /** Tri-state selection: true = all, false = none, null = indeterminate. */
    public allSelected = signal<boolean | null | undefined>(false);

    /** Set of hidden column keys (by title or dataKey). */
    public hiddenColumns = signal<Set<string>>(new Set());

    /** Whether a column resize drag is in progress (column key or null). */
    public isResizingColumn = signal<string | null>(null);

    /** Per-column width overrides set by resize drag (column key -> width in px). */
    public columnWidths = signal<Map<string, number>>(new Map());

    /**
     * Visible column definitions: full column list filtered by hiddenColumns.
     * Each entry carries the column instance and its stable original array index.
     */
    public visibleTemplateColumns = computed((): Array<{ col: InfiniteScrollTableTemplateColumnDirective; idx: number }> | null => {
        const all = this.templateColumns();
        if (!all) return null;
        const hidden = this.hiddenColumns();
        return all
            .map((col, i) => ({ col, idx: i }))
            .filter(({ col, idx }) => !hidden.has(this._colKey(col, idx)));
    });

    /**
     * MatTable column key identifiers -- auto-computed from visible columns.
     * Reactive to hiddenColumns, isRowSelected, enableDrag, expandedRowTemplate.
     */
    /**
     * Rebuilds columnKeys from current templates and flags.
     * Maintained for 100% backwards compatibility with earlier versions.
     */
    public updateColumnKeys(): void {
        // columnKeys is an auto-reactive computed signal in this package.
    }

    public columnKeys = computed(() => {
        const visible = this.visibleTemplateColumns();
        const dataColumns = visible?.map(({ col, idx }) => col.title || idx.toString()) ?? [];
        return [
            ...(this.isRowSelected() ? ["selection"] : []),
            ...(this.enableDrag() ? ["drag"] : []),
            ...(this.expandedRowTemplate() ? ["expand"] : []),
            ...dataColumns
        ];
    });

    @ContentChildren(InfiniteScrollTableTemplateColumnDirective)
    public set columnTemplateDirectives(value: QueryList<InfiniteScrollTableTemplateColumnDirective>) {
        if (value?.length > 0) {
            this.templateColumns.set(value.toArray());

            if (this.sortDirection() == null) {
                const arr = this.templateColumns();
                this.sortedColumn.set(
                    arr?.filter(
                        (c: InfiniteScrollTableTemplateColumnDirective) =>
                            c.preSortDirection != null && c.preSortDirection !== SortType.None
                    )[0] ?? null
                );
                if (this.sortedColumn()) {
                    this.sortDirection.set(this.sortedColumn()?.preSortDirection ?? SortType.None);
                }
            }
        }
    }

    /** Column currently being sorted. */
    public sortedColumn = signal<InfiniteScrollTableTemplateColumnDirective | null>(null);

    /** Column whose filter overlay is open. */
    public editFilterTarget = signal<InfiniteScrollTableTemplateColumnDirective | null>(null);

    /** Disables infinite scroll trigger when loading or when all data is present. */
    public isScrollDisabled = computed(() => !this.loadMoreRows() || !this.hasMoreData() || this.isLoading());

    /** Resolved virtual-scroll flag (falls back to standard when drag or expandable rows are active). */
    public effectiveVirtualScroll = computed(
        () => this.enableVirtualScroll() && !this.expandedRowTemplate() && !this.enableDrag()
    );

    /** Column keys for virtual mode (minus drag and expansion columns). */
    public virtualColumnKeys = computed(() => {
        const visible = this.visibleTemplateColumns();
        const dataColumns = visible?.map(({ col, idx }) => col.title || idx.toString()) ?? [];
        return [...(this.isRowSelected() ? ['selection'] : []), ...dataColumns];
    });

    /** Slice of items rendered in virtual mode. */
    public virtualVisibleItems = signal<T[]>([]);

    /** First item index of current virtual slice. */
    public virtualRangeStart = signal<number>(0);

    /** True while user is actively scrolling. */
    public isScrolling = signal<boolean>(false);

    public seekController!: SeekController;
    public isSeekingRow!: WritableSignal<boolean>;

    private virtualStrategy = inject(TableVirtualScrollStrategy);
    private destroyRef = inject(DestroyRef);
    private ngZone = inject(NgZone);
    private cdr = inject(ChangeDetectorRef);

    private virtualCtrl = new VirtualScrollController<T>({
        visibleItems: this.virtualVisibleItems,
        rangeStart: this.virtualRangeStart,
        isScrolling: this.isScrolling,
        strategy: this.virtualStrategy,
        destroyRef: this.destroyRef,
        ngZone: this.ngZone,
        cdr: this.cdr,
        getItems: () => this.items(),
        getVirtualRowHeight: () => this.virtualRowHeight(),
        getScrollDistance: () => this.scrollDistance(),
        getVirtualScrollBuffer: () => this.virtualScrollBuffer(),
        isLoading: () => this.isLoading(),
        hasMoreData: () => this.hasMoreData(),
        getLoadMoreRows: () => this.loadMoreRows(),
        onRowsRendered: (event) => this.rowsRendered.emit(event),
        getScrollUpDistance: () => this.scrollUpDistance(),
        onScrolledUp: () => this.scrolledUp.emit(),
        effectiveVirtualScroll: () => this.effectiveVirtualScroll(),
        getViewport: () => this.virtualViewport,
        getEnableWordWrap: () => this.enableWordWrap()
    });

    private fillCheck = new FillCheckController({
        getScrollElement: () =>
            this.effectiveVirtualScroll()
                ? this.virtualViewport?.elementRef?.nativeElement
                : this.scrolltable?.nativeElement,
        getItems: () => this.items(),
        isLoading: () => this.isLoading(),
        hasMoreData: () => this.hasMoreData(),
        getLoadMoreRows: () => this.loadMoreRows(),
        cdr: this.cdr
    });

    /** Tracks expanded rows. */
    public expandedRows = new SelectionModel<T>(true, []);

    /** Two-way bindable scroll position. */
    public scrollTopInput = input<number>(0, { alias: 'scrollTop' });
    public scrollTopChange = output<number>({ alias: 'scrollTopChange' });

    public onTableScroll(): void {
        const top = this.scrolltable?.nativeElement?.scrollTop ?? 0;
        this.scrollTopChange.emit(top);
    }

    private pendingScrollTop: number | null = null;

    // Column resize internal state
    private _resizingKey: string | null = null;
    private _resizeStartX = 0;
    private _resizeStartWidth = 0;
    private _resizeMoveHandler?: (e: MouseEvent) => void;
    private _resizeUpHandler?: () => void;

    public applyScrollTop(top: number): void {
        this.pendingScrollTop = top;
    }

    public sortDirection = signal<SortType | undefined>(undefined);
    public hasCompletedFirstLoad = signal(false);
    private wasEverLoading = signal(false);

    constructor() {
        effect(() => {
            if (this.isLoading()) {
                this.wasEverLoading.set(true);
            }
            if (!this.isLoading() && this.wasEverLoading() && !this.hasCompletedFirstLoad()) {
                this.hasCompletedFirstLoad.set(true);
            }
        });

        this.seekController = new SeekController({
            getItems: () => this.items(),
            isLoading: () => this.isLoading(),
            hasMoreData: () => this.hasMoreData(),
            getLoadMoreRows: () => this.loadMoreRows(),
            onReached: (idx) => {
                this.cancelSeek();
                setTimeout(() => this.scrollToRowDirect(idx, 'auto'));
            },
            cdr: this.cdr
        });

        this.isSeekingRow = this.seekController.isSeeking;
    }

    /** Stable key used for column identity (matches matColumnDef). */
    private _colKey(col: InfiniteScrollTableTemplateColumnDirective, idx: number): string {
        return col.title || col.dataKey || idx.toString();
    }

    public ngOnInit(): void {
        warnInfiniteScrollConfig({
            hasLoadMoreRows: !!this.loadMoreRows(),
            enableVirtualScroll: !!this.enableVirtualScroll(),
            enableDrag: !!this.enableDrag(),
            hasExpandedRowTemplate: !!this.expandedRowTemplate(),
            hasMoreData: !!this.hasMoreData(),
            isLoading: !!this.isLoading(),
            virtualRowHeight: this.virtualRowHeight(),
            virtualScrollBuffer: this.virtualScrollBuffer()
        });
    }

    public ngAfterViewInit(): void {
        this.fillCheck.attach();
    }

    public ngOnDestroy(): void {
        this.fillCheck.destroy();
        this.virtualCtrl.destroy();
        this.seekController?.destroy();
        // Clean up any in-progress column resize
        if (this._resizeMoveHandler) document.removeEventListener("mousemove", this._resizeMoveHandler);
        if (this._resizeUpHandler) document.removeEventListener("mouseup", this._resizeUpHandler);
    }

    public ngAfterViewChecked(): void {
        this.fillCheck.check();
        if (this.pendingScrollTop !== null && this.scrolltable?.nativeElement) {
            this.scrolltable.nativeElement.scrollTop = this.pendingScrollTop;
            this.pendingScrollTop = null;
        }
    }

    /** Cycles sort through Descending -> Ascending -> None. */
    public sortColumn = (column: InfiniteScrollTableTemplateColumnDirective): void => {
        if (this.sortedColumn() !== column) {
            this.sortDirection.set(SortType.Descending);
            this.sortedColumn.set(column);
        } else if (this.sortedColumn() === column) {
            if (this.sortDirection() === SortType.Descending) {
                this.sortDirection.set(SortType.Ascending);
                this.sortedColumn.set(column);
            } else if (this.sortDirection() === SortType.Ascending) {
                this.sortDirection.set(SortType.None);
                this.sortedColumn.set(null);
            }
        }
        const dir = this.sortDirection() ?? SortType.None;
        this.sortChanged.emit({ sortDirection: dir, dataKey: column?.dataKey || null });
    };

    public rowActionClick = (index: number, dataKey?: string, $event?: Event): void => {
        $event?.stopPropagation();
        this.rowActionClicked.emit({ index, dataKey });
    };

    public selectRow = (index: number): void => {
        this.rowSelected.emit({ index });
    };

    public selectAll = (): void => {
        const next = !this.allSelected();
        this.allSelected.set(next);
        this.allRowsSelected.emit(next);
    };

    public resetScroll = (height = 0): void => {
        if (this.effectiveVirtualScroll() && this.virtualViewport) {
            this.virtualViewport.scrollToOffset(height);
        } else if (this.scrolltable?.nativeElement) {
            this.scrolltable.nativeElement.scrollTop = height;
        }
    };

    public resetScrollState = (): void => {
        this.resetScroll(0);
        this.fillCheck.resetGuard();
        if (this.effectiveVirtualScroll()) {
            this.virtualCtrl.resetCaches();
        }
    };

    public scrollToEnd = (): void => {
        if (this.effectiveVirtualScroll() && this.virtualViewport) {
            const totalSize = (this.items()?.length ?? 0) * this.virtualCtrl.effectiveItemSize;
            this.virtualViewport.scrollToOffset(totalSize);
        } else if (this.scrolltable?.nativeElement) {
            this.scrolltable.nativeElement.scrollTop = this.scrolltable.nativeElement.scrollHeight;
        }
    };

    public scrollToRow = (index: number, behavior: ScrollBehavior = 'auto'): void => {
        const len = this.items()?.length ?? 0;
        if (index < len) {
            this.scrollToRowDirect(index, behavior);
            return;
        }
        if (!this.loadMoreRows()) return;
        this.seekController.startSeek(index);
    };

    public cancelSeek = (): void => {
        this.seekController.cancelSeek();
    };

    private scrollToRowDirect(index: number, behavior: ScrollBehavior): void {
        if (this.effectiveVirtualScroll() && this.virtualViewport) {
            this.virtualStrategy.scrollToIndex(index, behavior);
        } else if (this.scrolltable?.nativeElement) {
            const rows = this.scrolltable.nativeElement.querySelectorAll(
                'mat-row:not(.mat-expansion-row)'
            ) as NodeListOf<HTMLElement>;
            const clampedIndex = Math.min(index, rows.length - 1);
            if (clampedIndex >= 0 && rows[clampedIndex]) {
                rows[clampedIndex].scrollIntoView({ behavior, block: 'nearest' });
            }
        }
    }

    public resetSelectAll = (selected?: boolean): void => {
        this.allSelected.set(selected);
    };

    public drop(event: CdkDragDrop<T[], T[]>): void {
        this.rowDropped.emit(event);
    }


    // ── Column Visibility API ───────────────────────────────────────────────────

    /** Hides a column by its key (title -> dataKey -> index string). */
    public hideColumn = (key: string): void => {
        const next = new Set(this.hiddenColumns());
        next.add(key);
        this.hiddenColumns.set(next);
    };

    /** Shows a previously hidden column. */
    public showColumn = (key: string): void => {
        const next = new Set(this.hiddenColumns());
        next.delete(key);
        this.hiddenColumns.set(next);
    };

    /** Toggles a column between visible and hidden. */
    public toggleColumn = (key: string): void => {
        this.hiddenColumns().has(key) ? this.showColumn(key) : this.hideColumn(key);
    };

    /** Returns true if the column is currently hidden. */
    public isColumnHidden = (key: string): boolean => this.hiddenColumns().has(key);

    /** Returns the list of currently hidden column keys. */
    public getHiddenColumns = (): string[] => Array.from(this.hiddenColumns());

    /**
     * Returns all column definitions with key, title, and hidden state.
     * Useful for building a column-picker UI outside the table.
     */
    public getColumnDefinitions = (): Array<{ key: string; title: string; hidden: boolean }> => {
        const all = this.templateColumns();
        if (!all) return [];
        const hidden = this.hiddenColumns();
        return all.map((col, i) => {
            const key = this._colKey(col, i);
            return { key, title: col.title || col.dataKey || `Column ${i + 1}`, hidden: hidden.has(key) };
        });
    };

    // ── Column Resize API ────────────────────────────────────────────────────────

    /**
     * Returns the current resized width (px) for a column, or undefined if not yet resized.
     * Used in the template to override flex/width with the drag result.
     */
    public getColumnWidth = (col: InfiniteScrollTableTemplateColumnDirective, idx: number): number | undefined =>
        this.columnWidths().get(this._colKey(col, idx));

    /** Clears all column resize overrides, restoring original template widths. */
    public resetColumnWidths = (): void => {
        this.columnWidths.set(new Map());
    };

    /** Called from the resize handle mousedown event. */
    public startColumnResize = (
        event: MouseEvent,
        col: InfiniteScrollTableTemplateColumnDirective,
        idx: number
    ): void => {
        event.preventDefault();
        event.stopPropagation();
        const key = this._colKey(col, idx);
        const headerEl = (event.target as HTMLElement).closest('mat-header-cell') as HTMLElement | null;
        this._resizingKey = key;
        this._resizeStartX = event.clientX;
        this._resizeStartWidth = headerEl?.offsetWidth ?? (this.columnWidths().get(key) ?? 150);
        this.isResizingColumn.set(key);

        this._resizeMoveHandler = (e: MouseEvent) => {
            this.ngZone.run(() => {
                const delta = e.clientX - this._resizeStartX;
                const newWidth = Math.max(50, this._resizeStartWidth + delta);
                const next = new Map(this.columnWidths());
                next.set(this._resizingKey!, newWidth);
                this.columnWidths.set(next);
            });
        };

        this._resizeUpHandler = () => {
            this._resizingKey = null;
            this.isResizingColumn.set(null);
            document.removeEventListener('mousemove', this._resizeMoveHandler!);
            document.removeEventListener('mouseup', this._resizeUpHandler!);
            this._resizeMoveHandler = undefined;
            this._resizeUpHandler = undefined;
            this.ngZone.run(() => this.cdr.markForCheck());
        };

        document.addEventListener('mousemove', this._resizeMoveHandler);
        document.addEventListener('mouseup', this._resizeUpHandler);
    };

        public getColumnSortIcon = (column: InfiniteScrollTableTemplateColumnDirective): string => {
        if (this.sortedColumn() === column) {
            switch (this.sortDirection()) {
                case SortType.Ascending:
                    return 'arrow_upward';
                case SortType.Descending:
                    return 'arrow_downward';
                default:
                    return 'remove';
            }
        }
        return 'remove';
    };

    public toggleFilterDisplay = (event: Event, column: InfiniteScrollTableTemplateColumnDirective): void => {
        event.stopPropagation();
        if (this.editFilterTarget() === column) {
            this.editFilterTarget.set(null);
        } else {
            this.editFilterTarget.set(column);
        }
    };

    public closeFilter = (): void => {
        this.editFilterTarget.set(null);
    };

    public filterOverlayPositions: ConnectedPosition[] = [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' }
    ];

    public clearFilterTargetIfMatches = (index: number, column: InfiniteScrollTableTemplateColumnDirective): void => {
        if (!this.preventFilterCollapse && this.editFilterTarget() === column) {
            this.editFilterTarget.set(null);
            this.filterCollapsed.emit({ index, dataKey: column.dataKey });
        }
    };

    public openExpandedRow = (element: T): void => {
        this.expandedRows.select(element);
        this.cdr.markForCheck();
    };

    public toggleExpandedRow = (element: T, event: Event): void => {
        event?.stopPropagation();
        this.expandedRows.toggle(element);
        this.cdr.markForCheck();
    };

    /** Deselects all rows and resets selection state. */
    public clearSelection = (): void => {
        this.allSelected.set(false);
        this.allRowsSelected.emit(false);
    };

    /** Selects all rows. */
    public selectAllRows = (): void => {
        this.allSelected.set(true);
        this.allRowsSelected.emit(true);
    };

    /** Collapses all currently expanded detail rows. */
    public collapseAllRows = (): void => {
        this.expandedRows.clear();
        this.cdr.markForCheck();
    };

    /** Expands all provided rows (or all current items). */
    public expandAllRows = (rows?: T[]): void => {
        const toExpand = rows ?? this.items() ?? [];
        this.expandedRows.clear();
        for (const row of toExpand) {
            this.expandedRows.select(row);
        }
        this.cdr.markForCheck();
    };

    /** Returns an array of currently expanded row items. */
    public getExpandedRows = (): T[] => {
        return this.expandedRows.selected;
    };

    /** Returns whether a specific row is currently expanded. */
    public isRowExpanded = (item: T): boolean => {
        return this.expandedRows.isSelected(item);
    };

    /** Handles keyboard selection or expansion when user presses Space or Enter on a focused row. */
    public onRowKeyDown = (event: KeyboardEvent, row: T, index: number): void => {
        if (event.key === " " || event.key === "Spacebar") {
            event.preventDefault();
            if (this.isRowSelected()) {
                this.selectRow(index);
            } else if (this.expandedRowTemplate()) {
                this.toggleExpandedRow(row, event);
            }
        } else if (event.key === "Enter") {
            if (this.expandedRowTemplate()) {
                this.toggleExpandedRow(row, event);
            }
        }
    };
}
