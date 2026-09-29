import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ChangeDetectorRef, DestroyRef, effect, ElementRef, NgZone, WritableSignal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TableVirtualScrollStrategy } from './table-virtual-scroll-strategy';

/**
 * Configuration options for VirtualScrollController.
 */
export interface VirtualScrollControllerConfig<T = unknown> {
    /** Signal to write the visible (sliced) items into. */
    visibleItems: WritableSignal<T[]>;
    /** Signal to write the current range-start index into. */
    rangeStart: WritableSignal<number>;
    /** Signal to write the scrolling flag into. */
    isScrolling: WritableSignal<boolean>;
    /** The CDK virtual scroll strategy provided at the component level. */
    strategy: TableVirtualScrollStrategy;
    destroyRef: DestroyRef;
    ngZone: NgZone;
    cdr: ChangeDetectorRef;

    // Callbacks that read component inputs / state
    getItems: () => T[] | undefined;
    getVirtualRowHeight: () => number;
    getScrollDistance: () => number;
    getVirtualScrollBuffer: () => number;
    isLoading: () => boolean;
    hasMoreData: () => boolean;
    getLoadMoreRows: () => (() => void) | undefined;
    onRowsRendered: (event: { startIndex: number; stopIndex: number }) => void;
    getScrollUpDistance: () => number;
    onScrolledUp: () => void;

    // Effect dependencies
    effectiveVirtualScroll: () => boolean;
    getViewport: () => CdkVirtualScrollViewport | undefined;
    getEnableWordWrap?: () => boolean;
}

/**
 * Orchestrates virtual scrolling between `CdkVirtualScrollViewport`,
 * `TableVirtualScrollStrategy`, and the host table component.
 */
export class VirtualScrollController<T = unknown> {
    private measuredRowHeight: number | null = null;
    private rowHeightMeasured = false;
    private scrollingTimer: ReturnType<typeof setTimeout> | null = null;
    private columnWidthCache: number[] = [];
    private widthSyncScheduled = false;
    private lastScrollOffset = 0;
    private lastScrollLeft = -1;
    private lastWordWrapState: boolean | null = null;
    private cacheStable = false;
    private viewport: CdkVirtualScrollViewport | null = null;
    private headerWrapper: ElementRef | null = null;
    private attachSub: Subscription | null = null;

    constructor(private readonly config: VirtualScrollControllerConfig<T>) {
        effect(() => {
            if (this.config.effectiveVirtualScroll()) {
                this.syncData(this.config.getViewport());
            }
        });
    }

    /** Returns measured row height if available, otherwise the configured initial virtualRowHeight. */
    public get effectiveItemSize(): number {
        return this.measuredRowHeight ?? this.config.getVirtualRowHeight();
    }

    /**
     * Pushes current data length, row height, and buffer to the scroll strategy,
     * and re-slices visible items from the data array.
     */
    public syncData(viewport: CdkVirtualScrollViewport | undefined): void {
        const wordWrap = this.config.getEnableWordWrap?.() ?? false;
        if (this.lastWordWrapState !== null && this.lastWordWrapState !== wordWrap) {
            this.rowHeightMeasured = false;
            this.measuredRowHeight = null;
        }
        this.lastWordWrapState = wordWrap;

        const items = this.config.getItems() ?? [];
        const activeViewport = viewport ?? this.viewport ?? undefined;

        this.config.strategy.updateDataLength(items.length);
        this.config.strategy.updateItemSize(this.effectiveItemSize);
        this.config.strategy.updateBufferSize(this.config.getVirtualScrollBuffer());

        if (activeViewport) {
            activeViewport.checkViewportSize?.();
        }

        if (items.length > 0) {
            let range = activeViewport?.getRenderedRange();
            if (!range || (range.start === 0 && range.end === 0)) {
                const vpHeight = activeViewport?.getViewportSize() || 500;
                const visibleCount = Math.max(15, Math.ceil(vpHeight / this.effectiveItemSize));
                const buffer = this.config.getVirtualScrollBuffer();
                const fallbackEnd = Math.min(items.length, visibleCount + buffer);
                range = { start: 0, end: fallbackEnd };
                if (activeViewport) {
                    activeViewport.setRenderedRange(range);
                }
            }
            this.config.visibleItems.set(items.slice(range.start, range.end));
            this.config.rangeStart.set(range.start);
        } else {
            this.config.visibleItems.set([]);
            this.config.rangeStart.set(0);
        }

        this.config.cdr.markForCheck();
        this.scheduleWidthSync();
    }

