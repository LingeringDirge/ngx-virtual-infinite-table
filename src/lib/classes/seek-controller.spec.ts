import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SeekController } from './seek-controller';

describe('SeekController', () => {
    it('should initialize and handle startSeek and cancelSeek', () => {
        TestBed.runInInjectionContext(() => {
            const loadMoreSpy = jest.fn();
            const reachedSpy = jest.fn();
            const cdr = { markForCheck: jest.fn() } as unknown as ChangeDetectorRef;

            const controller = new SeekController({
                getItems: () => [1, 2, 3],
                isLoading: () => false,
                hasMoreData: () => true,
                getLoadMoreRows: () => loadMoreSpy,
                onReached: reachedSpy,
                cdr
            });

            expect(controller.isSeeking()).toBe(false);
            expect(controller.seekTarget()).toBeNull();

            controller.startSeek(10);
            expect(controller.isSeeking()).toBe(true);
            expect(controller.seekTarget()).toBe(10);
            expect(loadMoreSpy).toHaveBeenCalled();

            controller.cancelSeek();
            expect(controller.isSeeking()).toBe(false);
            expect(controller.seekTarget()).toBeNull();
        });
    });
});
