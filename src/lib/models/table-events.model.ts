import { SortType } from './sort-type.enum';

/**
 * Payload emitted when a column's sort state changes.
 */
export interface IInfiniteScrollSortEvent {
    dataKey: string | null;
    sortDirection: SortType;
}

/**
 * Payload emitted for row-level actions and selections.
 */
export interface IInfiniteScrollTableRowActionEvent {
    index: number;
    dataKey?: string;
}

/**
 * Payload emitted when a column filter overlay closes.
 */
export interface IInfiniteScrollFilterCollapsedEvent {
    index: number;
    dataKey?: string;
}

/**
 * Payload emitted when the rendered row range changes in virtual scroll mode.
 */
export interface IInfiniteScrollRowsRenderedEvent {
    startIndex: number;
    stopIndex: number;
}
