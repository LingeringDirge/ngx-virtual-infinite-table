import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InfiniteScrollTableFilterComponent } from './infinite-scroll-table-filter.component';

describe('InfiniteScrollTableFilterComponent', () => {
    let component: InfiniteScrollTableFilterComponent;
    let fixture: ComponentFixture<InfiniteScrollTableFilterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [InfiniteScrollTableFilterComponent, NoopAnimationsModule]
        }).compileComponents();

        fixture = TestBed.createComponent(InfiniteScrollTableFilterComponent);
        component = fixture.componentInstance;
        component.dataKey = 'name';
        component.columnName = 'Full Name';
        component.type = 'text';
        fixture.detectChanges();
    });

    it('should create the filter component', () => {
        expect(component).toBeTruthy();
    });

    it('should emit filterChanged and close overlay on applyFilters', () => {
        const closeSpy = jest.fn();
        component.scrollTable = { closeFilter: closeSpy };

        let emittedEvent: any;
        component.filterChanged.subscribe((e) => (emittedEvent = e));

        component.filterValue = { text: 'Angular' };
        component.applyFilters();

        expect(emittedEvent).toBeDefined();
        expect(emittedEvent.dataKey).toBe('name');
        expect(emittedEvent.filterValue.enabled).toBe(true);
        expect(emittedEvent.filterValue.text).toBe('Angular');
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should clear filter value and re-apply on clearFilter', () => {
        let emittedEvent: any;
        component.filterChanged.subscribe((e) => (emittedEvent = e));

        component.filterValue = { enabled: true, text: 'Search term' };
        component.clearFilter();

        expect(emittedEvent.filterValue.enabled).toBe(false);
        expect(emittedEvent.filterValue.text).toBeNull();
    });

    it('should format displayText correctly for multiselect', () => {
        component.type = 'multiselect';
        component.lookupValueNames = 'Option 1, Option 2';
        expect(component.displayText).toBe('Option 1, Option 2');

        component.lookupValueNames = 'Option 1, Option 2, Option 3, Option 4';
        expect(component.displayText).toBe('4 items selected');

        component.lookupValueNames = '';
        expect(component.displayText).toBe('Select Items');
    });
});
