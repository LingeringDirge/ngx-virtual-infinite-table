import { effect, signal, WritableSignal, ChangeDetectorRef } from '@angular/core';

export interface SeekControllerConfig {
    getItems: () => unknown[] | undefined;
    isLoading: () => boolean;
    hasMoreData: () => boolean;
    getLoadMoreRows: () => (() => void) | undefined;
    /** Called when the target index becomes available so the host can perform the final scroll. */
    onReached: (index: number) => void;
    cdr: ChangeDetectorRef;
}

/**
 * Controller that owns the "seek to index" pump used by `scrollToRow`.
 * Repeatedly calls `loadMoreRows()` until the requested index is loaded.
 */
export class SeekController {
    public isSeeking: WritableSignal<boolean> = signal(false);
    public seekTarget: WritableSignal<number | null> = signal(null);

    private seekLastKnownLength = 0;

    constructor(private readonly config: SeekControllerConfig) {
        effect(() => {
            const target = this.seekTarget();
            if (target == null) return;

            const len = this.config.getItems()?.length ?? 0;
            const loading = this.config.isLoading();
            const done = !this.config.hasMoreData();

            if (len > target) {
                const t = target;
                this.cancelSeek();
                setTimeout(() => this.config.onReached(t));
                return;
            }

            if (done) {
                this.cancelSeek();
                return;
            }

            if (!loading) {
                if (this.seekLastKnownLength > 0 && len === this.seekLastKnownLength) {
                    this.cancelSeek();
                    return;
                }
                this.seekLastKnownLength = len;
                this.config.getLoadMoreRows()?.();
            }
        });
    }

    public startSeek(targetIndex: number): void {
        this.seekLastKnownLength = this.config.getItems()?.length ?? 0;
        this.isSeeking.set(true);
        this.seekTarget.set(targetIndex);
        this.config.cdr.markForCheck();

        if (!this.config.isLoading()) {
            this.config.getLoadMoreRows()?.();
        }
    }

    public cancelSeek(): void {
        this.seekTarget.set(null);
        this.isSeeking.set(false);
        this.seekLastKnownLength = 0;
        this.config.cdr.markForCheck();
    }

    public destroy(): void {
        this.cancelSeek();
    }
}
