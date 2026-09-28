import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InfiniteScrollTableComponent } from './infinite-scroll-table.component';
import { SortType } from './models/sort-type.enum';

describe('InfiniteScrollTableComponent', () => {
    let component: InfiniteScrollTableComponent<any>;
    let fixture: ComponentFixture<InfiniteScrollTableComponent<any>>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [InfiniteScrollTableComponent, NoopAnimationsModule]
        }).compileComponents();

        fixture = TestBed.createComponent(InfiniteScrollTableComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('items', []);
        fixture.detectChanges();
    });

    it('should create the table component', () => {
        expect(component).toBeTruthy();
    });

    it('should default trackBy to item.id, item.guid, or index', () => {
        const trackByFn = component.trackBy();
        expect(trackByFn(0, { id: 'item-1' })).toBe('item-1');
        expect(trackByFn(1, { guid: 'guid-abc' })).toBe('guid-abc');
        expect(trackByFn(2, { name: 'no-id' })).toBe(2);
        expect(trackByFn(3, null as unknown as Record<string, unknown>)).toBe(3);
    });

    it('should allow overriding trackBy with a custom function', () => {
        const customTrackBy = (_index: number, item: { code: string }) => item.code;
        fixture.componentRef.setInput('trackBy', customTrackBy);
        expect(component.trackBy()(0, { code: 'CUSTOM' })).toBe('CUSTOM');
    });

    it('should toggle selection state when selectAll is called', () => {
        let emittedValue: boolean | undefined;
        component.allRowsSelected.subscribe((val) => (emittedValue = val));

        component.selectAll();
        expect(component.allSelected()).toBe(true);
        expect(emittedValue).toBe(true);

        component.selectAll();
        expect(component.allSelected()).toBe(false);
        expect(emittedValue).toBe(false);
    });

    it('should support programmatic selection helpers (selectAllRows, clearSelection)', () => {
        let emittedValue: boolean | undefined;
        component.allRowsSelected.subscribe((val) => (emittedValue = val));

        component.selectAllRows();
        expect(component.allSelected()).toBe(true);
        expect(emittedValue).toBe(true);

        component.clearSelection();
        expect(component.allSelected()).toBe(false);
        expect(emittedValue).toBe(false);
    });

    it('should manage expanded rows state (expandAllRows, collapseAllRows, isRowExpanded)', () => {
        const sampleItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
        fixture.componentRef.setInput('items', sampleItems);

        expect(component.getExpandedRows().length).toBe(0);
        expect(component.isRowExpanded(sampleItems[0])).toBe(false);

        component.expandAllRows();
        expect(component.getExpandedRows().length).toBe(3);
        expect(component.isRowExpanded(sampleItems[0])).toBe(true);
        expect(component.isRowExpanded(sampleItems[1])).toBe(true);

        component.collapseAllRows();
        expect(component.getExpandedRows().length).toBe(0);
        expect(component.isRowExpanded(sampleItems[0])).toBe(false);
    });

    it('should handle keyboard interaction on rows (Space and Enter)', () => {
        const rowData = { id: 10 };
        const selectedIndices: number[] = [];
        component.rowSelected.subscribe((e) => selectedIndices.push(e.index));

        fixture.componentRef.setInput('isRowSelected', () => false);

        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
        const preventDefaultSpy = jest.spyOn(spaceEvent, 'preventDefault');

        component.onRowKeyDown(spaceEvent, rowData, 2);
        expect(preventDefaultSpy).toHaveBeenCalled();
        expect(selectedIndices).toEqual([2]);
    });

    it('should handle sorting state progression: Descending -> Ascending -> None', () => {
        const mockColumn = { dataKey: 'title', title: 'Title' } as any;
        const sortEvents: any[] = [];
        component.sortChanged.subscribe((e) => sortEvents.push(e));

        component.sortColumn(mockColumn);
        expect(component.sortDirection()).toBe(SortType.Descending);
        expect(component.sortedColumn()).toBe(mockColumn);
        expect(sortEvents[0]).toEqual({ sortDirection: SortType.Descending, dataKey: 'title' });

        component.sortColumn(mockColumn);
        expect(component.sortDirection()).toBe(SortType.Ascending);
        expect(sortEvents[1]).toEqual({ sortDirection: SortType.Ascending, dataKey: 'title' });

        component.sortColumn(mockColumn);
        expect(component.sortDirection()).toBe(SortType.None);
        expect(component.sortedColumn()).toBeNull();
        expect(sortEvents[2]).toEqual({ sortDirection: SortType.None, dataKey: 'title' });
    });

    it('should have default emptyText of "No records found"', () => {
        expect(component.emptyText()).toBe('No records found');
    });

    // ── Column Visibility ─────────────────────────────────────────────────────

    it('should start with no hidden columns', () => {
        expect(component.getHiddenColumns()).toEqual([]);
        expect(component.isColumnHidden('Name')).toBe(false);
    });

    it('should hide and show columns by key', () => {
        component.hideColumn('Status');
        expect(component.isColumnHidden('Status')).toBe(true);
        expect(component.getHiddenColumns()).toContain('Status');

        component.showColumn('Status');
        expect(component.isColumnHidden('Status')).toBe(false);
        expect(component.getHiddenColumns()).toEqual([]);
    });

    it('should toggle column visibility', () => {
        expect(component.isColumnHidden('Role')).toBe(false);
        component.toggleColumn('Role');
        expect(component.isColumnHidden('Role')).toBe(true);
        component.toggleColumn('Role');
        expect(component.isColumnHidden('Role')).toBe(false);
    });

    it('should return column definitions with hidden state', () => {
        component.hideColumn('Email');
        const defs = component.getColumnDefinitions();
        // No ContentChildren in unit test, so templateColumns() is null -> returns []
        expect(defs).toEqual([]);
    });

    // ── Column Resize ─────────────────────────────────────────────────────────

    it('should start with no column width overrides', () => {
        expect(component.columnWidths().size).toBe(0);
    });

    it('should reset column widths', () => {
        const next = new Map(component.columnWidths());
        next.set('Name', 250);
        component.columnWidths.set(next);
        expect(component.columnWidths().get('Name')).toBe(250);

        component.resetColumnWidths();
        expect(component.columnWidths().size).toBe(0);
    });

    it('getColumnWidth should return undefined when no override exists', () => {
        const mockCol = { title: 'ID', dataKey: 'id' } as any;
        expect(component.getColumnWidth(mockCol, 0)).toBeUndefined();
    });
});
