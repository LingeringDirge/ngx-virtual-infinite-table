import { SelectionModel } from '@angular/cdk/collections';
import { IsRowExpandedPipe } from './is-row-expanded.pipe';

describe('IsRowExpandedPipe', () => {
    it('should return true if row is selected in expandedRows SelectionModel', () => {
        const pipe = new IsRowExpandedPipe();
        const selection = new SelectionModel<string>(true, ['row-1', 'row-2']);

        expect(pipe.transform('row-1', selection)).toBe(true);
        expect(pipe.transform('row-3', selection)).toBe(false);
    });

    it('should return false if selection is null or undefined', () => {
        const pipe = new IsRowExpandedPipe();
        expect(pipe.transform('row-1', null as any)).toBe(false);
    });
});
