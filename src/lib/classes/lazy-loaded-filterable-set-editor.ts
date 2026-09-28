import { Observable } from 'rxjs';
import { FilterableSetEditor } from './filterable-set-editor';

/**
 * Filterable set editor for server-backed or lazily-loaded datasets.
 * Manages chunked pagination, active filters, and tracks edited/new/deleted rows.
 */
export class LazyLoadedFilterableSetEditor<IdType, ElementType, EditDataType, FilterType> extends FilterableSetEditor<
    IdType,
    ElementType,
    EditDataType,
    FilterType
> {
    private currentFilters!: FilterType;
    private currentFilteredCount = 0;
    private currentUnfilteredCount = 0;
    private updatedElements = new Map<IdType, ElementType>();

    constructor(
        private getElementSet: (skip: number, take: number, filters?: FilterType) => Observable<ElementType[]>,
        private getElementData: (elements: ElementType) => EditDataType,
        private getRecordId: (elements: ElementType) => IdType,
        private filtersEnabled: (filters: FilterType) => boolean,
        private hasValue: (data: EditDataType) => boolean,
        private clearData: (data: EditDataType | null) => void,
        private pageSize = 50
    ) {
        super();

        this.getElementSet(0, this.pageSize).subscribe({
            next: (r) => {
                r.forEach((e) => this.addElementData(e));
                this.currentUnfilteredCount = this.pageSize;
                this.loadedElements = this.updateView(r);
            },
            error: (e) => console.error(e)
        });
    }

    public filterChanged(filters: FilterType): void {
        this.currentFilters = filters;
        this.currentFilteredCount = 0;
        if (this.filtersEnabled(filters)) {
            this.loadedFilteredElements = [];
            this.getElementSet(0, this.pageSize, filters).subscribe({
                next: (r) => {
                    r.forEach((e) => this.addElementData(e));
                    this.loadedFilteredElements = this.updateView(r);
                    this.currentFilteredCount = this.pageSize;
                },
                error: (e) => console.error(e)
            });
        } else {
            this.loadedFilteredElements = [];
            this.getElementSet(0, this.pageSize).subscribe({
                next: (r) => {
                    r.forEach((e) => this.addElementData(e));
                    this.currentUnfilteredCount = this.pageSize;
                    this.loadedElements = this.updateView(r);
                },
                error: (e) => console.error(e)
            });
        }
    }

    public createNewElement(element: ElementType): void {
        const id = this.getRecordId(element);
        if (!this.records.has(id)) {
            this.records.set(id, { isNew: true, data: this.getElementData(element) });
        }
    }

    protected addElementData(element: ElementType): void {
        const id = this.getRecordId(element);
        const data = this.getElementData(element);
        if (!this.records.has(id)) {
            this.records.set(id, { isNew: !this.hasValue(data), data });
        }
    }

    public loadMoreElements = (): void => {
        if (this.filtersEnabled(this.currentFilters)) {
            this.getElementSet(this.currentFilteredCount, this.pageSize, this.currentFilters).subscribe({
                next: (r) => {
                    r.forEach((e) => this.addElementData(e));
                    this.loadedFilteredElements = [...this.loadedFilteredElements, ...this.updateView(r)];
                    this.currentFilteredCount += this.pageSize;
                },
                error: (e) => console.error(e)
            });
        } else {
            this.getElementSet(this.currentUnfilteredCount, this.pageSize).subscribe({
                next: (r) => {
                    r.forEach((e) => this.addElementData(e));
                    this.loadedElements = [...this.loadedElements, ...this.updateView(r)];
                    this.currentUnfilteredCount += this.pageSize;
                },
                error: (e) => console.error(e)
            });
        }
    };

    public clearElementData(id: IdType): void {
        if (this.records.has(id)) {
            this.clearData(this.records.get(id)?.data || null);
        }
    }

    public elementData(id: IdType): EditDataType | null {
        if (this.records.has(id)) {
            return this.records.get(id)?.data || null;
        }
        return null;
    }

    public get displayElements(): ElementType[] {
        return this.filtersEnabled(this.currentFilters) ? this.loadedFilteredElements : this.loadedElements;
    }

    public getDeletedRecords(): IdType[] {
        return [...this.records.entries()]
            .filter((e) => !e[1].isNew && !this.hasValue(e[1].data))
            .map((e) => e[0]);
    }

    public getUpdatedRecords(trackedOnly = false): [IdType, EditDataType][] {
        let entries = [...this.records.entries()];
        if (trackedOnly) {
            entries = entries.filter((r) => this.updatedElements.has(r[0]));
        }
        return entries
            .filter((e) => !e[1].isNew && this.hasValue(e[1].data))
            .map((e) => [e[0], e[1].data]);
    }

    public getAddedRecords(): EditDataType[] {
        return [...this.records.entries()]
            .filter((e) => !!e[1].isNew && this.hasValue(e[1].data))
            .map((e) => e[1].data);
    }

    public sort(sorter: (data: ElementType[]) => ElementType[]): void {
        this.loadedElements = sorter(this.loadedElements);
        this.loadedFilteredElements = sorter(this.loadedFilteredElements);
    }

    public override updateElement(element: ElementType): void {
        const rowId = this.getRecordId(element);
        const data = this.getElementData(element);

        if (this.records.has(rowId)) {
            const record = this.records.get(rowId);
            if (record) {
                this.records.set(rowId, { isNew: record.isNew, data });
            }
        }

        this.updatedElements.set(rowId, element);

        this.loadedElements = [...this.updateView(this.loadedElements)];
        if (this.loadedFilteredElements) {
            this.loadedFilteredElements = [...this.updateView(this.loadedFilteredElements)];
        }
    }

    public updateView(elements: ElementType[]): ElementType[] {
        elements.forEach((r, i) => {
            const rowId = this.getRecordId(r);
            if (this.updatedElements.has(rowId)) {
                const updatedElement = this.updatedElements.get(rowId);
                if (updatedElement) {
                    elements[i] = updatedElement;
                }
            }
        });

        return elements;
    }
}
