import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    IFilterValueState,
    IInfiniteFilterChangedEvent,
    InfiniteScrollFilterType
} from '../models/filter-events.model';

export interface IFilterHostTable {
    closeFilter(): void;
    preventFilterCollapse?: boolean;
}

/**
 * Filter overlay component for `ngx-infinite-scroll-table` columns.
 * Supports text, numeric range, currency range, date range, boolean, single-select, and multi-select filters.
 */
@Component({
    selector: 'ngx-virtual-infinite-table-filter, ngx-infinite-scroll-table-filter, infinite-scroll-table-filter, app-infinite-scroll-table-filter',
    templateUrl: './infinite-scroll-table-filter.component.html',
    styleUrls: ['./infinite-scroll-table-filter.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatFormFieldModule,
        MatIconModule,
        MatButtonModule,
        MatSelectModule,
        MatRadioModule,
        MatNativeDateModule,
        MatDatepickerModule,
        MatTooltipModule
    ]
})
export class InfiniteScrollTableFilterComponent implements OnInit {
    /** Target property key emitted with filter changes. */
    @Input() public dataKey!: string;

    /** Human-readable column name displayed in placeholders and tooltips. */
    @Input() public columnName = '';

    /** Type of filter input to render. */
    @Input() public type: InfiniteScrollFilterType = 'text';

    /** Filter state model. */
    @Input() public filterValue: IFilterValueState = {};

    /** Reference to the parent table for auto-closing filter overlays. */
    @Input() public scrollTable?: IFilterHostTable;

    /** Comma-separated label strings for multi-select display. */
    @Input() public lookupValueNames = '';

    /** Maximum individual items to show before summarizing as count. */
    private readonly maxDisplayItems = 2;

    /** Returns formatted button text for multi-select. */
    public get displayText(): string {
        if (!this.lookupValueNames || this.lookupValueNames === 'Select Items') {
            return 'Select Items';
        }
        const items = this.lookupValueNames.split(', ');
        if (items.length <= this.maxDisplayItems) {
            return this.lookupValueNames;
        }
        return `${items.length} items selected`;
    }

    /** Emitted when the filter value is applied. */
    @Output() public filterChanged = new EventEmitter<IInfiniteFilterChangedEvent>();

    /** Emitted when multi-select lookup trigger is clicked. */
    @Output() public showLookup = new EventEmitter<{ dataKey: string; event: MouseEvent }>();

    public ngOnInit(): void {
        if (!this.filterValue) {
            this.filterValue = { enabled: false };
        }
    }

    public applyFilters = (): void => {
        this.filterValue.enabled = true;

        if (
            (this.type === 'text' && (!this.filterValue.text || this.filterValue.text === '')) ||
            (this.type === 'boolean' && (this.filterValue.text == null || this.filterValue.text === '')) ||
            ((this.type === 'numeric' || this.type === 'currency') &&
                (this.filterValue.minValue == null || this.filterValue.minValue === '') &&
                (this.filterValue.maxValue == null || this.filterValue.maxValue === '')) ||
            (this.type === 'date' &&
                (!this.filterValue.minDate || this.filterValue.minDate === '') &&
                (!this.filterValue.maxDate || this.filterValue.maxDate === '')) ||
            (this.type === 'singleselect' && !this.filterValue.singleselect)
        ) {
            this.filterValue.enabled = false;
        }

        this.filterChanged.emit({
            dataKey: this.dataKey,
            filterValue: this.filterValue
        });

        this.scrollTable?.closeFilter();
    };

    public clearFilter = (): void => {
        this.filterValue = { enabled: false };
        switch (this.type) {
            case 'text':
            case 'singleselect':
            case 'boolean':
                this.filterValue.text = null;
                this.filterValue.singleselect = null;
                break;
            case 'numeric':
            case 'currency':
                this.filterValue.minValue = null;
                this.filterValue.maxValue = null;
                break;
            case 'date':
                this.filterValue.minDate = null;
                this.filterValue.maxDate = null;
                break;
            case 'multiselect':
                this.filterValue.lookupValueNames = null;
                break;
            default:
                break;
        }
        this.applyFilters();
    };

    public keyPress = (event: KeyboardEvent): void => {
        if (event.key === 'Enter') {
            this.applyFilters();
        }
    };

    public triggerLookup(event: MouseEvent): void {
        this.showLookup.emit({ dataKey: this.dataKey, event });
    }

    public datePickerOpened(): void {
        if (this.scrollTable) {
            this.scrollTable.preventFilterCollapse = true;
        }
    }

    public datePickerClosed(): void {
        if (this.scrollTable) {
            this.scrollTable.preventFilterCollapse = false;
        }
    }
}
