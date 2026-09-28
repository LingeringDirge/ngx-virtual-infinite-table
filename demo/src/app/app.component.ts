import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
    exportToCsv,
    IFilterValueState,
    IInfiniteFilterChangedEvent,
    IInfiniteScrollSortEvent,
    IInfiniteScrollTableRowActionEvent,
    InfiniteScrollTableComponent,
    InfiniteScrollTableModule,
    SortType
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

const CATEGORIES = ['Electronics', 'Home & Kitchen', 'Books', 'Clothing', 'Sports', 'Automotive', 'Health & Beauty'];

const ALL_COLUMNS = ['ID', 'Product Name', 'Category', 'Price', 'Stock', 'Status', 'Date Added', 'Rating'];

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatChipsModule,
        MatCheckboxModule,
        MatMenuModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatInputModule,
        InfiniteScrollTableModule
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    public table = viewChild(InfiniteScrollTableComponent);

    // ── Feature Toggles ────────────────────────────────────────────────────
    public isVirtualScroll = signal(true);
    public isDarkMode = signal(false);
    public enableDrag = signal(false);
    public enableExpansion = signal(false);
    public enableRowStripes = signal(true);
    public enableWordWrap = signal(false);
    public fitContent = signal(false);
    public enableSelection = signal(true);
    public seekRowIndex = signal<number>(250);

    // ── Column Visibility ──────────────────────────────────────────────────
    public allColumns = ALL_COLUMNS;
    public hiddenColumnSet = signal<Set<string>>(new Set<string>());

    public isColHidden(col: string): boolean {
        return this.hiddenColumnSet().has(col);
    }

    public toggleColumnVisible(col: string): void {
        const next = new Set(this.hiddenColumnSet());
        if (next.has(col)) {
            next.delete(col);
            this.table()?.showColumn(col);
        } else {
            next.add(col);
            this.table()?.hideColumn(col);
        }
        this.hiddenColumnSet.set(next);
    }

    // ── Data State ─────────────────────────────────────────────────────────
    public allMockProducts: ProductItem[] = [];
    public displayedProducts = signal<ProductItem[]>([]);
    public isLoading = signal(false);
    public hasMoreData = signal(true);

    // ── Filtering & Sorting ────────────────────────────────────────────────
    public activeFilters = signal<Record<string, IFilterValueState>>({});
    public sortDirection = signal<SortType>(SortType.None);
    public sortField = signal<string | null>(null);

    // ── Selection State ────────────────────────────────────────────────────
    public selectedRowIds = signal<Set<number>>(new Set<number>());

    private pageSize = 100;
    private filteredDataset: ProductItem[] = [];
    private currentOffset = 0;

    public ngOnInit(): void {
        this.allMockProducts = this.generateMockDataset(5000);
        this.resetAndLoad();
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

    // ── Data Operations ────────────────────────────────────────────────────

    public resetAndLoad(): void {
        this.isLoading.set(false);
        this.currentOffset = 0;
        this.selectedRowIds.set(new Set());
        this.hasMoreData.set(true);

        // Filter and sort ONCE on dataset/filter change (prevents re-filtering 5k items on every page chunk)
        const filtered = this.applyClientSideFilters(this.allMockProducts);
        this.filteredDataset = this.applyClientSideSort(filtered);

        // Load initial page (100 rows) with virtualized infinite scrolling by default
        const initialChunk = this.filteredDataset.slice(0, this.pageSize);
        this.currentOffset = initialChunk.length;
        this.displayedProducts.set(initialChunk);
        this.hasMoreData.set(this.currentOffset < this.filteredDataset.length);

        this.table()?.resetScrollState();
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
        }, 40);
    };

    // ── Sort / Filter ──────────────────────────────────────────────────────

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

    // ── Selection ──────────────────────────────────────────────────────────

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

    // ── Seek ───────────────────────────────────────────────────────────────

    public triggerSeek(): void {
        this.table()?.scrollToRow(this.seekRowIndex(), 'smooth');
    }

    // ── Drag & Drop ────────────────────────────────────────────────────────

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

    // ── Reset column widths ────────────────────────────────────────────────

    public resetWidths(): void {
        this.table()?.resetColumnWidths();
    }

    // ── Internals ──────────────────────────────────────────────────────────

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
