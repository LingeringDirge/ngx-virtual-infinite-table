import { ElementRef } from '@angular/core';
import { ClickOutsideDirective } from './click-outside.directive';

describe('ClickOutsideDirective', () => {
    it('should emit when document is clicked outside host element', () => {
        const hostElement = document.createElement('div');
        const outsideElement = document.createElement('button');
        document.body.appendChild(hostElement);
        document.body.appendChild(outsideElement);

        const directive = new ClickOutsideDirective(new ElementRef(hostElement));
        const spyNgx = jest.fn();
        const spyApp = jest.fn();

        directive.ngxClickOutside.subscribe(spyNgx);
        directive.appOffClick.subscribe(spyApp);

        directive.onDocumentClick({ target: outsideElement } as unknown as MouseEvent);
        expect(spyNgx).toHaveBeenCalled();
        expect(spyApp).toHaveBeenCalled();

        // Clicking inside should not emit
        spyNgx.mockClear();
        spyApp.mockClear();
        directive.onDocumentClick({ target: hostElement } as unknown as MouseEvent);
        expect(spyNgx).not.toHaveBeenCalled();
        expect(spyApp).not.toHaveBeenCalled();

        document.body.removeChild(hostElement);
        document.body.removeChild(outsideElement);
    });
});
