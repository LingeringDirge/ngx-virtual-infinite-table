import { CdkVirtualScrollViewport, VirtualScrollStrategy } from '@angular/cdk/scrolling';
import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

/**
 * Custom virtual scroll strategy for mat-table.
 *
 * Provides fixed-size virtual scrolling math for a mat-table that is not
 * rendered with `*cdkVirtualFor` (mat-table uses `*matRowDef`).
 */
@Injectable()
export class TableVirtualScrollStrategy implements VirtualScrollStrategy, OnDestroy {
    private scrolledIndexChange$ = new Subject<number>();

    /** Observable that emits the first visible item index whenever it changes. */
    public scrolledIndexChange: Observable<number> = this.scrolledIndexChange$.pipe(distinctUntilChanged());

    private viewport: CdkVirtualScrollViewport | null = null;

    private itemSize = 48;

    private dataLength = 0;

    private bufferSize = 20;

    /**
     * Update the number of buffer rows rendered above and below the
     * visible range. Higher values reduce blank flashes during fast
     * scrolling at the cost of slightly more DOM nodes.
     */
    public updateBufferSize(bufferSize: number): void {
        this.bufferSize = bufferSize;
    }

    /**
     * Update the estimated/measured row height in pixels.
     */
    public updateItemSize(itemSize: number): void {
        if (itemSize > 0 && itemSize !== this.itemSize) {
            this.itemSize = itemSize;
            this.updateRenderedRange();
        }
    }

    /**
     * Update total number of available items.
     */
    public updateDataLength(length: number): void {
        this.dataLength = length;
        this.onDataLengthChanged();
    }

    public attach(viewport: CdkVirtualScrollViewport): void {
        this.viewport = viewport;
        this.onDataLengthChanged();
        this.updateRenderedRange();
    }

    public detach(): void {
        this.viewport = null;
    }

    public ngOnDestroy(): void {
        this.scrolledIndexChange$.complete();
        this.viewport = null;
    }

    public onContentScrolled(): void {
        this.updateRenderedRange();
    }

    public onDataLengthChanged(): void {
        if (this.viewport) {
            this.viewport.setTotalContentSize(this.dataLength * this.itemSize);
        }
        this.updateRenderedRange();
    }

    public onContentRendered(): void {}

    public onRenderedOffsetChanged(): void {}

    public scrollToIndex(index: number, behavior: ScrollBehavior = 'auto'): void {
        if (this.viewport) {
            this.viewport.scrollToOffset(index * this.itemSize, behavior);
        }
    }

    private updateRenderedRange(): void {
        if (!this.viewport) return;

        const scrollOffset = this.viewport.measureScrollOffset();
        const firstVisibleIndex = Math.floor(scrollOffset / this.itemSize);
        const viewportSize = this.viewport.getViewportSize();
        const visibleRangeCount = Math.ceil(viewportSize / this.itemSize);

        const start = Math.max(0, firstVisibleIndex - this.bufferSize);
        const end = Math.min(this.dataLength, firstVisibleIndex + visibleRangeCount + this.bufferSize);

        this.viewport.setRenderedRange({ start, end });
        this.viewport.setRenderedContentOffset(start * this.itemSize);
        this.scrolledIndexChange$.next(firstVisibleIndex);
    }
}