    /** Subscribes to the viewport's range and scroll streams. */
    public attach(viewport: CdkVirtualScrollViewport, headerWrapper: ElementRef | undefined): void {
        this.detach();

        this.viewport = viewport;
        this.headerWrapper = headerWrapper ?? null;

        // Ensure strategy is attached to the viewport and size is calculated
        this.config.strategy.attach(viewport);
        viewport?.checkViewportSize?.();

        // Immediately synchronize current items and row dimensions
        this.syncData(viewport);

        const sub = new Subscription();
        this.attachSub = sub;

        sub.add(
            viewport.renderedRangeStream.subscribe((rawRange) => {
                const allItems = this.config.getItems() ?? [];
                let range = rawRange;
                if (allItems.length > 0 && range.end === 0) {
                    const vpHeight = viewport.getViewportSize() || 500;
                    const visibleCount = Math.max(15, Math.ceil(vpHeight / this.effectiveItemSize));
                    const buffer = this.config.getVirtualScrollBuffer();
                    range = { start: 0, end: Math.min(allItems.length, visibleCount + buffer) };
                }
                this.config.visibleItems.set(allItems.slice(range.start, range.end));
                this.config.rangeStart.set(range.start);
                this.checkLoadMore(range, allItems.length);
                this.config.onRowsRendered({
                    startIndex: range.start,
                    stopIndex: Math.max(range.start, range.end - 1)
                });
                this.config.cdr.markForCheck();

                requestAnimationFrame(() => {
                    if (!this.rowHeightMeasured && allItems.length > 0) {
                        this.rowHeightMeasured = true;
                        this.measureAndUpdateRowHeight();
                    }
                });
                if (!this.cacheStable) {
                    this.scheduleWidthSync();
                }
            })
        );

        this.config.ngZone.runOutsideAngular(() => {
            sub.add(
                viewport.elementScrolled().subscribe(() => {
                    this.syncHorizontalScroll();
                    this.updateScrollingState();
                    this.checkScrolledUp();
                })
            );
        });
    }

    /** Detaches the current viewport and header references. */
    public detach(): void {
        this.attachSub?.unsubscribe();
        this.attachSub = null;
        this.viewport = null;
        this.headerWrapper = null;
    }

    /** Clears pending timers. Call from ngOnDestroy. */
    public destroy(): void {
        if (this.scrollingTimer) {
            clearTimeout(this.scrollingTimer);
            this.scrollingTimer = null;
        }
        this.detach();
    }

    /** Clears row-height and column-width caches. */
    public resetCaches(): void {
        this.rowHeightMeasured = false;
        this.measuredRowHeight = null;
        this.columnWidthCache = [];
        this.cacheStable = false;
    }

    /** Batches column-width sync to next animation frame. */
    public scheduleWidthSync(): void {
        if (this.widthSyncScheduled) return;
        this.widthSyncScheduled = true;
        requestAnimationFrame(() => {
            this.widthSyncScheduled = false;
            this.syncColumnWidths();
        });
    }

    private syncHorizontalScroll(): void {
        const vpEl = this.viewport?.elementRef?.nativeElement;
        const headerWrapperEl = this.headerWrapper?.nativeElement;
        if (!vpEl || !headerWrapperEl) return;

        const currentLeft = vpEl.scrollLeft;
        if (currentLeft === this.lastScrollLeft) return;
        this.lastScrollLeft = currentLeft;

        const headerTable = headerWrapperEl.querySelector('mat-table') as HTMLElement;
        if (headerTable) {
            headerTable.style.transform = `translateX(-${currentLeft}px)`;
        }
    }

    private updateScrollingState(): void {
        if (!this.config.isScrolling()) {
            this.config.isScrolling.set(true);
        }
        if (this.scrollingTimer) {
            clearTimeout(this.scrollingTimer);
        }
        this.scrollingTimer = setTimeout(() => {
            this.config.isScrolling.set(false);
            this.config.cdr.markForCheck();
        }, 150);
    }

    private checkScrolledUp(): void {
        const vpEl = this.viewport?.elementRef?.nativeElement;
        if (!vpEl) return;

        const currentOffset = vpEl.scrollTop;
        const viewportSize = this.viewport?.getViewportSize() ?? 0;
        const threshold = viewportSize * this.config.getScrollUpDistance();

        if (currentOffset < this.lastScrollOffset && currentOffset <= threshold) {
            this.config.onScrolledUp();
        }
        this.lastScrollOffset = currentOffset;
    }

