import { FilterableEntry, FilterableSetEditor } from './filterable-set-editor';

/**
 * In-memory client-side data set editor that handles filtering, sorting,
 * additions, updates, and deletions for local arrays.
 */
export class CannedFilterableSetEditor<IdType, ElementType, EditDataType, FilterType> extends FilterableSetEditor<
    IdType,
    ElementType,
    EditDataType,
    FilterType
> {
    private currentFilters!: FilterType;
    private toBeDeleted = new Map<IdType, EditDataType>();

    constructor(
        private cannedElements: ElementType[],
        private getElementData: (elements: ElementType) => EditDataType,
        private getRecordId: (elements: ElementType) => IdType,
        private filtersEnabled: (filters: FilterType) => boolean,
        private hasValue: (data: EditDataType) => boolean,
        private clearData: (data: EditDataType | null) => void,
        private filterData: (data: ElementType[], filters: FilterType) => ElementType[]
    ) {
        super();
        this.loadedElements = cannedElements;
    }

    public override refreshData(elements: ElementType[]): void {
        this.loadedElements = elements;
        this.records = new Map<IdType, FilterableEntry<EditDataType>>();
        elements.forEach((item) =>
            this.records.set(this.getRecordId(item), { isNew: false, data: this.getElementData(item) })
        );
        this.toBeDeleted = new Map<IdType, EditDataType>();
    }

    public filterChanged(filters: FilterType): void {
        this.currentFilters = filters;
        if (this.filtersEnabled(filters)) {
            this.loadedFilteredElements = this.filterData(this.loadedElements, filters);
        } else {
            this.loadedFilteredElements = [];
        }
    }

    public override updateElement(element: ElementType): void {
        const id = this.getRecordId(element);
        const index = this.loadedElements.findIndex((r) => this.getRecordId(r) === id);
        if (index >= 0) this.loadedElements[index] = element;

        if (this.records.has(id)) {
            const record = this.records.get(id);
            if (!record?.isNew) {
                this.records.set(id, { isNew: false, isUpdated: true, data: this.getElementData(element) });
            } else {
                this.records.set(id, { isNew: true, isUpdated: false, data: this.getElementData(element) });
            }
        } else {
            console.error('Cannot modify non-existent element in CannedFilterableSetEditor.');
        }

        this.loadedElements = [...this.loadedElements];
        if (this.loadedFilteredElements) {
            this.loadedFilteredElements = [...this.loadedFilteredElements];
        }
    }

    public override deleteElement(element: ElementType): void {
        const id = this.getRecordId(element);
        if (this.records.has(id)) {
            const record = this.records.get(id);
            if (record && !record.isNew) {
                this.toBeDeleted.set(id, record.data);
            }
            this.records.delete(id);
            this.loadedElements = this.loadedElements.filter((r) => this.getRecordId(r) !== id);
            this.loadedElements = [...this.loadedElements];
            this.filterChanged(this.currentFilters);
        } else {
            console.error('Failed to delete non-existent entry in CannedFilterableSetEditor.');
        }
    }

    public createNewElement(element: ElementType): void {
        const id = this.getRecordId(element);
        if (!this.records.has(id)) {
            this.records.set(id, { isNew: true, data: this.getElementData(element) });
        }
        this.loadedElements.unshift(element);
        this.loadedElements = [...this.loadedElements];
        if (this.filtersEnabled(this.currentFilters)) {
            this.loadedFilteredElements = this.filterData(this.loadedElements, this.currentFilters);
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
        // Canned arrays are fully present in-memory; no pagination needed
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
        return [...this.toBeDeleted.entries()].map((e) => e[0]);
    }

    public getUpdatedRecords(): [IdType, EditDataType][] {
        return [...this.records.entries()]
            .filter((e) => !e[1].isNew && e[1].isUpdated && this.hasValue(e[1].data))
            .map((e) => [e[0], e[1].data]);
    }

    public getAddedRecords(): EditDataType[] {
        return [...this.records.entries()]
            .filter((e) => !!e[1].isNew && this.hasValue(e[1].data))
            .map((e) => e[1].data);
    }

    public sort(sorter: (data: ElementType[]) => void): void {
        sorter(this.loadedElements);
        this.loadedElements = [...this.loadedElements];
        if (this.loadedFilteredElements && this.loadedFilteredElements.length) {
            sorter(this.loadedFilteredElements);
            this.loadedFilteredElements = [...this.loadedFilteredElements];
        }
    }
}
