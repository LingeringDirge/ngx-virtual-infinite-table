import { SelectionModel } from '@angular/cdk/collections';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'isRowExpanded',
    pure: false,
    standalone: true
})
export class IsRowExpandedPipe implements PipeTransform {
    public transform<T = unknown>(row: T, expandedRows: SelectionModel<T>): boolean {
        return expandedRows?.isSelected(row) ?? false;
    }
}
