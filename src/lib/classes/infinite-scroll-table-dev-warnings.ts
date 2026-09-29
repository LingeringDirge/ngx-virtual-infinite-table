import { isDevMode } from '@angular/core';

/**
 * Emit developer-mode console warnings for misconfigured or conflicting
 * `InfiniteScrollTable` inputs. Warnings run only in dev mode to avoid
 * noisy logs in production.
 *
 * @param opts Configuration snapshot from the component used to evaluate
 * potential conflicts and suspicious values.
 */
export function warnInfiniteScrollConfig(opts: {
    hasLoadMoreRows: boolean;
    enableVirtualScroll: boolean;
    enableDrag: boolean;
    hasExpandedRowTemplate: boolean;
    fitContent?: boolean;
    hasMoreData?: boolean;
    isLoading?: boolean;
    virtualRowHeight?: number;
    virtualScrollBuffer?: number;
}): void {
    if (!isDevMode()) return;

    if (opts.enableVirtualScroll && opts.enableDrag) {
        console.warn(
            '[InfiniteScrollTable] `enableVirtualScroll` is incompatible with `enableDrag`. Virtual scrolling will be disabled.'
        );
    }

    if (opts.enableVirtualScroll && opts.hasExpandedRowTemplate) {
        console.warn(
            '[InfiniteScrollTable] `enableVirtualScroll` is incompatible with `expandedRowTemplate`. Virtual scrolling will be disabled.'
        );
    }

    if (opts.enableVirtualScroll && opts.fitContent) {
        console.warn(
            '[InfiniteScrollTable] `enableVirtualScroll` is incompatible with `fitContent`. Virtual scrolling will be disabled.'
        );
    }

    if (!opts.hasLoadMoreRows && !opts.enableVirtualScroll) {
        console.warn('[InfiniteScrollTable] No `loadMoreRows` callback provided; infinite loading will not occur.');
    }

    if (!opts.hasMoreData && opts.isLoading) {
        console.warn(
            '[InfiniteScrollTable] `hasMoreData` is false while `isLoading` is true - these flags are contradictory.'
        );
    }

    if (opts.virtualRowHeight !== undefined && opts.virtualRowHeight > 200) {
        console.warn('[InfiniteScrollTable] `virtualRowHeight` is unusually large and may cause layout issues.');
    }

    if (opts.virtualScrollBuffer !== undefined && opts.virtualScrollBuffer > 200) {
        console.warn('[InfiniteScrollTable] `virtualScrollBuffer` is very large and may hurt performance.');
    }
}
