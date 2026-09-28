export interface FilterableEntry<EditDataType> {
    data: EditDataType;
    isNew: boolean;
    isUpdated?: boolean;
}

/**
 * Base abstract class for managing client-side and lazy-loaded datasets
 * with filtering, inline modifications, creation, and deletion tracking.
 */
export abstract class FilterableSetEditor<IdType, ElementType, EditDataType, FilterType> {
    public records = new Map<IdType, FilterableEntry<EditDataType>>();

    protected loadedElements: ElementType[] = [];
    protected loadedFilteredElements: ElementType[] = [];

    public abstract filterChanged(filters: FilterType): void;
    public abstract createNewElement(element: ElementType): void;
    protected abstract addElementData(element: ElementType): void;
    public abstract loadMoreElements(): void;
    public abstract clearElementData(id: IdType): void;
    public abstract elementData(id: IdType): EditDataType | null;
    public abstract get displayElements(): ElementType[];
    public abstract getDeletedRecords(): IdType[];
    public abstract getUpdatedRecords(trackedOnly?: boolean): [IdType, EditDataType][];
    public abstract getAddedRecords(): EditDataType[];
    public abstract sort(sorter: (data: ElementType[]) => unknown): void;

    public hasChanges(): boolean {
        return (
            !!this.getAddedRecords().length ||
            !!this.getDeletedRecords().length ||
            !!this.getUpdatedRecords().length
        );
    }

    public refreshData(_elements: ElementType[]): void {
        console.warn('Refresh not currently supported by this editor implementation.');
    }

    public updateElement(_element: ElementType): void {
        console.warn('Update not currently supported by this editor implementation.');
    }

    public deleteElement(_element: ElementType): void {
        console.warn('Delete not currently supported by this editor implementation.');
    }
}
