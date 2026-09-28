import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { TableVirtualScrollStrategy } from './table-virtual-scroll-strategy';

describe('TableVirtualScrollStrategy', () => {
    let strategy: TableVirtualScrollStrategy;
    let mockViewport: any;

    beforeEach(() => {
        strategy = new TableVirtualScrollStrategy();
        mockViewport = {
            setTotalContentSize: jest.fn(),
            setRenderedRange: jest.fn(),
            setRenderedContentOffset: jest.fn(),
            measureScrollOffset: jest.fn().mockReturnValue(0),
            getViewportSize: jest.fn().mockReturnValue(480),
            scrollToOffset: jest.fn()
        };
    });

    it('should initialize and attach to viewport with data', () => {
        strategy.updateDataLength(100);
        strategy.attach(mockViewport as CdkVirtualScrollViewport);
        expect(mockViewport.setRenderedRange).toHaveBeenCalled();
    });

    it('should calculate scroll offset when scrollToIndex is called', () => {
        strategy.attach(mockViewport as CdkVirtualScrollViewport);
        strategy.updateItemSize(50);
        strategy.scrollToIndex(10, 'smooth');

        expect(mockViewport.scrollToOffset).toHaveBeenCalledWith(500, 'smooth');
    });

    it('should recalculate total content size when data length changes', () => {
        strategy.attach(mockViewport as CdkVirtualScrollViewport);
        strategy.updateItemSize(40);
        strategy.updateDataLength(100);

        expect(mockViewport.setTotalContentSize).toHaveBeenCalledWith(4000);
    });
});