    private measureAndUpdateRowHeight(): void {
        const vpEl = this.viewport?.elementRef?.nativeElement;
        if (!vpEl) return;

        const rows: NodeListOf<HTMLElement> = vpEl.querySelectorAll('mat-row');
        if (rows.length === 0) return;

        let totalHeight = 0;
        rows.forEach((row) => {
            totalHeight += row.getBoundingClientRect().height;
        });

        const avgHeight = Math.round(totalHeight / rows.length);
        if (avgHeight > 0 && Math.abs(avgHeight - this.effectiveItemSize) > 2) {
            this.measuredRowHeight = avgHeight;
            this.config.strategy.updateItemSize(avgHeight);
        }
    }

    private syncColumnWidths(): void {
        const vpEl = this.viewport?.elementRef?.nativeElement;
        const headerWrapperEl = this.headerWrapper?.nativeElement;
        if (!vpEl || !headerWrapperEl) return;

        const bodyTable: HTMLElement | null = vpEl.querySelector('mat-table');
        const headerTable: HTMLElement | null = headerWrapperEl.querySelector('mat-table');
        if (!bodyTable || !headerTable) return;

        if (this.cacheStable) {
            headerTable.style.transform = `translateX(-${vpEl.scrollLeft}px)`;
            return;
        }

        const bodyRow = vpEl.querySelector('mat-row');
        const headerRow = headerWrapperEl.querySelector('mat-header-row');
        if (!bodyRow || !headerRow) return;

        const headerCells: NodeListOf<HTMLElement> = headerRow.querySelectorAll('mat-header-cell');
        const bodyCells: NodeListOf<HTMLElement> = bodyRow.querySelectorAll('mat-cell');

        const colCount = Math.max(bodyCells.length, headerCells.length);
        const measured: number[] = [];
        for (let i = 0; i < colCount; i++) {
            const bodyW = bodyCells[i]?.getBoundingClientRect().width ?? 0;
            const headerW = headerCells[i]?.getBoundingClientRect().width ?? 0;
            measured.push(Math.max(bodyW, headerW));
        }

        let anyChanged = false;
        for (let i = 0; i < colCount; i++) {
            const cached = this.columnWidthCache[i] ?? 0;
            const candidate = measured[i] ?? 0;
            if (candidate > cached) {
                this.columnWidthCache[i] = candidate;
                anyChanged = true;
            }
        }

        if (!anyChanged && this.columnWidthCache.length >= colCount && colCount > 0) {
            this.cacheStable = true;
        }

        const allBodyRows: NodeListOf<HTMLElement> = vpEl.querySelectorAll('mat-row');

        if (anyChanged) {
            for (let i = 0; i < colCount; i++) {
                const w = `${this.columnWidthCache[i]}px`;
                const hc = headerCells[i];
                if (hc) {
                    hc.style.width = w;
                    hc.style.minWidth = w;
                    hc.style.maxWidth = w;
                }
            }
        }

        allBodyRows.forEach((row) => {
            const cells = row.querySelectorAll('mat-cell') as NodeListOf<HTMLElement>;
            cells.forEach((cell, i) => {
                if (this.columnWidthCache[i]) {
                    cell.style.minWidth = `${this.columnWidthCache[i]}px`;
                }
            });
        });

        if (anyChanged) {
            headerTable.style.minWidth = `${bodyTable.scrollWidth}px`;
        }

        headerTable.style.transform = `translateX(-${vpEl.scrollLeft}px)`;
    }

    private checkLoadMore(range: ListRange, totalItems: number): void {
        if (this.config.isLoading() || !this.config.hasMoreData() || !this.config.getLoadMoreRows()) return;

        const viewportSize = this.viewport?.getViewportSize() ?? 0;
        const visibleRows = viewportSize > 0 ? Math.ceil(viewportSize / this.effectiveItemSize) : 10;
        const threshold = Math.max(
            this.config.getVirtualScrollBuffer(),
            Math.ceil(visibleRows * this.config.getScrollDistance())
        );
        if (range.end >= totalItems - threshold && totalItems > 0) {
            this.config.getLoadMoreRows()?.();
        }
    }
}
