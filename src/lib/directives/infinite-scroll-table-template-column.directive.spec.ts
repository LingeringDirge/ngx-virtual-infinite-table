import { TemplateRef } from '@angular/core';
import { InfiniteScrollTableTemplateColumnDirective } from './infinite-scroll-table-template-column.directive';

describe('InfiniteScrollTableTemplateColumnDirective', () => {
    it('should create an instance and calculate flex shortcut', () => {
        const mockTemplate = {} as TemplateRef<unknown>;
        const directive = new InfiniteScrollTableTemplateColumnDirective(mockTemplate);
        expect(directive).toBeTruthy();
        expect(directive.template).toBe(mockTemplate);

        expect(directive.flex).toBeNull();
        directive.width = '200px';
        expect(directive.flex).toBe('0 0 200px');
    });

    it('should synchronize maxColumnWidth and maxWidth', () => {
        const mockTemplate = {} as TemplateRef<unknown>;
        const directive = new InfiniteScrollTableTemplateColumnDirective(mockTemplate);

        directive.maxColumnWidth = 350;
        expect(directive.maxColumnWidth).toBe(350);
        expect(directive.maxWidth).toBe(350);

        directive.maxWidth = 400;
        expect(directive.maxColumnWidth).toBe(400);
        expect(directive.maxWidth).toBe(400);
    });

    it('should default sticky and stickyEnd to false and allow configuration', () => {
        const mockTemplate = {} as TemplateRef<unknown>;
        const directive = new InfiniteScrollTableTemplateColumnDirective(mockTemplate);

        expect(directive.sticky).toBe(false);
        expect(directive.stickyEnd).toBe(false);

        directive.sticky = true;
        directive.stickyEnd = true;
        expect(directive.sticky).toBe(true);
        expect(directive.stickyEnd).toBe(true);
    });
});
