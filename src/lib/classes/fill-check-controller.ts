import { ChangeDetectorRef } from '@angular/core';

export interface FillCheckControllerConfig {
    /** Returns the scroll container element (virtual viewport or mat-table wrapper). */
    getScrollElement: () => HTMLElement | undefined;
    getItems: () => unknown[] | undefined;
    isLoading: () => boolean;
    hasMoreData: () => boolean;
    getLoadMoreRows: () => (() => void) | undefined;
    cdr: ChangeDetectorRef;
}

/**
 * Detects when the scroll container has no scrollbar (content shorter than
 * the container) and proactively calls `loadMoreRows()` to fill the view.
 */
export class FillCheckController {
    private lastItemCount = 0;
    private resizeObserver: ResizeObserver | null = null;
    private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private readonly config: FillCheckControllerConfig) {}

    /** Sets up a ResizeObserver on the scroll container. */
    public attach(): void {
        const el = this.config.getScrollElement();
        if (!el || typeof ResizeObserver === 'undefined') return;

        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeDebounceTimer) {
                clearTimeout(this.resizeDebounceTimer);
            }
            this.resizeDebounceTimer = setTimeout(() => {
                const htmlElement = this.config.getScrollElement();
                if (
                    htmlElement &&
                    htmlElement.clientHeight > 0 &&
                    htmlElement.clientHeight >= htmlElement.scrollHeight &&
                    !!this.config.getLoadMoreRows() &&
                    this.config.hasMoreData() &&
                    !this.config.isLoading() &&
                    (this.config.getItems()?.length ?? 0) > 0
                ) {
                    this.lastItemCount = 0;
                    this.config.cdr.markForCheck();
                }
            }, 200);
        });
        this.resizeObserver.observe(el);
    }

    /** Proactively requests more data if the container is underfilled. */
    public check(): void {
        if (!this.config.hasMoreData() || this.config.isLoading()) return;

        const htmlElement = this.config.getScrollElement();
        const itemCount = this.config.getItems()?.length ?? 0;
        if (
            htmlElement &&
            htmlElement.clientHeight > 0 &&
            htmlElement.clientHeight >= htmlElement.scrollHeight &&
            !!this.config.getLoadMoreRows() &&
            this.config.hasMoreData() &&
            !this.config.isLoading() &&
            itemCount > 0
        ) {
            if (this.lastItemCount !== itemCount) {
                this.lastItemCount = itemCount;
                this.config.getLoadMoreRows()?.();
            }
        }
    }

    /** Resets the duplicate-load guard. */
    public resetGuard(): void {
        this.lastItemCount = 0;
    }

    /** Cleans up observers and timers. */
    public destroy(): void {
        if (this.resizeDebounceTimer) {
            clearTimeout(this.resizeDebounceTimer);
            this.resizeDebounceTimer = null;
        }
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
    }
}
