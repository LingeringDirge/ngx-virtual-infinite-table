import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
    selector: '[ngxClickOutside], [clickOutside], [appOffClick]',
    standalone: true
})
export class ClickOutsideDirective {
    @Output() public ngxClickOutside = new EventEmitter<MouseEvent>();
    @Output() public appOffClick = new EventEmitter<MouseEvent>();

    constructor(private readonly elementRef: ElementRef) {}

    @HostListener('document:mousedown', ['$event'])
    public onDocumentClick(event: MouseEvent): void {
        const target = event.target as Node;
        if (!this.elementRef.nativeElement.contains(target)) {
            this.ngxClickOutside.emit(event);
            this.appOffClick.emit(event);
        }
    }
}
