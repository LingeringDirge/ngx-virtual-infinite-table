import { ChangeDetectorRef } from '@angular/core';
import { FillCheckController } from './fill-check-controller';

describe('FillCheckController', () => {
    it('should trigger loadMoreRows when container is underfilled', () => {
        const loadMoreSpy = jest.fn();
        const cdr = { markForCheck: jest.fn() } as unknown as ChangeDetectorRef;

        const mockElement = {
            clientHeight: 600,
            scrollHeight: 400
        } as HTMLElement;

        const controller = new FillCheckController({
            getScrollElement: () => mockElement,
            getItems: () => [{ id: 1 }, { id: 2 }],
            isLoading: () => false,
            hasMoreData: () => true,
            getLoadMoreRows: () => loadMoreSpy,
            cdr
        });

        controller.check();
        expect(loadMoreSpy).toHaveBeenCalledTimes(1);

        // Should not trigger duplicate call for same item count
        controller.check();
        expect(loadMoreSpy).toHaveBeenCalledTimes(1);

        // Resetting guard allows check again
        controller.resetGuard();
        controller.check();
        expect(loadMoreSpy).toHaveBeenCalledTimes(2);
    });

    it('should not trigger loadMoreRows if already loading or no more data', () => {
        const loadMoreSpy = jest.fn();
        const cdr = { markForCheck: jest.fn() } as unknown as ChangeDetectorRef;

        const mockElement = {
            clientHeight: 600,
            scrollHeight: 400
        } as HTMLElement;

        const controllerLoading = new FillCheckController({
            getScrollElement: () => mockElement,
            getItems: () => [{ id: 1 }],
            isLoading: () => true,
            hasMoreData: () => true,
            getLoadMoreRows: () => loadMoreSpy,
            cdr
        });

        controllerLoading.check();
        expect(loadMoreSpy).not.toHaveBeenCalled();

        const controllerNoMore = new FillCheckController({
            getScrollElement: () => mockElement,
            getItems: () => [{ id: 1 }],
            isLoading: () => false,
            hasMoreData: () => false,
            getLoadMoreRows: () => loadMoreSpy,
            cdr
        });

        controllerNoMore.check();
        expect(loadMoreSpy).not.toHaveBeenCalled();
    });
});
