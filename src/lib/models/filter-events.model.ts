/**
 * Filter value payload for table columns.
 */
export interface IFilterValueState {
    enabled?: boolean | string;
    text?: string | null;
    minValue?: number | string | null;
    maxValue?: number | string | null;
    minDate?: Date | string | null;
    maxDate?: Date | string | null;
    singleselect?: string | number | null;
    lookupValueNames?: string | null;
    options?: (string | number)[];
    [key: string]: unknown;
}

/**
 * Payload emitted when an active column filter changes.
 */
export interface IInfiniteFilterChangedEvent {
    dataKey: string;
    filterValue: IFilterValueState;
}

/**
 * Filter types supported by the default column filter component.
 */
export type InfiniteScrollFilterType =
    | 'text'
    | 'numeric'
    | 'currency'
    | 'date'
    | 'boolean'
    | 'multiselect'
    | 'singleselect';
