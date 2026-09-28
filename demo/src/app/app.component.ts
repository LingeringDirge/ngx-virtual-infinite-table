import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
    NgZone,
    OnDestroy,
    OnInit,
    TrackByFunction,
    signal,
    viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
    InfiniteScrollTableComponent,
    InfiniteScrollTableFilterComponent,
    InfiniteScrollTableTemplateColumnDirective,
    IFilterValueState,
    IInfiniteFilterChangedEvent,
    IInfiniteScrollSortEvent,
    IInfiniteScrollTableRowActionEvent,
    SortType,
    exportToCsv
} from 'ngx-virtual-infinite-table';

export interface ProductItem {
    id: number;
    title: string;
    category: string;
    price: number;
    stock: number;
    rating: number;
    inStock: boolean;
    createdDate: string;
    description: string;
}

const CATEGORIES = [
    'Electronics',
    'Home & Kitchen',
    'Books',
    'Clothing',
    'Sports',
    'Automotive',
    'Health & Beauty'
];

/**
 * Inline Web Worker script for multi-column filtering and multi-type sorting.
 * Using a Blob URL keeps the worker bundle 100% portable with zero custom build configuration.
 */
const FILTER_WORKER_SCRIPT = `
self.onmessage = function(e) {
    var data = e.data;
    var items = data.items || [];
    var filters = data.filters || {};
    var sortField = data.sortField;
    var sortDirection = data.sortDirection;

    // ── 1. Background Multi-Column Filter ──
    var filtered = items.filter(function(item) {
        for (var key in filters) {
            if (!Object.prototype.hasOwnProperty.call(filters, key)) continue;
            var val = filters[key];
            if (!val || !val.enabled) continue;

            if (key === 'title' && val.text) {
                if (item.title.toLowerCase().indexOf(val.text.toLowerCase()) === -1) return false;
            }
            if (key === 'category' && val.singleselect) {
                if (item.category !== val.singleselect) return false;
            }
            if (key === 'price') {
                if (val.minValue != null && item.price < Number(val.minValue)) return false;
                if (val.maxValue != null && item.price > Number(val.maxValue)) return false;
            }
            if (key === 'stock') {
                if (val.minValue != null && item.stock < Number(val.minValue)) return false;
                if (val.maxValue != null && item.stock > Number(val.maxValue)) return false;
            }
            if (key === 'inStock' && val.text != null) {
                if (item.inStock !== (val.text === 'true')) return false;
            }
        }
        return true;
    });

    // ── 2. Background Multi-Type Sorter ──
    if (sortField && sortDirection) {
        var isAsc = sortDirection === 1 || sortDirection === '1' || sortDirection === 'asc' || sortDirection === 'Ascending';
        filtered.sort(function(a, b) {
            var valA = a[sortField];
            var valB = b[sortField];
            if (valA < valB) return isAsc ? -1 : 1;
            if (valA > valB) return isAsc ? 1 : -1;
            return 0;
        });
    }

    self.postMessage(filtered);
};
`;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMO APPLICATION COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════
 */
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSlideToggleModule,
        MatMenuModule,
        MatTooltipModule,
        InfiniteScrollTableComponent,
        InfiniteScrollTableFilterComponent,
        InfiniteScrollTableTemplateColumnDirective
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
    /** Reference to the child table component for programmatic controls (seek, export, reset). */
    public table = viewChild(InfiniteScrollTableComponent);

    private readonly ngZone = inject(NgZone);
    private readonly cdr = inject(ChangeDetectorRef);

    // ── Feature Toggles ────────────────────────────────────────────────────
    /** True = Virtualized Infinite Scroll (Default), False = Standard Infinite Scroll. */
    public isVirtualScroll = signal<boolean>(true);
    public isDarkMode = signal<boolean>(false);
    public enableDrag = signal<boolean>(false);
    public enableExpansion = signal<boolean>(false);
    public enableRowStripes = signal<boolean>(true);
    public enableWordWrap = signal<boolean>(false);
    public enableSelection = signal<boolean>(true);
    public fitContent = signal<boolean>(false);

    // ── Table State ────────────────────────────────────────────────────────
    /** Rows currently passed to `<ngx-virtual-infinite-table [items]="displayedProducts()">`. */
    public displayedProducts = signal<ProductItem[]>([]);
    public isLoading = signal<boolean>(false);
    public hasMoreData = signal<boolean>(true);

    // ── Sort & Filter State ────────────────────────────────────────────────
    public sortField = signal<string | null>(null);
    public sortDirection = signal<SortType | null>(null);
    public activeFilters = signal<Record<string, IFilterValueState>>({
        title: { enabled: false },
        category: { enabled: false },
        price: { enabled: false },
        stock: { enabled: false },
        inStock: { enabled: false }
    });

    // ── Column Visibility ──────────────────────────────────────────────────
    public hiddenColumns = signal<Set<string>>(new Set<string>());
    public allColumns: string[] = [
        'ID',
        'Product Name',
        'Category',
        'Price ($)',
        'Stock',
        'Status',
        'Date Added',
        'Rating'
    ];

    // ── Jump to Row (Seek) ─────────────────────────────────────────────────
    public seekRowIndex = signal<number>(500);

    // ── Row Selection State ────────────────────────────────────────────────
    public selectedRowIds = signal<Set<number>>(new Set<number>());

    // ── Dataset Management ─────────────────────────────────────────────────
    /** Number of rows to page into the table per chunk. */
    private readonly pageSize = 100;
    /** Full raw mock dataset (5,000 items). */
    private allMockProducts: ProductItem[] = [];
    /** Current filtered & sorted subset awaiting pagination slicing. */
    private filteredDataset: ProductItem[] = [];
    /** Current pagination offset. */
    private currentOffset = 0;
    /** Background Web Worker for non-blocking filter and sort operations. */
    private filterWorker: Worker | null = null;
    private workerBlobUrl: string | null = null;

    // ── Lifecycle Hooks ────────────────────────────────────────────────────

    public ngOnInit(): void {
        this.initWebWorker();
        // Generate mock dataset of 5,000 products
        this.allMockProducts = this.generateMockDataset(5000);
        this.filteredDataset = [...this.allMockProducts];

        // Load initial page synchronously to guarantee instantaneous first render
        const initialChunk = this.filteredDataset.slice(0, this.pageSize);
        this.currentOffset = initialChunk.length;
        this.displayedProducts.set(initialChunk);
        this.hasMoreData.set(this.currentOffset < this.filteredDataset.length);
        this.isLoading.set(false);
    }

    public ngOnDestroy(): void {
        if (this.filterWorker) {
            this.filterWorker.terminate();
            this.filterWorker = null;
        }
        if (this.workerBlobUrl) {
            URL.revokeObjectURL(this.workerBlobUrl);
            this.workerBlobUrl = null;
        }
    }

    // ── TrackBy Function ───────────────────────────────────────────────────

    public trackByProduct: TrackByFunction<ProductItem> = (_index: number, item: ProductItem): number => {
        return item.id;
    };

    // ── Web Worker Initialization ──────────────────────────────────────────

    private initWebWorker(): void {
        if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
            try {
                const blob = new Blob([FILTER_WORKER_SCRIPT], { type: 'application/javascript' });
                this.workerBlobUrl = URL.createObjectURL(blob);
                this.filterWorker = new Worker(this.workerBlobUrl);
                this.filterWorker.onmessage = ({ data }: { data: ProductItem[] }) => {
                    this.ngZone.run(() => {
                        this.onFilterWorkerComplete(data);
                        this.cdr.markForCheck();
                    });
                };
            } catch {
                this.filterWorker = null;
            }
        }
    }

    // ── Mode Toggles ───────────────────────────────────────────────────────

    public toggleDarkMode(): void {
        const next = !this.isDarkMode();
        this.isDarkMode.set(next);
        if (next) {
            document.body.classList.add('dark-theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme', 'dark');
        }
    }

    public onModeChange(mode: 'virtual' | 'infinite'): void {
        const next = mode === 'virtual';
        if (this.isVirtualScroll() === next) return;
        this.isVirtualScroll.set(next);
        if (next) {
            this.enableDrag.set(false);
            this.enableExpansion.set(false);
        } else {
            this.enableExpansion.set(true);
        }
        this.resetAndLoad();
    }

    public toggleVirtualMode(): void {
        this.onModeChange(this.isVirtualScroll() ? 'infinite' : 'virtual');
    }

    // ── Data Operations & Progressive Infinite Scroll ──────────────────────

    public resetAndLoad(): void {
        this.isLoading.set(true);
        this.currentOffset = 0;
        this.selectedRowIds.set(new Set());
        this.hasMoreData.set(true);

        const workerPayload = {
            items: this.allMockProducts,
            filters: this.activeFilters(),
            sortField: this.sortField(),
            sortDirection: this.sortDirection()
        };

        if (this.filterWorker) {
            this.filterWorker.postMessage(workerPayload);
        } else {
            const filtered = this.applyClientSideFilters(this.allMockProducts);
            const sorted = this.applyClientSideSort(filtered);
            this.onFilterWorkerComplete(sorted);
        }
    }

    private onFilterWorkerComplete(results: ProductItem[]): void {
        this.filteredDataset = results;
        this.currentOffset = 0;

        const initialChunk = this.filteredDataset.slice(0, this.pageSize);
        this.currentOffset = initialChunk.length;
        this.displayedProducts.set(initialChunk);
        this.hasMoreData.set(this.currentOffset < this.filteredDataset.length);
        this.isLoading.set(false);

        this.table()?.resetScrollState();
        this.cdr.markForCheck();
    }

    public loadMoreRows = (): void => {
        if (this.isLoading() || !this.hasMoreData()) return;
        this.isLoading.set(true);

        setTimeout(() => {
            const nextChunk = this.filteredDataset.slice(this.currentOffset, this.currentOffset + this.pageSize);
            this.currentOffset += nextChunk.length;
            this.displayedProducts.update((prev: ProductItem[]) => [...prev, ...nextChunk]);
            this.hasMoreData.set(this.currentOffset < this.filteredDataset.length);
            this.isLoading.set(false);
            this.cdr.markForCheck();
        }, 20);
    };

    // ── Sort / Filter Handlers ─────────────────────────────────────────────

    public onSortChange(event: IInfiniteScrollSortEvent): void {
        this.sortDirection.set(event.sortDirection);
        this.sortField.set(event.dataKey);
        this.resetAndLoad();
    }

    public onFilterChange(event: IInfiniteFilterChangedEvent): void {
        this.activeFilters.update((prev: Record<string, IFilterValueState>) => ({
            ...prev,
            [event.dataKey]: event.filterValue
        }));
        this.resetAndLoad();
    }

    // ── Selection Handlers ─────────────────────────────────────────────────

    public isRowSelected = (index: number): boolean => {
        const item = this.displayedProducts()[index];
        return item ? this.selectedRowIds().has(item.id) : false;
    };

    public onRowSelected(event: IInfiniteScrollTableRowActionEvent): void {
        const item = this.displayedProducts()[event.index];
        if (!item) return;
        this.selectedRowIds.update((set: Set<number>) => {
            const next = new Set(set);
            next.has(item.id) ? next.delete(item.id) : next.add(item.id);
            return next;
        });
    }

    public onAllRowsSelected(selected: boolean): void {
        if (selected) {
            this.selectedRowIds.set(new Set(this.displayedProducts().map((p: ProductItem) => p.id)));
        } else {
            this.selectedRowIds.set(new Set());
        }
    }

    public clearSelection(): void {
        this.selectedRowIds.set(new Set());
        this.table()?.clearSelection();
    }

    // ── Column Visibility ──────────────────────────────────────────────────

    public toggleColumnVisible(col: string): void {
        this.hiddenColumns.update((set: Set<string>) => {
            const next = new Set(set);
            next.has(col) ? next.delete(col) : next.add(col);
            return next;
        });
    }

    public isColHidden(col: string): boolean {
        return this.hiddenColumns().has(col);
    }

    // ── Programmatic Seek to Row ───────────────────────────────────────────

    public triggerSeek(): void {
        this.table()?.scrollToRow(this.seekRowIndex(), 'smooth');
    }

    // ── Drag & Drop Reordering ─────────────────────────────────────────────

    public onRowDropped(event: { previousIndex: number; currentIndex: number }): void {
        const current = [...this.displayedProducts()];
        const [moved] = current.splice(event.previousIndex, 1);
        current.splice(event.currentIndex, 0, moved);
        this.displayedProducts.set(current);
    }

    // ── CSV Export ─────────────────────────────────────────────────────────

    public exportCsv(): void {
        exportToCsv(
            this.displayedProducts(),
            [
                { title: 'ID', dataKey: 'id' },
                { title: 'Product Name', dataKey: 'title' },
                { title: 'Category', dataKey: 'category' },
                { title: 'Price ($)', dataKey: 'price', formatter: (v: number) => v.toFixed(2) },
                { title: 'Stock', dataKey: 'stock' },
                { title: 'In Stock', dataKey: 'inStock', formatter: (v: boolean) => (v ? 'Yes' : 'No') },
                { title: 'Rating', dataKey: 'rating' },
                { title: 'Date Added', dataKey: 'createdDate' }
            ],
            'products.csv'
        );
    }

    // ── Expand / Collapse All ──────────────────────────────────────────────

    public expandAll(): void {
        this.table()?.expandAllRows();
    }

    public collapseAll(): void {
        this.table()?.collapseAllRows();
    }

    // ── Column Widths ──────────────────────────────────────────────────────

    public resetWidths(): void {
        this.table()?.resetColumnWidths();
    }

    // ── Synchronous Fallbacks & Mock Generator ─────────────────────────────

    private applyClientSideFilters(items: ProductItem[]): ProductItem[] {
        const filters = this.activeFilters();
        return items.filter((item) => {
            for (const [key, val] of Object.entries(filters) as [string, IFilterValueState][]) {
                if (!val.enabled) continue;
                if (key === 'title' && val.text) {
                    if (!item.title.toLowerCase().includes(val.text.toLowerCase())) return false;
                }
                if (key === 'category' && val.singleselect) {
                    if (item.category !== val.singleselect) return false;
                }
                if (key === 'price') {
                    if (val.minValue != null && item.price < Number(val.minValue)) return false;
                    if (val.maxValue != null && item.price > Number(val.maxValue)) return false;
                }
                if (key === 'stock') {
                    if (val.minValue != null && item.stock < Number(val.minValue)) return false;
                    if (val.maxValue != null && item.stock > Number(val.maxValue)) return false;
                }
                if (key === 'inStock' && val.text != null) {
                    if (item.inStock !== (val.text === 'true')) return false;
                }
            }
            return true;
        });
    }

    private applyClientSideSort(items: ProductItem[]): ProductItem[] {
        const dir = this.sortDirection();
        const field = this.sortField() as keyof ProductItem | null;
        if (!dir || !field) return items;
        return [...items].sort((a, b) => {
            const valA = a[field];
            const valB = b[field];
            if (valA < valB) return dir === SortType.Ascending ? -1 : 1;
            if (valA > valB) return dir === SortType.Ascending ? 1 : -1;
            return 0;
        });
    }

    private generateMockDataset(count: number): ProductItem[] {
        const dataset: ProductItem[] = [];
        const adjectives = ['Premium', 'Pro', 'Ultra', 'Smart', 'Eco', 'Quantum', 'Max', 'Compact'];
        const nouns = ['Display', 'Headset', 'Camera', 'Sensor', 'Tracker', 'Speaker', 'Drone', 'Controller'];

        for (let i = 1; i <= count; i++) {
            const adj = adjectives[i % adjectives.length];
            const noun = nouns[Math.floor(i / adjectives.length) % nouns.length];
            const category = CATEGORIES[i % CATEGORIES.length];
            const price = Math.round((25 + (i * 17) % 850) * 100) / 100;
            const stock = (i * 7) % 150;
            const rating = Math.round((3 + (i % 20) / 10) * 10) / 10;
            const month = ((i % 12) + 1).toString().padStart(2, '0');
            const day = ((i % 28) + 1).toString().padStart(2, '0');

            dataset.push({
                id: i,
                title: `${adj} ${noun} ${i}`,
                category,
                price,
                stock,
                rating,
                inStock: stock > 0,
                createdDate: `2025-${month}-${day}`,
                description: `High-grade ${adj.toLowerCase()} hardware featuring modern ergonomics, advanced performance, and 2-year warranty.`
            });
        }
        return dataset;
    }
}
